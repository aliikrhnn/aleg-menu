'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import {
  getPosMenu,
  createManualOrder,
  type ProductForPos,
  type CategoryForPos,
  type TableWithStatus,
} from '@/lib/actions/tables-status';

type CartItem = {
  key: string; // unique key (productId + variantId + opts)
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  note?: string;
};

type Props = {
  table: TableWithStatus;
  cashierId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function OrderTakingModal({
  table,
  cashierId,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryForPos[]>([]);
  const [products, setProducts] = useState<ProductForPos[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [noteEditingKey, setNoteEditingKey] = useState<string | null>(null);

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

  // Ürün ekle (basit - sepete ekler veya adet artırır)
  const addProduct = useCallback((product: ProductForPos) => {
    // Varyant varsa ilkini default seç (basit garson akışı)
    const variant = product.variants[0];
    const unitPrice =
      Number(product.price) + Number(variant?.price_delta || 0);
    const variantId = variant?.id;
    const variantName = variant?.name;
    const key = `${product.id}__${variantId || 'none'}`;

    setCart((prev) => {
      const idx = prev.findIndex((it) => it.key === key && !it.note);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          productName: product.name + (variantName ? ` (${variantName})` : ''),
          variantId,
          variantName,
          unitPrice,
          quantity: 1,
        },
      ];
    });
  }, []);

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
    const r = await createManualOrder({
      tableId: table.id,
      orderType: 'dine_in',
      cashierId,
      items: cart.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        variantId: it.variantId,
        variantName: it.variantName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        note: it.note,
      })),
      sendToKitchen: true, // direkt mutfağa
    });
    setSubmitting(false);
    if (!r.success) {
      toast.error(r.error || 'Sipariş gönderilemedi');
      return;
    }
    toast.success(`${table.name} · sipariş gönderildi`);
    onSuccess();
    onClose();
  }, [cart, table, cashierId, onClose, onSuccess]);

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
            YENİ SİPARİŞ
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

  return (
    <button
      type="button"
      onClick={onAdd}
      className="text-left p-3 rounded-[12px] transition-all active:scale-[0.97]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
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
