'use client';

/**
 * Aleg — Hesap Paneli (B versiyonu)
 *
 * 3-sütun split layout (C3):
 *   - Sol: Kalem listesi + checkbox seçim
 *   - Orta: Ödeme paneli (Nakit/Kart/Açık Hesap, İndirim, Parçalı)
 *   - Sağ: Embedded menü (ürün ekle)
 *
 * Mobile (< 1024px): tab bazlı [Kalemler] [Ödeme] [+ Ürün]
 *
 * Aksiyonlar:
 *   - İkram (kalem bazlı)
 *   - İptal (kalem bazlı)
 *   - İndirim (genel)
 *   - Parçalı Ödeme (multi-method split)
 *   - Açık Hesap (cari)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  makeItemsComplimentary,
  splitItemsFromMultipleOrders,
  cancelOrderItems,
  closeOrderOnAccount,
  type TableOrderDetail,
} from '@/lib/actions/tables-status';
import { takePayment } from '@/lib/actions/payments';
import { MenuPicker } from './menu-picker';

const fmt = (n: number) => `₺${Math.round(n).toLocaleString('tr-TR')}`;

type LocalPaymentMethod = 'cash' | 'card' | 'on_account';

type FlatItem = {
  orderId: string;
  orderNo: string;
  orderStatus: string;
  orderPaymentStatus: string;
  item: TableOrderDetail['items'][number];
  lineTotal: number;
};

type PartialEntry = {
  id: string;
  method: 'cash' | 'card';
  amount: number;
};

type MobileTab = 'items' | 'pay' | 'menu';

type Props = {
  tableId: string;
  tableName: string;
  orders: TableOrderDetail[];
  cashierId: string;
  onClose: () => void;
  onChanged: () => void;
};

export function HesapPanel({
  tableId,
  tableName,
  orders,
  cashierId,
  onClose,
  onChanged,
}: Props) {
  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Ödeme
  const [paymentMethod, setPaymentMethod] = useState<LocalPaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);

  // İndirim
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discount, setDiscount] = useState<{
    type: 'percent' | 'fixed';
    value: number;
    reason: string;
  } | null>(null);

  // Parçalı ödeme
  const [partialModalOpen, setPartialModalOpen] = useState(false);

  // İptal sebebi modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Açık hesap modal
  const [onAccountModalOpen, setOnAccountModalOpen] = useState(false);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('items');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Flat items
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

  // İndirim hesabı
  const baseAmount = selectedItems.size > 0 ? selectedTotal : unpaidTotal;
  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === 'percent') {
      return Math.min(baseAmount, (baseAmount * discount.value) / 100);
    }
    return Math.min(baseAmount, discount.value);
  }, [discount, baseAmount]);
  const payableAmount = Math.max(0, baseAmount - discountAmount);

  const isPartialMode = selectedItems.size > 0;

  // Selection helpers
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

  // ============================================================
  // ÖDEME — TÜM MASA
  // ============================================================
  const handlePayAll = useCallback(async () => {
    if (unpaidOrders.length === 0) {
      toast.info('Ödenmemiş sipariş yok');
      return;
    }

    if (paymentMethod === 'on_account') {
      setOnAccountModalOpen(true);
      return;
    }

    const ok = await confirmDialog({
      title: 'Tüm masayı öde?',
      body: `${fmt(payableAmount)} tutarında ${unpaidOrders.length} sipariş ödenecek. Yöntem: ${methodLabel(paymentMethod)}.${discount ? ` İndirim: ${fmt(discountAmount)}` : ''}`,
      confirmLabel: 'Ödemeyi Al',
      cancelLabel: 'Vazgeç',
    });
    if (!ok) return;

    setSubmitting(true);
    let allOk = true;
    const failures: string[] = [];

    // İndirim varsa orantısal dağıt
    let remainingDiscount = discountAmount;
    for (let i = 0; i < unpaidOrders.length; i++) {
      const o = unpaidOrders[i];
      const isLast = i === unpaidOrders.length - 1;
      const orderShare = isLast
        ? remainingDiscount
        : Math.round((discountAmount * Number(o.total)) / unpaidTotal);
      remainingDiscount -= orderShare;
      const orderPayable = Math.max(0, Number(o.total) - orderShare);

      const r = await takePayment({
        orderId: o.id,
        paymentMethod: paymentMethod === 'cash' ? 'cash' : 'card',
        amount: orderPayable,
        discountAmount: orderShare > 0 ? orderShare : undefined,
        discountReason: discount?.reason || undefined,
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
      `${unpaidOrders.length} sipariş ödendi · ${fmt(payableAmount)}`
    );
    setDiscount(null);
    onChanged();
    setTimeout(() => onClose(), 600);
  }, [
    unpaidOrders,
    unpaidTotal,
    paymentMethod,
    discountAmount,
    discount,
    payableAmount,
    onChanged,
    onClose,
  ]);

  // ============================================================
  // ÖDEME — SEÇİLİ
  // ============================================================
  const handlePaySelected = useCallback(async () => {
    if (selectedFlatItems.length === 0) return;

    if (paymentMethod === 'on_account') {
      setOnAccountModalOpen(true);
      return;
    }

    const ok = await confirmDialog({
      title: 'Seçili kalemleri öde?',
      body: `${fmt(payableAmount)} tutarında ${selectedFlatItems.length} kalem. Yöntem: ${methodLabel(paymentMethod)}.${discount ? ` İndirim: ${fmt(discountAmount)}` : ''}`,
      confirmLabel: 'Ayır ve Öde',
      cancelLabel: 'Vazgeç',
    });
    if (!ok) return;

    setSubmitting(true);

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

    const payR = await takePayment({
      orderId: splitR.newOrderId,
      paymentMethod: paymentMethod === 'cash' ? 'cash' : 'card',
      amount: payableAmount,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      discountReason: discount?.reason || undefined,
      autoPrint: false,
    });
    setSubmitting(false);

    if (!payR.success) {
      toast.error(payR.error || 'Ödeme alınamadı');
      onChanged();
      return;
    }
    toast.success(`${fmt(payableAmount)} ödendi`);
    clearSelection();
    setDiscount(null);
    onChanged();
  }, [
    selectedFlatItems,
    selectedTotal,
    payableAmount,
    discountAmount,
    discount,
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
  // İPTAL
  // ============================================================
  const handleCancelSelected = useCallback(
    async (reason: string) => {
      if (selectedFlatItems.length === 0) return;
      setSubmitting(true);
      const itemIds = selectedFlatItems.map((fi) => fi.item.id);
      const r = await cancelOrderItems({ itemIds, reason });
      setSubmitting(false);
      setCancelModalOpen(false);
      if (!r.success) {
        toast.error(r.error || 'İptal başarısız');
        return;
      }
      toast.success(`${r.cancelledCount} kalem iptal edildi`);
      clearSelection();
      onChanged();
    },
    [selectedFlatItems, onChanged]
  );

  // ============================================================
  // AÇIK HESAP
  // ============================================================
  const handleOnAccount = useCallback(
    async (note: string) => {
      setSubmitting(true);
      let allOk = true;
      const failures: string[] = [];

      // Tüm masa veya seçili kısım?
      if (isPartialMode) {
        // Önce kalemleri ayır
        const itemIds = selectedFlatItems.map((fi) => fi.item.id);
        const splitR = await splitItemsFromMultipleOrders({
          itemIds,
          targetTableId: tableId,
          cashierId,
        });
        if (!splitR.success || !splitR.newOrderId) {
          setSubmitting(false);
          setOnAccountModalOpen(false);
          toast.error(splitR.error || 'Ayırma başarısız');
          return;
        }
        const r = await closeOrderOnAccount({
          orderId: splitR.newOrderId,
          cashierId,
          customerNote: note,
        });
        if (!r.success) {
          allOk = false;
          failures.push(r.error || 'hata');
        }
      } else {
        for (const o of unpaidOrders) {
          const r = await closeOrderOnAccount({
            orderId: o.id,
            cashierId,
            customerNote: note,
          });
          if (!r.success) {
            allOk = false;
            failures.push(`#${o.order_no}: ${r.error}`);
          }
        }
      }

      setSubmitting(false);
      setOnAccountModalOpen(false);

      if (!allOk) {
        toast.error(`Hata: ${failures.join(' · ')}`);
        onChanged();
        return;
      }
      toast.success('Açık hesap olarak kapatıldı');
      clearSelection();
      onChanged();
      if (!isPartialMode) {
        setTimeout(() => onClose(), 600);
      }
    },
    [
      isPartialMode,
      selectedFlatItems,
      unpaidOrders,
      tableId,
      cashierId,
      onChanged,
      onClose,
    ]
  );

  // ============================================================
  // PARÇALI ÖDEME — multi-method split
  // ============================================================
  const handlePartialPayment = useCallback(
    async (entries: PartialEntry[]) => {
      if (entries.length === 0) return;
      const totalEntered = entries.reduce((s, e) => s + e.amount, 0);
      if (Math.abs(totalEntered - payableAmount) > 0.01) {
        toast.error(
          `Girilen tutar (${fmt(totalEntered)}) hedef ile uyuşmuyor (${fmt(payableAmount)})`
        );
        return;
      }

      setSubmitting(true);
      setPartialModalOpen(false);

      // İndirim varsa hedef toplam: payableAmount, ama her kayıt'ı kayıt et
      // Önce ödeme yapılacak siparişi belirle
      let targetOrderId: string;
      if (isPartialMode) {
        // Önce kalemleri ayır
        const itemIds = selectedFlatItems.map((fi) => fi.item.id);
        const splitR = await splitItemsFromMultipleOrders({
          itemIds,
          targetTableId: tableId,
          cashierId,
        });
        if (!splitR.success || !splitR.newOrderId) {
          setSubmitting(false);
          toast.error(splitR.error || 'Ayırma başarısız');
          return;
        }
        targetOrderId = splitR.newOrderId;
      } else if (unpaidOrders.length === 1) {
        targetOrderId = unpaidOrders[0].id;
      } else {
        // Birden fazla siparişi tek havuzda ayır
        const allItemIds: string[] = [];
        unpaidOrders.forEach((o) => {
          o.items.forEach((it) => allItemIds.push(it.id));
        });
        const splitR = await splitItemsFromMultipleOrders({
          itemIds: allItemIds,
          targetTableId: tableId,
          cashierId,
        });
        if (!splitR.success || !splitR.newOrderId) {
          setSubmitting(false);
          toast.error(splitR.error || 'Birleştirme başarısız');
          return;
        }
        targetOrderId = splitR.newOrderId;
      }

      // Her parça için ayrı takePayment
      // Birinci parça indirimi de taşır
      let allOk = true;
      const failures: string[] = [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const isFirst = i === 0;
        const r = await takePayment({
          orderId: targetOrderId,
          paymentMethod: e.method,
          amount: e.amount,
          discountAmount:
            isFirst && discountAmount > 0 ? discountAmount : undefined,
          discountReason: isFirst && discount ? discount.reason : undefined,
          note: `Parçalı ödeme ${i + 1}/${entries.length}`,
          autoPrint: false,
        });
        if (!r.success) {
          allOk = false;
          failures.push(`Parça ${i + 1}: ${r.error}`);
        }
      }

      setSubmitting(false);
      if (!allOk) {
        toast.error(failures.join(' · '));
        onChanged();
        return;
      }
      toast.success(`Parçalı ödeme tamamlandı · ${fmt(payableAmount)}`);
      clearSelection();
      setDiscount(null);
      onChanged();
      if (!isPartialMode) {
        setTimeout(() => onClose(), 600);
      }
    },
    [
      isPartialMode,
      selectedFlatItems,
      unpaidOrders,
      payableAmount,
      discountAmount,
      discount,
      tableId,
      cashierId,
      onChanged,
      onClose,
    ]
  );

  // ============================================================
  // RENDER
  // ============================================================

  // Mobile tab buton
  const MobileTabBtn = ({
    tab,
    label,
    badge,
  }: {
    tab: MobileTab;
    label: string;
    badge?: string | number;
  }) => (
    <button
      type="button"
      onClick={() => setMobileTab(tab)}
      className="flex-1 h-12 flex flex-col items-center justify-center gap-0.5 transition-all"
      style={{
        background: mobileTab === tab ? 'var(--paper)' : 'transparent',
        borderTop: `2px solid ${mobileTab === tab ? 'var(--accent)' : 'transparent'}`,
        color: mobileTab === tab ? 'var(--accent)' : 'var(--ink-3)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      {badge !== undefined && (
        <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(42, 31, 24, 0.65)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-[1400px] h-full max-h-[95vh] rounded-[14px] flex flex-col overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 24px 80px -20px rgba(0,0,0,0.5)',
          animation: 'aleg-modal-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes aleg-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

        {/* HEADER */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="uppercase mb-0.5 sm:mb-1"
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
              className="truncate"
              style={{
                fontFamily: 'var(--f-serif)',
                fontSize: 22,
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
          <div className="flex items-baseline gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
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
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                {fmt(tableTotal)}
              </div>
              {unpaidTotal !== tableTotal && (
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    marginTop: 2,
                  }}
                >
                  Kalan: {fmt(unpaidTotal)}
                </div>
              )}
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

        {/* DESKTOP: 3-SÜTUN | MOBILE: TEK SÜTUN + ALT TAB */}
        <div className="flex-1 flex min-h-0 lg:flex-row flex-col">
          {/* SOL: KALEMLER */}
          <div
            className={`flex flex-col min-w-0 flex-1 lg:border-r ${
              isMobile && mobileTab !== 'items' ? 'hidden' : ''
            }`}
            style={{ borderColor: 'var(--line)' }}
          >
            {/* Toplu seçim header */}
            {selectableItems.length > 0 && (
              <div
                className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 flex-shrink-0"
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
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
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

            {/* Sol footer - Kalem aksiyon butonları (ikram + iptal) */}
            {selectedItems.size > 0 && (
              <div
                className="px-4 sm:px-5 py-3 flex-shrink-0 flex gap-2"
                style={{
                  background: 'var(--paper-2)',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <button
                  onClick={handleGiftSelected}
                  disabled={submitting}
                  className="flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
                  style={{
                    background: 'transparent',
                    color: 'var(--gold)',
                    border: '1.5px solid var(--gold)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  ★ İkram
                </button>
                <button
                  onClick={() => setCancelModalOpen(true)}
                  disabled={submitting}
                  className="flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
                  style={{
                    background: 'transparent',
                    color: 'var(--danger)',
                    border: '1.5px solid var(--danger)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  🚫 İptal
                </button>
              </div>
            )}
          </div>

          {/* ORTA: ÖDEME PANELİ */}
          <div
            className={`flex flex-col flex-shrink-0 lg:w-[340px] ${
              isMobile && mobileTab !== 'pay' ? 'hidden' : ''
            }`}
            style={{ background: 'var(--paper-2)' }}
          >
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
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

              {/* Tutar gösterim */}
              <div
                className="rounded-[12px] p-4 mb-3"
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="uppercase mb-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--ink-3)',
                  }}
                >
                  {discount ? 'ARA TOPLAM' : 'ÖDENECEK TUTAR'}
                </div>
                {discount ? (
                  <>
                    <div
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--ink-2)',
                        textDecoration: 'line-through',
                        opacity: 0.6,
                      }}
                    >
                      {fmt(baseAmount)}
                    </div>
                    <div
                      className="flex items-center gap-1.5 mt-0.5"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}
                    >
                      <span>İNDİRİM</span>
                      <span>−{fmt(discountAmount)}</span>
                      <button
                        onClick={() => setDiscount(null)}
                        className="ml-auto"
                        style={{ color: 'var(--ink-3)', fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </div>
                    <div
                      className="mt-2 pt-2"
                      style={{ borderTop: '1px solid var(--line)' }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--f-serif)',
                          fontStyle: 'italic',
                          fontSize: 32,
                          fontWeight: 500,
                          color: 'var(--ink)',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.05,
                        }}
                      >
                        {fmt(payableAmount)}
                      </div>
                    </div>
                  </>
                ) : (
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
                )}
              </div>

              {/* Yöntem (3'lü grid) */}
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
              <div className="grid grid-cols-3 gap-1.5 mb-3">
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
                  active={paymentMethod === 'on_account'}
                  onClick={() => setPaymentMethod('on_account')}
                  icon="📒"
                  label="Açık Hes."
                />
              </div>

              {/* Aksiyon butonları */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <button
                  onClick={() => setDiscountModalOpen(true)}
                  disabled={submitting}
                  className="h-10 rounded-[8px] text-xs transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                  style={{
                    background: 'var(--paper)',
                    color: 'var(--accent)',
                    border: '1.5px solid var(--accent)',
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  🏷 İndirim
                </button>
                <button
                  onClick={() => setPartialModalOpen(true)}
                  disabled={submitting || paymentMethod === 'on_account'}
                  className="h-10 rounded-[8px] text-xs transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                  style={{
                    background: 'var(--paper)',
                    color: 'var(--super)',
                    border: '1.5px solid var(--super)',
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  💸 Parçalı
                </button>
              </div>
            </div>

            {/* Sticky bottom - Ana ödeme butonu */}
            <div
              className="px-4 sm:px-5 py-3 flex-shrink-0"
              style={{
                borderTop: '1px solid var(--line)',
                background: 'var(--paper)',
              }}
            >
              <button
                onClick={isPartialMode ? handlePaySelected : handlePayAll}
                disabled={
                  submitting ||
                  (isPartialMode
                    ? selectedFlatItems.length === 0
                    : unpaidOrders.length === 0)
                }
                className="w-full h-13 rounded-[12px] font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                style={{
                  background:
                    paymentMethod === 'on_account'
                      ? 'var(--super)'
                      : 'var(--accent)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontSize: 12,
                  height: 50,
                  boxShadow: '0 1px 2px rgba(196,85,58,0.2), 0 4px 16px -4px rgba(196,85,58,0.4)',
                }}
              >
                {submitting ? (
                  <span>İşleniyor…</span>
                ) : !isPartialMode && unpaidOrders.length === 0 ? (
                  <span>Tüm Masa Ödendi ✓</span>
                ) : (
                  <>
                    <span>
                      {paymentMethod === 'on_account'
                        ? isPartialMode
                          ? 'Açık Hesaba Aktar'
                          : 'Açık Hesap Olarak Kapat'
                        : isPartialMode
                          ? 'Seçili Öde'
                          : 'Tüm Masayı Öde'}
                    </span>
                    <span>·</span>
                    <span style={{ fontWeight: 700 }}>{fmt(payableAmount)}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SAĞ: MENÜ (+ ÜRÜN EKLE) */}
          <div
            className={`flex flex-col flex-shrink-0 lg:w-[380px] lg:border-l ${
              isMobile && mobileTab !== 'menu' ? 'hidden' : ''
            }`}
            style={{ borderColor: 'var(--line)' }}
          >
            <MenuPicker
              tableId={tableId}
              targetOrderId={unpaidOrders[0]?.id}
              cashierId={cashierId}
              onAdded={onChanged}
            />
          </div>
        </div>

        {/* MOBILE TAB BAR */}
        {isMobile && (
          <div
            className="flex-shrink-0 flex"
            style={{
              background: 'var(--paper-2)',
              borderTop: '1px solid var(--line)',
            }}
          >
            <MobileTabBtn
              tab="items"
              label="Kalemler"
              badge={selectableItems.length}
            />
            <MobileTabBtn tab="pay" label="Ödeme" badge={fmt(payableAmount)} />
            <MobileTabBtn tab="menu" label="+ Ürün" />
          </div>
        )}
      </div>

      {/* === MODALS === */}
      {discountModalOpen && (
        <DiscountModal
          baseAmount={baseAmount}
          initial={discount}
          onClose={() => setDiscountModalOpen(false)}
          onApply={(d) => {
            setDiscount(d);
            setDiscountModalOpen(false);
          }}
        />
      )}

      {partialModalOpen && (
        <PartialPaymentModal
          totalDue={payableAmount}
          onClose={() => setPartialModalOpen(false)}
          onSubmit={handlePartialPayment}
        />
      )}

      {cancelModalOpen && (
        <CancelReasonModal
          itemCount={selectedFlatItems.length}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={handleCancelSelected}
        />
      )}

      {onAccountModalOpen && (
        <OnAccountModal
          amount={payableAmount}
          isPartial={isPartialMode}
          onClose={() => setOnAccountModalOpen(false)}
          onConfirm={handleOnAccount}
        />
      )}
    </div>
  );
}

// ============================================================
// HELPERS & SUB-COMPONENTS
// ============================================================

function methodLabel(m: LocalPaymentMethod): string {
  switch (m) {
    case 'cash':
      return 'Nakit';
    case 'card':
      return 'Kart';
    case 'on_account':
      return 'Açık Hesap';
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
          fontSize: 9,
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
  const isCancelled = item.status === 'cancelled';

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
        opacity: isPaid || isCancelled ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle || isCancelled}
        className="flex-shrink-0 mt-0.5"
        style={{
          cursor: onToggle && !isCancelled ? 'pointer' : 'not-allowed',
        }}
      >
        <CheckBoxIndicator
          active={isSelected}
          disabled={!onToggle || isCancelled}
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-ink"
            style={{
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.2,
              textDecoration: isCancelled ? 'line-through' : 'none',
            }}
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
              color: isCancelled ? 'var(--ink-3)' : itemCfg.color,
              padding: '1px 5px',
              borderRadius: 3,
              background: `color-mix(in srgb, ${isCancelled ? 'var(--ink-3)' : itemCfg.color} 12%, transparent)`,
            }}
          >
            {isCancelled ? 'İPTAL' : itemCfg.label}
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
          {isComplimentary && !isCancelled && (
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
            style={{ fontSize: 11.5, fontStyle: 'italic', lineHeight: 1.35 }}
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
            textDecoration:
              isComplimentary || isCancelled ? 'line-through' : 'none',
            opacity: isComplimentary || isCancelled ? 0.5 : 1,
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

// ============================================================
// İNDİRİM MODAL
// ============================================================
function DiscountModal({
  baseAmount,
  initial,
  onClose,
  onApply,
}: {
  baseAmount: number;
  initial: { type: 'percent' | 'fixed'; value: number; reason: string } | null;
  onClose: () => void;
  onApply: (d: {
    type: 'percent' | 'fixed';
    value: number;
    reason: string;
  }) => void;
}) {
  const [type, setType] = useState<'percent' | 'fixed'>(
    initial?.type || 'percent'
  );
  const [valueStr, setValueStr] = useState(
    initial?.value ? String(initial.value) : ''
  );
  const [reason, setReason] = useState(initial?.reason || '');

  const value = parseFloat(valueStr) || 0;
  const calc = useMemo(() => {
    if (type === 'percent') {
      return Math.min(baseAmount, (baseAmount * value) / 100);
    }
    return Math.min(baseAmount, value);
  }, [type, value, baseAmount]);

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-[14px] flex flex-col overflow-hidden"
        style={{ background: 'var(--paper)' }}
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
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            İNDİRİM UYGULA
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
            }}
          >
            {fmt(baseAmount)} üzerinden
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Tür */}
          <div>
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
              TÜR
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setType('percent')}
                className="h-12 rounded-[8px] transition-all"
                style={{
                  background:
                    type === 'percent'
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                      : 'var(--card)',
                  border: `1.5px solid ${type === 'percent' ? 'var(--accent)' : 'var(--line)'}`,
                  color: type === 'percent' ? 'var(--accent)' : 'var(--ink-2)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                % YÜZDE
              </button>
              <button
                type="button"
                onClick={() => setType('fixed')}
                className="h-12 rounded-[8px] transition-all"
                style={{
                  background:
                    type === 'fixed'
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                      : 'var(--card)',
                  border: `1.5px solid ${type === 'fixed' ? 'var(--accent)' : 'var(--line)'}`,
                  color: type === 'fixed' ? 'var(--accent)' : 'var(--ink-2)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ₺ SABİT TUTAR
              </button>
            </div>
          </div>

          {/* Değer */}
          <div>
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
              DEĞER {type === 'percent' ? '(%)' : '(₺)'}
            </div>
            <input
              type="number"
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              placeholder={type === 'percent' ? '10' : '50'}
              autoFocus
              className="w-full h-12 px-3 rounded-[8px] text-lg font-semibold"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
                fontFamily: 'var(--f-mono)',
              }}
            />
            {/* Hızlı seçimler */}
            {type === 'percent' && (
              <div className="flex gap-1.5 mt-2">
                {[5, 10, 15, 20, 25].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValueStr(String(v))}
                    className="flex-1 h-8 rounded-[6px] text-xs"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink-2)',
                      fontFamily: 'var(--f-mono)',
                      fontWeight: 600,
                    }}
                  >
                    %{v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sebep */}
          <div>
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
              SEBEP (opsiyonel)
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="örn: sadakat indirimi, personel..."
              className="w-full h-10 px-3 rounded-[8px] text-sm"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>

          {/* Sonuç */}
          {value > 0 && (
            <div
              className="rounded-[10px] p-3"
              style={{
                background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                border:
                  '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
              }}
            >
              <div
                className="text-xs mb-1"
                style={{ color: 'var(--ink-2)' }}
              >
                İndirim:{' '}
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}>
                  −{fmt(calc)}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  color: 'var(--ink)',
                }}
              >
                Yeni Toplam: {fmt(baseAmount - calc)}
              </div>
            </div>
          )}
        </div>

        <div
          className="px-5 py-4 flex gap-2"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={() => {
              if (value <= 0) {
                toast.error('Geçerli bir değer gir');
                return;
              }
              onApply({ type, value, reason });
            }}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PARÇALI ÖDEME MODAL
// ============================================================
function PartialPaymentModal({
  totalDue,
  onClose,
  onSubmit,
}: {
  totalDue: number;
  onClose: () => void;
  onSubmit: (entries: PartialEntry[]) => void;
}) {
  const [entries, setEntries] = useState<PartialEntry[]>([]);
  const [draftMethod, setDraftMethod] = useState<'cash' | 'card'>('cash');
  const [draftAmount, setDraftAmount] = useState('');

  const totalAdded = entries.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, totalDue - totalAdded);

  const addEntry = () => {
    const amt = parseFloat(draftAmount) || 0;
    if (amt <= 0) {
      toast.error('Geçerli tutar gir');
      return;
    }
    if (amt > remaining + 0.01) {
      toast.error(`Maksimum ${fmt(remaining)} ekleyebilirsin`);
      return;
    }
    setEntries((prev) => [
      ...prev,
      { id: `e${Date.now()}`, method: draftMethod, amount: amt },
    ]);
    setDraftAmount('');
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const splitHalfHalf = () => {
    const half = Math.round(totalDue / 2);
    setEntries([
      { id: 'h1', method: 'cash', amount: half },
      { id: 'h2', method: 'card', amount: totalDue - half },
    ]);
  };

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[14px] flex flex-col overflow-hidden"
        style={{ background: 'var(--paper)', maxHeight: '90vh' }}
      >
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
              letterSpacing: '0.16em',
              color: 'var(--super)',
            }}
          >
            PARÇALI ÖDEME
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                color: 'var(--ink)',
              }}
            >
              Toplam {fmt(totalDue)}
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: remaining === 0 ? 'var(--ok)' : 'var(--accent)',
              }}
            >
              KALAN: {fmt(remaining)}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Hızlı seçimler */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={splitHalfHalf}
              className="flex-1 h-9 rounded-[6px] text-xs"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                fontWeight: 700,
              }}
            >
              YARI YARI (NAKİT/KART)
            </button>
            <button
              type="button"
              onClick={() => setDraftAmount(String(Math.round(totalDue / 2)))}
              className="h-9 px-3 rounded-[6px] text-xs"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                fontWeight: 700,
              }}
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => setDraftAmount(String(Math.round(totalDue / 3)))}
              className="h-9 px-3 rounded-[6px] text-xs"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                fontWeight: 700,
              }}
            >
              ⅓
            </button>
          </div>

          {/* Yeni parça ekle */}
          {remaining > 0 && (
            <div
              className="rounded-[10px] p-3 space-y-2"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
            >
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftMethod('cash')}
                  className="h-10 rounded-[8px] text-xs font-semibold"
                  style={{
                    background:
                      draftMethod === 'cash'
                        ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                        : 'var(--paper)',
                    border: `1.5px solid ${draftMethod === 'cash' ? 'var(--accent)' : 'var(--line)'}`,
                    color: draftMethod === 'cash' ? 'var(--accent)' : 'var(--ink-2)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  💵 Nakit
                </button>
                <button
                  type="button"
                  onClick={() => setDraftMethod('card')}
                  className="h-10 rounded-[8px] text-xs font-semibold"
                  style={{
                    background:
                      draftMethod === 'card'
                        ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                        : 'var(--paper)',
                    border: `1.5px solid ${draftMethod === 'card' ? 'var(--accent)' : 'var(--line)'}`,
                    color: draftMethod === 'card' ? 'var(--accent)' : 'var(--ink-2)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  💳 Kart
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  placeholder="₺ tutar"
                  className="flex-1 h-10 px-3 rounded-[8px] text-base font-semibold"
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    fontFamily: 'var(--f-mono)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={addEntry}
                  className="h-10 px-4 rounded-[8px] text-xs font-semibold"
                  style={{
                    background: 'var(--super)',
                    color: '#FAF5EA',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  + EKLE
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDraftAmount(String(remaining))}
                className="w-full text-xs text-center"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 600,
                }}
              >
                Kalanın hepsini ({fmt(remaining)}) ekle
              </button>
            </div>
          )}

          {/* Eklenen parçalar */}
          {entries.length > 0 && (
            <div className="space-y-1.5">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-2)',
                }}
              >
                EKLENEN PARÇALAR ({entries.length})
              </div>
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 p-2.5 rounded-[8px]"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <span style={{ fontSize: 16 }}>
                    {e.method === 'cash' ? '💵' : '💳'}
                  </span>
                  <span
                    className="flex-1"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {e.method === 'cash' ? 'NAKİT' : 'KART'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    {fmt(e.amount)}
                  </span>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="w-7 h-7 rounded-[6px]"
                    style={{
                      background: 'transparent',
                      color: 'var(--ink-3)',
                      fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="px-5 py-4 flex gap-2 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={() => onSubmit(entries)}
            disabled={remaining > 0.01 || entries.length === 0}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold disabled:opacity-40"
            style={{
              background: 'var(--super)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {remaining > 0.01 ? `Kalan: ${fmt(remaining)}` : 'Ödemeyi Al'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// İPTAL SEBEBİ MODAL
// ============================================================
function CancelReasonModal({
  itemCount,
  onClose,
  onConfirm,
}: {
  itemCount: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const presets = ['Yanlış sipariş', 'Müşteri vazgeçti', 'Stokta yok', 'Diğer'];

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-[14px] flex flex-col overflow-hidden"
        style={{ background: 'var(--paper)' }}
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
              letterSpacing: '0.16em',
              color: 'var(--danger)',
            }}
          >
            İPTAL ET
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              color: 'var(--ink)',
            }}
          >
            {itemCount} kalem iptal edilecek
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
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
              SEBEP
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className="h-8 px-3 rounded-full text-xs"
                  style={{
                    background:
                      reason === p
                        ? 'color-mix(in srgb, var(--danger) 10%, var(--paper))'
                        : 'var(--card)',
                    border: `1px solid ${reason === p ? 'var(--danger)' : 'var(--line)'}`,
                    color: reason === p ? 'var(--danger)' : 'var(--ink-2)',
                    fontWeight: 600,
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
              placeholder="veya yaz..."
              className="w-full h-10 px-3 rounded-[8px] text-sm"
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
          className="px-5 py-4 flex gap-2"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'var(--danger)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            🚫 İptal Et
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AÇIK HESAP MODAL
// ============================================================
function OnAccountModal({
  amount,
  isPartial,
  onClose,
  onConfirm,
}: {
  amount: number;
  isPartial: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-[14px] flex flex-col overflow-hidden"
        style={{ background: 'var(--paper)' }}
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
              letterSpacing: '0.16em',
              color: 'var(--super)',
            }}
          >
            AÇIK HESAP
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
            }}
          >
            {fmt(amount)}{' '}
            {isPartial ? 'cariye aktarılacak' : 'açık hesaba kaydedilecek'}
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
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
              MÜŞTERİ NOTU (opsiyonel)
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="örn: Ahmet Bey, sonra ödeyecek..."
              className="w-full h-10 px-3 rounded-[8px] text-sm"
              autoFocus
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>
          <div
            className="rounded-[10px] p-3 text-xs"
            style={{
              background: 'color-mix(in srgb, var(--super) 6%, transparent)',
              border:
                '1px solid color-mix(in srgb, var(--super) 25%, var(--line))',
              color: 'var(--ink-2)',
              lineHeight: 1.5,
            }}
          >
            ℹ️ Sipariş ödenmiş olarak işaretlenecek. Müşteri ödemeyi sonra
            yapacak. Açıklama notunda detayları belirt.
          </div>
        </div>

        <div
          className="px-5 py-4 flex gap-2"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={() => onConfirm(note)}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'var(--super)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            📒 Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
