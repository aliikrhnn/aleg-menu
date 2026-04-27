'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { toast } from '@/components/ui/toast';
import {
  getPosMenu,
  createManualOrder,
  addItemsToOrder,
  type ProductForPos,
  type CategoryForPos,
  type TableWithStatus,
} from '@/lib/actions/tables-status';

type CartItemOption = {
  preset_name: string;
  value_name: string;
  price_delta: number;
};

type CartItem = {
  key: string; // unique (productId + variantId + opts hash)
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number; // tüm opt delta'lar dahil
  quantity: number;
  note?: string;
  options?: CartItemOption[];
};

type Props = {
  table: TableWithStatus;
  cashierId: string;
  onClose: () => void;
  onSuccess: () => void;
  /**
   * Mod:
   * - 'new' (default) → yeni sipariş açar (createManualOrder)
   * - 'addToOrder' → mevcut açık siparişe ekler (addItemsToOrder)
   */
  mode?: 'new' | 'addToOrder';
  /**
   * 'addToOrder' modunda hangi sipariş ID'sine eklenecek
   */
  targetOrderId?: string;
  /**
   * Header alt başlığı için (örn "MASAYA EKLE")
   */
  subtitle?: string;
};

export function OrderTakingModal({
  table,
  cashierId,
  onClose,
  onSuccess,
  mode = 'new',
  targetOrderId,
  subtitle,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryForPos[]>([]);
  const [products, setProducts] = useState<ProductForPos[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [noteEditingKey, setNoteEditingKey] = useState<string | null>(null);

  // ESC ile kapama (submit sırasında değil)
  useEscapeKey(onClose, !submitting);

  // Menü yükle
  useEffect(() => {
    let canceled = false;
    (async () => {
      const r = await getPosMenu();
      if (canceled) return;
      if (r.success) {
        setCategories(r.categories || []);
        setProducts(r.products || []);
        if ((r.categories || []).length > 0) {
          setActiveCategoryId(r.categories![0].id);
        }
      } else {
        toast.error(r.error || 'Menü yüklenemedi');
      }
      setLoading(false);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  // Filtrelenmiş ürünler
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.status === 'active');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    } else if (activeCategoryId) {
      result = result.filter((p) => p.category_id === activeCategoryId);
    }
    return result;
  }, [products, search, activeCategoryId]);

  const total = useMemo(
    () => cart.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(
    () => cart.reduce((sum, it) => sum + it.quantity, 0),
    [cart]
  );

  // Ürün seçim modal (varyant/option olan ürünler için)
  const [pickerProduct, setPickerProduct] = useState<ProductForPos | null>(null);

  // Cart'a ekleme helper - hash'le aynı item'ı birleştirir
  const addToCart = useCallback(
    (params: {
      product: ProductForPos;
      variantId?: string;
      variantName?: string;
      unitPrice: number;
      options: CartItemOption[];
      note?: string;
    }) => {
      const { product, variantId, variantName, unitPrice, options, note } = params;
      const optsKey = options
        .map((o) => `${o.preset_name}:${o.value_name}`)
        .sort()
        .join('|');
      const key = `${product.id}__${variantId || 'none'}__${optsKey}__${note || ''}`;

      const fullName =
        product.name + (variantName ? ` (${variantName})` : '');

      setCart((prev) => {
        const idx = prev.findIndex((it) => it.key === key);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            quantity: updated[idx].quantity + 1,
          };
          return updated;
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            productName: fullName,
            variantId,
            variantName,
            unitPrice,
            quantity: 1,
            options: options.length > 0 ? options : undefined,
            note,
          },
        ];
      });
    },
    []
  );

  // Ürüne tıklayınca - varyant/option varsa modal aç
  const addProduct = useCallback(
    (product: ProductForPos) => {
      const hasVariants = product.variants.length > 0;
      const hasOptions = product.option_presets.length > 0;
      if (hasVariants || hasOptions) {
        setPickerProduct(product);
        return;
      }
      // Düz ürün - direkt ekle
      addToCart({
        product,
        unitPrice: Number(product.price),
        options: [],
      });
    },
    [addToCart]
  );

  const updateQuantity = useCallback((key: string, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      if (idx < 0) return prev;
      const newQty = prev[idx].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((it) => it.key !== key));
  }, []);

  const updateNote = useCallback((key: string, note: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      if (idx < 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], note: note.trim() || undefined };
      // Notu olunca yeni satır olur (key uniquencess için)
      if (note.trim()) {
        updated[idx] = {
          ...updated[idx],
          key: `${updated[idx].key}__${Date.now()}`,
        };
      }
      return updated;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Sepet boş');
      return;
    }
    setSubmitting(true);

    const items = cart.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      variantId: it.variantId,
      variantName: it.variantName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      note: it.note,
      options: it.options,
    }));

    let success = false;
    let errorMsg: string | undefined;

    if (mode === 'addToOrder' && targetOrderId) {
      // Mevcut siparişe ekle
      const r = await addItemsToOrder({
        orderId: targetOrderId,
        cashierId,
        items,
        sendToKitchen: true,
      });
      success = r.success;
      errorMsg = r.error;
    } else {
      // Yeni sipariş aç
      const r = await createManualOrder({
        tableId: table.id,
        orderType: 'dine_in',
        cashierId,
        items,
        sendToKitchen: true,
      });
      success = r.success;
      errorMsg = r.error;
    }

    setSubmitting(false);
    if (!success) {
      toast.error(errorMsg || 'Sipariş gönderilemedi');
      return;
    }
    toast.success(
      mode === 'addToOrder'
        ? `${table.name} · masaya eklendi`
        : `${table.name} · sipariş gönderildi`
    );
    onSuccess();
    onClose();
  }, [cart, table, cashierId, onClose, onSuccess, mode, targetOrderId]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'var(--paper)' }}
    >
      {/* HEADER */}
      <header
        className="px-4 py-3 flex items-center gap-3 border-b flex-shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderColor: 'var(--line)',
        }}
      >
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink-2)',
            fontSize: 18,
          }}
          aria-label="Kapat"
        >
          ✕
        </button>
        <div className="flex-1 min-w-0">
          <div
            className="uppercase mb-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--ink-3)',
            }}
          >
            {subtitle ||
              (mode === 'addToOrder' ? 'MASAYA EKLE' : 'YENİ SİPARİŞ')}
          </div>
          <div
            className="text-ink truncate"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {table.name}
          </div>
        </div>
      </header>

      {/* SEARCH */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürün ara..."
          className="w-full h-10 px-3 rounded-[10px] text-sm"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
      </div>

      {/* CATEGORY CHIPS */}
      {!search && categories.length > 0 && (
        <div
          className="px-3 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className="flex-shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: isActive ? 'var(--accent)' : 'var(--card)',
                  color: isActive ? '#FAF5EA' : 'var(--ink-2)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--line)'}`,
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {cat.hero_icon ? <span className="mr-1">{cat.hero_icon}</span> : null}
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* PRODUCT GRID */}
      <main className="flex-1 px-3 pb-3 overflow-y-auto">
        {loading ? (
          <div
            className="py-16 text-center"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              color: 'var(--ink-3)',
            }}
          >
            Menü yükleniyor...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className="py-16 text-center"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              color: 'var(--ink-3)',
            }}
          >
            {search ? 'Sonuç yok' : 'Bu kategoride ürün yok'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => addProduct(product)}
              />
            ))}
          </div>
        )}
      </main>

      {/* CART (sticky bottom sheet) */}
      {cart.length > 0 && (
        <div
          className="border-t flex-shrink-0"
          style={{
            background: 'var(--paper-2)',
            borderColor: 'var(--line)',
            maxHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* CART HEADER */}
          <div
            className="px-4 py-2.5 flex items-center justify-between border-b flex-shrink-0"
            style={{ borderColor: 'var(--line)' }}
          >
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-2)',
              }}
            >
              SEPET · {itemCount} ürün
            </div>
            <button
              onClick={() => setCart([])}
              className="text-xs"
              style={{
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              TEMİZLE
            </button>
          </div>

          {/* CART ITEMS */}
          <div className="flex-1 overflow-y-auto">
            {cart.map((item) => (
              <CartItemRow
                key={item.key}
                item={item}
                editing={noteEditingKey === item.key}
                onEditNote={() =>
                  setNoteEditingKey(noteEditingKey === item.key ? null : item.key)
                }
                onUpdateNote={(note) => {
                  updateNote(item.key, note);
                  setNoteEditingKey(null);
                }}
                onIncrease={() => updateQuantity(item.key, +1)}
                onDecrease={() => updateQuantity(item.key, -1)}
                onRemove={() => removeItem(item.key)}
              />
            ))}
          </div>

          {/* CART FOOTER */}
          <div
            className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0"
            style={{ borderColor: 'var(--line)' }}
          >
            <div className="flex-1">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--ink-3)',
                }}
              >
                TOPLAM
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                ₺{total.toLocaleString('tr-TR')}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-12 px-5 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {submitting ? 'Gönderiliyor...' : '✓ Mutfağa Gönder'}
            </button>
          </div>
        </div>
      )}

      {/* VARYANT/OPTION SEÇİM MODAL */}
      {pickerProduct && (
        <ProductOptionsPicker
          product={pickerProduct}
          onClose={() => setPickerProduct(null)}
          onAdd={(payload) => {
            addToCart({ product: pickerProduct, ...payload });
            setPickerProduct(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// PRODUCT CARD
// ============================================================
function ProductCard({
  product,
  onAdd,
}: {
  product: ProductForPos;
  onAdd: () => void;
}) {
  const variant = product.variants[0];
  const price = Number(product.price) + Number(variant?.price_delta || 0);
  const hasOptions =
    product.variants.length > 0 || product.option_presets.length > 0;

  return (
    <button
      type="button"
      onClick={onAdd}
      className="relative text-left p-3 rounded-[12px] transition-all active:scale-[0.97]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Varyant/option indicator - sağ üst */}
      {hasOptions && (
        <span
          className="absolute"
          style={{
            top: 8,
            right: 8,
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '2px 5px',
            borderRadius: 4,
            background:
              'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
            border:
              '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          }}
        >
          ◈ SEÇENEK
        </span>
      )}
      <div>
        {product.hero_icon && (
          <div className="mb-1.5" style={{ fontSize: 22, lineHeight: 1 }}>
            {product.hero_icon}
          </div>
        )}
        <div
          className="text-ink"
          style={{
            fontWeight: 600,
            fontSize: 13,
            lineHeight: 1.25,
          }}
        >
          {product.name}
        </div>
        {product.description && (
          <div
            className="text-ink-3 mt-0.5"
            style={{
              fontSize: 11,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </div>
        )}
      </div>
      <div
        className="mt-2 text-ink"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        ₺{price.toLocaleString('tr-TR')}
      </div>
    </button>
  );
}

// ============================================================
// CART ITEM ROW
// ============================================================
function CartItemRow({
  item,
  editing,
  onEditNote,
  onUpdateNote,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  editing: boolean;
  onEditNote: () => void;
  onUpdateNote: (note: string) => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const [draftNote, setDraftNote] = useState(item.note || '');

  return (
    <div
      className="px-4 py-2.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div
            className="text-ink"
            style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}
          >
            {item.productName}
          </div>
          <div
            className="mt-0.5 text-ink-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
            }}
          >
            ₺{item.unitPrice.toLocaleString('tr-TR')} / adet
          </div>

          {/* Seçilen options chip'leri */}
          {item.options && item.options.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.options.map((opt, i) => (
                <span
                  key={i}
                  className="inline-flex items-center"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background:
                      'color-mix(in srgb, var(--accent) 10%, transparent)',
                    color: 'var(--accent)',
                    border:
                      '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                  }}
                >
                  {opt.value_name}
                  {opt.price_delta !== 0 && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontFamily: 'var(--f-mono)',
                        opacity: 0.7,
                      }}
                    >
                      {opt.price_delta > 0 ? '+' : ''}₺{opt.price_delta}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {item.note && !editing && (
            <button
              onClick={onEditNote}
              className="mt-1 text-left"
              style={{
                color: 'var(--ink-2)',
                fontSize: 12,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{item.note}&rdquo; ·{' '}
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}>
                DÜZENLE
              </span>
            </button>
          )}
          {!item.note && !editing && (
            <button
              onClick={onEditNote}
              className="mt-1"
              style={{
                color: 'var(--ink-3)',
                fontSize: 11,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              + NOT EKLE
            </button>
          )}
          {editing && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Müşteri notu..."
                autoFocus
                className="flex-1 h-8 px-2 rounded-[6px] text-xs"
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => onUpdateNote(draftNote)}
                className="h-8 px-2.5 rounded-[6px] text-xs font-semibold"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                }}
              >
                ✓
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onDecrease}
            className="w-7 h-7 rounded-full grid place-items-center transition-all active:scale-90"
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontSize: 14,
              fontWeight: 700,
            }}
            aria-label="Azalt"
          >
            −
          </button>
          <span
            className="text-ink"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 14,
              fontWeight: 700,
              minWidth: 24,
              textAlign: 'center',
            }}
          >
            {item.quantity}
          </span>
          <button
            onClick={onIncrease}
            className="w-7 h-7 rounded-full grid place-items-center transition-all active:scale-90"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontSize: 14,
              fontWeight: 700,
            }}
            aria-label="Arttır"
          >
            +
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-full grid place-items-center transition-all active:scale-90 ml-1"
            style={{
              background: 'transparent',
              color: 'var(--danger)',
              fontSize: 14,
            }}
            aria-label="Kaldır"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className="mt-1.5 text-right text-ink"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        ₺{(item.unitPrice * item.quantity).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT OPTIONS PICKER
// Varyant + option preset seçimi - bottom sheet modal
// ============================================================
function ProductOptionsPicker({
  product,
  onClose,
  onAdd,
}: {
  product: ProductForPos;
  onClose: () => void;
  onAdd: (payload: {
    variantId?: string;
    variantName?: string;
    unitPrice: number;
    options: CartItemOption[];
    note?: string;
  }) => void;
}) {
  // Sıralı preset'ler
  const sortedPresets = useMemo(
    () =>
      [...product.option_presets].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    [product.option_presets]
  );

  // Default varyant seçimi
  const [variantId, setVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );

  // Default seçimleri kur
  const [selectedOpts, setSelectedOpts] = useState<
    Record<string, string[]>
  >(() => {
    const init: Record<string, string[]> = {};
    sortedPresets.forEach((preset) => {
      const defaults = preset.values.filter((v) => v.is_default).map((v) => v.id);
      if (defaults.length > 0) {
        init[preset.preset_id] =
          preset.type === 'single' ? [defaults[0]] : defaults;
      } else if (preset.required && preset.values.length > 0) {
        // Required ama default yoksa ilkini seç (sadece single için)
        if (preset.type === 'single') {
          init[preset.preset_id] = [preset.values[0].id];
        } else {
          init[preset.preset_id] = [];
        }
      } else {
        init[preset.preset_id] = [];
      }
    });
    return init;
  });

  const [note, setNote] = useState('');

  // Validation - tüm required alanlar dolu mu
  const isValid = useMemo(() => {
    return sortedPresets.every((p) => {
      if (!p.required) return true;
      return (selectedOpts[p.preset_id] || []).length > 0;
    });
  }, [sortedPresets, selectedOpts]);

  // Toplam fiyat
  const variant = product.variants.find((v) => v.id === variantId);
  const variantDelta = Number(variant?.price_delta || 0);

  const optionsTotal = useMemo(() => {
    let sum = 0;
    sortedPresets.forEach((p) => {
      const sel = selectedOpts[p.preset_id] || [];
      sel.forEach((vid) => {
        const v = p.values.find((x) => x.id === vid);
        if (v) sum += Number(v.price_delta);
      });
    });
    return sum;
  }, [sortedPresets, selectedOpts]);

  const totalPrice = Number(product.price) + variantDelta + optionsTotal;

  const toggleSingle = (presetId: string, valueId: string) => {
    setSelectedOpts((prev) => ({ ...prev, [presetId]: [valueId] }));
  };

  const toggleMulti = (presetId: string, valueId: string) => {
    setSelectedOpts((prev) => {
      const cur = prev[presetId] || [];
      if (cur.includes(valueId)) {
        return { ...prev, [presetId]: cur.filter((id) => id !== valueId) };
      }
      return { ...prev, [presetId]: [...cur, valueId] };
    });
  };

  const handleAdd = () => {
    const options: CartItemOption[] = [];
    sortedPresets.forEach((p) => {
      (selectedOpts[p.preset_id] || []).forEach((vid) => {
        const v = p.values.find((x) => x.id === vid);
        if (v) {
          options.push({
            preset_name: p.preset_name,
            value_name: v.name,
            price_delta: Number(v.price_delta),
          });
        }
      });
    });
    onAdd({
      variantId,
      variantName: variant?.name,
      unitPrice: totalPrice,
      options,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center"
      style={{
        background: 'color-mix(in srgb, var(--ink) 50%, transparent)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-[20px] sm:rounded-[20px] overflow-hidden"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 -8px 32px rgba(42,31,24,0.18)',
          animation: 'callItemIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* HEADER */}
        <div
          className="px-4 py-3 flex items-start gap-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              SEÇENEKLER
            </div>
            <div
              className="text-ink"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {product.name}
            </div>
            {product.description && (
              <div
                className="mt-1 text-ink-3"
                style={{ fontSize: 12, lineHeight: 1.4 }}
              >
                {product.description}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontSize: 16,
            }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* VARYANTLAR */}
          {product.variants.length > 0 && (
            <PickerSection
              title="Boyut / Varyant"
              required
            >
              <div className="grid grid-cols-1 gap-1.5">
                {product.variants.map((v) => {
                  const isSel = variantId === v.id;
                  const delta = Number(v.price_delta);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      className="w-full p-3 rounded-[10px] flex items-center gap-3 text-left transition-all active:scale-[0.98]"
                      style={{
                        background: isSel
                          ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                          : 'var(--card)',
                        border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                      }}
                    >
                      <RadioDot active={isSel} />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-ink"
                          style={{ fontWeight: 600, fontSize: 14 }}
                        >
                          {v.name}
                        </div>
                      </div>
                      {delta !== 0 && (
                        <div
                          className="text-ink-2 flex-shrink-0"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {delta > 0 ? '+' : ''}₺{delta}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </PickerSection>
          )}

          {/* OPTION PRESETS */}
          {sortedPresets.map((preset) => {
            const sel = selectedOpts[preset.preset_id] || [];
            return (
              <PickerSection
                key={preset.preset_id}
                title={preset.preset_name}
                required={preset.required}
                subtitle={
                  preset.type === 'multi'
                    ? 'Birden fazla seçilebilir'
                    : undefined
                }
              >
                <div className="grid grid-cols-1 gap-1.5">
                  {preset.values.map((v) => {
                    const isSel = sel.includes(v.id);
                    const delta = Number(v.price_delta);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() =>
                          preset.type === 'single'
                            ? toggleSingle(preset.preset_id, v.id)
                            : toggleMulti(preset.preset_id, v.id)
                        }
                        className="w-full p-3 rounded-[10px] flex items-center gap-3 text-left transition-all active:scale-[0.98]"
                        style={{
                          background: isSel
                            ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                            : 'var(--card)',
                          border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                        }}
                      >
                        {preset.type === 'single' ? (
                          <RadioDot active={isSel} />
                        ) : (
                          <CheckBox active={isSel} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-ink"
                            style={{ fontWeight: 600, fontSize: 14 }}
                          >
                            {v.name}
                          </div>
                        </div>
                        {delta !== 0 && (
                          <div
                            className="text-ink-2 flex-shrink-0"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {delta > 0 ? '+' : ''}₺{delta}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </PickerSection>
            );
          })}

          {/* NOT */}
          <PickerSection title="Müşteri Notu">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="örn: az şekerli, soğansız..."
              className="w-full h-11 px-3 rounded-[10px] text-sm"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </PickerSection>
        </div>

        {/* FOOTER */}
        <div
          className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0"
          style={{
            background: 'var(--paper-2)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex-1">
            <div
              className="uppercase mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
              }}
            >
              TOPLAM
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              ₺{totalPrice.toLocaleString('tr-TR')}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="h-12 px-5 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            + Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function PickerSection({
  title,
  required,
  subtitle,
  children,
}: {
  title: string;
  required?: boolean;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline gap-2">
        <span
          className="text-ink uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          {title}
        </span>
        {required && (
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.1em',
            }}
          >
            * ZORUNLU
          </span>
        )}
        {subtitle && (
          <span
            className="text-ink-3"
            style={{ fontSize: 11 }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <div
      className="grid place-items-center flex-shrink-0"
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        background: active ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      {active && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: '#FAF5EA',
          }}
        />
      )}
    </div>
  );
}

function CheckBox({ active }: { active: boolean }) {
  return (
    <div
      className="grid place-items-center flex-shrink-0"
      style={{
        width: 20,
        height: 20,
        borderRadius: 5,
        background: active ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      {active && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FAF5EA"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </div>
  );
}
