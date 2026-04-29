'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getCustomerOrdersBatch,
  type CustomerOrderSummary,
} from '@/lib/actions/orders';
import {
  getCustomerOrderIds,
  removeCustomerOrder,
} from '@/lib/customer-orders';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';

type Lang = 'tr' | 'en';

const T = {
  title: { tr: 'Siparişlerim', en: 'My Orders' },
  empty: {
    tr: 'Henüz siparişin yok',
    en: 'No orders yet',
  },
  emptyHint: {
    tr: 'Bir şeyler sipariş ettikten sonra buradan takip edebilirsin.',
    en: 'After you order, you can track it here.',
  },
  loading: { tr: 'Yükleniyor…', en: 'Loading…' },
  refresh: { tr: 'Yenile', en: 'Refresh' },
  remove: { tr: 'Listeden çıkar', en: 'Remove' },
  // Status
  status_received: { tr: 'Alındı', en: 'Received' },
  status_confirmed: { tr: 'Alındı', en: 'Confirmed' },
  status_preparing: { tr: 'Hazırlanıyor', en: 'Preparing' },
  status_ready: { tr: 'Hazır', en: 'Ready' },
  status_delivered: { tr: 'Teslim edildi', en: 'Delivered' },
  status_cancelled: { tr: 'İptal edildi', en: 'Cancelled' },
  // Order type
  pickup: { tr: 'Paket', en: 'Pickup' },
  delivery: { tr: 'Kapıya', en: 'Delivery' },
  // Action
  trackOrder: { tr: 'Takip et', en: 'Track' },
  reviewOrder: { tr: 'Değerlendir', en: 'Review' },
  // Time
  justNow: { tr: 'şimdi', en: 'now' },
  minutesAgo: { tr: 'dk', en: 'm' },
  hoursAgo: { tr: 'sa', en: 'h' },
  daysAgo: { tr: 'g', en: 'd' },
};

const STATUS_CFG: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  received: { color: 'var(--ink-2)', bg: 'var(--paper-2)', icon: '📋' },
  confirmed: { color: 'var(--ink-2)', bg: 'var(--paper-2)', icon: '📋' },
  preparing: { color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 10%, var(--card))', icon: '🍳' },
  ready: { color: 'var(--olive)', bg: 'color-mix(in srgb, var(--olive) 12%, var(--card))', icon: '🔔' },
  delivered: { color: 'var(--olive)', bg: 'color-mix(in srgb, var(--olive) 8%, var(--card))', icon: '✓' },
  cancelled: { color: 'var(--danger, #B83A2E)', bg: 'color-mix(in srgb, var(--danger, #B83A2E) 8%, var(--card))', icon: '⊘' },
};

type Props = {
  open: boolean;
  onClose: () => void;
  businessSlug: string;
  lang: Lang;
};

export function MyOrdersPanel({ open, onClose, businessSlug, lang }: Props) {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ids = getCustomerOrderIds(businessSlug);
    if (ids.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const result = await getCustomerOrdersBatch(ids, businessSlug);
    if (result.success && result.orders) {
      setOrders(result.orders);
    } else {
      setError(result.error || 'Hata');
    }
    setLoading(false);
  }, [businessSlug]);

  useEffect(() => {
    if (!open) return;
    fetchOrders();
    // Açıkken her 8 saniyede bir tazele (statü canlı kalsın)
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [open, fetchOrders]);

  useEscapeKey(onClose, open);

  if (!open) return null;

  const handleRemove = (orderId: string) => {
    removeCustomerOrder(businessSlug, orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'mopFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-paper w-full sm:max-w-[520px] sm:rounded-[22px] rounded-t-[22px] border border-line relative flex flex-col"
        style={{
          maxHeight: '90vh',
          boxShadow:
            '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'mopSlideUp 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-5 border-b border-line flex-shrink-0 flex items-center justify-between">
          <div>
            <div
              className="text-ink-3 uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9.5,
                letterSpacing: '0.14em',
                fontWeight: 700,
              }}
            >
              {orders.length > 0 ? `${orders.length} sipariş` : '—'}
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                lineHeight: 1,
              }}
            >
              {T.title[lang]}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-paper-2 disabled:opacity-50"
              aria-label={T.refresh[lang]}
              title={T.refresh[lang]}
              style={{ color: 'var(--ink-3)' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: loading ? 'mopSpin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <polyline points="21 4 21 12 13 12" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-paper-2"
              aria-label="Kapat"
              style={{ color: 'var(--ink-2)' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && orders.length === 0 ? (
            <div className="py-12 text-center text-ink-3 text-sm">
              {T.loading[lang]}
            </div>
          ) : error ? (
            <div
              className="rounded-[var(--r)] px-4 py-3 text-sm"
              style={{
                background:
                  'color-mix(in srgb, var(--danger, #B83A2E) 8%, var(--card))',
                color: 'var(--danger, #B83A2E)',
              }}
            >
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-14 text-center">
              <div
                className="text-[42px] mb-3"
                style={{ color: 'var(--ink-3)' }}
              >
                📋
              </div>
              <h3
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
                className="mb-2"
              >
                {T.empty[lang]}
              </h3>
              <p
                className="text-[13px] max-w-[280px] mx-auto"
                style={{ color: 'var(--ink-3)' }}
              >
                {T.emptyHint[lang]}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  businessSlug={businessSlug}
                  lang={lang}
                  onRemove={() => handleRemove(order.id)}
                  onTrackClicked={onClose}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes mopFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mopSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes mopSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Sipariş satırı
// ============================================================
function OrderRow({
  order,
  businessSlug,
  lang,
  onRemove,
  onTrackClicked,
}: {
  order: CustomerOrderSummary;
  businessSlug: string;
  lang: Lang;
  onRemove: () => void;
  onTrackClicked: () => void;
}) {
  const cfg = STATUS_CFG[order.status] || STATUS_CFG.received;
  const isTerminal =
    order.status === 'delivered' || order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const showReview = isDelivered && !order.has_review;

  // Zaman etiketi
  const ms = Date.now() - new Date(order.created_at).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const timeLabel =
    minutes < 1
      ? T.justNow[lang]
      : minutes < 60
      ? `${minutes} ${T.minutesAgo[lang]}`
      : hours < 24
      ? `${hours} ${T.hoursAgo[lang]}`
      : `${days} ${T.daysAgo[lang]}`;

  // Hedef etiketi
  const destination =
    order.order_type === 'pickup'
      ? T.pickup[lang]
      : order.order_type === 'delivery'
      ? T.delivery[lang]
      : order.table_name || (lang === 'tr' ? 'Masa' : 'Table');

  const statusKey = (`status_${order.status}` as keyof typeof T) ?? 'status_received';
  const statusLabel = T[statusKey] ? T[statusKey][lang] : order.status;

  return (
    <div
      className="rounded-[var(--r)] overflow-hidden"
      style={{
        background: cfg.bg,
        border: `1px solid color-mix(in srgb, ${cfg.color} 15%, var(--line))`,
      }}
    >
      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* Status icon */}
        <div
          className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-[10px]"
          style={{
            background: 'var(--card)',
            color: cfg.color,
            fontSize: 18,
            border: `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
          }}
        >
          {cfg.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Üst satır: status + zaman */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: cfg.color,
              }}
            >
              {statusLabel}
            </span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
              }}
            >
              · {timeLabel}
            </span>
          </div>

          {/* Hedef + tutar */}
          <div className="flex items-baseline gap-2">
            <span
              className="truncate"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 19,
                fontWeight: 400,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              {destination}
            </span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ink-3)',
                letterSpacing: '0.04em',
              }}
            >
              · ₺{order.total.toLocaleString('tr-TR')}
            </span>
          </div>

          {/* Sipariş no */}
          <div
            className="mt-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--accent)',
            }}
          >
            #{order.order_no}
          </div>
        </div>

        {/* Sağ: aksiyon */}
        <div className="flex-shrink-0">
          <a
            href={`/menu/${businessSlug}/siparis/${order.id}`}
            onClick={onTrackClicked}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-[10px] text-[12px] font-semibold transition-opacity hover:opacity-90"
            style={{
              background: showReview ? 'var(--accent)' : 'var(--ink)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {showReview
              ? T.reviewOrder[lang]
              : isTerminal
              ? T.trackOrder[lang]
              : T.trackOrder[lang]}
            <span>→</span>
          </a>
        </div>
      </div>

      {/* Terminal durumda "kaldır" linki */}
      {isTerminal && (
        <div
          className="px-4 pb-2 -mt-1 text-right"
          style={{ borderColor: 'var(--line)' }}
        >
          <button
            onClick={onRemove}
            className="text-[10px] hover:underline transition-colors"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {T.remove[lang]}
          </button>
        </div>
      )}
    </div>
  );
}
