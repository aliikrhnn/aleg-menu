'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getOrderTracking,
  type OrderTrackingData,
} from '@/lib/actions/orders';
import { submitReview } from '@/lib/actions/reviews';

type Lang = 'tr' | 'en';

const T = {
  trackingTitle: { tr: 'Siparişin', en: 'Your order' },
  orderNo: { tr: 'Sipariş kodu', en: 'Order code' },
  table: { tr: 'Masa', en: 'Table' },
  pickup: { tr: 'Gel-al', en: 'Pickup' },
  delivery: { tr: 'Paket servis', en: 'Delivery' },
  total: { tr: 'Toplam', en: 'Total' },
  // Statuses
  status_received: { tr: 'Sipariş alındı', en: 'Order received' },
  status_preparing: { tr: 'Hazırlanıyor', en: 'Preparing' },
  status_ready: { tr: 'Hazır', en: 'Ready' },
  status_delivered: { tr: 'Teslim edildi', en: 'Delivered' },
  status_cancelled: { tr: 'İptal edildi', en: 'Cancelled' },
  // Status hints
  hint_received: {
    tr: 'Mutfak siparişini gördü, çok yakında hazırlanmaya başlayacak.',
    en: 'The kitchen has seen your order. Preparation will start soon.',
  },
  hint_preparing: {
    tr: 'Şu an üzerinde çalışıyorlar.',
    en: 'They are working on it now.',
  },
  hint_ready: {
    tr: 'Siparişin hazır! Görevli birazdan getirecek.',
    en: 'Your order is ready! A staff member will bring it shortly.',
  },
  hint_delivered: {
    tr: 'Afiyet olsun. Deneyimini paylaşır mısın?',
    en: 'Enjoy! Would you share your experience?',
  },
  hint_cancelled: {
    tr: 'Bu sipariş iptal edildi.',
    en: 'This order was cancelled.',
  },
  items: { tr: 'Ürünler', en: 'Items' },
  // Review
  rateExperience: {
    tr: 'Bu siparişi değerlendir',
    en: 'Rate this order',
  },
  ratePrompt: {
    tr: 'Yıldız sayısını seç',
    en: 'Pick the number of stars',
  },
  reviewComment: {
    tr: 'Yorumunu yaz (opsiyonel)',
    en: 'Add a comment (optional)',
  },
  reviewCommentPlaceholder: {
    tr: 'Neyi sevdin? Ne daha iyi olabilirdi?',
    en: 'What did you like? What could be better?',
  },
  reviewName: { tr: 'Adın (opsiyonel)', en: 'Your name (optional)' },
  reviewPhone: { tr: 'Telefon (opsiyonel)', en: 'Phone (optional)' },
  submitReview: { tr: 'Değerlendirmeyi gönder', en: 'Submit review' },
  reviewSubmitting: { tr: 'Gönderiliyor…', en: 'Submitting…' },
  reviewThanks: {
    tr: 'Teşekkürler! Geri bildiriminiz bizim için değerli.',
    en: 'Thank you! Your feedback is valuable.',
  },
  reviewExists: {
    tr: 'Bu sipariş için zaten değerlendirme yaptın.',
    en: 'You have already reviewed this order.',
  },
  // Action
  backToMenu: { tr: 'Menüye dön', en: 'Back to menu' },
  // Last updated
  lastUpdate: { tr: 'Son güncelleme', en: 'Last updated' },
  justNow: { tr: 'şimdi', en: 'just now' },
  secondsAgo: { tr: 'sn önce', en: 's ago' },
};

const STATUS_ORDER = ['received', 'preparing', 'ready', 'delivered'] as const;

type Props = {
  initialData: OrderTrackingData;
  orderId: string;
  businessSlug: string;
};

export function TrackingClient({
  initialData,
  orderId,
  businessSlug,
}: Props) {
  const [data, setData] = useState<OrderTrackingData>(initialData);
  const [lang] = useState<Lang>('tr'); // Default tr; menüden lang param gelmez
  const [lastFetch, setLastFetch] = useState<number>(Date.now());

  // Polling: status delivered/cancelled değilse her 5 saniyede bir güncelle
  useEffect(() => {
    if (data.status === 'delivered' || data.status === 'cancelled') {
      // hala has_review değişmiş olabilir, daha yavaş poll
      return;
    }
    const interval = setInterval(async () => {
      const result = await getOrderTracking(orderId, businessSlug);
      if (result.success && result.data) {
        setData(result.data);
        setLastFetch(Date.now());
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [data.status, orderId, businessSlug]);

  // Status info
  const isCancelled = data.status === 'cancelled';
  const currentStepIdx = isCancelled
    ? -1
    : STATUS_ORDER.indexOf(data.status as (typeof STATUS_ORDER)[number]);
  const isDelivered = data.status === 'delivered';
  const showReview = isDelivered && !data.has_review;

  // Order type label
  const orderTypeLabel =
    data.order_type === 'dine_in' && data.table_name
      ? `${T.table[lang]} ${data.table_name}`
      : data.order_type === 'pickup'
      ? T.pickup[lang]
      : data.order_type === 'delivery'
      ? T.delivery[lang]
      : '';

  return (
    <div
      className="min-h-screen pb-12"
      style={{
        background: 'var(--paper)',
        color: 'var(--ink)',
      }}
    >
      {/* Header bar */}
      <div
        className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
        style={{
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <Link
          href={`/menu/${businessSlug}`}
          className="text-[12px] flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--ink-2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {T.backToMenu[lang]}
        </Link>
        <div
          className="text-[10px] uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          {data.business.name}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8">
        {/* Title */}
        <div className="mb-6">
          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--accent)',
            }}
          >
            #{data.order_no}
            {orderTypeLabel && (
              <span style={{ color: 'var(--ink-3)' }}>
                {' · '}
                {orderTypeLabel}
              </span>
            )}
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 38,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            {T.trackingTitle[lang]}
          </h1>
        </div>

        {/* Status bar */}
        {isCancelled ? (
          <CancelledCard lang={lang} />
        ) : (
          <StatusBar currentStep={currentStepIdx} lang={lang} />
        )}

        {/* Status hint */}
        <div
          className="mt-5 p-4 rounded-[var(--r)]"
          style={{
            background:
              isDelivered
                ? 'color-mix(in srgb, var(--olive) 8%, var(--card))'
                : isCancelled
                ? 'color-mix(in srgb, var(--danger, #B83A2E) 6%, var(--card))'
                : 'color-mix(in srgb, var(--accent) 5%, var(--card))',
            border: `1px solid ${
              isDelivered
                ? 'color-mix(in srgb, var(--olive) 18%, var(--line))'
                : isCancelled
                ? 'color-mix(in srgb, var(--danger, #B83A2E) 18%, var(--line))'
                : 'color-mix(in srgb, var(--accent) 18%, var(--line))'
            }`,
          }}
        >
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'var(--ink)' }}
          >
            {isCancelled
              ? T.hint_cancelled[lang]
              : data.status === 'received'
              ? T.hint_received[lang]
              : data.status === 'preparing'
              ? T.hint_preparing[lang]
              : data.status === 'ready'
              ? T.hint_ready[lang]
              : T.hint_delivered[lang]}
          </p>
        </div>

        {/* Sipariş kalemleri */}
        <div className="mt-8">
          <div
            className="uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--ink-3)',
            }}
          >
            {T.items[lang]}
          </div>
          <div
            className="rounded-[var(--r)] divide-y"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            {data.items.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderColor: 'var(--line)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-mono text-[13px]"
                      style={{ color: 'var(--ink-3)' }}
                    >
                      {item.quantity}×
                    </span>
                    <span className="text-[14px]">{item.product_name}</span>
                  </div>
                </div>
                <div
                  className="text-[13px] font-mono ml-3"
                  style={{ color: 'var(--ink-2)' }}
                >
                  ₺{(item.unit_price * item.quantity).toLocaleString('tr-TR')}
                </div>
              </div>
            ))}
            {/* Toplam */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--paper-2)' }}
            >
              <span
                className="text-[13px] uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                }}
              >
                {T.total[lang]}
              </span>
              <span
                className="font-mono text-[16px] font-bold"
                style={{ color: 'var(--ink)' }}
              >
                ₺{data.total.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
        </div>

        {/* Review */}
        {showReview && (
          <div className="mt-10">
            <ReviewForm
              orderId={data.id}
              businessId={data.business.id}
              lang={lang}
              onSubmitted={() =>
                setData((prev) => ({ ...prev, has_review: true }))
              }
            />
          </div>
        )}

        {isDelivered && data.has_review && (
          <div
            className="mt-10 p-4 rounded-[var(--r)] text-center"
            style={{
              background: 'color-mix(in srgb, var(--olive) 8%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--olive) 20%, var(--line))',
            }}
          >
            <div className="text-[24px] mb-1.5">✓</div>
            <p
              className="text-[14px]"
              style={{ color: 'var(--ink)' }}
            >
              {T.reviewExists[lang]}
            </p>
          </div>
        )}

        {/* Last updated */}
        {!isDelivered && !isCancelled && (
          <div
            className="mt-8 text-center text-[11px]"
            style={{ color: 'var(--ink-3)' }}
          >
            <RelativeTime ts={lastFetch} lang={lang} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STATUS BAR
// ============================================================
function StatusBar({
  currentStep,
  lang,
}: {
  currentStep: number;
  lang: Lang;
}) {
  const steps: Array<{
    key: 'received' | 'preparing' | 'ready' | 'delivered';
    icon: string;
  }> = [
    { key: 'received', icon: '📋' },
    { key: 'preparing', icon: '🍳' },
    { key: 'ready', icon: '🔔' },
    { key: 'delivered', icon: '✓' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-start justify-between relative">
        {/* Progress line (background) */}
        <div
          className="absolute top-5 left-5 right-5 h-[2px]"
          style={{ background: 'var(--line)', zIndex: 0 }}
        />
        {/* Progress line (filled) */}
        <div
          className="absolute top-5 left-5 h-[2px] transition-all duration-700"
          style={{
            width:
              currentStep < 0
                ? '0%'
                : currentStep === 0
                ? '0%'
                : currentStep === steps.length - 1
                ? 'calc(100% - 40px)'
                : `${(currentStep / (steps.length - 1)) * 100}%`,
            background: 'var(--accent)',
            zIndex: 0,
          }}
        />

        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isComplete = idx < currentStep;
          const isPending = idx > currentStep;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center flex-1 relative"
              style={{ zIndex: 1 }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] transition-all duration-500"
                style={{
                  background: isPending
                    ? 'var(--card)'
                    : isActive
                    ? 'var(--accent)'
                    : 'var(--accent)',
                  border: `2px solid ${
                    isPending ? 'var(--line)' : 'var(--accent)'
                  }`,
                  color: isPending ? 'var(--ink-3)' : '#FAF5EA',
                  boxShadow: isActive
                    ? '0 0 0 5px color-mix(in srgb, var(--accent) 18%, transparent)'
                    : 'none',
                  animation: isActive ? 'tbPulse 2.2s ease-in-out infinite' : 'none',
                }}
              >
                {isComplete ? '✓' : step.icon}
              </div>
              <div
                className="mt-2 text-[10px] uppercase text-center px-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: isPending ? 'var(--ink-3)' : 'var(--ink)',
                }}
              >
                {T[`status_${step.key}` as keyof typeof T][lang]}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes tbPulse {
          0%, 100% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 18%, transparent); }
          50% { box-shadow: 0 0 0 9px color-mix(in srgb, var(--accent) 8%, transparent); }
        }
      `}</style>
    </div>
  );
}

function CancelledCard({ lang }: { lang: Lang }) {
  return (
    <div
      className="mt-4 p-6 rounded-[var(--r)] text-center"
      style={{
        background:
          'color-mix(in srgb, var(--danger, #B83A2E) 6%, var(--card))',
        border:
          '1px solid color-mix(in srgb, var(--danger, #B83A2E) 20%, var(--line))',
      }}
    >
      <div className="text-[36px] mb-2">⊘</div>
      <div
        className="font-semibold text-[16px]"
        style={{ color: 'var(--danger, #B83A2E)' }}
      >
        {T.status_cancelled[lang]}
      </div>
    </div>
  );
}

// ============================================================
// REVIEW FORM
// ============================================================
function ReviewForm({
  orderId,
  businessId,
  lang,
  onSubmitted,
}: {
  orderId: string;
  businessId: string;
  lang: Lang;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const handleSubmit = async () => {
    if (rating < 1) {
      setError(T.ratePrompt[lang]);
      return;
    }
    setError(null);
    setSubmitting(true);
    startTransition(async () => {
      const result = await submitReview({
        businessId,
        orderId,
        rating,
        comment: comment.trim() || undefined,
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
      });
      setSubmitting(false);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => onSubmitted(), 800); // animasyon için kısa gecikme
      } else {
        setError(result.error || 'Hata');
      }
    });
  };

  if (success) {
    return (
      <div
        className="p-6 rounded-[var(--r)] text-center"
        style={{
          background: 'color-mix(in srgb, var(--olive) 10%, var(--card))',
          border:
            '1px solid color-mix(in srgb, var(--olive) 25%, var(--line))',
        }}
      >
        <div className="text-[36px] mb-2">★</div>
        <p className="text-[15px]" style={{ color: 'var(--ink)' }}>
          {T.reviewThanks[lang]}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--r)] p-6"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--accent)',
        }}
      >
        {T.rateExperience[lang]}
      </div>
      <h3
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
        className="mb-5"
      >
        {T.ratePrompt[lang]}
      </h3>

      {/* Stars */}
      <div className="flex gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hoverRating || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-[36px] leading-none transition-transform hover:scale-110"
              style={{
                color: filled ? 'var(--accent)' : 'var(--line)',
                cursor: 'pointer',
              }}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          );
        })}
      </div>

      {/* Comment */}
      <div className="mb-3">
        <label
          className="block uppercase mb-1.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          {T.reviewComment[lang]}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={T.reviewCommentPlaceholder[lang]}
          className="w-full px-3 py-2 rounded-[10px] text-[14px] resize-none focus:outline-none"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
          }}
        />
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label
            className="block uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            {T.reviewName[lang]}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-[10px] text-[14px] focus:outline-none"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          />
        </div>
        <div>
          <label
            className="block uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            {T.reviewPhone[lang]}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-[10px] text-[14px] focus:outline-none"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          className="mb-3 px-3 py-2 rounded-[10px] text-[12px]"
          style={{
            background:
              'color-mix(in srgb, var(--danger, #B83A2E) 8%, var(--card))',
            color: 'var(--danger, #B83A2E)',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating < 1}
        className="w-full py-3.5 rounded-[14px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--accent)', color: '#FAF5EA' }}
      >
        {submitting ? T.reviewSubmitting[lang] : T.submitReview[lang]}
      </button>
    </div>
  );
}

// ============================================================
// RELATIVE TIME (last update)
// ============================================================
function RelativeTime({ ts, lang }: { ts: number; lang: Lang }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
  // tick used to refresh
  void tick;

  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  return (
    <span>
      {T.lastUpdate[lang]}:{' '}
      {sec < 3 ? T.justNow[lang] : `${sec} ${T.secondsAgo[lang]}`}
    </span>
  );
}
