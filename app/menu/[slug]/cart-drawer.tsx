'use client';

import { useState } from 'react';
import { submitOrder } from '@/lib/actions/orders';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';

type Lang = 'tr' | 'en';

export type CartDrawerSelection = {
  preset_id: string;
  preset_name: string;
  value_id: string;
  value_name: string;
  price_delta: number;
};

export type CartDrawerItem = {
  key: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  hero_image_url?: string | null;
  hero_icon?: string | null;
  selections?: CartDrawerSelection[];
};

type Mode = 'dinein' | 'pickup' | 'delivery';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  mode: Mode;
  items: CartDrawerItem[];
  total: number;
  businessId: string;
  tableId?: string | null;
  tableName?: string | null;
  onQtyChange: (cartItemKey: string, newQty: number) => void;
  onClearCart: () => void;
}

function money(n: number, lang: Lang) {
  return lang === 'tr' ? `₺${n.toFixed(0)}` : `${n.toFixed(0)}₺`;
}

const T = {
  title: { tr: 'Siparişin', en: 'Your order' },
  empty: { tr: 'Sepetin boş', en: 'Cart is empty' },
  note: { tr: 'Not (opsiyonel)', en: 'Note (optional)' },
  notePlaceholder: {
    tr: 'Özel istek? (ör: az şekerli)',
    en: 'Special request?',
  },
  name: { tr: 'Adın (opsiyonel)', en: 'Your name (optional)' },
  namePlaceholder: { tr: 'Örn: Ali', en: 'e.g. Ali' },
  phone: { tr: 'Telefon (opsiyonel)', en: 'Phone (optional)' },
  phonePlaceholder: { tr: '0555 555 55 55', en: '+90 555...' },
  subtotal: { tr: 'Ara toplam', en: 'Subtotal' },
  total: { tr: 'Toplam', en: 'Total' },
  submit: { tr: 'Siparişi Gönder', en: 'Send order' },
  submitting: { tr: 'Gönderiliyor...', en: 'Sending...' },
  success: { tr: 'Siparişin mutfağa düştü', en: 'Your order is in the kitchen' },
  successHint: {
    tr: 'Kısa süre içinde hazırlanmaya başlayacak.',
    en: 'It will start being prepared shortly.',
  },
  orderCode: { tr: 'Sipariş Kodu', en: 'Order code' },
  newOrder: { tr: 'Yeni sipariş ver', en: 'New order' },
  clear: { tr: 'Sepeti boşalt', en: 'Clear cart' },
};

export function CartDrawer({
  open,
  onClose,
  lang,
  mode,
  items,
  total,
  businessId,
  tableId,
  tableName,
  onQtyChange,
  onClearCart,
}: CartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Başarı ekranı
  const [successOrderNo, setSuccessOrderNo] = useState<string | null>(null);

  // ESC ile kapama (submit veya başarı ekranı sırasında değil)
  useEscapeKey(onClose, open && !submitting && !successOrderNo);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    const orderType: 'dine_in' | 'pickup' | 'delivery' =
      mode === 'dinein' ? 'dine_in' : mode === 'pickup' ? 'pickup' : 'delivery';

    const result = await submitOrder({
      business_id: businessId,
      order_type: orderType,
      table_id: tableId || null,
      customer_name: name.trim() || undefined,
      customer_phone: phone.trim() || undefined,
      customer_note: note.trim() || undefined,
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.qty,
        unit_price: i.unit_price,
        options: i.selections || [],
      })),
    });

    setSubmitting(false);

    if (result.success) {
      setSuccessOrderNo(result.order_no);
      onClearCart();
    } else {
      setError(result.error);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    setNote('');
    setName('');
    setPhone('');
    setSuccessOrderNo(null);
    onClose();
  };

  const handleNewOrder = () => {
    setSuccessOrderNo(null);
    setError(null);
    setNote('');
    setName('');
    setPhone('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'cdFadeIn 0.2s ease',
      }}
      onClick={handleClose}
    >
      <div
        className="bg-paper w-full sm:max-w-[480px] sm:rounded-[22px] rounded-t-[22px] border border-line relative max-h-[92vh] flex flex-col"
        style={{
          boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'cdSlideUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile hint) */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-ink-3 opacity-30" />
        </div>

        {/* Close */}
        {!successOrderNo && (
          <button
            onClick={handleClose}
            disabled={submitting}
            className="absolute top-[14px] right-[14px] w-[32px] h-[32px] rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors disabled:opacity-40 z-10"
            aria-label="kapat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ============ BAŞARI EKRANI ============ */}
        {successOrderNo ? (
          <div className="px-6 py-10 text-center">
            {/* Tik animasyonu */}
            <div className="mx-auto mb-5 w-16 h-16 relative">
              <svg viewBox="0 0 80 80" width="64" height="64" className="mx-auto">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="var(--olive)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="226"
                  strokeDashoffset="226"
                  style={{ animation: 'cdRingDraw 0.8s ease forwards' }}
                />
                <path
                  d="M 25 42 L 35 52 L 56 28"
                  stroke="var(--olive)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="60"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'cdCheckDraw 0.5s 0.5s ease forwards' }}
                />
              </svg>
            </div>

            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
              className="mb-2"
            >
              {T.success[lang]}
            </h2>

            <p className="text-ink-2 text-sm mb-6">{T.successHint[lang]}</p>

            <div className="inline-flex flex-col items-center px-5 py-3 rounded-[14px] bg-card border border-line mb-7">
              <span
                className="text-ink-3 uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                }}
              >
                {T.orderCode[lang]}
              </span>
              <span
                className="text-accent"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                #{successOrderNo}
              </span>
            </div>

            <button
              onClick={handleNewOrder}
              className="w-full py-3.5 rounded-[14px] bg-accent flex items-center justify-center gap-2 font-semibold text-sm"
              style={{ color: '#FAF5EA' }}
            >
              {T.newOrder[lang]}
            </button>
          </div>
        ) : (
          <>
            {/* ============ SEPET EKRANI ============ */}
            <div className="px-5 py-5 border-b border-line flex-shrink-0">
              <div
                className="text-ink-3 uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                }}
              >
                {mode === 'dinein' && tableName
                  ? `${tableName.toUpperCase()} · ${lang === 'tr' ? 'SİPARİŞ' : 'ORDER'}`
                  : mode === 'dinein'
                  ? lang === 'tr'
                    ? 'MASA SİPARİŞİ'
                    : 'DINE-IN'
                  : mode === 'pickup'
                  ? lang === 'tr'
                    ? 'GEL-AL'
                    : 'PICKUP'
                  : lang === 'tr'
                  ? 'PAKET SERVİS'
                  : 'DELIVERY'}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 30,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {T.title[lang]}
              </h2>
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="py-12 text-center text-ink-3 text-sm">{T.empty[lang]}</div>
              ) : (
                <>
                  {/* Items */}
                  <div className="space-y-2 mb-5">
                    {items.map((item) => {
                      const isEmoji = item.hero_icon
                        ? /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(item.hero_icon)
                        : false;
                      return (
                      <div
                        key={item.key}
                        className="flex items-start gap-3 p-3 bg-card border border-line rounded-[14px]"
                      >
                        {/* Ürün resmi / ikon */}
                        <div className="w-12 h-12 rounded-[10px] bg-paper-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.hero_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.hero_image_url}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : isEmoji ? (
                            <span className="text-2xl">{item.hero_icon}</span>
                          ) : (
                            <span
                              className="text-ink/30"
                              style={{
                                fontFamily: 'var(--f-serif)',
                                fontStyle: 'italic',
                                fontSize: 22,
                                fontWeight: 400,
                              }}
                            >
                              {item.product_name.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">
                            {item.product_name}
                          </div>
                          {/* Seçimler - rozet olarak göster */}
                          {item.selections && item.selections.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selections.map((s, idx) => (
                                <span
                                  key={`${s.preset_id}-${s.value_id}-${idx}`}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                  style={{
                                    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                                    color: 'var(--accent)',
                                    fontFamily: 'var(--f-mono)',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {s.value_name}
                                </span>
                              ))}
                            </div>
                          )}
                          <div
                            className="text-ink-3 text-xs mt-1"
                            style={{ fontFamily: 'var(--f-mono)' }}
                          >
                            {money(item.unit_price, lang)} × {item.qty} ={' '}
                            <b className="text-ink-2">
                              {money(item.unit_price * item.qty, lang)}
                            </b>
                          </div>
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                          <button
                            onClick={() => onQtyChange(item.key, item.qty - 1)}
                            className="w-8 h-8 rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
                            aria-label="azalt"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                          <span
                            className="w-7 text-center text-sm font-bold text-ink"
                            style={{ fontFamily: 'var(--f-mono)' }}
                          >
                            {item.qty}
                          </span>
                          <button
                            onClick={() => onQtyChange(item.key, item.qty + 1)}
                            className="w-8 h-8 rounded-full bg-accent grid place-items-center hover:opacity-90 transition-opacity"
                            style={{ color: '#FAF5EA' }}
                            aria-label="artır"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* Customer info */}
                  <div className="space-y-3 mb-4">
                    {mode !== 'dinein' && (
                      <>
                        <FieldInput
                          label={T.name[lang]}
                          placeholder={T.namePlaceholder[lang]}
                          value={name}
                          onChange={setName}
                          maxLength={80}
                        />
                        <FieldInput
                          label={T.phone[lang]}
                          placeholder={T.phonePlaceholder[lang]}
                          value={phone}
                          onChange={setPhone}
                          type="tel"
                          maxLength={30}
                        />
                      </>
                    )}
                    <FieldTextarea
                      label={T.note[lang]}
                      placeholder={T.notePlaceholder[lang]}
                      value={note}
                      onChange={setNote}
                      maxLength={500}
                    />
                  </div>

                  {/* Clear cart button (küçük) */}
                  {items.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(lang === 'tr' ? 'Sepeti boşaltmak istiyor musun?' : 'Clear cart?')) {
                          onClearCart();
                          handleClose();
                        }
                      }}
                      className="text-ink-3 text-xs hover:text-ink-2 transition-colors"
                      style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}
                    >
                      — {T.clear[lang]}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-line px-5 py-4 bg-card flex-shrink-0">
                {/* Total */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-ink-2 uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      fontWeight: 700,
                    }}
                  >
                    {T.total[lang]}
                  </span>
                  <span
                    className="text-ink"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    {money(total, lang)}
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="mb-3 px-3 py-2 rounded-[10px] text-sm"
                    style={{
                      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                      color: 'var(--accent)',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || items.length === 0}
                  className="w-full py-3.5 rounded-[14px] bg-accent flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    color: '#FAF5EA',
                    boxShadow: '0 8px 20px rgba(196,85,58,0.3)',
                  }}
                >
                  {submitting ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round" />
                      </svg>
                      {T.submitting[lang]}
                    </>
                  ) : (
                    <>
                      {T.submit[lang]}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        <style jsx>{`
          @keyframes cdFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes cdSlideUp {
            from {
              opacity: 0;
              transform: translateY(60%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes cdRingDraw {
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes cdCheckDraw {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// ============================================================
// Küçük form bileşenleri
// ============================================================

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span
        className="block text-ink-3 uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3.5 py-2.5 bg-card border border-line rounded-[10px] text-ink text-sm placeholder-ink-3 focus:outline-none focus:border-accent transition-colors"
      />
    </label>
  );
}

function FieldTextarea({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span
        className="block text-ink-3 uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={2}
        className="w-full px-3.5 py-2.5 bg-card border border-line rounded-[10px] text-ink text-sm placeholder-ink-3 focus:outline-none focus:border-accent transition-colors resize-none"
      />
    </label>
  );
}
