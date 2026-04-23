'use client';

import Link from 'next/link';

type LatestReview = {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
  is_replied: boolean;
} | null;

export function LatestReviewCard({ review }: { review: LatestReview }) {
  return (
    <Link
      href="/panel/degerlendirmeler"
      className="group block bg-card border border-line rounded-[var(--r)] p-6 transition-colors hover:border-[var(--line-2)]"
      style={{ minHeight: 180 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="text-ink-3 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          SON DEĞERLENDİRME
        </div>
        <span
          className="text-ink-3 group-hover:text-accent transition-colors text-sm"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          Tümü ↗
        </span>
      </div>

      {review ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span style={{ color: 'var(--gold)', fontSize: 18 }}>
              {renderStars(review.rating)}
            </span>
            <span className="text-ink-2 text-[12px]">
              {formatDate(review.created_at)}
            </span>
            {!review.is_replied && review.rating >= 4 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded ml-auto"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 15%, var(--card))',
                  color: 'var(--ok)',
                  fontWeight: 700,
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.1em',
                }}
              >
                YENİ
              </span>
            )}
          </div>
          {review.comment && (
            <p
              className="text-[14px] text-ink-2 mb-3 leading-relaxed line-clamp-3"
              style={{
                fontStyle: 'italic',
                paddingLeft: 10,
                borderLeft: '2px solid var(--line)',
              }}
            >
              &ldquo;{review.comment}&rdquo;
            </p>
          )}
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-ink-3">
              {review.customer_name || 'Anonim müşteri'}
            </span>
            {!review.is_replied && (
              <span
                className="text-accent font-semibold"
                style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
              >
                Cevap bekliyor →
              </span>
            )}
          </div>
        </>
      ) : (
        <div
          className="flex items-center justify-center flex-col py-8"
          style={{ minHeight: 120 }}
        >
          <div className="text-3xl mb-2 opacity-30">★</div>
          <p className="text-ink-2 text-[13px] text-center max-w-xs">
            Müşterilerin hesap fişindeki QR&apos;ı okutarak deneyimlerini
            puanlayabilir.
          </p>
        </div>
      )}
    </Link>
  );
}

function renderStars(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}
