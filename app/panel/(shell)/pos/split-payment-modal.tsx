'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { takePartialPayment, getPartialPayments, type PaymentMethod } from '@/lib/actions/payments';
import { playSuccess, playDing } from '@/lib/sounds';
import { cn } from '@/lib/utils';

type OrderInput = {
  id: string;
  order_no: string;
  total: number;
  table_label: string | null;
  items: Array<{
    id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

type Props = {
  order: OrderInput;
  discountAmount: number;
  tipAmount: number;
  onClose: () => void;
  onAllPaid: () => void;
};

type SplitMode = 'equal' | 'items';

type PaidRecord = {
  id: string;
  amount: number;
  payment_method: string | null;
  note: string | null;
  covers_item_ids: string[];
};

export function SplitPaymentModal({
  order,
  discountAmount,
  tipAmount,
  onClose,
  onAllPaid,
}: Props) {
  const [mode, setMode] = useState<SplitMode>('equal');
  const [payments, setPayments] = useState<PaidRecord[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Eşit böl
  const [partyCount, setPartyCount] = useState<number>(2);

  // Kalem bazlı
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Ödeme yöntemi (her parça için)
  const [method, setMethod] = useState<PaymentMethod>('cash');

  const baseTotal = Number(order.total); // zaten discount + tip hesaba katılmış olmalı
  const netTotal = Math.max(0, baseTotal - discountAmount) + tipAmount;
  // Order.total zaten sipariş tablosundaki değer — discount/tip burada bilgi amaçlı
  // Split calculus'ta gerçek ödenecek = netTotal

  const loadPayments = useCallback(async () => {
    const r = await getPartialPayments(order.id);
    if (!r.success) {
      setError(r.error || 'Parçalı ödemeler alınamadı');
    } else {
      setPayments(r.payments || []);
      setError(null);
    }
    setLoading(false);
  }, [order.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // ESC ile kapat (işlem sırasında değil)
  useEscapeKey(onClose, !isPending);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, netTotal - totalPaid);
  const isFullyPaid = remaining <= 0.01;

  // Kalemler - ödenmiş mi kontrolü
  const paidItemIds = new Set<string>();
  payments.forEach((p) => {
    p.covers_item_ids.forEach((id) => paidItemIds.add(id));
  });

  // Eşit böl — her parçanın tutarı
  const perPartyAmount = partyCount > 0 ? Math.round((netTotal / partyCount) * 100) / 100 : 0;
  const remainingPerParty = Math.max(0, remaining / (partyCount - payments.length || 1));

  // Kalem-bazlı — seçili kalemlerin tutarı
  const selectedItems = order.items.filter(
    (it) => it.id && selectedItemIds.has(it.id) && !paidItemIds.has(it.id)
  );
  const selectedTotal = selectedItems.reduce(
    (s, it) => s + Number(it.unit_price) * it.quantity,
    0
  );

  // Eşit-böl tek seferlik ödeme
  const handleEqualPay = () => {
    const amount = Math.min(remainingPerParty > 0 ? remainingPerParty : perPartyAmount, remaining);
    if (amount <= 0) return;
    setError(null);

    startTransition(async () => {
      const partyIdx = payments.length + 1;
      const r = await takePartialPayment({
        orderId: order.id,
        paymentMethod: method,
        amount: Math.round(amount * 100) / 100,
        note: `Eşit böl ${partyCount} kişi`,
        partyLabel: `Kişi ${partyIdx}/${partyCount}`,
        splitGroup: `${order.id}-equal-${partyCount}`,
      });
      if (!r.success) {
        setError(r.error || 'Ödeme alınamadı');
        return;
      }
      playDing(0.25);
      if (r.isFullyPaid) {
        playSuccess();
        onAllPaid();
      } else {
        await loadPayments();
      }
    });
  };

  // Kalem-bazlı ödeme
  const handleItemsPay = () => {
    if (selectedItems.length === 0) {
      setError('En az bir kalem seç');
      return;
    }
    setError(null);

    startTransition(async () => {
      const itemIds = selectedItems.map((it) => it.id!).filter(Boolean);
      const r = await takePartialPayment({
        orderId: order.id,
        paymentMethod: method,
        amount: Math.round(selectedTotal * 100) / 100,
        note: `${itemIds.length} kalem`,
        coversItemIds: itemIds,
        partyLabel: `${itemIds.length} kalem`,
        splitGroup: `${order.id}-items`,
      });
      if (!r.success) {
        setError(r.error || 'Ödeme alınamadı');
        return;
      }
      playDing(0.25);
      setSelectedItemIds(new Set());
      if (r.isFullyPaid) {
        playSuccess();
        onAllPaid();
      } else {
        await loadPayments();
      }
    });
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="w-full max-w-[600px] max-h-[92vh] rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes aleg-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

        {/* Başlık */}
        <div
          className="px-5 py-4 flex items-start justify-between flex-shrink-0"
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
                color: 'var(--super)',
              }}
            >
              ⇄ BÖLEREK ÖDEME
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              {order.table_label ? `Masa ${order.table_label}` : `Sipariş ${order.order_no}`}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Toplam özet */}
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--super) 4%, var(--card))',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                TOPLAM
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {fmt(netTotal)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                ÖDENEN
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ok)' }}>
                {fmt(totalPaid)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                KALAN
              </div>
              <div style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 15,
                fontWeight: 700,
                color: isFullyPaid ? 'var(--ok)' : 'var(--danger)',
              }}>
                {fmt(remaining)}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--paper-2)' }}>
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(100, (totalPaid / (netTotal || 1)) * 100)}%`,
                background: isFullyPaid ? 'var(--ok)' : 'var(--super)',
              }}
            />
          </div>
        </div>

        {/* Mode tab */}
        <div
          className="px-5 pt-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-1 p-1 rounded-[10px]" style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}>
            <button
              onClick={() => setMode('equal')}
              className="flex-1 h-9 rounded-[8px] text-sm font-semibold transition-all"
              style={{
                background: mode === 'equal' ? 'var(--card)' : 'transparent',
                color: mode === 'equal' ? 'var(--super)' : 'var(--ink-3)',
                boxShadow: mode === 'equal' ? '0 1px 2px rgba(42,31,24,0.08)' : 'none',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ⇌ EŞİT BÖL
            </button>
            <button
              onClick={() => setMode('items')}
              className="flex-1 h-9 rounded-[8px] text-sm font-semibold transition-all"
              style={{
                background: mode === 'items' ? 'var(--card)' : 'transparent',
                color: mode === 'items' ? 'var(--super)' : 'var(--ink-3)',
                boxShadow: mode === 'items' ? '0 1px 2px rgba(42,31,24,0.08)' : 'none',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ◎ KALEME GÖRE
            </button>
          </div>
          {/* Boşluk */}
          <div className="h-3" />
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-5">
          {mode === 'equal' ? (
            <div className="space-y-4">
              <div>
                <div
                  className="uppercase mb-2"
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)' }}
                >
                  KAÇ KİŞİ?
                </div>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPartyCount(n)}
                      className="flex-1 h-12 rounded-[10px] text-lg font-bold transition-all hover:scale-[1.03]"
                      style={{
                        background: partyCount === n
                          ? 'color-mix(in srgb, var(--super) 14%, var(--card))'
                          : 'var(--paper-2)',
                        border: `1.5px solid ${partyCount === n ? 'var(--super)' : 'var(--line)'}`,
                        color: partyCount === n ? 'var(--super)' : 'var(--ink-2)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5">
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={partyCount}
                    onChange={(e) => {
                      const v = Math.max(2, Math.min(20, Number(e.target.value) || 2));
                      setPartyCount(v);
                    }}
                    className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none focus:border-super"
                    style={{
                      background: 'var(--paper-2)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink)',
                      fontFamily: 'var(--f-mono)',
                    }}
                    placeholder="Veya manuel girin"
                  />
                </div>
              </div>

              <div
                className="p-3 rounded-[10px]"
                style={{
                  background: 'color-mix(in srgb, var(--super) 6%, var(--card))',
                  border: '1px solid color-mix(in srgb, var(--super) 20%, var(--line))',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    Kişi başı
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 18, fontWeight: 700, color: 'var(--super)' }}>
                    {fmt(perPartyAmount)}
                  </span>
                </div>
                {payments.length > 0 && (
                  <div className="flex items-center justify-between mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                      {payments.length}/{partyCount} ödendi · kalan / kişi
                    </span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      {fmt(remainingPerParty)}
                    </span>
                  </div>
                )}
              </div>

              {/* Ödeme yöntemi */}
              <div>
                <div
                  className="uppercase mb-2"
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)' }}
                >
                  BU KİŞİNİN ÖDEME YÖNTEMİ
                </div>
                <MethodChips method={method} onChange={setMethod} />
              </div>

              {/* Ödenmiş liste */}
              {payments.length > 0 && (
                <div>
                  <div
                    className="uppercase mb-2"
                    style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)' }}
                  >
                    ÖDENENLER
                  </div>
                  <div className="space-y-1.5">
                    {payments.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-[8px] text-sm"
                        style={{
                          background: 'color-mix(in srgb, var(--ok) 5%, var(--paper-2))',
                          border: '1px solid color-mix(in srgb, var(--ok) 15%, var(--line))',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--ok)' }}>✓</span>
                          <span style={{ color: 'var(--ink)' }}>
                            {p.note || `Parça ${i + 1}`}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
                            {methodLabel(p.payment_method as PaymentMethod)}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--ok)' }}>
                          {fmt(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Items mode
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="uppercase"
                    style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)' }}
                  >
                    KALEMLERİ SEÇ
                  </div>
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    Ödenmemiş kalemleri aynı kişi için işaretle
                  </span>
                </div>
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => {
                    const itemId = item.id || `item-${idx}`;
                    const isPaid = item.id ? paidItemIds.has(item.id) : false;
                    const isSelected = item.id ? selectedItemIds.has(item.id) : false;
                    const lineTotal = Number(item.unit_price) * item.quantity;

                    return (
                      <button
                        key={itemId}
                        onClick={() => item.id && !isPaid && toggleItem(item.id)}
                        disabled={isPaid || !item.id}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-[10px] text-left transition-all',
                          !isPaid && item.id && 'hover:scale-[1.01]',
                          isPaid && 'opacity-50 cursor-not-allowed'
                        )}
                        style={{
                          background: isSelected
                            ? 'color-mix(in srgb, var(--super) 10%, var(--paper-2))'
                            : 'var(--paper-2)',
                          border: `1.5px solid ${isSelected ? 'var(--super)' : 'var(--line)'}`,
                          textDecoration: isPaid ? 'line-through' : 'none',
                        }}
                      >
                        <span
                          className="inline-flex items-center justify-center rounded flex-shrink-0"
                          style={{
                            width: 18,
                            height: 18,
                            border: `2px solid ${
                              isPaid ? 'var(--ok)' : isSelected ? 'var(--super)' : 'var(--line-2)'
                            }`,
                            background: isPaid
                              ? 'var(--ok)'
                              : isSelected
                                ? 'var(--super)'
                                : 'transparent',
                            color: '#FAF5EA',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {isPaid ? '✓' : isSelected ? '✓' : ''}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                            {item.quantity}× {item.product_name}
                          </div>
                          {isPaid && (
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ok)', fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}>
                              ÖDENMİŞ
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--ink)',
                          }}
                        >
                          {fmt(lineTotal)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div
                  className="p-3 rounded-[10px]"
                  style={{
                    background: 'color-mix(in srgb, var(--super) 6%, var(--card))',
                    border: '1px solid color-mix(in srgb, var(--super) 20%, var(--line))',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                      Seçili {selectedItems.length} kalem
                    </span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 18, fontWeight: 700, color: 'var(--super)' }}>
                      {fmt(selectedTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Ödeme yöntemi */}
              <div>
                <div
                  className="uppercase mb-2"
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-3)' }}
                >
                  ÖDEME YÖNTEMİ
                </div>
                <MethodChips method={method} onChange={setMethod} />
              </div>
            </div>
          )}

          {error && (
            <div
              className="mt-3 p-2.5 rounded-[8px] text-sm flex items-start gap-2"
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
        </div>

        {/* Footer aksiyonlar */}
        <div
          className="p-4 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-12 px-4 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Kapat
          </button>
          {mode === 'equal' ? (
            <button
              onClick={handleEqualPay}
              disabled={isPending || isFullyPaid || remaining <= 0}
              className="group flex-1 h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
              style={{
                background: 'var(--super)',
                color: '#FAF5EA',
                boxShadow: '0 1px 2px rgba(90,107,126,0.2), 0 4px 12px -4px rgba(90,107,126,0.3)',
              }}
            >
              <span>
                {isPending
                  ? 'Kaydediliyor...'
                  : isFullyPaid
                    ? '✓ Tümü Ödendi'
                    : `Sıradaki Kişiyi Öde · ${fmt(
                        remainingPerParty > 0 ? remainingPerParty : perPartyAmount
                      )}`}
              </span>
              {!isPending && !isFullyPaid && (
                <span className="transition-transform group-hover:translate-x-1" style={{ fontSize: 16 }}>
                  →
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={handleItemsPay}
              disabled={isPending || selectedItems.length === 0}
              className="group flex-1 h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
              style={{
                background: 'var(--super)',
                color: '#FAF5EA',
                boxShadow: '0 1px 2px rgba(90,107,126,0.2), 0 4px 12px -4px rgba(90,107,126,0.3)',
              }}
            >
              <span>
                {isPending
                  ? 'Kaydediliyor...'
                  : selectedItems.length === 0
                    ? 'Kalem seç'
                    : `Seçili Kalemleri Öde · ${fmt(selectedTotal)}`}
              </span>
              {!isPending && selectedItems.length > 0 && (
                <span className="transition-transform group-hover:translate-x-1" style={{ fontSize: 16 }}>
                  →
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Method chips mini
// ============================================================

function MethodChips({
  method,
  onChange,
}: {
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  const methods: Array<{ id: PaymentMethod; icon: string; label: string }> = [
    { id: 'cash', icon: '₺', label: 'NAKİT' },
    { id: 'card', icon: '◉', label: 'KART' },
    { id: 'other', icon: '•', label: 'DİĞER' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {methods.map((m) => {
        const isActive = method === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="h-14 rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98]"
            style={{
              background: isActive
                ? 'color-mix(in srgb, var(--super) 12%, var(--card))'
                : 'var(--paper-2)',
              border: `1.5px solid ${isActive ? 'var(--super)' : 'var(--line)'}`,
              color: isActive ? 'var(--super)' : 'var(--ink-2)',
            }}
          >
            <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 500 }}>
              {m.icon}
            </div>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}
            >
              {m.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Utils
function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(n);
}

function methodLabel(m: PaymentMethod | null): string {
  if (!m) return '';
  const labels: Record<string, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale',
    online: 'Online',
    split: 'Böl.',
    other: 'Diğer',
  };
  return labels[m] || m;
}
