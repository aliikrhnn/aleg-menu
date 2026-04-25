'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getTableOrders,
  makeItemsComplimentary,
  mergeTables,
  splitItemsFromMultipleOrders,
  listTablesForMove,
  type TableOrderDetail,
  type TableWithStatus,
} from '@/lib/actions/tables-status';
import { PaymentModal } from '@/app/panel/(shell)/pos/payment-modal';
import { useCashierSession } from '@/lib/cashier-session';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { OrderTakingModal } from '@/components/order/order-taking-modal';
import { HesapPanel } from '@/components/order/hesap-panel';

const fmt = (n: number) =>
  `₺${Math.round(n).toLocaleString('tr-TR')}`;

type Props = {
  tableId: string;
  tableName: string;
  onClose: () => void;
};

export function TableDetailModal({
  tableId,
  tableName,
  onClose,
}: Props) {
  const [orders, setOrders] = useState<TableOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ödeme modali için seçili sipariş
  const [payingOrder, setPayingOrder] = useState<TableOrderDetail | null>(null);
  // Kalem bazlı ikram picker (itemId + orderId takip)
  const [giftItemContext, setGiftItemContext] = useState<{
    orderId: string;
    itemId: string;
  } | null>(null);
  // Masa aksiyonları menüsü
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  // Masa aksiyon modalları
  const [changeTableOpen, setChangeTableOpen] = useState(false); // tüm masalara taşı (boş veya dolu)
  const [splitOpen, setSplitOpen] = useState(false); // kalem bazlı böl
  // Hızlı ürün ekle modal (menüden direkt ekleme)
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Hesap paneli açık mı (yan panel layout)
  const [hesapPanelOpen, setHesapPanelOpen] = useState(false);
  // Kalem seçimi (orderId + itemId set olarak)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { cashier } = useCashierSession();

  const load = () => {
    getTableOrders(tableId).then((r) => {
      if (!r.success) {
        setError(r.error || 'Sipariş alınamadı');
      } else {
        setOrders(r.orders || []);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalAmount = orders.reduce((s, o) => s + o.total, 0);
  const totalItems = orders.reduce(
    (s, o) => s + o.items.reduce((si, it) => si + it.quantity, 0),
    0
  );
  const hasUnpaid = orders.some(
    (o) => o.payment_status !== 'paid' && o.payment_status !== 'refunded'
  );
  const complimentaryTotal = orders.reduce(
    (s, o) => s + o.complimentary_total,
    0
  );

  // Tüm kalemleri tek flat listede topla (sipariş ayrımı UI'da yok)
  // Sadece ödenmemiş siparişlerin kalemleri (paid olanlar görünmesin)
  type FlatItem = {
    orderId: string;
    orderNo: string;
    orderStatus: string;
    orderPaymentStatus: string;
    item: TableOrderDetail['items'][number];
    lineTotal: number;
  };

  const flatItems: FlatItem[] = useMemo(() => {
    const result: FlatItem[] = [];
    orders.forEach((o) => {
      // Ödenmiş siparişler ayrı altta gösterilebilir, şimdilik aktif olanları topla
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

  // Sadece ödenmemiş kalemler (selection için)
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

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[640px] max-h-[90vh] overflow-hidden rounded-[var(--r)] flex flex-col"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes aleg-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

        {/* Başlık */}
        <div
          className="px-6 py-5 flex items-start justify-between gap-3 flex-shrink-0"
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
              AÇIK MASA
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              Masa{' '}
              <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>
                {tableName}
              </span>
            </h2>
            {!loading && orders.length > 0 && (
              <p className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>
                {orders.length} aktif sipariş · {totalItems} kalem
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Hızlı Ürün Ekle - menüden direkt ekleme */}
            <button
              onClick={() => setQuickAddOpen(true)}
              className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
              title="Menüden hızlı ürün ekle"
            >
              <span style={{ fontSize: 14 }}>+</span>
              <span>Ürün Ekle</span>
            </button>
            {/* Masa Aksiyonları */}
            <button
              onClick={() => setTableActionsOpen(true)}
              className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 hover:bg-paper-2 transition-colors"
              style={{
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
              title="Masayı değiştir / birleştir / böl"
            >
              <span>⋯</span>
              <span>MASA</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors"
              style={{ color: 'var(--ink-2)' }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center" style={{ color: 'var(--ink-3)' }}>
              <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18 }}>
                Yükleniyor…
              </div>
            </div>
          ) : error ? (
            <div
              className="m-5 p-4 rounded-[10px] text-sm"
              style={{
                background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
                color: 'var(--danger)',
              }}
            >
              ⚠ {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center px-6">
              <div
                className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 10%, transparent)',
                  color: 'var(--ok)',
                  fontSize: 24,
                }}
              >
                ✓
              </div>
              <h3
                className="mb-2"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  color: 'var(--ink)',
                }}
              >
                Bu masada açık sipariş yok
              </h3>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Yeni sipariş aç butonuyla başla.
              </p>
            </div>
          ) : (
            <div className="px-5 py-3">
              {/* Toplu seçim header */}
              {selectableItems.length > 0 && (
                <div
                  className="flex items-center justify-between gap-2 mb-3 pb-3"
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
                    <div
                      className="flex items-center gap-1.5"
                      style={{ fontFamily: 'var(--f-mono)' }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--accent)',
                        }}
                      >
                        {fmt(selectedTotal)}
                      </span>
                      <button
                        onClick={clearSelection}
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-3)',
                          letterSpacing: '0.08em',
                        }}
                      >
                        × TEMİZLE
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Flat kalem listesi */}
              <div className="space-y-1.5">
                {flatItems.map((fi) => {
                  const key = `${fi.orderId}__${fi.item.id}`;
                  const isSelected = selectedItems.has(key);
                  const isPaid = fi.orderPaymentStatus === 'paid';
                  const isComplimentary = fi.item.is_complimentary;
                  return (
                    <FlatItemRow
                      key={key}
                      flatItem={fi}
                      isSelected={isSelected}
                      isPaid={isPaid}
                      isComplimentary={isComplimentary}
                      onToggle={
                        isPaid ? undefined : () => toggleItem(fi.orderId, fi.item.id)
                      }
                      onGift={() =>
                        setGiftItemContext({
                          orderId: fi.orderId,
                          itemId: fi.item.id,
                        })
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Toplam özeti + butonlar */}
        {!loading && orders.length > 0 && (
          <div
            className="px-6 py-4 flex-shrink-0"
            style={{
              background: 'var(--paper-2)',
              borderTop: '1px solid var(--line)',
            }}
          >
            {complimentaryTotal > 0 && (
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span style={{ color: 'var(--gold)' }}>★ İkram toplam</span>
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--gold)' }}>
                  {fmt(complimentaryTotal)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
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
                {fmt(totalAmount)}
              </span>
            </div>
            {hasUnpaid && (
              <div
                className="mt-2 text-xs flex items-center gap-1.5"
                style={{ color: 'var(--danger)' }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, background: 'var(--danger)' }}
                />
                <span>Ödeme bekliyor</span>
              </div>
            )}
          </div>
        )}

        {/* Aksiyon butonları */}
        <div
          className="px-5 py-4 flex items-center gap-2 flex-shrink-0 flex-wrap"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            Kapat
          </button>
          {/* Hesap Al / Seçili Öde / İkram / İptal */}
          {hasUnpaid && (
            <>
              {selectedItems.size > 0 ? (
                <>
                  <button
                    onClick={async () => {
                      // Seçili kalemleri ikram et (orderId bazında grupla)
                      const grouped = new Map<string, string[]>();
                      selectedFlatItems.forEach((fi) => {
                        if (!grouped.has(fi.orderId))
                          grouped.set(fi.orderId, []);
                        grouped.get(fi.orderId)!.push(fi.item.id);
                      });
                      const ok = await confirmDialog({
                        title: 'Seçili kalemleri ikram?',
                        body: `${selectedFlatItems.length} kalem ikram edilecek.`,
                        confirmLabel: 'İkram Et',
                        cancelLabel: 'Vazgeç',
                      });
                      if (!ok) return;
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
                        toast.success(
                          `${selectedFlatItems.length} kalem ikram edildi`
                        );
                      }
                      clearSelection();
                      load();
                    }}
                    className="h-11 px-4 rounded-[10px] text-sm font-semibold transition-all hover:bg-paper-2"
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
                    onClick={async () => {
                      // Önce sipariş ayır, sonra paid yap (parsiyel ödeme)
                      // splitItemsFromMultipleOrders kullanılır - mevcut backend
                      const ok = await confirmDialog({
                        title: 'Seçili kalemleri öde?',
                        body: `${fmt(selectedTotal)} tutarında ${selectedFlatItems.length} kalem ayrı bir hesap olarak ödenecek.`,
                        confirmLabel: 'Ayır ve Öde',
                        cancelLabel: 'Vazgeç',
                      });
                      if (!ok || !cashier) return;
                      const itemIds = selectedFlatItems.map((fi) => fi.item.id);
                      const r = await splitItemsFromMultipleOrders({
                        itemIds,
                        targetTableId: tableId,
                        cashierId: cashier.id,
                      });
                      if (!r.success) {
                        toast.error(r.error || 'Ayırma başarısız');
                        return;
                      }
                      toast.success('Kalemler ayrıldı, ödeme açılıyor');
                      clearSelection();
                      // Yeni siparişi yükle ve ödeme aç
                      const fresh = await getTableOrders(tableId);
                      if (fresh.success) {
                        const orders = fresh.orders || [];
                        setOrders(orders);
                        const newOrderId = r.newOrderId;
                        const target = newOrderId
                          ? orders.find((o) => o.id === newOrderId)
                          : orders.find(
                              (o) =>
                                o.payment_status !== 'paid' &&
                                o.payment_status !== 'refunded'
                            );
                        if (target) setPayingOrder(target);
                      }
                    }}
                    className="flex-1 h-11 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
                    style={{
                      background: 'var(--accent)',
                      color: '#FAF5EA',
                      boxShadow:
                        '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
                      minWidth: 200,
                    }}
                  >
                    <span>Seçili Öde · {fmt(selectedTotal)}</span>
                    <span style={{ fontSize: 14 }}>→</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    // Yeni: HesapPanel'i aç (yan panel layout C3)
                    setHesapPanelOpen(true);
                  }}
                  className="flex-1 h-11 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
                  style={{
                    background: 'var(--accent)',
                    color: '#FAF5EA',
                    boxShadow:
                      '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
                    minWidth: 180,
                  }}
                >
                  <span>₺ Hesap Al · {fmt(totalAmount)}</span>
                  <span
                    className="transition-transform"
                    style={{ fontSize: 16 }}
                  >
                    →
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ödeme Modal */}
      {payingOrder && (
        <PaymentModal
          open={true}
          onClose={() => setPayingOrder(null)}
          onItemsChanged={async () => {
            // PaymentModal'da kalem ikramı yapıldı → sipariş detayını yenile
            const r = await getTableOrders(tableId);
            if (r.success) {
              const fresh = r.orders || [];
              setOrders(fresh);
              // payingOrder'ı güncel veriyle tazeleyelim
              const refreshed = fresh.find((o) => o.id === payingOrder.id);
              if (refreshed) setPayingOrder(refreshed);
            }
          }}
          onSuccess={async () => {
            setPayingOrder(null);
            // Siparişleri yeniden yükle (load sonucu için data döndürelim)
            const r = await getTableOrders(tableId);
            if (r.success) {
              const fresh = r.orders || [];
              setOrders(fresh);
              const stillUnpaid = fresh.some(
                (o) =>
                  o.payment_status !== 'paid' &&
                  o.payment_status !== 'refunded'
              );
              // Tüm siparişler ödenmişse modal'ı otomatik kapat
              if (!stillUnpaid) {
                setTimeout(() => onClose(), 600); // kısa delay — success feedback gözüksün
              }
            }
          }}
          order={{
            id: payingOrder.id,
            order_no: payingOrder.order_no,
            total: payingOrder.total,
            table_label: tableName,
            items: payingOrder.items.map((it) => ({
              id: it.id,
              product_name: it.product_name,
              quantity: it.quantity,
              unit_price: it.unit_price,
              is_complimentary: it.is_complimentary,
              complimentary_reason: it.complimentary_reason,
            })),
          }}
        />
      )}

      {/* Hızlı Ürün Ekle Modal (menüden direkt) */}
      {quickAddOpen && cashier && (() => {
        // En eski açık (ödenmemiş) siparişi bul
        const openOrder = orders.find(
          (o) =>
            o.payment_status !== 'paid' && o.payment_status !== 'refunded'
        );
        // OrderTakingModal için minimal table objesi
        const tableObj: TableWithStatus = {
          id: tableId,
          name: tableName,
          capacity: 0,
          zone_id: null,
          shape: 'square',
          db_status: 'occupied',
          live_status: 'active',
          active_order_count: orders.length,
          total_amount: totalAmount,
          oldest_order_at: null,
          has_unpaid: hasUnpaid,
          has_new_items: false,
          has_ready_items: false,
        };
        return (
          <OrderTakingModal
            table={tableObj}
            cashierId={cashier.id}
            mode={openOrder ? 'addToOrder' : 'new'}
            targetOrderId={openOrder?.id}
            subtitle={openOrder ? 'HIZLI EKLE' : 'YENİ SİPARİŞ'}
            onClose={() => setQuickAddOpen(false)}
            onSuccess={() => {
              load(); // siparişleri tazele
              setQuickAddOpen(false);
            }}
          />
        );
      })()}

      {/* Hesap Paneli (yan panel C3 layout) */}
      {hesapPanelOpen && cashier && (
        <HesapPanel
          tableId={tableId}
          tableName={tableName}
          orders={orders}
          cashierId={cashier.id}
          onClose={() => setHesapPanelOpen(false)}
          onChanged={() => {
            // Sipariş değişti - listemizi tazele
            load();
          }}
        />
      )}

      {/* Kalem İkram Picker */}
      {giftItemContext && (
        <ItemGiftPicker
          onPick={async (reason) => {
            const r = await makeItemsComplimentary({
              orderId: giftItemContext.orderId,
              itemIds: [giftItemContext.itemId],
              reason,
            });
            setGiftItemContext(null);
            if (r.success) {
              // Reload
              const fresh = await getTableOrders(tableId);
              if (fresh.success) setOrders(fresh.orders || []);
              toast.success('İkram uygulandı');
            } else {
              toast.error(r.error || 'İkram uygulanamadı');
            }
          }}
          onClose={() => setGiftItemContext(null)}
        />
      )}

      {/* Masa Aksiyonları Menüsü */}
      {tableActionsOpen && (
        <TableActionsMenu
          ordersCount={orders.filter((o) => o.payment_status !== 'paid' && o.payment_status !== 'refunded').length}
          onChangeTable={() => {
            setTableActionsOpen(false);
            setChangeTableOpen(true);
          }}
          onSplitItems={() => {
            setTableActionsOpen(false);
            setSplitOpen(true);
          }}
          onClose={() => setTableActionsOpen(false)}
        />
      )}

      {/* Masa Değiştir — tüm masalar (boş + dolu). Dolu masaya taşınırken uyarı. */}
      {changeTableOpen && (
        <TablePicker
          title="↔ MASA DEĞİŞTİR · HEDEF"
          subtitle={`Masa ${tableName} hangi masaya taşınsın?`}
          currentTableId={tableId}
          filter="all"
          onPick={async (toTableId, toTableName, isOccupied) => {
            // Dolu masa ise uyar
            if (isOccupied) {
              const ok = await confirmDialog({
                title: `Masa ${toTableName} dolu`,
                body: `Masa ${tableName} siparişleri bu masayla birleştirilecek. Devam etmek istiyor musun?`,
                tone: 'warn',
                confirmLabel: 'Birleştir',
                cancelLabel: 'Vazgeç',
              });
              if (!ok) return;
            }
            setChangeTableOpen(false);
            const r = await mergeTables({ fromTableId: tableId, toTableId });
            if (!r.success) {
              toast.error(r.error || 'Masa değiştirilemedi');
              return;
            }
            if (isOccupied) {
              toast.success(`${r.movedCount} sipariş Masa ${toTableName}'e aktarıldı`);
            } else {
              toast.success(`Siparişler Masa ${toTableName}'e taşındı`);
            }
            onClose();
          }}
          onClose={() => setChangeTableOpen(false)}
        />
      )}

      {/* Masa Böl — tüm kalemler birleşik listede, hangisi ayrılacak seç */}
      {splitOpen && (
        <SplitItemsPicker
          orders={orders.filter(
            (o) => o.payment_status !== 'paid' && o.payment_status !== 'refunded'
          )}
          onConfirm={async (itemIds, targetTableId, targetTableName) => {
            if (!cashier) {
              toast.error('Oturum bulunamadı');
              return;
            }
            setSplitOpen(false);
            const r = await splitItemsFromMultipleOrders({
              itemIds,
              targetTableId,
              cashierId: cashier.id,
            });
            if (!r.success) {
              toast.error(r.error || 'Bölme başarısız');
              return;
            }
            toast.success(`${r.movedCount} ürün Masa ${targetTableName}'e taşındı`);
            onClose();
          }}
          onClose={() => setSplitOpen(false)}
        />
      )}
    </div>
  );
}


// ============================================================
// ITEM GIFT PICKER - Tek kalem için ikram sebebi
// ============================================================

function ItemGiftPicker({
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
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            Neden ikram?
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
            Bu kalem hesaptan düşer, complimentary olarak kaydedilir.
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
// MASA AKSİYONLARI MENÜSÜ (bottom sheet)
// ============================================================

function TableActionsMenu({
  ordersCount,
  onChangeTable,
  onSplitItems,
  onClose,
}: {
  ordersCount: number;
  onChangeTable: () => void;
  onSplitItems: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-[440px] rounded-t-[var(--r)] sm:rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 -10px 40px -10px rgba(0,0,0,0.3)',
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
              color: 'var(--super)',
            }}
          >
            ⋯ MASA AKSİYONLARI
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            Masayı yönet
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <ActionRow
            icon="↔"
            title="Masa Değiştir"
            desc="Siparişleri başka bir masaya taşı (boş veya dolu)"
            onClick={onChangeTable}
            disabled={ordersCount === 0}
          />
          <ActionRow
            icon="⊘"
            title="Masa Böl"
            desc="Seçili kalemleri ayrı bir masaya/hesaba taşı"
            onClick={onSplitItems}
            disabled={ordersCount === 0}
          />
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
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  desc,
  onClick,
  disabled,
}: {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 p-3 rounded-[10px] text-left transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--super)',
          lineHeight: 1,
          marginTop: 2,
        }}
      >
        {icon}
      </span>
      <div className="flex-1">
        <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink)' }}>
          {title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
          {desc}
        </div>
      </div>
      <span style={{ color: 'var(--ink-3)', fontSize: 16 }}>→</span>
    </button>
  );
}

// ============================================================
// TABLE PICKER — Masa değiştir / birleştir hedef seçimi
// ============================================================

function TablePicker({
  title,
  subtitle,
  currentTableId,
  filter, // 'empty_only' | 'occupied_only' | 'all'
  onPick,
  onClose,
}: {
  title: string;
  subtitle: string;
  currentTableId: string;
  filter: 'empty_only' | 'occupied_only' | 'all';
  onPick: (tableId: string, tableName: string, isOccupied: boolean) => void;
  onClose: () => void;
}) {
  const [tables, setTables] = useState<
    Array<{ id: string; name: string; status: string; zone_name: string | null; is_occupied: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    listTablesForMove().then((r) => {
      if (r.success && r.tables) {
        // Mevcut masayı hariç tut + filtreyi uygula
        const filtered = r.tables
          .filter((t) => t.id !== currentTableId)
          .filter((t) => {
            if (filter === 'empty_only') return !t.is_occupied;
            if (filter === 'occupied_only') return t.is_occupied;
            return true;
          });
        setTables(filtered);
        setFetchError(null);
      } else {
        setFetchError(r.error || 'Masalar yüklenemedi');
      }
      setLoading(false);
    });
  }, [currentTableId, filter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bölgeye göre grupla
  const byZone = tables.reduce<Record<string, typeof tables>>((acc, t) => {
    const key = t.zone_name || 'Diğer';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[640px] max-h-[90vh] rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--super)',
            }}
          >
            {title}
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
            {subtitle}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center" style={{ color: 'var(--ink-3)' }}>
              Masalar yükleniyor…
            </div>
          ) : fetchError ? (
            <div className="py-12 text-center px-5">
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
              <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--danger)' }}>
                Masalar yüklenemedi
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
                {fetchError}
              </div>
            </div>
          ) : tables.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'var(--ink-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤷</div>
              <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16 }}>
                {filter === 'empty_only'
                  ? 'Uygun boş masa yok'
                  : filter === 'occupied_only'
                  ? 'Birleştirilecek dolu masa yok'
                  : 'Başka masa yok'}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>
                {filter === 'all'
                  ? 'İşletmede aktif masa tanımlı değil gibi görünüyor. Panel → Masalar\'dan ekleyebilirsin.'
                  : ''}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byZone).map(([zoneName, zoneTables]) => (
                <div key={zoneName}>
                  <div
                    className="uppercase mb-2"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {zoneName}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {zoneTables.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onPick(t.id, t.name, t.is_occupied)}
                        className="h-16 rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-[1.03] active:scale-[0.98]"
                        style={{
                          background: t.is_occupied
                            ? 'color-mix(in srgb, var(--warn) 10%, var(--card))'
                            : 'color-mix(in srgb, var(--ok) 6%, var(--card))',
                          border: `1.5px solid ${
                            t.is_occupied
                              ? 'color-mix(in srgb, var(--warn) 40%, var(--line))'
                              : 'color-mix(in srgb, var(--ok) 30%, var(--line))'
                          }`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--f-serif)',
                            fontStyle: 'italic',
                            fontSize: 18,
                            fontWeight: 500,
                            color: 'var(--ink)',
                          }}
                        >
                          {t.name}
                        </span>
                        <span
                          className="uppercase"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            color: t.is_occupied ? 'var(--warn)' : 'var(--ok)',
                          }}
                        >
                          {t.is_occupied ? '● DOLU' : '○ BOŞ'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
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
// SPLIT ITEMS PICKER — sipariş içinden kalem seçip ayır
// ============================================================

function SplitItemsPicker({
  orders,
  onConfirm,
  onClose,
}: {
  orders: TableOrderDetail[];
  onConfirm: (
    itemIds: string[],
    targetTableId: string,
    targetTableName: string
  ) => void;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickingTable, setPickingTable] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Tüm kalemleri birleşik liste
  const allItems = orders.flatMap((o) =>
    o.items.map((it) => ({
      ...it,
      orderId: o.id,
      orderNo: o.order_no,
    }))
  );

  const toggle = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectedTotal = allItems
    .filter((it) => selectedIds.has(it.id) && !it.is_complimentary)
    .reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);

  const multipleOrders = orders.length > 1;

  if (pickingTable) {
    return (
      <TablePicker
        title="⊘ KALEMİ AYIR · HEDEF MASA"
        subtitle={`${selectedIds.size} kalem nereye taşınsın?`}
        currentTableId=""
        filter="all"
        onPick={(tableId, tableName) => {
          onConfirm(Array.from(selectedIds), tableId, tableName);
        }}
        onClose={() => setPickingTable(false)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[560px] max-h-[92vh] rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--super)',
            }}
          >
            ⊘ MASA BÖL · KALEM SEÇ
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
            Hangi kalemler taşınacak?
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
            {multipleOrders
              ? 'Birden fazla siparişten kalem seçebilirsin — hepsi tek hedefe taşınır.'
              : 'Seçili kalemler yeni bir siparişe taşınır (aynı masada ayrı hesap veya başka masa).'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {orders.map((o) => (
            <div key={o.id}>
              {multipleOrders && (
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
                  SİPARİŞ #{o.order_no}
                </div>
              )}
              <div className="space-y-1.5">
                {o.items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const lineTotal = Number(item.unit_price) * item.quantity;
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-[10px] text-left transition-all hover:scale-[1.01]"
                      style={{
                        background: isSelected
                          ? 'color-mix(in srgb, var(--super) 10%, var(--paper-2))'
                          : 'var(--paper-2)',
                        border: `1.5px solid ${isSelected ? 'var(--super)' : 'var(--line)'}`,
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center rounded flex-shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          border: `2px solid ${isSelected ? 'var(--super)' : 'var(--line-2, var(--line))'}`,
                          background: isSelected ? 'var(--super)' : 'transparent',
                          color: '#FAF5EA',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {item.quantity}× {item.product_name}
                          {item.is_complimentary && (
                            <span
                              className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded"
                              style={{
                                fontFamily: 'var(--f-mono)',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                                color: 'var(--gold)',
                              }}
                            >
                              ★ İKRAM
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 13,
                          fontWeight: 600,
                          color: item.is_complimentary ? 'var(--ink-3)' : 'var(--ink)',
                          textDecoration: item.is_complimentary ? 'line-through' : 'none',
                        }}
                      >
                        ₺{lineTotal.toFixed(0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Seçim özeti */}
        {selectedIds.size > 0 && (
          <div
            className="px-4 py-3 flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--super) 6%, var(--card))',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--ink-2)' }}>
                Seçili {selectedIds.size} kalem
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 16, fontWeight: 700, color: 'var(--super)' }}>
                ₺{selectedTotal.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        <div
          className="p-4 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--line)' }}
        >
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
            onClick={() => setPickingTable(true)}
            disabled={selectedIds.size === 0}
            className="group flex-1 h-11 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
            style={{
              background: 'var(--super)',
              color: '#FAF5EA',
            }}
          >
            <span>Hedef Masa Seç</span>
            <span className="transition-transform group-hover:translate-x-1" style={{ fontSize: 16 }}>
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FLAT ITEM ROW — Masa kaleminin tek satır gösterimi (checkbox'lı)
// ============================================================
function FlatItemRow({
  flatItem,
  isSelected,
  isPaid,
  isComplimentary,
  onToggle,
  onGift,
}: {
  flatItem: {
    orderId: string;
    orderNo: string;
    orderStatus: string;
    orderPaymentStatus: string;
    item: TableOrderDetail['items'][number];
    lineTotal: number;
  };
  isSelected: boolean;
  isPaid: boolean;
  isComplimentary: boolean;
  onToggle?: () => void;
  onGift: () => void;
}) {
  const { item } = flatItem;

  const itemStatusConfig: Record<
    string,
    { label: string; color: string }
  > = {
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
      {/* Checkbox - sadece ödenmemiş kalemler */}
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
        {isComplimentary && item.complimentary_reason && (
          <div
            className="mt-0.5"
            style={{
              fontSize: 10.5,
              color: 'var(--gold)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
            }}
          >
            ★ {item.complimentary_reason}
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
        {!isPaid && !isComplimentary && (
          <button
            onClick={onGift}
            className="text-[10px]"
            style={{
              color: 'var(--gold)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
            }}
            title="Bu kalemi ikram et"
          >
            ★ İKRAM
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CHECK BOX INDICATOR
// ============================================================
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
          active
            ? 'var(--accent)'
            : disabled
              ? 'var(--line)'
              : 'var(--ink-3)'
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
