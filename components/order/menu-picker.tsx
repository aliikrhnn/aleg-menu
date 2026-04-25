'use client';

/**
 * MenuPicker — Embedded ürün seçim paneli
 *
 * HesapPanel'in sağ sütununda kullanılır.
 * Search + kategori chip + ürün grid + sepet + "Masaya Ekle" buton.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import {
  getPosMenu,
  createManualOrder,
  addItemsToOrder,
  type ProductForPos,
  type CategoryForPos,
} from '@/lib/actions/tables-status';

const fmt = (n: number) =>
  `₺${Math.round(n).toLocaleString('tr-TR')}`;

type CartItemOption = {
  preset_name: string;
  value_name: string;
  price_delta: number;
};

type CartItem = {
  key: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  note?: string;
  options?: CartItemOption[];
};

type Props = {
  tableId: string;
  /** Açık siparişe eklemek için. Yoksa yeni sipariş açılır. */
  targetOrderId?: string;
  cashierId: string;
  onAdded: () => void;
};

export function MenuPicker({
  tableId,
  targetOrderId,
  cashierId,
  onAdded,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryForPos[]>([]);
  const [products, setProducts] = useState<ProductForPos[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pickerProduct, setPickerProduct] = useState<ProductForPos | null>(null);

  useEffect(() => {
    let live = true;
    getPosMenu().then((r) => {
      if (!live) return;
      if (!r.success) {
        toast.error(r.error || 'Menü alınamadı');
      } else {
        setCategories(r.categories || []);
        setProducts(r.products || []);
        if (!activeCategoryId && r.categories && r.categories.length > 0) {
          setActiveCategoryId(r.categories[0].id);
        }
      }
      setLoading(false);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    } else if (activeCategoryId) {
      result = result.filter((p) => p.category_id === activeCategoryId);
    }
    return result;
  }, [products, search, activeCategoryId]);

  const cartTotal = cart.reduce(
    (s, it) => s + it.unitPrice * it.quantity,
    0
  );
  const cartItemCount = cart.reduce((s, it) => s + it.quantity, 0);

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
      const fullName = product.name + (variantName ? ` (${variantName})` : '');

      setCart((prev) => {
        const idx = prev.findIndex((it) => it.key === key);
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

  const handleProductClick = useCallback(
    (product: ProductForPos) => {
      const hasVariants = product.variants.length > 0;
      const hasOptions = product.option_presets.length > 0;
      if (hasVariants || hasOptions) {
        setPickerProduct(product);
        return;
      }
      addToCart({
        product,
        unitPrice: Number(product.price),
        options: [],
      });
    },
    [addToCart]
  );

  const removeCartItem = (key: string) => {
    setCart((prev) => prev.filter((it) => it.key !== key));
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) => {
      const updated = prev
        .map((it) =>
          it.key === key
            ? { ...it, quantity: Math.max(0, it.quantity + delta) }
            : it
        )
        .filter((it) => it.quantity > 0);
      return updated;
    });
  };

  const handleAddToTable = useCallback(async () => {
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

    if (targetOrderId) {
      const r = await addItemsToOrder({
        orderId: targetOrderId,
        cashierId,
        items,
        sendToKitchen: true,
      });
      success = r.success;
      errorMsg = r.error;
    } else {
      const r = await createManualOrder({
        tableId,
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
      toast.error(errorMsg || 'Eklenemedi');
      return;
    }
    toast.success(`${cartItemCount} ürün masaya eklendi`);
    setCart([]);
    onAdded();
  }, [cart, cartItemCount, targetOrderId, tableId, cashierId, onAdded]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink-3)',
          }}
        >
          Menü yükleniyor…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* SEARCH */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara…"
            className="w-full h-10 px-3 pr-9 rounded-[8px] text-sm"
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
              style={{ color: 'var(--ink-3)', fontSize: 14 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KATEGORİ DROPDOWN */}
      {!search && categories.length > 0 && (
        <CategoryDropdown
          categories={categories}
          activeCategoryId={activeCategoryId}
          onChange={setActiveCategoryId}
        />
      )}

      {/* ÜRÜN GRID */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {filteredProducts.length === 0 ? (
          <div
            className="py-8 text-center"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--ink-3)',
            }}
          >
            {search ? 'Eşleşen ürün yok' : 'Bu kategoride ürün yok'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => handleProductClick(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* SEPET (sticky bottom) */}
      {cart.length > 0 && (
        <div
          className="flex-shrink-0"
          style={{
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="max-h-[200px] overflow-y-auto px-3 py-2">
            {cart.map((it) => (
              <div
                key={it.key}
                className="flex items-start gap-2 py-1.5"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-ink truncate"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {it.productName}
                  </div>
                  {it.options && it.options.length > 0 && (
                    <div
                      className="truncate"
                      style={{ fontSize: 10, color: 'var(--ink-3)' }}
                    >
                      {it.options.map((o) => o.value_name).join(' · ')}
                    </div>
                  )}
                  {it.note && (
                    <div
                      className="truncate"
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{it.note}&rdquo;
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(it.key, -1)}
                    className="w-6 h-6 rounded text-xs"
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink-2)',
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      minWidth: 16,
                      textAlign: 'center',
                    }}
                  >
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(it.key, 1)}
                    className="w-6 h-6 rounded text-xs"
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink-2)',
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCartItem(it.key)}
                    className="ml-1 w-6 h-6 rounded text-xs"
                    style={{
                      background: 'transparent',
                      color: 'var(--ink-3)',
                    }}
                    aria-label="Kaldır"
                  >
                    ✕
                  </button>
                </div>
                <span
                  className="flex-shrink-0"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 50,
                    textAlign: 'right',
                  }}
                >
                  {fmt(it.unitPrice * it.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="px-3 py-2.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div>
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                {cartItemCount} ÜRÜN
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}
              >
                {fmt(cartTotal)}
              </div>
            </div>
            <button
              onClick={handleAddToTable}
              disabled={submitting}
              className="h-10 px-4 rounded-[8px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {submitting ? 'Ekleniyor…' : '+ Masaya Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT OPTIONS PICKER */}
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
  onClick,
}: {
  product: ProductForPos;
  onClick: () => void;
}) {
  const hasOptions =
    product.variants.length > 0 || product.option_presets.length > 0;
  const price = Number(product.price);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left p-2.5 rounded-[10px] transition-all active:scale-[0.97]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {hasOptions && (
        <span
          className="absolute"
          style={{
            top: 5,
            right: 5,
            fontFamily: 'var(--f-mono)',
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '1px 4px',
            borderRadius: 3,
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          }}
        >
          ◈
        </span>
      )}
      <div>
        {product.hero_icon && (
          <div className="mb-1" style={{ fontSize: 16, lineHeight: 1 }}>
            {product.hero_icon}
          </div>
        )}
        <div
          className="text-ink"
          style={{
            fontWeight: 600,
            fontSize: 12,
            lineHeight: 1.25,
          }}
        >
          {product.name}
        </div>
      </div>
      <div
        className="mt-1.5 text-ink"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {fmt(price)}
      </div>
    </button>
  );
}

// ============================================================
// PRODUCT OPTIONS PICKER (mini)
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
  const sortedPresets = useMemo(
    () =>
      [...product.option_presets].sort((a, b) => a.sort_order - b.sort_order),
    [product.option_presets]
  );

  const [variantId, setVariantId] = useState<string | undefined>(
    product.variants[0]?.id
  );
  const [selectedOpts, setSelectedOpts] = useState<Record<string, string[]>>(
    () => {
      const init: Record<string, string[]> = {};
      sortedPresets.forEach((preset) => {
        const defaults = preset.values
          .filter((v) => v.is_default)
          .map((v) => v.id);
        if (defaults.length > 0) {
          init[preset.preset_id] =
            preset.type === 'single' ? [defaults[0]] : defaults;
        } else if (preset.required && preset.type === 'single' && preset.values.length > 0) {
          init[preset.preset_id] = [preset.values[0].id];
        } else {
          init[preset.preset_id] = [];
        }
      });
      return init;
    }
  );
  const [note, setNote] = useState('');

  const isValid = useMemo(() => {
    return sortedPresets.every((p) => {
      if (!p.required) return true;
      return (selectedOpts[p.preset_id] || []).length > 0;
    });
  }, [sortedPresets, selectedOpts]);

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
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
      style={{ background: 'color-mix(in srgb, var(--ink) 50%, transparent)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-[16px] sm:rounded-[16px] overflow-hidden"
        style={{ background: 'var(--paper)' }}
      >
        <div
          className="px-4 py-3 flex items-start gap-3"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex-1">
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink)',
              }}
            >
              {product.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {product.variants.length > 0 && (
            <div className="mb-3">
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-2)',
                }}
              >
                BOYUT
              </div>
              <div className="grid gap-1.5">
                {product.variants.map((v) => {
                  const isSel = variantId === v.id;
                  const delta = Number(v.price_delta);
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id)}
                      className="w-full p-2.5 rounded-[8px] flex items-center gap-2 text-left"
                      style={{
                        background: isSel
                          ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                          : 'var(--card)',
                        border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                      }}
                    >
                      <RadioDot active={isSel} />
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
                        {v.name}
                      </span>
                      {delta !== 0 && (
                        <span
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--ink-2)',
                          }}
                        >
                          {delta > 0 ? '+' : ''}₺{delta}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sortedPresets.map((preset) => {
            const sel = selectedOpts[preset.preset_id] || [];
            return (
              <div key={preset.preset_id} className="mb-3">
                <div
                  className="uppercase mb-2 flex items-baseline gap-2"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-2)',
                  }}
                >
                  <span>{preset.preset_name}</span>
                  {preset.required && (
                    <span style={{ color: 'var(--accent)' }}>* ZORUNLU</span>
                  )}
                </div>
                <div className="grid gap-1.5">
                  {preset.values.map((v) => {
                    const isSel = sel.includes(v.id);
                    const delta = Number(v.price_delta);
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          if (preset.type === 'single') {
                            setSelectedOpts((prev) => ({
                              ...prev,
                              [preset.preset_id]: [v.id],
                            }));
                          } else {
                            setSelectedOpts((prev) => {
                              const cur = prev[preset.preset_id] || [];
                              if (cur.includes(v.id)) {
                                return {
                                  ...prev,
                                  [preset.preset_id]: cur.filter((id) => id !== v.id),
                                };
                              }
                              return {
                                ...prev,
                                [preset.preset_id]: [...cur, v.id],
                              };
                            });
                          }
                        }}
                        className="w-full p-2.5 rounded-[8px] flex items-center gap-2 text-left"
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
                          <CheckMark active={isSel} />
                        )}
                        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
                          {v.name}
                        </span>
                        {delta !== 0 && (
                          <span
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--ink-2)',
                            }}
                          >
                            {delta > 0 ? '+' : ''}₺{delta}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mb-2">
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-2)',
              }}
            >
              NOT
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="örn: az şekerli"
              className="w-full h-9 px-2.5 rounded-[8px] text-sm"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}
        >
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 18,
              fontWeight: 700,
              flex: 1,
            }}
          >
            ₺{totalPrice.toLocaleString('tr-TR')}
          </div>
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="h-10 px-4 rounded-[8px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
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

function RadioDot({ active }: { active: boolean }) {
  return (
    <div
      className="grid place-items-center flex-shrink-0"
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        background: active ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      {active && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: '#FAF5EA',
          }}
        />
      )}
    </div>
  );
}

function CheckMark({ active }: { active: boolean }) {
  return (
    <div
      className="grid place-items-center flex-shrink-0"
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        background: active ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      {active && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </div>
  );
}

// ============================================================
// CATEGORY DROPDOWN — Kompakt + tüm kategorileri popover ile gösterir
// ============================================================
function CategoryDropdown({
  categories,
  activeCategoryId,
  onChange,
}: {
  categories: CategoryForPos[];
  activeCategoryId: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = categories.find((c) => c.id === activeCategoryId);

  // Açıldığında dış tıklamada kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-cat-dropdown]')) setOpen(false);
    };
    setTimeout(() => window.addEventListener('click', handler), 50);
    return () => window.removeEventListener('click', handler);
  }, [open]);

  return (
    <div
      data-cat-dropdown
      className="relative px-3 py-2 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-3 rounded-[8px] flex items-center justify-between gap-2 transition-all active:scale-[0.98]"
        style={{
          background: open ? 'var(--paper-2)' : 'var(--paper)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--line)'}`,
          color: 'var(--ink)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {active?.hero_icon && (
            <span style={{ fontSize: 14 }}>{active.hero_icon}</span>
          )}
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 12,
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {active?.name || 'Kategori seç'}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 150ms',
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 mt-1 rounded-[10px] overflow-hidden z-10"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            boxShadow: '0 8px 24px -6px rgba(42,31,24,0.18)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {categories.map((c) => {
            const isActive = activeCategoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className="w-full h-10 px-3 flex items-center gap-2 text-left transition-colors"
                style={{
                  background: isActive
                    ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                    : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--ink)',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {c.hero_icon && (
                  <span style={{ fontSize: 14 }}>{c.hero_icon}</span>
                )}
                <span
                  className="flex-1 truncate"
                  style={{
                    fontFamily: 'var(--f-sans)',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {c.name}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'var(--accent)',
                    }}
                  >
                    ●
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
