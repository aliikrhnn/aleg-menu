'use client';

import Link from 'next/link';
import { CountUp } from './count-up';

type Last7Day = {
  date: string;
  revenue: number;
  count: number;
  isToday: boolean;
};

type HeroMetricsProps = {
  todayRevenue: number;
  todayOrderCount: number;
  avgBasket: number;
  monthRevenue: number;
  monthOrderCount: number;
  activeOrders: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  revenueChangePct: number;
  orderChangePct: number;
  last7Days: Last7Day[];
};

export function HeroMetrics(props: HeroMetricsProps) {
  const revenueSeries = props.last7Days.map((d) => d.revenue);
  const orderSeries = props.last7Days.map((d) => d.count);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Bugün ciro - büyük kart, sparkline */}
      <div className="lg:col-span-2">
        <BigMetricCard
          label="BUGÜN CİRO"
          href="/panel/raporlar?preset=today"
          value={props.todayRevenue}
          prefix="₺"
          delta={props.todayRevenue > 0 ? props.revenueChangePct : null}
          deltaLabel="düne göre"
          series={revenueSeries}
          highlight
        />
      </div>

      {/* Aktif sipariş - canlı, pulse */}
      <LivePulseCard
        activeOrders={props.activeOrders}
        newOrders={props.newOrders}
        preparingOrders={props.preparingOrders}
        readyOrders={props.readyOrders}
      />

      {/* Ort. sepet — küçük + bar sparkline */}
      <SmallMetricCard
        label="ORT. SEPET"
        href="/panel/raporlar?preset=today"
        value={props.avgBasket}
        prefix="₺"
        sublabel={`${props.todayOrderCount} sipariş`}
        series={orderSeries}
        seriesType="bar"
      />
    </div>
  );
}

// ============================================================
// BÜYÜK KART — sparkline'lı, ana metrik
// ============================================================
function BigMetricCard({
  label,
  value,
  prefix,
  delta,
  deltaLabel,
  href,
  series,
  highlight,
}: {
  label: string;
  value: number;
  prefix?: string;
  delta?: number | null;
  deltaLabel?: string;
  href: string;
  series: number[];
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--r)] p-5 transition-all hover:scale-[1.005] active:scale-[0.995] relative overflow-hidden"
      style={{
        background: highlight
          ? 'color-mix(in srgb, var(--accent) 4%, var(--card))'
          : 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 156,
      }}
    >
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div
          className="text-ink-3 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          {label}
        </div>
        {delta !== null && delta !== undefined && (
          <div className="flex items-center gap-1.5">
            <DeltaBadge value={delta} />
            {deltaLabel && (
              <span
                className="text-ink-3"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                }}
              >
                {deltaLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 relative z-10">
        <CountUp
          value={value}
          prefix={prefix}
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 44,
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
        />
      </div>

      <div
        className="text-ink-3 mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          letterSpacing: '0.16em',
          fontWeight: 700,
        }}
      >
        SON 7 GÜN
      </div>

      <div className="relative" style={{ height: 44 }}>
        <Sparkline
          values={series}
          highlightLast
          color="var(--accent)"
          fill
        />
      </div>
    </Link>
  );
}

// ============================================================
// CANLI PULSE KARTI — aktif siparişler
// ============================================================
function LivePulseCard({
  activeOrders,
  newOrders,
  preparingOrders,
  readyOrders,
}: {
  activeOrders: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
}) {
  const hasActive = activeOrders > 0;
  return (
    <Link
      href="/panel/masalar"
      className="group block rounded-[var(--r)] p-5 transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
      style={{
        background: hasActive
          ? 'color-mix(in srgb, var(--ok, #5C8C3A) 6%, var(--card))'
          : 'var(--card)',
        border: hasActive
          ? '1px solid color-mix(in srgb, var(--ok, #5C8C3A) 25%, var(--line))'
          : '1px solid var(--line)',
        minHeight: 156,
      }}
    >
      {hasActive && (
        <div
          className="absolute"
          style={{
            top: 8,
            right: 8,
            width: 80,
            height: 80,
            pointerEvents: 'none',
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--ok, #5C8C3A) 18%, transparent) 0%, transparent 70%)',
              animation: 'hmPulse 2.4s ease-in-out infinite',
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div
          className="text-ink-3 uppercase flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          AKTİF SİPARİŞ
          <span
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              background: 'var(--ok, #5C8C3A)',
              animation: 'hmDot 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <div className="mb-3 relative z-10">
        <CountUp
          value={activeOrders}
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 44,
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
        />
      </div>

      {hasActive ? (
        <div className="space-y-1.5">
          {newOrders > 0 && (
            <BreakdownRow
              count={newOrders}
              label="yeni sipariş"
              dotColor="var(--accent)"
              pulse
            />
          )}
          {preparingOrders > 0 && (
            <BreakdownRow
              count={preparingOrders}
              label="hazırlanıyor"
              dotColor="var(--gold, #B8903E)"
            />
          )}
          {readyOrders > 0 && (
            <BreakdownRow
              count={readyOrders}
              label="hazır · garson bekliyor"
              dotColor="var(--ok, #5C8C3A)"
              pulse
            />
          )}
        </div>
      ) : (
        <div
          className="text-ink-3"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 13,
          }}
        >
          Şu an aktif sipariş yok
        </div>
      )}

      <style jsx>{`
        @keyframes hmPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @keyframes hmDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }
      `}</style>
    </Link>
  );
}

function BreakdownRow({
  count,
  label,
  dotColor,
  pulse,
}: {
  count: number;
  label: string;
  dotColor: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: dotColor,
          animation: pulse ? 'hmDot 1.6s ease-in-out infinite' : undefined,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink)',
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink-2)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ============================================================
// KÜÇÜK KART
// ============================================================
function SmallMetricCard({
  label,
  value,
  prefix,
  sublabel,
  href,
  series,
  seriesType,
}: {
  label: string;
  value: number;
  prefix?: string;
  sublabel?: string;
  href: string;
  series: number[];
  seriesType: 'line' | 'bar';
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--r)] p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 156,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="text-ink-3 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          {label}
        </div>
      </div>

      <div className="mb-3">
        <CountUp
          value={value}
          prefix={prefix}
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1,
          }}
        />
      </div>

      {sublabel && (
        <div
          className="text-ink-3 mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
          }}
        >
          {sublabel}
        </div>
      )}

      <div className="relative" style={{ height: 30 }}>
        {seriesType === 'bar' ? (
          <BarSparkline values={series} color="var(--ink-2)" highlightLast />
        ) : (
          <Sparkline values={series} color="var(--ink-2)" />
        )}
      </div>
    </Link>
  );
}

// ============================================================
// SPARKLINE (line/area)
// ============================================================
function Sparkline({
  values,
  color,
  fill,
  highlightLast,
}: {
  values: number[];
  color: string;
  fill?: boolean;
  highlightLast?: boolean;
}) {
  if (!values.length) return null;
  const W = 200;
  const H = 44;
  const PAD = 2;
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return { x, y, v };
  });

  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    pathD += ` Q ${cx},${prev.y} ${cx},${(prev.y + p.y) / 2} T ${p.x},${p.y}`;
  }
  const fillD = fill
    ? `${pathD} L ${points[points.length - 1].x},${H} L ${points[0].x},${H} Z`
    : '';

  const last = points[points.length - 1];

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="hmFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && fillD && (
        <path
          d={fillD}
          fill="url(#hmFill)"
          style={{
            animation: 'hmDraw 0.8s ease-out forwards',
          }}
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="500"
        strokeDashoffset="500"
        style={{
          animation: 'hmStroke 0.9s ease-out 0.1s forwards',
        }}
      />
      {highlightLast && (
        <>
          <circle
            cx={last.x}
            cy={last.y}
            r="3.5"
            fill={color}
            style={{
              animation: 'hmPop 0.4s ease-out 1s both',
            }}
          />
          <circle
            cx={last.x}
            cy={last.y}
            r="6"
            fill="none"
            stroke={color}
            strokeOpacity="0.4"
            strokeWidth="1"
            style={{
              animation: 'hmHaloPulse 2.4s ease-in-out 1.2s infinite',
              transformOrigin: `${last.x}px ${last.y}px`,
            }}
          />
        </>
      )}
      <style>{`
        @keyframes hmStroke {
          to { stroke-dashoffset: 0; }
        }
        @keyframes hmDraw {
          from { opacity: 0; transform: scaleY(0.3); transform-origin: bottom; }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes hmPop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        @keyframes hmHaloPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0; transform: scale(2); }
        }
      `}</style>
    </svg>
  );
}

// ============================================================
// BAR SPARKLINE
// ============================================================
function BarSparkline({
  values,
  color,
  highlightLast,
}: {
  values: number[];
  color: string;
  highlightLast?: boolean;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div
      className="flex items-end gap-1 w-full"
      style={{ height: '100%' }}
    >
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const heightPct = max > 0 ? (v / max) * 100 : 0;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(heightPct, 4)}%`,
              background:
                isLast && highlightLast
                  ? 'var(--accent)'
                  : `color-mix(in srgb, ${color} 35%, transparent)`,
              animation: `hmBarUp 0.6s ease-out ${i * 0.05}s both`,
              transformOrigin: 'bottom',
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes hmBarUp {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// DELTA BADGE
// ============================================================
function DeltaBadge({ value }: { value: number }) {
  const isUp = value > 0;
  const isFlat = value === 0;
  const color = isFlat
    ? 'var(--ink-3)'
    : isUp
    ? 'var(--ok, #5C8C3A)'
    : 'var(--danger, #B83A2E)';
  const icon = isFlat ? '—' : isUp ? '↗' : '↘';
  const displayValue = Math.abs(value);
  const label =
    value >= 999
      ? '+999%'
      : `${isUp ? '+' : isFlat ? '' : '−'}${displayValue}%`;

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 10.5,
        fontWeight: 700,
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
