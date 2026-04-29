'use client';

import Link from 'next/link';

type TopProduct = {
  product_id: string;
  product_name: string | Record<string, string>;
  quantity: number;
  revenue: number;
  hero_icon: string | null;
  hero_image_url: string | null;
};

// Defansif: string geldiyse onu, JSON obje geldiyse tr → en → ilk değeri kullan
function resolveName(
  name: string | Record<string, string> | null | undefined
): string {
  if (!name) return 'Ürün';
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return name.tr || name.en || Object.values(name)[0] || 'Ürün';
  }
  return String(name);
}

// Emoji mi kontrol et
function isEmoji(s: string | null): boolean {
  if (!s) return false;
  return /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(s);
}

export function TopProductsCard({
  topProducts,
}: {
  topProducts: TopProduct[];
}) {
  const maxQty = Math.max(...topProducts.map((p) => p.quantity), 1);
  const hasData = topProducts.length > 0;
  const champion = topProducts[0];
  const rest = topProducts.slice(1);

  return (
    <Link
      href="/panel/raporlar?preset=today"
      className="group block rounded-[var(--r)] p-6 transition-all hover:scale-[1.005] active:scale-[0.995]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 260,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div
            className="text-ink-3 uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            BUGÜN · POPÜLER
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {hasData ? 'En çok satan' : 'Henüz sipariş yok'}
          </h2>
        </div>
        <span
          className="text-ink-3 group-hover:text-accent transition-colors"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
          }}
        >
          Detay →
        </span>
      </div>

      {hasData ? (
        <>
          {/* Champion - en çok satan ürün */}
          <ChampionCard product={champion} />

          {/* Diğerleri - bar list */}
          {rest.length > 0 && (
            <div className="space-y-2 mt-3">
              {rest.map((p, idx) => (
                <RankRow
                  key={p.product_id || idx}
                  rank={idx + 2}
                  product={p}
                  maxQty={maxQty}
                  delay={idx * 80}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </Link>
  );
}

// ============================================================
// CHAMPION — #1 ürün hero card
// ============================================================
function ChampionCard({ product }: { product: TopProduct }) {
  const name = resolveName(product.product_name);
  const hasImage = !!product.hero_image_url;
  const hasEmoji = isEmoji(product.hero_icon);

  return (
    <div
      className="rounded-[14px] p-4 mb-3 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--gold, #B8903E) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent) 5%, var(--card)) 100%)',
        border:
          '1px solid color-mix(in srgb, var(--gold, #B8903E) 25%, var(--line))',
        animation: 'tpChampionIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Sparkle overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -10,
          right: -10,
          width: 100,
          height: 100,
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--gold, #B8903E) 22%, transparent) 0%, transparent 70%)',
          animation: 'tpChampionGlow 3s ease-in-out infinite',
        }}
      />

      <div className="flex items-center gap-3 relative z-10">
        {/* Visual: image > emoji > medal */}
        <div
          className="flex-shrink-0 grid place-items-center rounded-[10px] overflow-hidden"
          style={{
            width: 56,
            height: 56,
            background: 'var(--card)',
            border: '1px solid color-mix(in srgb, var(--gold, #B8903E) 30%, var(--line))',
          }}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.hero_image_url!}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : hasEmoji ? (
            <span style={{ fontSize: 30 }}>{product.hero_icon}</span>
          ) : (
            <span
              style={{
                fontSize: 22,
                color: 'var(--gold, #B8903E)',
              }}
            >
              ★
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Champion badge */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                background:
                  'color-mix(in srgb, var(--gold, #B8903E) 14%, transparent)',
                color: 'var(--gold, #B8903E)',
              }}
            >
              <span style={{ fontSize: 10 }}>🥇</span>
              <span>1.</span>
            </span>
          </div>

          <div
            className="truncate"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {name}
          </div>

          <div
            className="mt-0.5 flex items-center gap-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: 'var(--ink-2)',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
              {product.quantity}x
            </span>
            <span>·</span>
            <span>
              ₺{Math.round(product.revenue).toLocaleString('tr-TR')}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes tpChampionIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes tpChampionGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SIRA SATIRI - 2., 3., 4., 5.
// ============================================================
function RankRow({
  rank,
  product,
  maxQty,
  delay,
}: {
  rank: number;
  product: TopProduct;
  maxQty: number;
  delay: number;
}) {
  const name = resolveName(product.product_name);
  const pct = (product.quantity / maxQty) * 100;
  const hasEmoji = isEmoji(product.hero_icon);
  const hasImage = !!product.hero_image_url;

  // Rank renkleri
  const rankColor =
    rank === 2
      ? 'var(--ink-2)' // gümüş
      : rank === 3
      ? 'color-mix(in srgb, var(--gold, #B8903E) 70%, var(--ink-2))' // bronz
      : 'var(--ink-3)';

  const barColor =
    rank === 2
      ? 'color-mix(in srgb, var(--accent) 55%, var(--ink-3))'
      : rank === 3
      ? 'color-mix(in srgb, var(--accent) 35%, var(--ink-3))'
      : 'var(--line-2, var(--ink-3))';

  return (
    <div
      className="rounded-[10px] p-2.5 transition-colors hover:bg-paper-2"
      style={{
        animation: `tpRowIn 0.5s ease-out ${delay}ms both`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-1">
        {/* Rank */}
        <span
          className="flex-shrink-0 grid place-items-center rounded-full"
          style={{
            width: 22,
            height: 22,
            background: 'var(--paper-2)',
            color: rankColor,
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {rank}
        </span>

        {/* Mini icon (emoji veya image varsa) */}
        {(hasEmoji || hasImage) && (
          <div
            className="flex-shrink-0 grid place-items-center rounded-md overflow-hidden"
            style={{
              width: 22,
              height: 22,
              background: 'var(--paper-2)',
            }}
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.hero_image_url!}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span style={{ fontSize: 13 }}>{product.hero_icon}</span>
            )}
          </div>
        )}

        <span
          className="flex-1 truncate text-[13px]"
          style={{ color: 'var(--ink)', fontWeight: 500 }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-2)',
          }}
        >
          {product.quantity}x
        </span>
        <span
          className="text-right"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10.5,
            color: 'var(--ink-3)',
            minWidth: 56,
          }}
        >
          ₺{Math.round(product.revenue).toLocaleString('tr-TR')}
        </span>
      </div>

      {/* Bar */}
      <div
        className="h-1 rounded-full overflow-hidden ml-[30px]"
        style={{ background: 'var(--paper-2)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: barColor,
            width: `${pct}%`,
            animation: `tpBarFill 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay + 100}ms both`,
            transformOrigin: 'left',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes tpRowIn {
          from {
            opacity: 0;
            transform: translateX(-6px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes tpBarFill {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState() {
  return (
    <div
      className="flex items-center justify-center flex-col py-10"
      style={{ minHeight: 140 }}
    >
      <div
        className="text-4xl mb-3"
        style={{
          opacity: 0.35,
          animation: 'tpEmptyBob 3s ease-in-out infinite',
        }}
      >
        ☕
      </div>
      <p
        className="text-center text-sm max-w-xs"
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
        }}
      >
        İlk sipariş geldiğinde popüler ürünler burada belirecek.
      </p>
      <style jsx>{`
        @keyframes tpEmptyBob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-3px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
