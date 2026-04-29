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
  const isPositive = review && review.rating >= 4;
  const isNegative = review && review.rating <= 2;

  return (
    <Link
      href="/panel/degerlendirmeler"
      className="group block rounded-[var(--r)] p-6 transition-all hover:scale-[1.005] active:scale-[0.995] relative overflow-hidden"
      style={{
        background: isPositive
          ? 'color-mix(in srgb, var(--ok, #5C8C3A) 4%, var(--card))'
          : isNegative
          ? 'color-mix(in srgb, var(--gold, #B8903E) 5%, var(--card))'
          : 'var(--card)',
        border: isPositive
          ? '1px solid color-mix(in srgb, var(--ok, #5C8C3A) 22%, var(--line))'
          : isNegative
          ? '1px solid color-mix(in srgb, var(--gold, #B8903E) 22%, var(--line))'
          : '1px solid var(--line)',
        minHeight: 180,
      }}
    >
      {/* Glow halka - olumlu yorum varsa */}
      {isPositive && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--ok, #5C8C3A) 16%, transparent) 0%, transparent 70%)',
            animation: 'lrGlow 3.6s ease-in-out infinite',
          }}
        />
      )}

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div
          className="text-ink-3 uppercase flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          SON DEĞERLENDİRME
          {review && !review.is_replied && (
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: 'var(--accent)',
                animation: 'lrDot 1.6s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <span
          className="text-ink-3 group-hover:text-accent transition-colors"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
          }}
        >
          Tümü →
        </span>
      </div>

      {review ? (
        <div className="relative z-10">
          {/* Yıldızlar + tarih + yeni rozeti */}
          <div className="flex items-center gap-2.5 mb-3">
            <AnimatedStars rating={review.rating} />
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                letterSpacing: '0.04em',
              }}
            >
              {formatDate(review.created_at)}
            </span>
            {!review.is_replied && review.rating >= 4 && (
              <span
                className="px-1.5 py-0.5 rounded ml-auto"
                style={{
                  background:
                    'color-mix(in srgb, var(--ok, #5C8C3A) 15%, transparent)',
                  color: 'var(--ok, #5C8C3A)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                }}
              >
                YENİ
              </span>
            )}
          </div>

          {review.comment ? (
            <p
              className="text-[14px] mb-3 leading-relaxed line-clamp-3"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                color: 'var(--ink)',
                paddingLeft: 12,
                borderLeft: '2px solid color-mix(in srgb, var(--accent) 35%, var(--line))',
                animation: 'lrCommentIn 0.5s ease-out 0.5s both',
              }}
            >
              &ldquo;{review.comment}&rdquo;
            </p>
          ) : (
            <p
              className="text-[13px] text-ink-3 mb-3"
              style={{ fontStyle: 'italic' }}
            >
              Yorum yazılmamış, sadece puan verilmiş.
            </p>
          )}

          <div className="flex items-center justify-between text-[12px]">
            <span style={{ color: 'var(--ink-3)' }}>
              {review.customer_name || 'Anonim müşteri'}
            </span>
            {!review.is_replied ? (
              <span
                className="font-semibold flex items-center gap-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10.5,
                  color: 'var(--accent)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Cevap bekliyor
                <span>→</span>
              </span>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10.5,
                  color: 'var(--ok, #5C8C3A)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                ✓ Cevaplandı
              </span>
            )}
          </div>
        </div>
      ) : (
        <EmptyReview />
      )}

      <style jsx>{`
        @keyframes lrGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes lrDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
        @keyframes lrCommentIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Link>
  );
}

// ============================================================
// ANIMASYONLU YILDIZLAR — mount'ta sırayla doluyor
// ============================================================
function AnimatedStars({ rating }: { rating: number }) {
  const filled = Math.floor(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{ fontSize: 18, lineHeight: 1 }}
      aria-label={`${rating} yıldız`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const isFilled = i <= filled;
        return (
          <span
            key={i}
            style={{
              color: isFilled
                ? 'var(--gold, #B8903E)'
                : 'color-mix(in srgb, var(--ink-3) 50%, transparent)',
              animation: isFilled
                ? `lrStarPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 90}ms both`
                : `lrStarFade 0.3s ease-out ${i * 90}ms both`,
              display: 'inline-block',
              transformOrigin: 'center',
            }}
          >
            ★
          </span>
        );
      })}
      <style jsx>{`
        @keyframes lrStarPop {
          0% {
            transform: scale(0) rotate(-30deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.2) rotate(8deg);
          }
          100% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }
        @keyframes lrStarFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </span>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyReview() {
  return (
    <div
      className="flex items-center justify-center flex-col py-6 relative z-10"
      style={{ minHeight: 120 }}
    >
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              fontSize: 22,
              color:
                'color-mix(in srgb, var(--gold, #B8903E) 35%, transparent)',
              animation: `lrEmptyStar 2.4s ease-in-out ${i * 0.15}s infinite`,
              display: 'inline-block',
            }}
          >
            ★
          </span>
        ))}
      </div>
      <p
        className="text-center max-w-xs"
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        Müşteriler hesap fişindeki QR&apos;ı okuttuğunda deneyimlerini buradan
        görebilirsin.
      </p>
      <style jsx>{`
        @keyframes lrEmptyStar {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
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
