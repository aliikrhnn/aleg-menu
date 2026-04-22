'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { updateOrderStatus, cancelOrder, getActiveOrders, type ActiveOrder } from '@/lib/actions/pos';
import { PrintButton } from '@/components/panel/print-button';

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
    key: 'received',
    label: 'Yeni Sipariş',
    accentColor: 'var(--accent)',
    nextAction: { status: 'preparing', label: 'Mutfağa Yolla' },
  },
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderIds = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  // Ses çal (yeni sipariş geldiğinde)
  const playDing = useCallback(() => {
    if (!soundEnabled) return;
    if (!audioRef.current) {
      // Base64 inline "ding" sesi (çok kısa, web standardı sine wave)
      // Daha gerçekçi için sonra /public/sounds/ding.mp3 eklenebilir
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT..');
      audioRef.current = audio;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(() => {
      // İlk kullanıcı etkileşimine kadar bazı tarayıcılar ses çalmayı engeller
    });
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
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function refreshOrders() {
    const result = await getActiveOrders();
    if (result.success && result.orders) {
      // Yeni sipariş geldi mi kontrol et (ses için)
      const currentIds = new Set(result.orders.map((o) => o.id));
      const prevIds = prevOrderIds.current;
      const newReceivedOrders = result.orders.filter(
        (o) => !prevIds.has(o.id) && o.status === 'received'
      );
      if (newReceivedOrders.length > 0) {
        playDing();
      }
      prevOrderIds.current = currentIds;
      setOrders(result.orders);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setBusyOrderId(orderId);
    const result = await updateOrderStatus(orderId, newStatus);
    setBusyOrderId(null);

    if (!result.success) {
      alert(`Hata: ${result.error}`);
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
    const confirmed = confirm('Bu siparişi iptal etmek istiyor musun? Bu işlem geri alınamaz.');
    if (!confirmed) return;
    setBusyOrderId(orderId);
    const result = await cancelOrder(orderId);
    setBusyOrderId(null);
    if (!result.success) {
      alert(`Hata: ${result.error}`);
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  // Kolonlarda siparişleri grupla
  const ordersByColumn = COLUMNS.map((col) => ({
    ...col,
    orders: orders.filter((o) => {
      if (col.key === 'ready') {
        return o.status === 'ready' || o.status === 'on_way';
      }
      return o.status === col.key;
    }),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Head */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div
            className="text-accent uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            CANLI SİPARİŞLER · {orders.length} AKTİF
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 38,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--ink)',
            }}
          >
            Sipariş akışı
          </h1>
        </div>

        {/* Ses switch */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span
            className="text-ink-2 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}
          >
            SES BİLDİRİMİ
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{
              background: soundEnabled ? 'var(--olive)' : 'var(--paper-3)',
            }}
            aria-pressed={soundEnabled}
          >
            <span
              className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
              style={{
                transform: soundEnabled ? 'translateX(22px)' : 'translateX(2px)',
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
                    busy={busyOrderId === order.id}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
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
  busy,
}: {
  order: ActiveOrder;
  accentColor: string;
  nextAction?: { status: OrderStatus; label: string };
  onStatusChange: (id: string, status: OrderStatus) => void;
  onCancel: (id: string) => void;
  busy: boolean;
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

  return (
    <article
      className="bg-paper border border-line rounded-[14px] overflow-hidden transition-opacity"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
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
            variant="icon"
            label="Mutfağa tekrar yazdır"
          />
          <PrintButton
            orderId={order.id}
            mode="cashier"
            variant="secondary"
            label="Hesap"
            className="!h-8 !px-3 !text-[11px]"
          />
          <button
            onClick={() => onCancel(order.id)}
            disabled={busy}
            className="text-ink-3 hover:text-accent text-xs disabled:opacity-30 transition-colors px-2"
            style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
            title="Siparişi iptal et"
          >
            İPTAL
          </button>
          {nextAction && (
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
