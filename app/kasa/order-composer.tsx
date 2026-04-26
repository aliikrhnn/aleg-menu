'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import {
  getPosMenu,
  addItemsToOrder,
  type CategoryForPos,
  type ProductForPos,
} from '@/lib/actions/tables-status';
import { getTopProducts } from '@/lib/actions/menu';
import { useOfflineActions } from '@/lib/offline/use-offline-actions';
import { useCashierSession } from '@/lib/cashier-session';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { playSuccess, playDing } from '@/lib/sounds';
import { cn } from '@/lib/utils';

type CartItem = {
  cartId: string; // her kalemin local unique id'si
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  isComplimentary?: boolean;
  complimentaryReason?: string;
  printStation?: string | null;
  options?: Array<{
    preset_name: string;
    value_name: string;
    price_delta: number;
  }>;
};

type Props = {
  open: boolean;
  // Ne açıldı: masa mı, hızlı satış mı, mevcut sipariş mi
  mode:
    | { kind: 'table'; tableId: string; tableName: string }
    | { kind: 'quick'; label?: string }
    | { kind: 'addToOrder'; orderId: string; tableName?: string };
  onClose: () => void;
  onSuccess: (info: { queued?: boolean; online?: boolean; orderId?: string }) => void;
};

export function OrderComposer({ open, mode, onClose, onSuccess }: Props) {
  const { createManualOrder } = useOfflineActions();
  const { cashier } = useCashierSession();

  const [menu, setMenu] = useState<{
    categories: CategoryForPos[];
    products: ProductForPos[];
  } | null>(null);
  const [topProducts, setTopProducts] = useState<
    Array<{ id: string; name: string; price: number; hero_image_url: string | null; hero_icon: string | null; sold_count: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [variantPicker, setVariantPicker] = useState<ProductForPos | null>(null);
  const [complimentaryPicker, setComplimentaryPicker] = useState<string | null>(null); // cart id
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ESC ile kapama (variant picker, complimentary picker veya transition sırasında değil)
  useEscapeKey(
    onClose,
    open && !variantPicker && !complimentaryPicker && !isPending
  );

  // Menu'yü yükle
  useEffect(() => {
    if (!open || menu) return;
    setLoading(true);
    getPosMenu().then((r) => {
      if (r.success) {
        setMenu({ categories: r.categories || [], products: r.products || [] });
        // Default: Tüm kategoriler göster (null)
      } else {
        setError(r.error || 'Menü alınamadı');
      }
      setLoading(false);
    });
  }, [open, menu]);

  // Sık satılanlar — açılınca bir kez
  useEffect(() => {
    if (!open || topProducts.length > 0) return;
    getTopProducts({ limit: 6, daysBack: 30 }).then((r) => {
      if (r.success && r.products) {
        setTopProducts(r.products);
      }
    });
  }, [open, topProducts.length]);

  // ESC kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (variantPicker) setVariantPicker(null);
        else if (complimentaryPicker) setComplimentaryPicker(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, variantPicker, complimentaryPicker]);

  // Reset cart when closing
  useEffect(() => {
    if (!open) {
      setCart([]);
      setNote('');
      setSearch('');
      setError(null);
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    if (!menu) return [];
    const q = search.trim().toLowerCase();
    return menu.products.filter((p) => {
      if (q) {
        return p.name.toLowerCase().includes(q);
      }
      if (!activeCategory) return true;
      return p.category_id === activeCategory;
    });
  }, [menu, search, activeCategory]);

  const subtotal = cart
    .filter((i) => !i.isComplimentary)
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const complimentaryTotal = cart
    .filter((i) => i.isComplimentary)
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  // Handlers
  const handleAddProduct = (product: ProductForPos) => {
    if (product.status === 'soldout') {
      setError(`${product.name} tükendi`);
      return;
    }

    // Varyant veya option preset varsa picker aç
    if (product.variants.length > 0 || product.option_presets.length > 0) {
      setVariantPicker(product);
      return;
    }

    // Yalın ürün — direkt sepete
    addToCartDirect(product);
  };

  const addToCartDirect = (
    product: ProductForPos,
    variantId?: string,
    options?: CartItem['options']
  ) => {
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
    const optDelta = (options || []).reduce((s, o) => s + o.price_delta, 0);
    const finalPrice = product.price + (variant?.price_delta || 0) + optDelta;

    playDing(0.2);

    // Opsiyonları karşılaştırmak için key
    const optKey = (options || [])
      .map((o) => `${o.preset_name}=${o.value_name}`)
      .sort()
      .join('|');

    setCart((prev) => {
      const existing = prev.find((i) => {
        if (i.productId !== product.id) return false;
        if (i.variantId !== variantId) return false;
        if (i.note || i.isComplimentary) return false;
        const iKey = (i.options || [])
          .map((o) => `${o.preset_name}=${o.value_name}`)
          .sort()
          .join('|');
        return iKey === optKey;
      });
      if (existing) {
        return prev.map((i) =>
          i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartId: `${Date.now()}-${Math.random()}`,
          productId: product.id,
          productName: product.name,
          variantId,
          variantName: variant?.name,
          quantity: 1,
          unitPrice: finalPrice,
          printStation: product.print_station,
          options,
        },
      ];
    });
    setVariantPicker(null);
  };

  const handleIncrement = (cartId: string) => {
    setCart((prev) =>
      prev.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const handleDecrement = (cartId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemove = (cartId: string) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const handleSetComplimentary = (cartId: string, reason: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.cartId === cartId
          ? { ...i, isComplimentary: true, complimentaryReason: reason }
          : i
      )
    );
    setComplimentaryPicker(null);
  };

  const handleUnsetComplimentary = (cartId: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.cartId === cartId
          ? { ...i, isComplimentary: false, complimentaryReason: undefined }
          : i
      )
    );
  };

  const handleSubmit = (sendToKitchen: boolean) => {
    if (cart.length === 0) {
      setError('Önce sepete ürün ekle');
      return;
    }
    if (!cashier) {
      setError('Kasiyer oturumu yok');
      return;
    }
    setError(null);

    startTransition(async () => {
      const commonItems = cart.map((c) => ({
        productId: c.productId,
        productName: c.productName,
        variantId: c.variantId,
        variantName: c.variantName,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        note: c.note,
        isComplimentary: c.isComplimentary,
        complimentaryReason: c.complimentaryReason,
        printStation: c.printStation || undefined,
        options: c.options,
      }));

      if (mode.kind === 'addToOrder') {
        // Mevcut siparişe kalem ekle
        const r = await addItemsToOrder({
          orderId: mode.orderId,
          cashierId: cashier.id,
          items: commonItems,
          sendToKitchen,
        });
        if (!r.success) {
          setError(r.error || 'Kalem eklenemedi');
          return;
        }
        playSuccess();
        onSuccess({ online: true, orderId: mode.orderId });
        return;
      }

      // Yeni sipariş (masa veya hızlı satış)
      const tableId = mode.kind === 'table' ? mode.tableId : null;
      const r = await createManualOrder({
        tableId,
        cashierId: cashier.id,
        note: note || undefined,
        sendToKitchen,
        items: commonItems,
      });

      if (!r.success) {
        setError(r.error || 'Sipariş oluşturulamadı');
        return;
      }

      playSuccess();
      onSuccess({
        queued: r.queued,
        online: r.online,
        orderId: r.orderId,
      });
    });
  };

  if (!open) return null;

  const title =
    mode.kind === 'table'
      ? `Masa ${mode.tableName}`
      : mode.kind === 'addToOrder'
        ? mode.tableName
          ? `Masa ${mode.tableName}`
          : 'Siparişe ekle'
        : 'Hızlı Satış';
  const subtitle =
    mode.kind === 'table'
      ? 'Sipariş aç'
      : mode.kind === 'addToOrder'
        ? 'Mevcut siparişe kalem ekle'
        : 'Masasız satış';

  return (
    <div
      className="fixed inset-0 z-[90]"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
    >
      <div
        className="absolute inset-0 md:inset-4 lg:inset-8 rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-composer-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes aleg-composer-in {
            from { opacity: 0; transform: translateY(12px) scale(0.99); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* HEADER */}
        <div
          className="px-5 py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              {subtitle}
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(22px, 3vw, 28px)',
                fontWeight: 400,
                color: 'var(--ink)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all hover:bg-paper-2 disabled:opacity-50"
            style={{
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            ✕ KAPAT
          </button>
        </div>

        {/* CONTENT: 2 panel */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* SOL: Menü */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Arama */}
            <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ürün ara..."
                  className="w-full h-10 pl-10 pr-4 rounded-[10px] focus:outline-none focus:border-accent transition-colors"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontSize: 14,
                  }}
                />
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-3)', fontSize: 16 }}
                >
                  ⌕
                </span>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-paper-2 transition-colors"
                    style={{ color: 'var(--ink-3)' }}
                    aria-label="Aramayı temizle"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Sık Satılanlar — arama boşsa ve chip varsa */}
            {!search && topProducts.length > 0 && (
              <div
                className="px-5 py-3 flex-shrink-0"
                style={{
                  borderBottom: '1px solid var(--line)',
                  background: 'color-mix(in srgb, var(--gold) 4%, var(--card))',
                }}
              >
                <div
                  className="uppercase mb-2 flex items-center gap-1.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--gold)',
                  }}
                >
                  <span>★</span>
                  <span>SIK SATILANLAR</span>
                  <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>
                    · son 30 gün
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {topProducts.map((tp) => {
                    // menu'deki asıl product kaydını bul (varyant/option için gerekli)
                    const product = menu?.products.find((p) => p.id === tp.id);
                    const disabled = !product || product.status === 'soldout';
                    return (
                      <button
                        key={tp.id}
                        onClick={() => {
                          if (!product) return;
                          handleAddProduct(product);
                        }}
                        disabled={disabled}
                        className="group flex items-center gap-2 px-3 h-10 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                        style={{
                          background: 'var(--card)',
                          border: '1.5px solid color-mix(in srgb, var(--gold) 30%, var(--line))',
                          color: 'var(--ink)',
                        }}
                        title={disabled ? `${tp.name} menüde yok veya tükendi` : `${tp.name} (${tp.sold_count} adet satıldı)`}
                      >
                        {tp.hero_icon && (
                          <span style={{ fontSize: 14, lineHeight: 1 }}>{tp.hero_icon}</span>
                        )}
                        <span>{tp.name}</span>
                        <span
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--accent)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          ₺{tp.price.toFixed(0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kategori sekmesi (sadece arama boşsa) */}
            {!search && menu && menu.categories.length > 0 && (
              <div
                className="px-5 py-2 flex gap-2 overflow-x-auto flex-shrink-0"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                {/* TÜMÜ */}
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    'px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                    activeCategory === null ? 'scale-[1.04]' : 'hover:opacity-80'
                  )}
                  style={{
                    background:
                      activeCategory === null
                        ? 'color-mix(in srgb, var(--accent) 12%, var(--card))'
                        : 'var(--card)',
                    border: `1px solid ${
                      activeCategory === null ? 'var(--accent)' : 'var(--line)'
                    }`,
                    color:
                      activeCategory === null ? 'var(--accent)' : 'var(--ink-2)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  TÜMÜ · {menu.products.length}
                </button>
                {menu.categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={cn(
                      'px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                      activeCategory === c.id ? 'scale-[1.04]' : 'hover:opacity-80'
                    )}
                    style={{
                      background:
                        activeCategory === c.id
                          ? 'color-mix(in srgb, var(--accent) 12%, var(--card))'
                          : 'var(--card)',
                      border: `1px solid ${
                        activeCategory === c.id ? 'var(--accent)' : 'var(--line)'
                      }`,
                      color:
                        activeCategory === c.id ? 'var(--accent)' : 'var(--ink-2)',
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.hero_icon && <span className="mr-1">{c.hero_icon}</span>}
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Ürün grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="py-20 text-center" style={{ color: 'var(--ink-3)' }}>
                  <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18 }}>
                    Menü yükleniyor…
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>
                  <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18 }}>
                    {search ? 'Sonuç yok' : 'Bu kategoride ürün yok'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {filteredProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onClick={() => handleAddProduct(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SAĞ: Sepet */}
          <div
            className="w-full md:w-[360px] lg:w-[400px] flex flex-col flex-shrink-0 min-h-0"
            style={{
              background: 'var(--card)',
              borderLeft: '1px solid var(--line)',
            }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--accent)',
                }}
              >
                SEPET · {totalItems} KALEM
              </span>
              {cart.length > 0 && (
                <button
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: 'Sepeti temizle?',
                      body: `${totalItems} kalem silinecek.`,
                      tone: 'warn',
                      confirmLabel: 'Temizle',
                      cancelLabel: 'Vazgeç',
                    });
                    if (ok) setCart([]);
                  }}
                  className="text-xs transition-colors hover:text-danger"
                  style={{
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.06em',
                  }}
                >
                  TEMİZLE
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-10 text-center" style={{ color: 'var(--ink-3)' }}>
                  <div className="text-4xl mb-3 opacity-30">◌</div>
                  <div
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 16,
                    }}
                  >
                    Sepet boş
                  </div>
                  <div className="text-xs mt-1">Soldan ürün seç</div>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
                  {cart.map((item) => (
                    <CartRow
                      key={item.cartId}
                      item={item}
                      onIncrement={() => handleIncrement(item.cartId)}
                      onDecrement={() => handleDecrement(item.cartId)}
                      onRemove={() => handleRemove(item.cartId)}
                      onMakeComplimentary={() => setComplimentaryPicker(item.cartId)}
                      onUnmakeComplimentary={() => handleUnsetComplimentary(item.cartId)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Not + Totaller */}
            <div className="flex-shrink-0 px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--line)' }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Sipariş notu (ör: masa 5 doğum günü)"
                rows={2}
                className="w-full px-3 py-2 rounded-[8px] text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}
              />
              {complimentaryTotal > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--gold)' }}>★</span> İkram
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--gold)', fontWeight: 600 }}>
                    {fmt(complimentaryTotal)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--line)' }}>
                <span
                  className="uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-2)',
                  }}
                >
                  TOPLAM
                </span>
                <span
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 28,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {fmt(subtotal)}
                </span>
              </div>
            </div>

            {error && (
              <div
                className="mx-4 mb-2 p-2.5 rounded-[8px] text-sm flex items-start gap-2 flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
                  border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
                  color: 'var(--danger)',
                }}
              >
                <span>⚠</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Aksiyon butonları */}
            <div className="p-4 flex-shrink-0 flex flex-col gap-2" style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={() => handleSubmit(true)}
                disabled={cart.length === 0 || isPending}
                className="group w-full h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  boxShadow:
                    '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
                }}
              >
                <span>
                  {isPending
                    ? 'Kaydediliyor…'
                    : mode.kind === 'addToOrder'
                      ? `+ Siparişe Ekle · ${fmt(subtotal)}`
                      : `Mutfağa Yolla · ${fmt(subtotal)}`}
                </span>
                {!isPending && (
                  <span className="transition-transform group-hover:translate-x-1" style={{ fontSize: 16 }}>→</span>
                )}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={cart.length === 0 || isPending}
                className="w-full h-10 rounded-[10px] text-xs font-semibold transition-all hover:bg-paper-2 disabled:opacity-40"
                style={{
                  background: 'transparent',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {mode.kind === 'addToOrder' ? 'Kaydet, Henüz Mutfağa Gitmesin' : 'Kaydet, Mutfağa Gitme'}
              </button>
            </div>
          </div>
        </div>

        {/* Varyant Picker Modal */}
        {variantPicker && (
          <VariantPicker
            product={variantPicker}
            onPick={({ variantId, options }) =>
              addToCartDirect(variantPicker, variantId, options)
            }
            onClose={() => setVariantPicker(null)}
          />
        )}

        {/* İkram Picker Modal */}
        {complimentaryPicker && (
          <ComplimentaryPicker
            onPick={(reason) => handleSetComplimentary(complimentaryPicker, reason)}
            onClose={() => setComplimentaryPicker(null)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function ProductCard({ product, onClick }: { product: ProductForPos; onClick: () => void }) {
  const soldOut = product.status === 'soldout';

  return (
    <button
      onClick={onClick}
      disabled={soldOut}
      className={cn(
        'relative rounded-[var(--r)] p-3 text-left transition-all',
        soldOut ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'
      )}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 90,
      }}
    >
      {/* Hero alanı */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            background: product.hero_image_url
              ? 'transparent'
              : 'color-mix(in srgb, var(--accent) 10%, var(--paper-2))',
            fontSize: 20,
          }}
        >
          {product.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.hero_image_url}
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: soldOut ? 0.5 : 1 }}
            />
          ) : (
            <span style={{ color: 'var(--accent)' }}>{product.hero_icon || '●'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-[13px] line-clamp-2"
            style={{ color: 'var(--ink)', lineHeight: 1.25 }}
          >
            {product.name}
          </div>
          <div
            className="mt-1 flex items-center gap-1.5 flex-wrap"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-2)' }}
          >
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
              ₺{product.price.toFixed(0)}
            </span>
            {product.variants.length > 0 && (
              <span className="text-[9px] opacity-60" style={{ letterSpacing: '0.08em' }}>
                · SEÇENEKLİ
              </span>
            )}
          </div>
        </div>
      </div>

      {soldOut && (
        <span
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            background: 'var(--ink)',
            color: 'var(--paper)',
            letterSpacing: '0.14em',
          }}
        >
          TÜKENDİ
        </span>
      )}
    </button>
  );
}

function CartRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  onMakeComplimentary,
  onUnmakeComplimentary,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onMakeComplimentary: () => void;
  onUnmakeComplimentary: () => void;
}) {
  const lineTotal = item.unitPrice * item.quantity;

  return (
    <div
      className="px-4 py-3"
      style={{
        background: item.isComplimentary ? 'color-mix(in srgb, var(--gold) 5%, transparent)' : 'transparent',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
              {item.productName}
            </span>
            {item.isComplimentary && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                }}
                title={item.complimentaryReason}
              >
                ★ İKRAM
              </span>
            )}
          </div>
          {item.complimentaryReason && (
            <div className="text-[11px] italic mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {item.complimentaryReason}
            </div>
          )}
          {item.options && item.options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.options.map((o, idx) => (
                <span
                  key={idx}
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    background: 'var(--paper-2)',
                    color: 'var(--ink-2)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {o.preset_name}: <strong>{o.value_name}</strong>
                  {o.price_delta !== 0 && (
                    <span style={{ color: 'var(--accent)', marginLeft: 3 }}>
                      {o.price_delta > 0 ? '+' : ''}₺{o.price_delta.toFixed(0)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          <div
            className="mt-1.5"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)' }}
          >
            ₺{item.unitPrice.toFixed(2)} × {item.quantity} ={' '}
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
              ₺{lineTotal.toFixed(2)}
            </span>
            {item.isComplimentary && (
              <span style={{ textDecoration: 'line-through', marginLeft: 4 }}> (ödeme yok)</span>
            )}
          </div>
        </div>

        {/* Miktar kontrolleri */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          <button
            onClick={onDecrement}
            className="w-7 h-7 flex items-center justify-center hover:bg-paper-3 transition-colors"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Azalt"
          >
            −
          </button>
          <span
            className="min-w-[24px] text-center text-sm font-bold"
            style={{ color: 'var(--ink)' }}
          >
            {item.quantity}
          </span>
          <button
            onClick={onIncrement}
            className="w-7 h-7 flex items-center justify-center hover:bg-paper-3 transition-colors"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Arttır"
          >
            +
          </button>
        </div>
      </div>

      {/* Alt aksiyonlar */}
      <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}>
        {!item.isComplimentary ? (
          <button
            onClick={onMakeComplimentary}
            className="uppercase transition-colors"
            style={{ color: 'var(--gold)' }}
          >
            ★ İKRAM YAP
          </button>
        ) : (
          <button
            onClick={onUnmakeComplimentary}
            className="uppercase transition-colors"
            style={{ color: 'var(--ink-3)' }}
          >
            İKRAMI KALDIR
          </button>
        )}
        <button
          onClick={onRemove}
          className="uppercase transition-colors ml-auto"
          style={{ color: 'var(--ink-3)' }}
        >
          SİL
        </button>
      </div>
    </div>
  );
}

function VariantPicker({
  product,
  onPick,
  onClose,
}: {
  product: ProductForPos;
  // Tamamlanmış seçim: variantId + options[]
  onPick: (args: { variantId?: string; options: CartItem['options'] }) => void;
  onClose: () => void;
}) {
  // Seçili variant id (ürünün variants'ı varsa)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(() => {
    if (product.variants.length === 0) return null;
    return product.variants[0].id; // ilk variant default
  });

  // Her preset için seçili value_id'ler (single: tek string, multi: string[])
  const [selectedOptions, setSelectedOptions] = useState<Map<string, Set<string>>>(() => {
    const init = new Map<string, Set<string>>();
    product.option_presets.forEach((preset) => {
      const defaults = preset.values.filter((v) => v.is_default);
      const set = new Set<string>();
      if (preset.type === 'single') {
        // Single: varsa default, yoksa ilk zorunluda ilk değer
        if (defaults.length > 0) set.add(defaults[0].id);
        else if (preset.required && preset.values.length > 0) set.add(preset.values[0].id);
      } else {
        defaults.forEach((v) => set.add(v.id));
      }
      init.set(preset.preset_id, set);
    });
    return init;
  });

  // Tüm zorunlu preset'lerde seçim yapıldı mı?
  const allRequiredPicked = product.option_presets.every((p) => {
    if (!p.required) return true;
    const sel = selectedOptions.get(p.preset_id);
    return sel && sel.size > 0;
  });

  const variant = selectedVariant
    ? product.variants.find((v) => v.id === selectedVariant)
    : undefined;

  // Total delta
  const optionDelta = Array.from(selectedOptions.entries()).reduce((sum, [pid, valueIds]) => {
    const preset = product.option_presets.find((p) => p.preset_id === pid);
    if (!preset) return sum;
    return (
      sum +
      Array.from(valueIds).reduce((s, vid) => {
        const val = preset.values.find((v) => v.id === vid);
        return s + (val?.price_delta || 0);
      }, 0)
    );
  }, 0);

  const finalPrice = product.price + (variant?.price_delta || 0) + optionDelta;

  const handleOptionToggle = (presetId: string, valueId: string, type: 'single' | 'multi') => {
    setSelectedOptions((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(presetId) || []);
      if (type === 'single') {
        next.set(presetId, new Set([valueId]));
      } else {
        if (current.has(valueId)) current.delete(valueId);
        else current.add(valueId);
        next.set(presetId, current);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!allRequiredPicked) return;

    // Seçili option değerlerini options array'ine çevir
    const options: CartItem['options'] = [];
    selectedOptions.forEach((valueIds, presetId) => {
      const preset = product.option_presets.find((p) => p.preset_id === presetId);
      if (!preset) return;
      valueIds.forEach((vid) => {
        const val = preset.values.find((v) => v.id === vid);
        if (val) {
          options.push({
            preset_name: preset.preset_name,
            value_name: val.name,
            price_delta: val.price_delta,
          });
        }
      });
    });

    onPick({ variantId: selectedVariant || undefined, options });
  };

  return (
    <div
      className="absolute inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[480px] max-h-[85vh] rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Başlık */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--accent)',
            }}
          >
            SEÇENEKLER
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            {product.name}
          </div>
        </div>

        {/* Scroll alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Varyantlar */}
          {product.variants.length > 0 && (
            <div>
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--ink-2)',
                }}
              >
                BOY · ZORUNLU
              </div>
              <div className="space-y-1.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      className="w-full flex items-center justify-between p-3 rounded-[10px] transition-all text-left hover:scale-[1.01]"
                      style={{
                        background: isSelected
                          ? 'color-mix(in srgb, var(--accent) 10%, var(--paper-2))'
                          : 'var(--paper-2)',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block rounded-full flex-shrink-0"
                          style={{
                            width: 14,
                            height: 14,
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--line-2)'}`,
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            boxShadow: isSelected
                              ? 'inset 0 0 0 2.5px var(--card)'
                              : 'none',
                          }}
                        />
                        <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                          {v.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 13,
                          fontWeight: 600,
                          color: v.price_delta >= 0 ? 'var(--ink-2)' : 'var(--ok)',
                        }}
                      >
                        {v.price_delta === 0
                          ? ''
                          : `${v.price_delta > 0 ? '+' : ''}₺${v.price_delta.toFixed(0)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option preset'ler */}
          {product.option_presets.map((preset) => {
            const selected = selectedOptions.get(preset.preset_id) || new Set<string>();
            return (
              <div key={preset.preset_id}>
                <div
                  className="uppercase mb-2 flex items-center gap-2"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--ink-2)',
                  }}
                >
                  <span>{preset.preset_name}</span>
                  <span
                    className="text-[8px]"
                    style={{
                      color: preset.required ? 'var(--danger)' : 'var(--ink-3)',
                    }}
                  >
                    · {preset.required ? 'ZORUNLU' : 'İSTEĞE BAĞLI'}
                    {preset.type === 'multi' && ' · ÇOKLU'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {preset.values.map((v) => {
                    const isSelected = selected.has(v.id);
                    const isMulti = preset.type === 'multi';
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleOptionToggle(preset.preset_id, v.id, preset.type)}
                        className="w-full flex items-center justify-between p-3 rounded-[10px] transition-all text-left hover:scale-[1.01]"
                        style={{
                          background: isSelected
                            ? 'color-mix(in srgb, var(--accent) 10%, var(--paper-2))'
                            : 'var(--paper-2)',
                          border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {isMulti ? (
                            <span
                              className="inline-flex items-center justify-center rounded flex-shrink-0"
                              style={{
                                width: 16,
                                height: 16,
                                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--line-2)'}`,
                                background: isSelected ? 'var(--accent)' : 'transparent',
                                color: '#FAF5EA',
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                          ) : (
                            <span
                              className="inline-block rounded-full flex-shrink-0"
                              style={{
                                width: 14,
                                height: 14,
                                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--line-2)'}`,
                                background: isSelected ? 'var(--accent)' : 'transparent',
                                boxShadow: isSelected
                                  ? 'inset 0 0 0 2.5px var(--card)'
                                  : 'none',
                              }}
                            />
                          )}
                          <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                            {v.name}
                          </span>
                        </div>
                        {v.price_delta !== 0 && (
                          <span
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontSize: 13,
                              fontWeight: 600,
                              color: v.price_delta > 0 ? 'var(--ink-2)' : 'var(--ok)',
                            }}
                          >
                            {v.price_delta > 0 ? '+' : ''}₺{v.price_delta.toFixed(0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-[10px] text-sm font-semibold hover:opacity-70"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allRequiredPicked}
            className="group flex-1 h-11 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              boxShadow:
                '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
            }}
          >
            <span>
              {allRequiredPicked
                ? `Sepete Ekle · ₺${finalPrice.toFixed(2)}`
                : 'Zorunlu seçenekleri tamamla'}
            </span>
            {allRequiredPicked && (
              <span className="transition-transform group-hover:translate-x-1" style={{ fontSize: 16 }}>
                →
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComplimentaryPicker({
  onPick,
  onClose,
}: {
  onPick: (reason: string) => void;
  onClose: () => void;
}) {
  const presets = [
    'Müdavim',
    'Şikayet telafisi',
    'Doğum günü',
    'Yıl dönümü',
    'Yeni müşteri',
    'Bekleme özrü',
  ];
  const [custom, setCustom] = useState('');

  return (
    <div
      className="absolute inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-[var(--r)] overflow-hidden"
        style={{ background: 'var(--card)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--gold)',
            }}
          >
            ★ İKRAM SEBEBİ
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            Neden ikram?
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
            Raporlarda ikram maliyetini görebilmen için kaydedilir.
          </p>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {presets.map((r) => (
              <button
                key={r}
                onClick={() => onPick(r)}
                className="px-3 py-2.5 rounded-[10px] text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 6%, var(--paper-2))',
                  border: '1px solid color-mix(in srgb, var(--gold) 20%, var(--line))',
                  color: 'var(--ink)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Veya özel sebep yaz..."
              className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none focus:border-gold transition-colors"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
            {custom.trim() && (
              <button
                onClick={() => onPick(custom.trim())}
                className="w-full h-10 mt-2 rounded-[10px] text-sm font-semibold transition-all hover:opacity-95"
                style={{
                  background: 'var(--gold)',
                  color: 'var(--ink)',
                }}
              >
                ★ İkram yap: &quot;{custom.trim()}&quot;
              </button>
            )}
          </div>
        </div>
        <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-[10px] text-sm font-semibold hover:opacity-70"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(n);
}
