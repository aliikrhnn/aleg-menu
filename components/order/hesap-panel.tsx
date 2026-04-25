'use client';

/**
 * Aleg — Hesap Paneli
 *
 * Yan panel layout (C3) — masa hesabı, ödeme, menü hep bir arada.
 *
 * Paket A: Sol kalemler + Orta basit ödeme
 * Paket B (sonra): Sağ menü tab + mobile responsive
 */

import { useState, useMemo, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  makeItemsComplimentary,
  splitItemsFromMultipleOrders,
  type TableOrderDetail,
} from '@/lib/actions/tables-status';
import {
  takePayment,
  type PaymentMethod,
} from '@/lib/actions/payments';

const fmt = (n: number) =>
  `₺${Math.round(n).toLocaleString('tr-TR')}`;

type FlatItem = {
  orderId: string;
  orderNo: string;
  orderStatus: string;
  orderPaymentStatus: string;
  item: TableOrderDetail['items'][number];
  lineTotal: number;
};

type Props = {
  tableId: string;
  tableName: string;
  orders: TableOrderDetail[];
  cashierId: string;
  onClose: () => void;
  onChanged: () => void; // siparişler değişince refresh
};

export function HesapPanel({
  tableId,
  tableName,
  orders,
  cashierId,
  onClose,
  onChanged,
}: Props) {
  // SOL: Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // ORTA: Ödeme yöntemi + işlem
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Flat items (ödenmemiş + ödenmiş hepsi)
  const flatItems: FlatItem[] = useMemo(() => {
    const result: FlatItem[] = [];
    orders.forEach((o) => {
      const isPaid =
        o.payment_status === 'paid' || o.payment_status === 'refunded';
      o.items.forEach((it) => {
        result.push({
          orderId: o.id,
          orderNo: o.order_no,
          orderStatus: o.status,
          orderPaymentStatus: isPaid ? 'paid' : 'unpaid',
          item: it,
          lineTotal: it.is_complimentary ? 0 : it.unit_price * it.quantity,
        });
      });
    });
    return result;
  }, [orders]);

  const selectableItems = useMemo(
    () => flatItems.filter((fi) => fi.orderPaymentStatus === 'unpaid'),
    [flatItems]
  );

  const selectedFlatItems = useMemo(
    () =>
      selectableItems.filter((fi) =>
        selectedItems.has(`${fi.orderId}__${fi.item.id}`)
      ),
    [selectableItems, selectedItems]
  );

  const selectedTotal = selectedFlatItems.reduce(
    (s, fi) => s + fi.lineTotal,
    0
  );

  const tableTotal = orders.reduce((s, o) => s + o.total, 0);
  const unpaidOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.payment_status !== 'paid' && o.payment_status !== 'refunded'
      ),
    [orders]
  );
  const unpaidTotal = unpaidOrders.reduce((s, o) => s + o.total, 0);

  const toggleItem = (orderId: string, itemId: string) => {
    setSelectedItems((prev) => {
      const key = `${orderId}__${itemId}`;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItems.size === selectableItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(
        new Set(selectableItems.map((fi) => `${fi.orderId}__${fi.item.id}`))
      );
    }
  };

  const clearSelection = () => setSelectedItems(new Set());

  const isPartialMode = selectedItems.size > 0;
  const payableAmount = isPartialMode ? selectedTotal : unpaidTotal;

  // ============================================================
  // ÖDEME İŞLEMLERİ
  // ============================================================

  const handlePayAll = useCallback(async () => {
    if (unpaidOrders.length === 0) {
      toast.info('Ödenmemiş sipariş yok');
      return;
    }
    const ok = await confirmDialog({
      title: 'Tüm masayı öde?',
      body: `${fmt(unpaidTotal)} tutarında ${unpaidOrders.length} sipariş ödenecek. Yöntem: ${methodLabel(paymentMethod)}.`,
      confirmLabel: 'Ödemeyi Al',
      cancelLabel: 'Vazgeç',
    });
    if (!ok) return;

    setSubmitting(true);
    let allOk = true;
    const failures: string[] = [];

    for (const o of unpaidOrders) {
      const r = await takePayment({
        orderId: o.id,
        paymentMethod,
        amount: o.total,
        autoPrint: false,
      });
      if (!r.success) {
        allOk = false;
        failures.push(`#${o.order_no}: ${r.error || 'hata'}`);
      }
    }
    setSubmitting(false);

    if (!allOk) {
      toast.error(`Bazı ödemeler başarısız: ${failures.join(' · ')}`);
      onChanged();
      return;
    }
    toast.success(
      `${unpaidOrders.length} sipariş ödendi · ${fmt(unpaidTotal)}`
    );
    onChanged();
    // Tüm masa ödendi → kısa delay ile kapat
    setTimeout(() => onClose(), 600);
  }, [unpaidOrders, unpaidTotal, paymentMethod, onChanged, onClose]);

  const handlePaySelected = useCallback(async () => {
    if (selectedFlatItems.length === 0) return;
    const ok = await confirmDialog({
      title: 'Seçili kalemleri öde?',
      body: `${fmt(selectedTotal)} tutarında ${selectedFlatItems.length} kalem ayrı bir hesap olarak ödenecek. Yöntem: ${methodLabel(paymentMethod)}.`,
      confirmLabel: 'Ayır ve Öde',
      cancelLabel: 'Vazgeç',
    });
    if (!ok) return;

    setSubmitting(true);

    // 1) Kalemleri yeni siparişe ayır (aynı masada)
    const itemIds = selectedFlatItems.map((fi) => fi.item.id);
    const splitR = await splitItemsFromMultipleOrders({
      itemIds,
      targetTableId: tableId,
      cashierId,
    });
    if (!splitR.success || !splitR.newOrderId) {
      setSubmitting(false);
      toast.error(splitR.error || 'Kalemler ayrılamadı');
      return;
    }

    // 2) Yeni sipariş için ödeme al
    const payR = await takePayment({
      orderId: splitR.newOrderId,
      paymentMethod,
      amount: selectedTotal,
      autoPrint: false,
    });
    setSubmitting(false);

    if (!payR.success) {
      toast.error(payR.error || 'Ödeme alınamadı');
      onChanged(); // yine de refresh - split yapıldı
      return;
    }
    toast.success(`${fmt(selectedTotal)} ödendi`);
    clearSelection();
    onChanged();
  }, [
    selectedFlatItems,
    selectedTotal,
    tableId,
    cashierId,
    paymentMethod,
    onChanged,
  ]);

  // ============================================================
  // İKRAM
  // ============================================================

  const handleGiftSelected = useCallback(async () => {
    if (selectedFlatItems.length === 0) return;
    const ok = await confirmDialog({
      title: 'Seçili kalemleri ikram?',
      body: `${selectedFlatItems.length} kalem ikram edilecek.`,
      confirmLabel: 'İkram Et',
      cancelLabel: 'Vazgeç',
    });
    if (!ok) return;

    // OrderId bazında grupla
    const grouped = new Map<string, string[]>();
    selectedFlatItems.forEach((fi) => {
      if (!grouped.has(fi.orderId)) grouped.set(fi.orderId, []);
      grouped.get(fi.orderId)!.push(fi.item.id);
    });

    let allOk = true;
    for (const [oid, ids] of grouped.entries()) {
      const r = await makeItemsComplimentary({
        orderId: oid,
        itemIds: ids,
        reason: 'Toplu ikram',
      });
      if (!r.success) {
        allOk = false;
        toast.error(r.error || 'İkram hatası');
      }
    }
    if (allOk) {
      toast.success(`${selectedFlatItems.length} kalem ikram edildi`);
    }
    clearSelection();
    onChanged();
  }, [selectedFlatItems, onChanged]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.65)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-[1200px] h-full max-h-[90vh] rounded-[14px] flex flex-col overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 24px 80px -20px rgba(0,0,0,0.5)',
          animation: 'aleg-modal-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes aleg-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

        {/* HEADER */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0"
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
              HESAP AL
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              Masa{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--accent)',
                }}
              >
                {tableName}
              </span>
            </h2>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-right">
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
                MASA TOPLAM
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
                {fmt(tableTotal)}
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center transition-colors hover:bg-paper-2 disabled:opacity-40"
              style={{ color: 'var(--ink-2)' }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2-SÜTUN LAYOUT (paket A) */}
        <div className="flex-1 flex min-h-0">
          {/* SOL: KALEMLER */}
          <div
            className="flex flex-col min-w-0 flex-1"
            style={{ borderRight: '1px solid var(--line)' }}
          >
            {/* Toplu seçim header */}
            {selectableItems.length > 0 && (
              <div
                className="px-5 py-3 flex items-center justify-between gap-2 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-xs"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: 'var(--ink-2)',
                    textTransform: 'uppercase',
                  }}
                >
                  <CheckBoxIndicator
                    active={
                      selectedItems.size > 0 &&
                      selectedItems.size === selectableItems.length
                    }
                    partial={
                      selectedItems.size > 0 &&
                      selectedItems.size < selectableItems.length
                    }
                  />
                  {selectedItems.size === 0
                    ? `${selectableItems.length} kalem`
                    : `${selectedItems.size} seçili`}
                </button>
                {selectedItems.size > 0 && (
                  <button
                    onClick={clearSelection}
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    × TEMİZLE
                  </button>
                )}
              </div>
            )}

            {/* Kalem listesi */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {flatItems.length === 0 ? (
                <div
                  className="py-12 text-center"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Bu masada kalem yok
                </div>
              ) : (
                <div className="space-y-1.5">
                  {flatItems.map((fi) => {
                    const key = `${fi.orderId}__${fi.item.id}`;
                    const isSelected = selectedItems.has(key);
                    const isPaid = fi.orderPaymentStatus === 'paid';
                    return (
                      <FlatItemRow
                        key={key}
                        flatItem={fi}
                        isSelected={isSelected}
                        isPaid={isPaid}
                        isComplimentary={fi.item.is_complimentary}
                        onToggle={
                          isPaid
                            ? undefined
                            : () => toggleItem(fi.orderId, fi.item.id)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sol footer - İkram butonu */}
            {selectedItems.size > 0 && (
              <div
                className="px-5 py-3 flex-shrink-0"
                style={{
                  background: 'var(--paper-2)',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <button
                  onClick={handleGiftSelected}
                  disabled={submitting}
                  className="w-full h-10 rounded-[10px] text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
                  style={{
                    background: 'transparent',
                    color: 'var(--gold)',
                    border: '1.5px solid var(--gold)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  ★ Seçili Kalemleri İkram Et
                </button>
              </div>
            )}
          </div>

          {/* ORTA: ÖDEME PANELİ */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{ width: 340, background: 'var(--paper-2)' }}
          >
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Mod göstergesi */}
              <div
                className="uppercase mb-3"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: isPartialMode ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {isPartialMode
                  ? `SEÇİLİ ÖDEME · ${selectedFlatItems.length} KALEM`
                  : 'TÜM MASA ÖDEMESİ'}
              </div>

              {/* Tutar büyük gösterim */}
              <div
                className="rounded-[12px] p-4 mb-4"
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="uppercase mb-1.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--ink-3)',
                  }}
                >
                  ÖDENECEK TUTAR
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 36,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  {fmt(payableAmount)}
                </div>
              </div>

              {/* Ödeme yöntemi */}
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-2)',
                }}
              >
                YÖNTEM
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                <PayMethodButton
                  active={paymentMethod === 'cash'}
                  onClick={() => setPaymentMethod('cash')}
                  icon="💵"
                  label="Nakit"
                />
                <PayMethodButton
                  active={paymentMethod === 'card'}
                  onClick={() => setPaymentMethod('card')}
                  icon="💳"
                  label="Kart"
                />
                <PayMethodButton
                  active={paymentMethod === 'transfer'}
                  onClick={() => setPaymentMethod('transfer')}
                  icon="↗"
                  label="Havale"
                />
                <PayMethodButton
                  active={paymentMethod === 'online'}
                  onClick={() => setPaymentMethod('online')}
                  icon="📱"
                  label="Online"
                />
              </div>
            </div>

            {/* Sticky bottom - Ödeme butonu */}
            <div
              className="px-5 py-4 flex-shrink-0"
              style={{
                borderTop: '1px solid var(--line)',
                background: 'var(--paper)',
              }}
            >
              {isPartialMode ? (
                <button
                  onClick={handlePaySelected}
                  disabled={submitting || selectedFlatItems.length === 0}
                  className="w-full h-14 rounded-[12px] font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                  style={{
                    background: 'var(--accent)',
                    color: '#FAF5EA',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontSize: 13,
                    boxShadow:
                      '0 1px 2px rgba(196,85,58,0.2), 0 4px 16px -4px rgba(196,85,58,0.4)',
                  }}
                >
                  {submitting ? (
                    <span>İşleniyor...</span>
                  ) : (
                    <>
                      <span>Seçili Öde</span>
                      <span style={{ fontSize: 16 }}>·</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>
                        {fmt(selectedTotal)}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePayAll}
                  disabled={submitting || unpaidOrders.length === 0}
                  className="w-full h-14 rounded-[12px] font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                  style={{
                    background: 'var(--accent)',
                    color: '#FAF5EA',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontSize: 13,
                    boxShadow:
                      '0 1px 2px rgba(196,85,58,0.2), 0 4px 16px -4px rgba(196,85,58,0.4)',
                  }}
                >
                  {submitting ? (
                    <span>İşleniyor...</span>
                  ) : unpaidOrders.length === 0 ? (
                    <span>Tüm Masa Ödendi ✓</span>
                  ) : (
                    <>
                      <span>Tüm Masayı Öde</span>
                      <span style={{ fontSize: 16 }}>·</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>
                        {fmt(unpaidTotal)}
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* İpucu */}
              <div
                className="mt-2 text-[11px] text-center"
                style={{ color: 'var(--ink-3)' }}
              >
                {isPartialMode
                  ? 'Seçili kalemler ayrı bir hesap olarak ödenir'
                  : 'Tüm açık siparişler tek seferde ödenir'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function methodLabel(m: PaymentMethod): string {
  switch (m) {
    case 'cash':
      return 'Nakit';
    case 'card':
      return 'Kart';
    case 'transfer':
      return 'Havale';
    case 'online':
      return 'Online';
    case 'split':
      return 'Bölünmüş';
    default:
      return 'Diğer';
  }
}

function PayMethodButton({
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
      className="h-12 rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.97]"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
          : 'var(--paper)',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
        color: active ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ============================================================
// FLAT ITEM ROW (TableDetailModal'dakiyle aynı, lokal kopya)
// ============================================================
function FlatItemRow({
  flatItem,
  isSelected,
  isPaid,
  isComplimentary,
  onToggle,
}: {
  flatItem: FlatItem;
  isSelected: boolean;
  isPaid: boolean;
  isComplimentary: boolean;
  onToggle?: () => void;
}) {
  const { item } = flatItem;
  const itemStatusConfig: Record<string, { label: string; color: string }> = {
    received: { label: 'YENİ', color: 'var(--accent)' },
    confirmed: { label: 'ONAY', color: 'var(--gold)' },
    preparing: { label: 'HAZIRLANIYOR', color: 'var(--warn)' },
    ready: { label: 'HAZIR', color: 'var(--ok)' },
    delivered: { label: 'TESLİM', color: 'var(--olive)' },
    cancelled: { label: 'İPTAL', color: 'var(--ink-3)' },
  };
  const itemCfg =
    itemStatusConfig[flatItem.orderStatus] || itemStatusConfig.received;

  return (
    <div
      className="flex items-start gap-2.5 p-2.5 rounded-[10px] transition-all"
      style={{
        background: isSelected
          ? 'color-mix(in srgb, var(--accent) 6%, var(--paper))'
          : isPaid
            ? 'color-mix(in srgb, var(--ok) 4%, transparent)'
            : 'var(--paper)',
        border: `1px solid ${
          isSelected
            ? 'color-mix(in srgb, var(--accent) 35%, var(--line))'
            : 'var(--line)'
        }`,
        opacity: isPaid ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
        className="flex-shrink-0 mt-0.5"
        style={{ cursor: onToggle ? 'pointer' : 'not-allowed' }}
        aria-label={isSelected ? 'Seçimi kaldır' : 'Seç'}
      >
        <CheckBoxIndicator active={isSelected} disabled={!onToggle} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-ink"
            style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}
          >
            {item.quantity}× {item.product_name}
          </span>
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: itemCfg.color,
              padding: '1px 5px',
              borderRadius: 3,
              background: `color-mix(in srgb, ${itemCfg.color} 12%, transparent)`,
            }}
          >
            {itemCfg.label}
          </span>
          {isPaid && (
            <span
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--ok)',
                padding: '1px 5px',
                borderRadius: 3,
                background: 'color-mix(in srgb, var(--ok) 12%, transparent)',
              }}
            >
              ✓ ÖDENDİ
            </span>
          )}
          {isComplimentary && (
            <span
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--gold)',
                padding: '1px 5px',
                borderRadius: 3,
                background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
              }}
            >
              ★ İKRAM
            </span>
          )}
        </div>

        {item.note && (
          <div
            className="mt-0.5 text-ink-2"
            style={{
              fontSize: 11.5,
              fontStyle: 'italic',
              lineHeight: 1.35,
            }}
          >
            &ldquo;{item.note}&rdquo;
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
        <span
          className="text-ink"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: isComplimentary ? 'line-through' : 'none',
            opacity: isComplimentary ? 0.5 : 1,
          }}
        >
          {fmt(item.unit_price * item.quantity)}
        </span>
      </div>
    </div>
  );
}

function CheckBoxIndicator({
  active,
  partial = false,
  disabled = false,
}: {
  active: boolean;
  partial?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className="grid place-items-center"
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        background: active
          ? 'var(--accent)'
          : disabled
            ? 'var(--paper-2)'
            : 'transparent',
        border: `1.5px solid ${
          active ? 'var(--accent)' : disabled ? 'var(--line)' : 'var(--ink-3)'
        }`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {active && !partial && (
        <svg
          width="11"
          height="11"
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
      {partial && (
        <div
          style={{
            width: 8,
            height: 2,
            background: '#FAF5EA',
            borderRadius: 1,
          }}
        />
      )}
    </div>
  );
}
