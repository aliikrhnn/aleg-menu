'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getOrderTracking,
  type OrderTrackingData,
  type RelatedOrderSummary,
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
  // Aynı masada diğer siparişler
  relatedHeading: {
    tr: 'Bu masadaki diğer siparişlerin',
    en: 'Other orders at this table',
  },
  relatedHint: {
    tr: 'Aynı masaya verilen siparişler — birine geçmek için tıkla',
    en: 'Orders placed at the same table — tap to switch',
  },
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
  // Google yönlendirme (4-5 yıldız)
  googleHeading: {
    tr: 'Bunu duymak harika!',
    en: 'That is great to hear!',
  },
  googleBody: {
    tr: "Memnun kaldığına çok sevindik. Google'da kısa bir yorum bırakır mısın? Bu, yeni müşterilerin bizi bulmasına yardımcı olur.",
    en: "We are so glad you enjoyed it. Could you leave a short Google review? It helps new customers find us.",
  },
  googleCTA: {
    tr: "Google'da değerlendir",
    en: 'Review on Google',
  },
  googleSkip: {
    tr: 'Sadece burada bırakmak istiyorum',
    en: 'I just want to leave it here',
  },
  googleRedirecting: {
    tr: 'Google&apos;a yönlendiriliyor…',
    en: 'Redirecting to Google…',
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
  // localStorage'da SADECE last_known_status saklıyoruz — review settings,
  // items, business her zaman server'dan gelmeli. Refresh'te server zaten
  // taze veriyi getirir; cache yalnız "status revert" görüntüsünü önler.
  const [data, setData] = useState<OrderTrackingData>(() => {
    if (typeof window === 'undefined') return initialData;
    try {
      const cachedStatus = window.localStorage.getItem(
        `aleg-order-status-${orderId}`
      );
      if (!cachedStatus) return initialData;
      const STATUS_RANK: Record<string, number> = {
        received: 0,
        confirmed: 1,
        preparing: 2,
        ready: 3,
        delivered: 4,
        cancelled: 5,
      };
      const cachedRank = STATUS_RANK[cachedStatus] ?? 0;
      const serverRank = STATUS_RANK[initialData.status] ?? 0;
      // Cache iptal/teslim gibi terminal durumdaysa onu kullan, ama veri
      // server'dan gelen taze obje. Yalnızca status alanını override edelim.
      if (cachedRank > serverRank && cachedRank >= 4) {
        return { ...initialData, status: cachedStatus };
      }
      return initialData;
    } catch {
      return initialData;
    }
  });
  const [lang] = useState<Lang>('tr'); // Default tr; menüden lang param gelmez

  // Her status değişikliğini localStorage'a kaydet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        `aleg-order-status-${orderId}`,
        data.status
      );
      // Eski cache anahtarlarını ve 24 saatten eski yenilerini temizle
      const NOW = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        // Eski versiyon (full obje) cache'lerini sil
        if (k.startsWith('aleg-order-') && !k.startsWith('aleg-order-status-')) {
          window.localStorage.removeItem(k);
          continue;
        }
        // Eski timestamp'li status cache'lerini sil (key'de yok ama temizlik)
        if (k.startsWith('aleg-order-status-')) {
          // Bu cache'lerin yaşını bilmiyoruz, kalsın
          continue;
        }
        // Genel temizlik: eski "aleg-order-{uuid}" objeleri için bile
        // 'created_at' kontrolü yapamıyoruz çünkü artık sadece status string
        void NOW;
        void ONE_DAY_MS;
      }
    } catch {
      /* localStorage kotası dolu olabilir, görmezden gel */
    }
  }, [data.status, orderId]);

  // Polling: status delivered/cancelled değilse her 5 saniyede bir güncelle
  useEffect(() => {
    if (data.status === 'delivered' || data.status === 'cancelled') {
      // Terminal durumda polling durdur
      return;
    }
    const interval = setInterval(async () => {
      const result = await getOrderTracking(orderId, businessSlug);
      if (result.success && result.data) {
        setData(result.data);
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

        {/* Bu masadaki diğer siparişler */}
        {data.related_orders && data.related_orders.length > 0 && (
          <div className="mt-8">
            <div
              className="uppercase mb-1.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: 'var(--ink-3)',
              }}
            >
              {T.relatedHeading[lang]}
            </div>
            <p
              className="text-[12px] mb-3"
              style={{
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
              }}
            >
              {T.relatedHint[lang]}
            </p>
            <div className="space-y-2">
              {data.related_orders.map((ro) => (
                <RelatedOrderCard
                  key={ro.id}
                  order={ro}
                  businessSlug={businessSlug}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}

        {/* Review */}
        {showReview && (
          <div className="mt-10">
            <ReviewForm
              orderId={data.id}
              businessId={data.business.id}
              businessName={data.business.name}
              smartRedirect={data.review_smart_redirect}
              googlePlaceId={data.google_place_id}
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

        {/* Otomatik güncelleme bilgisi + reassurance */}
        {!isDelivered && !isCancelled && (
          <div
            className="mt-8 flex items-center justify-center gap-2 text-[11px]"
            style={{ color: 'var(--ink-3)' }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: 'var(--accent)',
                animation: 'tcDot 1.5s ease-in-out infinite',
              }}
            />
            <span>
              {lang === 'tr'
                ? 'Otomatik güncelleniyor — sayfayı kapatabilir veya yenileyebilirsin'
                : 'Auto-updating — you can close or reload this page'}
            </span>
          </div>
        )}
        <style>{`
          @keyframes tcDot {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
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
type ReviewStep = 'rating' | 'google' | 'comment' | 'thanks';

function ReviewForm({
  orderId,
  businessId,
  businessName,
  smartRedirect,
  googlePlaceId,
  lang,
  onSubmitted,
}: {
  orderId: string;
  businessId: string;
  businessName: string;
  smartRedirect: boolean;
  googlePlaceId: string;
  lang: Lang;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState<ReviewStep>('rating');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Yıldıza tıklayınca: 4-5 + smart redirect + place_id varsa Google,
  // değilse direkt yorum ekranına geç
  function handleStarPick(stars: number) {
    setRating(stars);
    setError(null);
    // Debug — Ali test ederken console'da görebilsin
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[Aleg Review]', {
        stars,
        smartRedirect,
        hasPlaceId: !!googlePlaceId,
        placeId: googlePlaceId ? googlePlaceId.slice(0, 20) + '…' : '(boş)',
      });
    }
    if (smartRedirect && stars >= 4 && googlePlaceId) {
      setStep('google');
    } else {
      setStep('comment');
    }
  }

  async function persistReview(redirectedToGoogle: boolean) {
    setSubmitting(true);
    setError(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await submitReview({
          businessId,
          orderId,
          rating,
          comment: comment.trim() || undefined,
          customerName: name.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          redirectedToGoogle,
        });
        setSubmitting(false);
        if (result.success) {
          resolve(true);
        } else {
          setError(result.error || 'Hata');
          resolve(false);
        }
      });
    });
  }

  async function handleSubmit() {
    if (rating < 1) {
      setError(T.ratePrompt[lang]);
      return;
    }
    const ok = await persistReview(false);
    if (ok) {
      setStep('thanks');
      setTimeout(() => onSubmitted(), 800);
    }
  }

  async function handleGoogleRedirect() {
    const ok = await persistReview(true);
    if (!ok) return;
    const url = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;
    setTimeout(() => {
      window.open(url, '_blank');
      setStep('thanks');
      setTimeout(() => onSubmitted(), 800);
    }, 400);
  }

  // ============================================================
  // TEŞEKKÜR
  // ============================================================
  if (step === 'thanks') {
    return (
      <div
        className="p-8 rounded-[var(--r)] text-center"
        style={{
          background: 'color-mix(in srgb, var(--olive) 10%, var(--card))',
          border:
            '1px solid color-mix(in srgb, var(--olive) 25%, var(--line))',
        }}
      >
        <div
          className="text-[44px] mb-2"
          style={{ color: 'var(--olive)' }}
        >
          ✓
        </div>
        <p className="text-[16px]" style={{ color: 'var(--ink)' }}>
          {T.reviewThanks[lang]}
        </p>
      </div>
    );
  }

  // ============================================================
  // GOOGLE YÖNLENDİRME (4-5 yıldız)
  // ============================================================
  if (step === 'google') {
    return (
      <div
        className="rounded-[var(--r)] p-7 text-center"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        {/* Yıldızlar — büyük + altın */}
        <div
          className="text-[36px] tracking-wide mb-4"
          style={{ color: 'var(--gold, #B8903E)' }}
        >
          {'★'.repeat(rating)}
        </div>
        <h3
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
          className="mb-3"
        >
          {T.googleHeading[lang]}
        </h3>
        <p
          className="text-[14px] leading-relaxed mb-6 max-w-sm mx-auto"
          style={{ color: 'var(--ink-2)' }}
        >
          {T.googleBody[lang]}
        </p>

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
          onClick={handleGoogleRedirect}
          disabled={submitting}
          className="w-full h-12 rounded-[14px] font-semibold text-[14px] transition-opacity hover:opacity-90 disabled:opacity-50 mb-2 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: '#FAF5EA' }}
        >
          {submitting ? (
            <span>{T.googleRedirecting[lang]}</span>
          ) : (
            <>
              <GoogleIcon />
              <span>{T.googleCTA[lang]} →</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setStep('comment')}
          className="w-full h-11 text-[12px]"
          style={{ color: 'var(--ink-3)' }}
        >
          {T.googleSkip[lang]}
        </button>
      </div>
    );
  }

  // ============================================================
  // RATING (ilk ekran)
  // ============================================================
  if (step === 'rating') {
    return (
      <div
        className="rounded-[var(--r)] p-7"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="uppercase mb-1.5 text-center"
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
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
          className="mb-6 text-center"
        >
          {businessName}
        </h3>

        {/* Stars - büyük, dokunmatik için optimize */}
        <div className="flex justify-center gap-1.5 mb-3">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleStarPick(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-[44px] leading-none transition-all hover:scale-110 active:scale-95 px-1"
                style={{
                  color: filled ? 'var(--gold, #B8903E)' : 'var(--line)',
                  cursor: 'pointer',
                }}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            );
          })}
        </div>
        <p
          className="text-[12px] text-center"
          style={{
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
          }}
        >
          {lang === 'tr' ? 'Bir yıldıza dokun' : 'Tap a star'}
        </p>
      </div>
    );
  }

  // ============================================================
  // COMMENT (yorum) — 1-3 yıldız VEYA Google'ı atlayıp gelinmiş
  // ============================================================
  const isLowRating = rating <= 3;

  return (
    <div
      className="rounded-[var(--r)] p-6"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Yıldız özeti üstte */}
      <div className="text-center mb-5">
        <div
          className="text-[28px] tracking-wide"
          style={{ color: 'var(--gold, #B8903E)' }}
        >
          {'★'.repeat(rating)}
          <span style={{ color: 'var(--line)' }}>
            {'★'.repeat(5 - rating)}
          </span>
        </div>
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
          {isLowRating
            ? lang === 'tr'
              ? 'Ne oldu? (Yardımcı olmamız için)'
              : 'What happened? (Help us help you)'
            : T.reviewComment[lang]}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={
            isLowRating
              ? lang === 'tr'
                ? 'Deneyiminizi anlatın, hatamızı düzeltelim…'
                : 'Tell us what happened, we want to fix it…'
              : T.reviewCommentPlaceholder[lang]
          }
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
            maxLength={50}
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

// Google ikonu (renk-doğru, küçük)
function GoogleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h5.91c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.32z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ============================================================
// RELATED ORDER CARD — Aynı masada başka sipariş
// ============================================================
function RelatedOrderCard({
  order,
  businessSlug,
  lang,
}: {
  order: RelatedOrderSummary;
  businessSlug: string;
  lang: Lang;
}) {
  const STATUS_LABEL: Record<string, { tr: string; en: string; color: string; icon: string }> = {
    received: { tr: 'Alındı', en: 'Received', color: 'var(--ink-2)', icon: '📋' },
    confirmed: { tr: 'Alındı', en: 'Confirmed', color: 'var(--ink-2)', icon: '📋' },
    preparing: { tr: 'Hazırlanıyor', en: 'Preparing', color: 'var(--accent)', icon: '🍳' },
    ready: { tr: 'Hazır', en: 'Ready', color: 'var(--olive)', icon: '🔔' },
    delivered: { tr: 'Teslim', en: 'Delivered', color: 'var(--olive)', icon: '✓' },
    cancelled: { tr: 'İptal', en: 'Cancelled', color: 'var(--danger, #B83A2E)', icon: '⊘' },
  };
  const cfg = STATUS_LABEL[order.status] || STATUS_LABEL.received;

  const minutesAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  );
  const timeLabel =
    minutesAgo < 1
      ? lang === 'tr'
        ? 'şimdi'
        : 'now'
      : minutesAgo < 60
      ? `${minutesAgo} ${lang === 'tr' ? 'dk' : 'm'}`
      : `${Math.floor(minutesAgo / 60)} ${lang === 'tr' ? 'sa' : 'h'}`;

  return (
    <Link
      href={`/menu/${businessSlug}/siparis/${order.id}`}
      className="block rounded-[var(--r)] px-4 py-3 transition-all hover:scale-[1.005] active:scale-[0.99]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-[10px]"
          style={{
            background: `color-mix(in srgb, ${cfg.color} 12%, var(--paper-2))`,
            color: cfg.color,
            fontSize: 14,
          }}
        >
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}
            >
              #{order.order_no}
            </span>
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
              {cfg[lang]}
            </span>
          </div>
          <div
            className="text-[12px]"
            style={{ color: 'var(--ink-3)' }}
          >
            {timeLabel} · ₺{order.total.toLocaleString('tr-TR')}
          </div>
        </div>

        <div
          className="text-[16px] flex-shrink-0"
          style={{ color: 'var(--ink-3)' }}
        >
          →
        </div>
      </div>
    </Link>
  );
}

