'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { type PaymentMethod } from '@/lib/actions/payments';
import { makeItemsComplimentary } from '@/lib/actions/tables-status';
import { useOfflineActions } from '@/lib/offline/use-offline-actions';
import { playSuccess } from '@/lib/sounds';
import { SplitPaymentModal } from './split-payment-modal';

type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (info: { queued?: boolean; online?: boolean }) => void;
  // Kalem ikram değişikliği olduğunda parent refresh için
  onItemsChanged?: () => void;
  order: {
    id: string;
    order_no: string;
    total: number;
    table_label: string | null;
    items: Array<{
      id?: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      is_complimentary?: boolean;
      complimentary_reason?: string | null;
    }>;
  };
  // Fiş basım opsiyonu açık mı?
  autoPrintDefault?: boolean;
};

export function PaymentModal({
  open,
  onClose,
  onSuccess,
  onItemsChanged,
  order,
  autoPrintDefault = true,
}: PaymentModalProps) {
  const { takePayment, isOnline } = useOfflineActions();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [note, setNote] = useState('');
  const [autoPrint, setAutoPrint] = useState(autoPrintDefault);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  // Tip + discount
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [tipPickerOpen, setTipPickerOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [discountPickerOpen, setDiscountPickerOpen] = useState(false);
  // Split
  const [splitOpen, setSplitOpen] = useState(false);
  // Kalem-bazlı ikram picker (item id + name)
  const [itemGiftTarget, setItemGiftTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Modal açıldığında reset
  useEffect(() => {
    if (open) {
      setMethod('cash');
      // Tutarı otomatik doldur (tam ödeme varsayılanı)
      setCashReceived(Number(order.total).toFixed(2));
      setNote('');
      setError(null);
      setTipAmount(0);
      setDiscountAmount(0);
      setDiscountReason('');
      // Nakitse odaklan + tüm metni seç (kullanıcı silip değiştirebilsin)
      setTimeout(() => {
        cashInputRef.current?.focus();
        cashInputRef.current?.select();
      }, 100);
    }
  }, [open, order.total]);

  // ESC ile kapat (split modal açıkken veya işlem sırasında değil)
  useEscapeKey(onClose, open && !splitOpen && !isPending);

  // Tip/discount değiştiğinde cashReceived'ı yeni total ile senkronize et
  // (Kullanıcı manuel değiştirmişse dokunmayalım — auto-fill sadece boş ya da
  // önceki total ile tam eşleşen durumda geçerli)
  useEffect(() => {
    if (!open) return;
    const newTotal = Math.max(0, Number(order.total) - discountAmount) + tipAmount;
    setCashReceived(newTotal.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipAmount, discountAmount]);

  if (!open) return null;

  const baseTotal = Number(order.total);
  const netTotal = Math.max(0, baseTotal - discountAmount); // indirim sonrası
  const total = netTotal + tipAmount; // bahşişle birlikte ödenecek
  const received = Number(cashReceived) || 0;
  const change = method === 'cash' && received > 0 ? Math.max(0, received - total) : 0;
  const insufficient = method === 'cash' && received > 0 && received < total;

  // Hızlı nakit butonları
  const quickCash = [total, roundUp(total, 10), roundUp(total, 50), roundUp(total, 100)].filter(
    (v, i, arr) => arr.indexOf(v) === i && v > 0
  );

  const canSubmit =
    method !== 'cash' ||
    cashReceived === '' || // müşteri tam ödüyorsa boş bırakabilir
    received >= total;

  const handleSubmit = () => {
    if (!canSubmit) {
      setError('Alınan tutar yetersiz');
      return;
    }
    setError(null);

    const amountPaid = method === 'cash' && received > 0 ? received : total;
    const changeGiven = change;

    startTransition(async () => {
      const result = await takePayment({
        orderId: order.id,
        paymentMethod: method,
        amount: total,
        amountPaid,
        changeGiven,
        note: note || undefined,
        autoPrint,
        tip: tipAmount > 0 ? tipAmount : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        discountReason: discountAmount > 0 ? discountReason || 'İndirim' : undefined,
        displayLabel: `Ödeme · ${order.table_label ? `Masa ${order.table_label}` : 'Hızlı'} · ${methodLabel(method)}`,
      });

      if (!result.success) {
        setError(result.error || 'Ödeme alınamadı');
        return;
      }

      playSuccess();

      if (autoPrint && result.online) {
        // TODO Parça 3: fiş basımı için Aleg Printer Agent'a istek
        console.log('[aleg] Fiş basma işlevi Parça 3\'te gelecek');
      }

      onSuccess({ queued: result.queued, online: result.online });
    });
  };

  const handleGiftAll = (reason: string) => {
    setError(null);
    setGiftPickerOpen(false);

    startTransition(async () => {
      const result = await takePayment({
        orderId: order.id,
        paymentMethod: 'other',
        amount: 0,
        note: `Tümü ikram: ${reason}`,
        giftAll: true,
        giftReason: reason,
        displayLabel: `★ İkram · ${order.table_label ? `Masa ${order.table_label}` : 'Hızlı'}`,
      });

      if (!result.success) {
        setError(result.error || 'İkram işlenemedi');
        return;
      }

      playSuccess();
      onSuccess({ queued: result.queued, online: result.online });
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes aleg-modal-in {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Başlık */}
        <div
          className="px-6 py-5 flex items-center justify-between gap-3"
          style={{ borderBottom: '1px solid var(--line)' }}
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
              ÖDEME AL · #{order.order_no}
              {!isOnline && (
                <span
                  className="ml-2 px-1.5 py-0.5 rounded uppercase"
                  style={{
                    fontSize: 9,
                    background: 'color-mix(in srgb, var(--warn) 14%, transparent)',
                    color: 'var(--warn)',
                  }}
                >
                  ÇEVRİMDIŞI
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--ink)',
              }}
            >
              {order.table_label
                ? `Masa ${order.table_label}`
                : 'Hızlı satış'}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors disabled:opacity-50"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Ürünler özeti */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            ÜRÜNLER ({order.items.length})
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {order.items.map((item, i) => {
              const lineTotal = item.quantity * Number(item.unit_price);
              const isComp = item.is_complimentary;
              return (
                <div
                  key={item.id || i}
                  className="flex items-center justify-between gap-2 text-sm"
                  style={{
                    background: isComp
                      ? 'color-mix(in srgb, var(--gold) 5%, transparent)'
                      : 'transparent',
                    borderRadius: isComp ? 6 : 0,
                    padding: isComp ? '4px 6px' : '0',
                  }}
                >
                  <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                    <strong
                      style={{
                        color: isComp ? 'var(--gold)' : 'var(--ink)',
                      }}
                    >
                      {item.quantity}×
                    </strong>
                    <span style={{ color: 'var(--ink-2)' }}>
                      {item.product_name}
                    </span>
                    {isComp ? (
                      <span
                        className="text-[9px] uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                          color: 'var(--gold)',
                        }}
                        title={item.complimentary_reason || ''}
                      >
                        ★ İKRAM
                      </span>
                    ) : (
                      item.id && (
                        <button
                          onClick={() =>
                            setItemGiftTarget({
                              id: item.id!,
                              name: item.product_name,
                            })
                          }
                          disabled={isPending}
                          className="text-[9px] uppercase px-1.5 py-0.5 rounded transition-all hover:scale-[1.05] disabled:opacity-40 flex-shrink-0"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            background: 'var(--paper-2)',
                            color: 'var(--gold)',
                            border: '1px dashed color-mix(in srgb, var(--gold) 40%, var(--line))',
                          }}
                          title="Bu kalemi ikram et"
                        >
                          ★ İKRAM
                        </button>
                      )
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      color: isComp ? 'var(--ink-3)' : 'var(--ink-2)',
                      fontSize: 13,
                      textDecoration: isComp ? 'line-through' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    {fmt(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hızlı Aksiyon Chip'leri: İndirim · Bahşiş · Böl */}
        <div
          className="px-6 py-3 flex items-center gap-2 flex-wrap"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <button
            onClick={() => setDiscountPickerOpen(true)}
            disabled={isPending}
            className="h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.03] disabled:opacity-40"
            style={{
              background: discountAmount > 0
                ? 'color-mix(in srgb, var(--danger) 10%, var(--card))'
                : 'var(--paper-2)',
              border: `1px solid ${discountAmount > 0 ? 'var(--danger)' : 'var(--line)'}`,
              color: discountAmount > 0 ? 'var(--danger)' : 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>↓ İNDİRİM</span>
            {discountAmount > 0 && <span>· −{fmt(discountAmount)}</span>}
          </button>
          <button
            onClick={() => setTipPickerOpen(true)}
            disabled={isPending}
            className="h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.03] disabled:opacity-40"
            style={{
              background: tipAmount > 0
                ? 'color-mix(in srgb, var(--ok) 10%, var(--card))'
                : 'var(--paper-2)',
              border: `1px solid ${tipAmount > 0 ? 'var(--ok)' : 'var(--line)'}`,
              color: tipAmount > 0 ? 'var(--ok)' : 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>♡ BAHŞİŞ</span>
            {tipAmount > 0 && <span>· +{fmt(tipAmount)}</span>}
          </button>
          <button
            onClick={() => setSplitOpen(true)}
            disabled={isPending || baseTotal <= 0}
            className="h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.03] disabled:opacity-40 ml-auto"
            style={{
              background: 'color-mix(in srgb, var(--super) 8%, var(--card))',
              border: '1px solid var(--super)',
              color: 'var(--super)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>⇄ BÖLEREK ÖDE</span>
          </button>
        </div>

        {/* Toplam + breakdown */}
        <div
          className="px-6 py-4 space-y-1"
          style={{
            background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {/* Breakdown satırları - tip/discount varsa */}
          {(discountAmount > 0 || tipAmount > 0) && (
            <>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-2)' }}>
                <span style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
                  ARA TOPLAM
                </span>
                <span style={{ fontFamily: 'var(--f-mono)' }}>
                  {fmt(baseTotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--danger)' }}>
                  <span style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
                    ↓ İNDİRİM{discountReason ? ` · ${discountReason}` : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)' }}>
                    −{fmt(discountAmount)}
                  </span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ok)' }}>
                  <span style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
                    ♡ BAHŞİŞ
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)' }}>
                    +{fmt(tipAmount)}
                  </span>
                </div>
              )}
              <div className="h-px" style={{ background: 'var(--line)', margin: '6px 0' }} />
            </>
          )}

          <div className="flex items-center justify-between">
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-2)',
              }}
            >
              ÖDENECEK
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 36,
                fontWeight: 400,
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
              }}
            >
              {fmt(total)}
            </div>
          </div>
        </div>

        {/* Ödeme yöntemi */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            ÖDEME YÖNTEMİ
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MethodButton
              active={method === 'cash'}
              onClick={() => {
                setMethod('cash');
                // Nakitte tutarı otomatik doldur (tam tutar)
                setCashReceived(total.toFixed(2));
              }}
              icon="₺"
              label="Nakit"
            />
            <MethodButton
              active={method === 'card'}
              onClick={() => {
                setMethod('card');
                // Kartta da tutarı tam olarak doldur (kullanıcı üzerine basınca onay gibi)
                setCashReceived(total.toFixed(2));
              }}
              icon="▭"
              label="Kart"
            />
          </div>
        </div>

        {/* Nakit detayları */}
        {method === 'cash' && (
          <div
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                ALINAN TUTAR
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}
              >
                Boş bırakırsan tam tutar alınmış sayılır
              </div>
            </div>

            <input
              ref={cashInputRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              placeholder={fmt(total).replace(/[^\d,\.]/g, '')}
              className="w-full h-14 px-4 rounded-[10px] transition-all focus:outline-none focus:border-accent"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            />

            {/* Hızlı nakit butonları */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {quickCash.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCashReceived(String(v))}
                  className="h-8 px-3 rounded-full text-sm transition-all hover:scale-105"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 12,
                    letterSpacing: '0.04em',
                    color: 'var(--ink-2)',
                  }}
                >
                  {fmt(v)}
                </button>
              ))}
            </div>

            {/* Para üstü */}
            {change > 0 && (
              <div
                className="mt-3 flex items-center justify-between rounded-[10px] px-4 py-3"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 10%, var(--card))',
                  border: '1px solid color-mix(in srgb, var(--ok) 25%, var(--line))',
                }}
              >
                <span
                  className="uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ok)',
                  }}
                >
                  PARA ÜSTÜ
                </span>
                <span
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                    color: 'var(--ok)',
                  }}
                >
                  {fmt(change)}
                </span>
              </div>
            )}

            {insufficient && (
              <div
                className="mt-3 text-sm flex items-center gap-2"
                style={{ color: 'var(--danger)' }}
              >
                <span>⚠</span>
                <span>Eksik: {fmt(total - received)}</span>
              </div>
            )}
          </div>
        )}

        {/* Not + Fiş */}
        <div className="px-6 py-4 space-y-3">
          <div>
            <label
              className="uppercase mb-1.5 block"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-3)',
              }}
            >
              NOT (İSTEĞE BAĞLI)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ör: bahşiş dahil, fatura kesildi..."
              className="w-full h-10 px-3 rounded-[10px] transition-all focus:outline-none focus:border-accent"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-sans)',
                fontSize: 13,
                color: 'var(--ink)',
              }}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 rounded accent-accent cursor-pointer"
            />
            <span style={{ color: 'var(--ink-2)' }}>
              Ödeme tamamlanınca fiş bas
            </span>
          </label>
        </div>

        {/* Hata */}
        {error && (
          <div
            className="mx-6 mb-4 p-3 rounded-[10px] text-sm flex items-start gap-2"
            style={{
              background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
              color: 'var(--danger)',
            }}
          >
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Butonlar */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-12 px-5 rounded-[10px] font-semibold text-sm transition-all hover:opacity-70 disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="group flex-1 h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-sans)',
              boxShadow:
                '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
            }}
          >
            <span>
              {isPending ? 'Kaydediliyor...' : `Ödemeyi Tamamla · ${fmt(total)}`}
            </span>
            {!isPending && (
              <span
                className="transition-transform group-hover:translate-x-1"
                style={{ fontSize: 16 }}
              >
                →
              </span>
            )}
          </button>
        </div>

        {/* İkram linki - ayrı satır */}
        <div
          className="px-6 pb-5 flex items-center justify-center"
        >
          <button
            onClick={() => setGiftPickerOpen(true)}
            disabled={isPending}
            className="group flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold transition-all hover:scale-[1.03] disabled:opacity-40"
            style={{
              background: 'color-mix(in srgb, var(--gold) 10%, var(--card))',
              border: '1px dashed color-mix(in srgb, var(--gold) 40%, var(--line))',
              color: 'var(--gold)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>★ Tümünü İkram Et</span>
          </button>
        </div>
      </div>

      {/* Gift Picker Modal */}
      {giftPickerOpen && (
        <GiftPicker
          orderTotal={total}
          onPick={handleGiftAll}
          onClose={() => setGiftPickerOpen(false)}
        />
      )}

      {/* Tip Picker Modal */}
      {tipPickerOpen && (
        <TipPicker
          baseTotal={baseTotal}
          current={tipAmount}
          onPick={(amount) => {
            setTipAmount(amount);
            setTipPickerOpen(false);
          }}
          onClose={() => setTipPickerOpen(false)}
        />
      )}

      {/* Discount Picker Modal */}
      {discountPickerOpen && (
        <DiscountPicker
          baseTotal={baseTotal}
          current={discountAmount}
          currentReason={discountReason}
          onPick={(amount, reason) => {
            setDiscountAmount(amount);
            setDiscountReason(reason);
            setDiscountPickerOpen(false);
          }}
          onClose={() => setDiscountPickerOpen(false)}
        />
      )}

      {/* Split Payment Modal */}
      {splitOpen && (
        <SplitPaymentModal
          order={order}
          discountAmount={discountAmount}
          tipAmount={tipAmount}
          onClose={() => setSplitOpen(false)}
          onAllPaid={() => {
            setSplitOpen(false);
            playSuccess();
            onSuccess({ online: true });
          }}
        />
      )}

      {/* Item Gift Picker - PaymentModal içinde tek kalem ikramı */}
      {itemGiftTarget && (
        <ItemGiftPicker
          itemName={itemGiftTarget.name}
          onPick={async (reason) => {
            const targetId = itemGiftTarget.id;
            setItemGiftTarget(null);
            const r = await makeItemsComplimentary({
              orderId: order.id,
              itemIds: [targetId],
              reason,
            });
            if (!r.success) {
              setError(r.error || 'İkram uygulanamadı');
              return;
            }
            // Parent'ı haberdar et → order.total + items yenilensin
            onItemsChanged?.();
            playSuccess();
          }}
          onClose={() => setItemGiftTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// GIFT PICKER - Sebep seçimi
// ============================================================

function GiftPicker({
  orderTotal,
  onPick,
  onClose,
}: {
  orderTotal: number;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[460px] rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
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
            ★ TÜMÜNÜ İKRAM ET
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
            Tüm sipariş ({fmt(orderTotal)}) ikram olarak kaydedilecek.
            Raporlarda maliyet olarak görülür.
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
                ★ İkram et: &quot;{custom.trim()}&quot;
              </button>
            )}
          </div>
        </div>
        <div className="p-3" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TIP PICKER - Bahşiş
// ============================================================

function TipPicker({
  baseTotal,
  current,
  onPick,
  onClose,
}: {
  baseTotal: number;
  current: number;
  onPick: (amount: number) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState<string>(current > 0 ? String(current) : '');
  const presets = [
    { label: '%5', value: Math.round(baseTotal * 0.05 * 100) / 100 },
    { label: '%10', value: Math.round(baseTotal * 0.10 * 100) / 100 },
    { label: '%15', value: Math.round(baseTotal * 0.15 * 100) / 100 },
    { label: '%20', value: Math.round(baseTotal * 0.20 * 100) / 100 },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const customValue = Number(custom) || 0;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ok)',
            }}
          >
            ♡ BAHŞİŞ
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
            Ne kadar bahşiş?
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
            Ara toplam: {fmt(baseTotal)} · Personel paylaşımı için ayrı kaydedilir
          </p>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => onPick(p.value)}
                className="px-3 py-3 rounded-[10px] text-left transition-all hover:scale-[1.02]"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 6%, var(--paper-2))',
                  border: '1px solid color-mix(in srgb, var(--ok) 20%, var(--line))',
                }}
              >
                <div
                  className="font-bold text-lg"
                  style={{ color: 'var(--ok)', fontFamily: 'var(--f-mono)' }}
                >
                  {p.label}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
                  {fmt(p.value)}
                </div>
              </button>
            ))}
          </div>
          <div>
            <div
              className="uppercase mb-1.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--ink-3)',
              }}
            >
              VEYA ÖZEL TUTAR
            </div>
            <input
              type="number"
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="₺"
              className="w-full h-11 px-3 rounded-[10px] text-base font-semibold focus:outline-none focus:border-ok transition-colors"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                fontFamily: 'var(--f-mono)',
              }}
            />
            {customValue > 0 && (
              <button
                onClick={() => onPick(customValue)}
                className="w-full h-11 mt-2 rounded-[10px] text-sm font-semibold transition-all hover:opacity-95"
                style={{
                  background: 'var(--ok)',
                  color: '#FAF5EA',
                }}
              >
                ♡ Bahşiş olarak {fmt(customValue)} ekle
              </button>
            )}
          </div>
        </div>
        <div
          className="p-3 flex gap-2"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {current > 0 && (
            <button
              onClick={() => onPick(0)}
              className="flex-1 h-10 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
              style={{
                background: 'transparent',
                color: 'var(--danger)',
                border: '1px solid var(--line)',
              }}
            >
              Bahşişi Kaldır
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DISCOUNT PICKER - İndirim
// ============================================================

function DiscountPicker({
  baseTotal,
  current,
  currentReason,
  onPick,
  onClose,
}: {
  baseTotal: number;
  current: number;
  currentReason: string;
  onPick: (amount: number, reason: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'percent' | 'flat'>('percent');
  const [percent, setPercent] = useState<string>('');
  const [flat, setFlat] = useState<string>(current > 0 ? String(current) : '');
  const [reason, setReason] = useState<string>(currentReason);

  const presets = ['Öğrenci', 'Yaşlı/Emekli', 'Personel', 'Promosyon', 'Kuponlu', 'Özel'];
  const percentPresets = [10, 15, 20, 25, 50];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const computedAmount =
    mode === 'percent'
      ? Math.round(baseTotal * (Number(percent) || 0) / 100 * 100) / 100
      : Number(flat) || 0;

  const canApply = computedAmount > 0 && computedAmount <= baseTotal && reason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--danger)',
            }}
          >
            ↓ İNDİRİM UYGULA
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
            Ne kadar indirim?
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
            Ara toplam: {fmt(baseTotal)} · Raporlarda ayrı satır
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-[10px]"
            style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
          >
            <button
              onClick={() => setMode('percent')}
              className="flex-1 h-9 rounded-[8px] text-sm font-semibold transition-all"
              style={{
                background: mode === 'percent' ? 'var(--card)' : 'transparent',
                color: mode === 'percent' ? 'var(--danger)' : 'var(--ink-3)',
                boxShadow: mode === 'percent' ? '0 1px 2px rgba(42,31,24,0.08)' : 'none',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              % YÜZDE
            </button>
            <button
              onClick={() => setMode('flat')}
              className="flex-1 h-9 rounded-[8px] text-sm font-semibold transition-all"
              style={{
                background: mode === 'flat' ? 'var(--card)' : 'transparent',
                color: mode === 'flat' ? 'var(--danger)' : 'var(--ink-3)',
                boxShadow: mode === 'flat' ? '0 1px 2px rgba(42,31,24,0.08)' : 'none',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              ₺ TUTAR
            </button>
          </div>

          {/* Tutar girişi */}
          {mode === 'percent' ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {percentPresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPercent(String(p))}
                    className="h-9 px-3 rounded-full text-xs font-bold transition-all hover:scale-[1.05]"
                    style={{
                      background: percent === String(p)
                        ? 'color-mix(in srgb, var(--danger) 14%, var(--card))'
                        : 'var(--paper-2)',
                      border: `1px solid ${percent === String(p) ? 'var(--danger)' : 'var(--line)'}`,
                      color: percent === String(p) ? 'var(--danger)' : 'var(--ink-2)',
                      fontFamily: 'var(--f-mono)',
                    }}
                  >
                    %{p}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="Yüzde"
                  max={100}
                  className="w-full h-11 pl-3 pr-10 rounded-[10px] text-base font-semibold focus:outline-none focus:border-danger"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--f-mono)',
                  }}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-bold"
                  style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}
                >
                  %
                </span>
              </div>
              {computedAmount > 0 && (
                <div
                  className="mt-2 text-xs"
                  style={{ color: 'var(--danger)', fontFamily: 'var(--f-mono)' }}
                >
                  = −{fmt(computedAmount)}
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="number"
                inputMode="decimal"
                value={flat}
                onChange={(e) => setFlat(e.target.value)}
                placeholder="₺ tutar"
                className="w-full h-11 px-3 rounded-[10px] text-base font-semibold focus:outline-none focus:border-danger"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--f-mono)',
                }}
              />
              {computedAmount > baseTotal && (
                <div className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
                  ⚠ İndirim tutarı ara toplamdan ({fmt(baseTotal)}) büyük olamaz
                </div>
              )}
            </div>
          )}

          {/* Sebep */}
          <div>
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--ink-3)',
              }}
            >
              SEBEP
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setReason(p)}
                  className="h-8 px-3 rounded-full text-xs font-semibold transition-all hover:scale-[1.03]"
                  style={{
                    background: reason === p
                      ? 'color-mix(in srgb, var(--danger) 10%, var(--card))'
                      : 'var(--paper-2)',
                    border: `1px solid ${reason === p ? 'var(--danger)' : 'var(--line)'}`,
                    color: reason === p ? 'var(--danger)' : 'var(--ink-2)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Veya özel sebep..."
              className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none focus:border-danger"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
          </div>
        </div>

        {/* Aksiyonlar */}
        <div
          className="p-4 flex gap-2"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {current > 0 && (
            <button
              onClick={() => onPick(0, '')}
              className="h-11 px-4 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
              style={{
                background: 'transparent',
                color: 'var(--danger)',
                border: '1px solid var(--line)',
              }}
            >
              Kaldır
            </button>
          )}
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={() => onPick(computedAmount, reason.trim())}
            disabled={!canApply}
            className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all hover:opacity-95 disabled:opacity-40"
            style={{
              background: 'var(--danger)',
              color: '#FAF5EA',
            }}
          >
            {canApply
              ? `↓ İndirim uygula · −${fmt(computedAmount)}`
              : 'Tutar ve sebep gerekli'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-20 rounded-[10px] flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98]"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--accent) 12%, var(--card))'
          : 'var(--paper-2)',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
        color: active ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {icon}
      </div>
      <div
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </div>
    </button>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(n);
}

function methodLabel(m: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale',
    online: 'Online',
    split: 'Bölünmüş',
    other: 'Diğer',
  };
  return labels[m] || m;
}

function roundUp(n: number, step: number) {
  return Math.ceil(n / step) * step;
}


// ============================================================
// ITEM GIFT PICKER - PaymentModal içinden tek kalem ikramı
// ============================================================

function ItemGiftPicker({
  itemName,
  onPick,
  onClose,
}: {
  itemName: string;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
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
            ★ KALEM İKRAMI
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}
          >
            &quot;{itemName}&quot; neden ikram?
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
            Sipariş totalinden düşer, complimentary olarak kaydedilir.
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
                ★ İkram et: &quot;{custom.trim()}&quot;
              </button>
            )}
          </div>
        </div>
        <div className="p-3" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
