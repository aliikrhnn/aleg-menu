'use client';

import Link from 'next/link';
import { CountUp } from './count-up';

type HeroMetricsProps = {
  todayRevenue: number;
  todayOrderCount: number;
  avgBasket: number;
  monthRevenue: number;
  monthOrderCount: number;
  activeOrders: number;
  revenueChangePct: number;
  orderChangePct: number;
};

export function HeroMetrics(props: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Bugün ciro */}
      <MetricCard
        label="BUGÜN CİRO"
        href="/panel/raporlar?preset=today"
        value={
          <CountUp
            value={props.todayRevenue}
            prefix="₺"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 34,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          />
        }
        delta={props.todayRevenue > 0 ? props.revenueChangePct : null}
        deltaLabel="düne göre"
      />

      {/* Aktif sipariş (CANLI) */}
      <MetricCard
        label="AKTİF SİPARİŞ"
        href="/panel/pos"
        live
        value={
          <CountUp
            value={props.activeOrders}
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1,
            }}
          />
        }
        sublabel="şu an"
      />

      {/* Ortalama sepet */}
      <MetricCard
        label="ORT. SEPET"
        href="/panel/raporlar?preset=today"
        value={
          <CountUp
            value={props.avgBasket}
            prefix="₺"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1,
            }}
          />
        }
        sublabel={`${props.todayOrderCount} sipariş`}
      />

      {/* Bu ay */}
      <MetricCard
        label="BU AY"
        href="/panel/raporlar?preset=month"
        value={
          <CountUp
            value={props.monthRevenue}
            prefix="₺"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1,
            }}
          />
        }
        sublabel={`${props.monthOrderCount} sipariş`}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  delta,
  deltaLabel,
  href,
  live,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  delta?: number | null;
  deltaLabel?: string;
  href: string;
  live?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--r)] p-5 transition-all hover:border-[var(--line-2)] hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        minHeight: 130,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="text-ink-3 uppercase flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          {label}
          {live && (
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: 'var(--ok)',
                animation: 'aleg-live-dot 2s ease-in-out infinite',
              }}
            />
          )}
        </div>
      </div>

      <div className="mb-2">{value}</div>

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
      {sublabel && !delta && delta !== 0 && (
        <div
          className="text-ink-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.04em',
          }}
        >
          {sublabel}
        </div>
      )}

      <style jsx>{`
        @keyframes aleg-live-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.25);
          }
        }
      `}</style>
    </Link>
  );
}

function DeltaBadge({ value }: { value: number }) {
  const isUp = value > 0;
  const isFlat = value === 0;
  const color = isFlat ? 'var(--ink-3)' : isUp ? 'var(--ok)' : 'var(--danger)';
  const icon = isFlat ? '—' : isUp ? '↗' : '↘';
  const displayValue = Math.abs(value);
  const label = value >= 999 ? '+999%' : `${isUp ? '+' : isFlat ? '' : '−'}${displayValue}%`;

  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 11,
        fontWeight: 700,
        color,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
