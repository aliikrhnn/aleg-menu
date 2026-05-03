'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { updateOrderStatus, cancelOrder, getActiveOrders, type ActiveOrder } from '@/lib/actions/pos';
import { PrintButton } from '@/components/panel/print-button';
import { PaymentModal } from './payment-modal';
import { PosTopbar } from './pos-topbar';
import { playDing as playDingTone, playSuccess } from '@/lib/sounds';
import { startSyncWorker, stopSyncWorker } from '@/lib/offline/sync-worker';
import { usePendingCount } from '@/lib/offline/use-pending-count';
import { cacheOrders, getCachedOrders } from '@/lib/offline/db';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

interface OrdersBoardProps {
  initialOrders: ActiveOrder[];
  businessId: string;
}

type OrderStatus = ActiveOrder['status'];

// Kanban kolonları — sadece bu 3 durum ekranda canlı gösterilir
const COLUMNS: Array<{
  key: OrderStatus;
  label: string;
  accentColor: string;
  nextAction?: { status: OrderStatus; label: string };
}> = [
  {
    key: 'preparing',
    label: 'Hazırlanıyor',
    accentColor: 'var(--gold)',
    nextAction: { status: 'ready', label: 'Hazır' },
  },
  {
    key: 'ready',
    label: 'Hazır · Teslim',
    accentColor: 'var(--olive)',
    nextAction: { status: 'delivered', label: 'Teslim Edildi' },
  },
];

export function OrdersBoard({ initialOrders, businessId }: OrdersBoardProps) {
  const [orders, setOrders] = useState<ActiveOrder[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<ActiveOrder | null>(null);
  // Yeni gelen sipariş ID'leri ve flash bitiş zamanı (ms timestamp)
  // 5 dakika boyunca kırmızı flash gösterilir
  const [recentOrders, setRecentOrders] = useState<Map<string, number>>(
    new Map()
  );
  const pendingSyncCount = usePendingCount();
  const { isOnline } = useOnlineStatus();
  const prevOrderIds = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  // Otomatik onay yapılan ID'leri takip et (yeniden onaylama olmasın)
  const autoConfirmedRef = useRef<Set<string>>(new Set());

  // Initial orders'ı cache'le + sync worker başlat
  useEffect(() => {
    // Sync worker başlat
    startSyncWorker(() => {
      // Bir outbox item işlendiğinde - listeyi yenile
      getActiveOrders().then((r) => {
        if (r.success && r.orders) {
          setOrders(r.orders);
          cacheOrders(businessId, r.orders as unknown as Array<{ id: string } & Record<string, unknown>>);
        }
      });
    });

    // İlk açılış - initial orders'ı cache'le
    cacheOrders(businessId, initialOrders as unknown as Array<{ id: string } & Record<string, unknown>>);

    return () => {
      stopSyncWorker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Offline'a geçince - cache'den yükle
  useEffect(() => {
    if (isOnline) return;
    let cancelled = false;

    getCachedOrders(businessId).then((cached) => {
      if (cancelled || cached.length === 0) return;
      // Cache'den gelen data'yı ActiveOrder'a dönüştür
      const offlineOrders = cached.map((c) => {
        const base = c.data as ActiveOrder;
        // Local değişiklikleri uygula
        return {
          ...base,
          payment_status:
            c.local_payment_status === 'paid'
              ? 'paid' as const
              : base.payment_status,
        };
      });
      setOrders(offlineOrders);
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, businessId]);

  // Ses çal (yeni sipariş geldiğinde) - WebAudio API üzerinden
  const playDing = useCallback(() => {
    if (!soundEnabled) return;
    playDingTone(0.35);
  }, [soundEnabled]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          // Değişiklik algılandı — tüm listeyi tazele
          refreshOrders();
        }
      )
      .subscribe();

    // Ayrıca periyodik tazele (realtime kopukluklarına karşı)
    const interval = setInterval(() => {
      refreshOrders();
    }, 8000);

    // Sekme görünür olduğunda hemen tazele (arkaplandayken kaçırılmış güncellemeler için)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshOrders();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function refreshOrders() {
    const result = await getActiveOrders();
    if (result.success && result.orders) {
      // Yeni sipariş geldi mi kontrol et (ses + flash + otomatik onay)
      const currentIds = new Set(result.orders.map((o) => o.id));
      const prevIds = prevOrderIds.current;
      const newReceivedOrders = result.orders.filter(
        (o) => !prevIds.has(o.id) && o.status === 'received'
      );

      if (newReceivedOrders.length > 0) {
        playDing();

        // Yeni siparişleri flash listesine ekle (5 dk = 300000 ms)
        const FLASH_DURATION = 5 * 60 * 1000;
        const flashUntil = Date.now() + FLASH_DURATION;
        setRecentOrders((prev) => {
          const next = new Map(prev);
          newReceivedOrders.forEach((o) => {
            next.set(o.id, flashUntil);
          });
          return next;
        });

        // Otomatik onay — receivedaki yeni siparişleri preparing'e taşı
        // (mutfak fişi yeniden basılmaz çünkü zaten basıldı)
        for (const order of newReceivedOrders) {
          if (autoConfirmedRef.current.has(order.id)) continue;
          autoConfirmedRef.current.add(order.id);
          // Async, beklemeden — UI hızlı kalsın
          updateOrderStatus(order.id, 'preparing').catch((err) => {
            console.warn('[orders-board] auto-confirm failed:', err);
          });
        }
      }

      prevOrderIds.current = currentIds;

      // Optimistic: 'received' status olanları client'ta direkt 'preparing' yap
      // (server response'u gelene kadar UI tutarlı olsun)
      const optimistic = result.orders.map((o) =>
        o.status === 'received' && autoConfirmedRef.current.has(o.id)
          ? { ...o, status: 'preparing' as const }
          : o
      );
      setOrders(optimistic);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setBusyOrderId(orderId);
    const result = await updateOrderStatus(orderId, newStatus);
    setBusyOrderId(null);

    if (!result.success) {
      toast.error(`Hata: ${result.error}`);
      return;
    }
    // Optimistic update — realtime'ı beklemeden UI güncelle
    setOrders((prev) =>
      prev
        .map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
    );
  }

  async function handleCancel(orderId: string) {
    const confirmed = await confirmDialog({
      title: 'Siparişi iptal et?',
      body: 'Bu işlem geri alınamaz.',
      tone: 'danger',
      confirmLabel: 'İptal Et',
      cancelLabel: 'Vazgeç',
    });
    if (!confirmed) return;
    setBusyOrderId(orderId);
    const result = await cancelOrder(orderId);
    setBusyOrderId(null);
    if (!result.success) {
      toast.error(`Hata: ${result.error}`);
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  // Flash listesini her dakika temizle (süresi geçenleri sil)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentOrders((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, until] of next.entries()) {
          if (until <= now) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 30 * 1000); // 30 sn'de bir kontrol
    return () => clearInterval(interval);
  }, []);

  // Yeni siparişleri en üste alarak kolonlara dağıt
  const ordersByColumn = COLUMNS.map((col) => ({
    ...col,
    orders: orders.filter((o) => {
      if (col.key === 'ready') {
        return o.status === 'ready' || o.status === 'on_way';
      }
      if (col.key === 'preparing') {
        // received (yeni gelen, otomatik onay bekleyen) + confirmed + preparing
        return (
          o.status === 'received' ||
          o.status === 'confirmed' ||
          o.status === 'preparing'
        );
      }
      return o.status === col.key;
    }),
  }));

  // Ödenmeyen teslim edilmiş siparişler - "ödeme bekliyor" kolonu gibi
  const unpaidDelivered = orders.filter(
    (o) => o.status === 'delivered' && o.payment_status !== 'paid'
  );

  // Ödenmiş son siparişler — sadece TAMAMLANMIŞ olanlar (delivered+paid)
  // Hızlı satışta ödeme alındı ama mutfak hazırlıyorsa sipariş hâlâ
  // "Yeni/Hazırlanıyor/Hazır" kolonunda ödendi rozetiyle kalır.
  // Mutfak "Teslim Edildi" dediğinde bu bölüme düşer.
  const paidRecent = orders
    .filter((o) => o.payment_status === 'paid' && o.status === 'delivered')
    .sort((a, b) => {
      if (!a.paid_at || !b.paid_at) return 0;
      return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
    });

  const handlePaymentSuccess = (info: { queued?: boolean; online?: boolean }) => {
    setPaymentOrder(null);
    playSuccess();

    if (info.queued) {
      // Offline kaydı - optimistic UI: payment_status'u local'de paid yap
      setOrders((prev) =>
        prev.map((o) =>
          paymentOrder && o.id === paymentOrder.id
            ? { ...o, payment_status: 'paid' as const }
            : o
        )
      );
    } else {
      // Online başarılı - sunucudan güncel listeyi çek
      getActiveOrders().then((r) => {
        if (r.success && r.orders) {
          setOrders(r.orders);
          cacheOrders(businessId, r.orders as unknown as Array<{ id: string } & Record<string, unknown>>);
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Üst bar - bağlantı, kasa, Z-rapor */}
      <PosTopbar
        onRefresh={() => {
          getActiveOrders().then((r) => {
            if (r.success && r.orders) {
              setOrders(r.orders);
              cacheOrders(businessId, r.orders as unknown as Array<{ id: string } & Record<string, unknown>>);
            }
          });
        }}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Alt rozet satırı - aktif sipariş sayısı + ses toggle */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div
          className="text-accent uppercase flex items-center gap-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          <span
            style={{
              width: 24,
              height: 1,
              background: 'var(--accent)',
              display: 'inline-block',
            }}
          />
          SİPARİŞ AKIŞI · {orders.length} AKTİF
          {unpaidDelivered.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--warn) 14%, transparent)',
                color: 'var(--warn)',
                letterSpacing: '0.12em',
              }}
            >
              {unpaidDelivered.length} ÖDEME BEKLİYOR
            </span>
          )}
        </div>

        {/* Ses switch - kompakt */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span
            className="text-ink-3 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}
          >
            {soundEnabled ? '🔔 SES AÇIK' : '🔕 SES KAPALI'}
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{
              background: soundEnabled ? 'var(--olive)' : 'var(--paper-3)',
            }}
            aria-pressed={soundEnabled}
          >
            <span
              className="absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{
                transform: soundEnabled ? 'translateX(18px)' : 'translateX(2px)',
              }}
            />
          </button>
        </label>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {ordersByColumn.map((col) => (
          <div
            key={col.key}
            className="bg-card border border-line rounded-[var(--r)] flex flex-col min-h-0"
          >
            {/* Kolon başlığı */}
            <div
              className="px-5 py-4 border-b border-line flex items-center justify-between"
              style={{ borderLeftWidth: 3, borderLeftColor: col.accentColor }}
            >
              <div>
                <div
                  className="uppercase mb-0.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: col.accentColor,
                  }}
                >
                  {col.label}
                </div>
                <div
                  className="text-ink-2 text-xs"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {col.orders.length} sipariş
                </div>
              </div>
              <div
                className="w-8 h-8 rounded-full grid place-items-center font-bold"
                style={{
                  background: `color-mix(in srgb, ${col.accentColor} 12%, transparent)`,
                  color: col.accentColor,
                  fontFamily: 'var(--f-mono)',
                  fontSize: 13,
                }}
              >
                {col.orders.length}
              </div>
            </div>

            {/* Kartlar */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {col.orders.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-ink-3 text-3xl mb-2 opacity-40">○</div>
                  <p className="text-ink-3 text-xs">henüz sipariş yok</p>
                </div>
              ) : (
                col.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    accentColor={col.accentColor}
                    nextAction={col.nextAction}
                    onStatusChange={handleStatusChange}
                    onCancel={handleCancel}
                    onPayment={setPaymentOrder}
                    busy={busyOrderId === order.id}
                    isFlashing={recentOrders.has(order.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ödeme Bekleyen Siparişler */}
      {unpaidDelivered.length > 0 && (
        <div
          className="mt-4 rounded-[var(--r)] overflow-hidden flex-shrink-0"
          style={{
            background: 'var(--card)',
            border: '1px solid color-mix(in srgb, var(--warn) 30%, var(--line))',
            borderLeftWidth: 3,
            borderLeftColor: 'var(--warn)',
          }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{
              background: 'color-mix(in srgb, var(--warn) 8%, var(--card))',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--warn)',
                }}
              >
                ⧗ ÖDEME BEKLİYOR · {unpaidDelivered.length}
              </span>
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}
            >
              Teslim edildi, ödeme alınmadı
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {unpaidDelivered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                accentColor="var(--warn)"
                onStatusChange={handleStatusChange}
                onCancel={handleCancel}
                onPayment={setPaymentOrder}
                busy={busyOrderId === order.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ödenmiş Son Siparişler (son 2 saat) */}
      {paidRecent.length > 0 && (
        <div
          className="mt-4 rounded-[var(--r)] overflow-hidden flex-shrink-0"
          style={{
            background: 'var(--card)',
            border: '1px solid color-mix(in srgb, var(--ok) 30%, var(--line))',
            borderLeftWidth: 3,
            borderLeftColor: 'var(--ok)',
          }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{
              background: 'color-mix(in srgb, var(--ok) 6%, var(--card))',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ok)',
                }}
              >
                ✓ ÖDEME ALINDI · {paidRecent.length}
              </span>
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}
            >
              Son 2 saat · fiş tekrar basılabilir
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {paidRecent.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                accentColor="var(--ok)"
                onStatusChange={handleStatusChange}
                onCancel={handleCancel}
                onPayment={setPaymentOrder}
                busy={busyOrderId === order.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ödeme Modal */}
      {paymentOrder && (
        <PaymentModal
          open={true}
          onClose={() => setPaymentOrder(null)}
          onSuccess={handlePaymentSuccess}
          onItemsChanged={async () => {
            // Kalem ikramı sonrası refresh — paymentOrder'u güncel veriyle değiştir
            const r = await getActiveOrders();
            if (r.success && r.orders) {
              setOrders(r.orders);
              const refreshed = r.orders.find((o) => o.id === paymentOrder.id);
              if (refreshed) setPaymentOrder(refreshed);
            }
          }}
          order={{
            id: paymentOrder.id,
            order_no: paymentOrder.order_no,
            total: paymentOrder.total,
            table_label: paymentOrder.table_label,
            items: paymentOrder.items.map((it) => ({
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
    </div>
  );
}

// ============================================================
// Sipariş Kartı
// ============================================================

function OrderCard({
  order,
  accentColor,
  nextAction,
  onStatusChange,
  onCancel,
  onPayment: _onPayment,
  busy,
  isFlashing = false,
}: {
  order: ActiveOrder;
  accentColor: string;
  nextAction?: { status: OrderStatus; label: string };
  onStatusChange: (id: string, status: OrderStatus) => void;
  onCancel: (id: string) => void;
  onPayment: (order: ActiveOrder) => void;
  busy: boolean;
  isFlashing?: boolean;
}) {
  // Hydration mismatch'i önlemek için: ilk render'da boş, useEffect ile set
  const [elapsed, setElapsed] = useState<string>('');

  useEffect(() => {
    setElapsed(getElapsed(order.created_at));
    const t = setInterval(() => setElapsed(getElapsed(order.created_at)), 30000);
    return () => clearInterval(t);
  }, [order.created_at]);

  const orderTypeLabel =
    order.order_type === 'dine_in'
      ? 'MASA'
      : order.order_type === 'pickup'
      ? 'GEL-AL'
      : 'PAKET';

  const isPaid = order.payment_status === 'paid';
  // Tamamen bitmiş: ödendi + teslim edildi. Sadece fiş tekrar bas.
  const isCompleted = isPaid && order.status === 'delivered';

  return (
    <article
      className={`bg-paper border rounded-[14px] overflow-hidden transition-opacity ${isFlashing ? 'aleg-flash-new' : 'border-line'}`}
      style={{
        opacity: busy ? 0.5 : isCompleted ? 0.75 : 1,
        background: isCompleted
          ? 'color-mix(in srgb, var(--ok) 3%, var(--paper))'
          : isPaid
          ? 'color-mix(in srgb, var(--ok) 2%, var(--paper))'
          : 'var(--paper)',
        ...(isFlashing
          ? {
              borderWidth: 2,
              borderColor: 'var(--accent)',
            }
          : {}),
      }}
    >
      {/* CSS animation - flashing */}
      {isFlashing && (
        <style>{`
          @keyframes aleg-flash {
            0%, 100% {
              box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
            }
            50% {
              box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 35%, transparent);
            }
          }
          .aleg-flash-new {
            animation: aleg-flash 1.4s ease-in-out infinite;
          }
        `}</style>
      )}
      {/* Card head */}
      <div
        className="px-3.5 py-2.5 border-b border-line flex items-center justify-between"
        style={{
          background: 'var(--paper-2)',
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 12,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.06em',
            }}
          >
            #{order.order_no}
          </span>
          <span
            className="text-ink-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              fontWeight: 700,
            }}
          >
            {orderTypeLabel}
            {order.table_label ? ` · ${order.table_label}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {order.payment_status === 'paid' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.14em',
                background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
                color: 'var(--ok)',
              }}
              title={
                order.payment_method
                  ? `${order.payment_method} ile ödendi`
                  : 'Ödendi'
              }
            >
              <span style={{ fontSize: 9 }}>✓</span>
              ÖDENDİ
            </span>
          )}
          <span
            className="text-ink-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
            }}
          >
            {elapsed}
          </span>
        </div>
      </div>

      {/* Customer info (varsa) */}
      {(order.customer_name || order.customer_phone) && (
        <div className="px-3.5 pt-2.5 text-ink-2 text-xs">
          {order.customer_name && <span className="font-semibold">{order.customer_name}</span>}
          {order.customer_name && order.customer_phone && <span> · </span>}
          {order.customer_phone && (
            <span style={{ fontFamily: 'var(--f-mono)' }}>{order.customer_phone}</span>
          )}
        </div>
      )}

      {/* Items */}
      <div className="px-3.5 py-2.5">
        <ul className="space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm text-ink">
              <span
                className="flex-shrink-0 font-bold text-accent"
                style={{
                  fontFamily: 'var(--f-mono)',
                  minWidth: 22,
                }}
              >
                {item.quantity}×
              </span>
              <div className="flex-1 min-w-0">
                <div>{item.product_name}</div>
                {item.options && item.options.length > 0 && (
                  <div
                    className="text-[11px] text-ink-3 mt-0.5 leading-tight"
                    style={{ fontFamily: 'var(--f-mono)' }}
                  >
                    {item.options.map((o) => o.value_name).join(' · ')}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Note */}
        {order.note && (
          <div
            className="mt-2 px-2.5 py-1.5 rounded-[8px] text-xs text-ink-2 italic"
            style={{
              background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
              borderLeft: '2px solid var(--gold)',
            }}
          >
            {order.note}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3.5 py-2.5 border-t border-line flex items-center justify-between"
        style={{ background: 'var(--paper-2)' }}
      >
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          ₺{order.total.toFixed(0)}
        </span>

        <div className="flex gap-1.5 items-center">
          <PrintButton
            orderId={order.id}
            mode="reprint_kitchen"
            variant="secondary"
            label="Mutfağa Tekrar"
            className="!h-8 !px-3 !text-[11px]"
          />
          <PrintButton
            orderId={order.id}
            mode="cashier"
            variant="secondary"
            label={isPaid ? 'Fiş Tekrar Bas' : 'Hesap Bas'}
            className="!h-8 !px-3 !text-[11px]"
          />
          {/* İPTAL butonu — sadece ödenmemişse */}
          {!isPaid && (
            <button
              onClick={() => onCancel(order.id)}
              disabled={busy}
              className="text-ink-3 hover:text-accent text-xs disabled:opacity-30 transition-colors px-2"
              style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
              title="Siparişi iptal et"
            >
              İPTAL
            </button>
          )}

          {/* Hesap Al butonu Siparişler ekranından kaldırıldı (Tur 12).
              Ödeme almak için Kasa ekranını kullan. */}

          {/* Next action — tamamen bitmiş olmayanlar için görünür */}
          {/* Ödenmiş ama hazırlanıyor olanlarda da kasiyer 'Hazır' / 'Teslim Edildi' diyebilmeli */}
          {nextAction && !isCompleted && (
            <button
              onClick={() => onStatusChange(order.id, nextAction.status)}
              disabled={busy}
              className="px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: accentColor,
                color: '#FAF5EA',
                letterSpacing: '0.02em',
              }}
            >
              {nextAction.label}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ============================================================
// Yardımcılar
// ============================================================

function getElapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'şimdi';
  if (diffMin < 60) return `${diffMin}dk`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}sa`;
}
