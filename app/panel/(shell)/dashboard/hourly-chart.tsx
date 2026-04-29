'use client';

import Link from 'next/link';
import { useState } from 'react';

type Hour = { hour: number; revenue: number; count: number };

export function HourlyChart({
  hourly,
  peakHour,
  totalRevenue,
}: {
  hourly: Hour[];
  peakHour: Hour | null;
  totalRevenue: number;
}) {
  // Açılış-kapanış tahmini: ilk ve son sipariş saatine göre kapsa, yoksa 8-23
  const firstActive = hourly.find((h) => h.count > 0)?.hour ?? 8;
  const lastActive = [...hourly].reverse().find((h) => h.count > 0)?.hour ?? 22;
  const fromHour = Math.min(firstActive - 1, 7);
  const toHour = Math.max(lastActive + 1, 23);
  const range = hourly.filter((h) => h.hour >= fromHour && h.hour <= toHour);

  const hasData = totalRevenue > 0;

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
      <div className="flex items-start justify-between mb-3">
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
            BUGÜN · SAATLİK CİRO
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {peakHour
              ? `Tepe ${peakHour.hour.toString().padStart(2, '0')}:00 · ${peakHour.count} sipariş`
              : 'Gün daha yeni başladı'}
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
          Raporlar →
        </span>
      </div>

      {hasData ? (
        <HourlyAreaChart range={range} peakHour={peakHour} />
      ) : (
        <EmptyChart fromHour={fromHour} toHour={toHour} />
      )}
    </Link>
  );
}

// ============================================================
// AREA CHART — custom SVG, animasyonlu
// ============================================================
function HourlyAreaChart({
  range,
  peakHour,
}: {
  range: Hour[];
  peakHour: Hour | null;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const W = 600;
  const H = 160;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 24;
  const PAD_X = 8;

  const maxRevenue = Math.max(...range.map((h) => h.revenue), 1);
  const avgRevenue =
    range.reduce((s, h) => s + h.revenue, 0) /
    Math.max(range.filter((h) => h.revenue > 0).length, 1);

  const points = range.map((h, i) => {
    const x = PAD_X + (i / Math.max(range.length - 1, 1)) * (W - PAD_X * 2);
    const y =
      H - PAD_BOTTOM - (h.revenue / maxRevenue) * (H - PAD_TOP - PAD_BOTTOM);
    return { x, y, hour: h.hour, revenue: h.revenue, count: h.count };
  });

  // Smooth Catmull-Rom benzeri path - Q ile yumuşak
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    pathD += ` Q ${cx},${prev.y} ${cx},${(prev.y + p.y) / 2} T ${p.x},${p.y}`;
  }
  const fillD = `${pathD} L ${points[points.length - 1].x},${H - PAD_BOTTOM} L ${points[0].x},${H - PAD_BOTTOM} Z`;

  // Ortalama çizgisi y koordinatı
  const avgY =
    H - PAD_BOTTOM - (avgRevenue / maxRevenue) * (H - PAD_TOP - PAD_BOTTOM);

  const peakIdx = peakHour
    ? range.findIndex((h) => h.hour === peakHour.hour)
    : -1;
  const peakPoint = peakIdx >= 0 ? points[peakIdx] : null;

  // Hover noktası
  const hoveredPoint =
    hoveredIdx !== null && hoveredIdx >= 0 && hoveredIdx < points.length
      ? points[hoveredIdx]
      : null;

  // Mouse → en yakın saat
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const x = xRatio * W;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    setHoveredIdx(nearestIdx);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="hcAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background grid (subtle) */}
        {[0.25, 0.5, 0.75].map((t, i) => {
          const y = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * t;
          return (
            <line
              key={i}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeWidth="0.5"
              strokeDasharray="2 4"
              opacity="0.5"
            />
          );
        })}

        {/* Ortalama çizgisi */}
        {avgRevenue > 0 && (
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={avgY}
            y2={avgY}
            stroke="var(--ink-3)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
        )}

        {/* Area fill */}
        <path
          d={fillD}
          fill="url(#hcAreaFill)"
          style={{
            animation: 'hcFillIn 1s ease-out forwards',
            opacity: 0,
            transformOrigin: 'bottom',
          }}
        />

        {/* Çizgi (path) */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2000"
          strokeDashoffset="2000"
          style={{
            animation: 'hcStrokeDraw 1.2s ease-out 0.1s forwards',
          }}
        />

        {/* Peak point + halo */}
        {peakPoint && (
          <>
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r="14"
              fill="none"
              stroke="var(--accent)"
              strokeOpacity="0.4"
              strokeWidth="1"
              style={{
                animation: 'hcHaloPulse 2.4s ease-in-out 1.4s infinite',
                transformOrigin: `${peakPoint.x}px ${peakPoint.y}px`,
              }}
            />
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r="5"
              fill="var(--accent)"
              stroke="var(--card)"
              strokeWidth="2"
              style={{
                animation: 'hcPop 0.4s ease-out 1.3s both',
                transformOrigin: `${peakPoint.x}px ${peakPoint.y}px`,
              }}
            />
          </>
        )}

        {/* Hover rule (dikey çizgi) */}
        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.5"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="6"
              fill="var(--accent)"
              stroke="var(--card)"
              strokeWidth="2.5"
            />
          </>
        )}

        {/* X-axis ticks (saat etiketleri her 3 saatte 1) */}
        {range
          .filter((_, i) => i % 3 === 0 || i === range.length - 1)
          .map((h) => {
            const idx = range.indexOf(h);
            const x =
              PAD_X + (idx / Math.max(range.length - 1, 1)) * (W - PAD_X * 2);
            return (
              <text
                key={h.hour}
                x={x}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="var(--ink-3)"
                fontWeight="700"
                letterSpacing="0.04em"
              >
                {h.hour.toString().padStart(2, '0')}
              </text>
            );
          })}

        <style>{`
          @keyframes hcFillIn {
            0% { opacity: 0; transform: scaleY(0.2); }
            100% { opacity: 1; transform: scaleY(1); }
          }
          @keyframes hcStrokeDraw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes hcPop {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          @keyframes hcHaloPulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0; transform: scale(1.6); }
          }
        `}</style>
      </svg>

      {/* Tooltip - hover noktasında */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${(hoveredPoint.x / W) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            zIndex: 5,
          }}
        >
          <div
            className="rounded-[10px] px-2.5 py-2 whitespace-nowrap"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              boxShadow: '0 6px 16px rgba(42,31,24,0.25)',
              transform: 'translateY(-6px)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                letterSpacing: '0.06em',
                opacity: 0.7,
                fontSize: 9.5,
              }}
            >
              {hoveredPoint.hour.toString().padStart(2, '0')}:00
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 1 }}>
              ₺{Math.round(hoveredPoint.revenue).toLocaleString('tr-TR')}
            </div>
            <div style={{ opacity: 0.75, fontSize: 10 }}>
              {hoveredPoint.count} sipariş
            </div>
          </div>
        </div>
      )}

      {/* Heatbar - alt kısım */}
      <div className="mt-4">
        <div
          className="uppercase mb-1.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--ink-3)',
          }}
        >
          Yoğunluk haritası
        </div>
        <div className="flex gap-0.5" style={{ height: 10 }}>
          {range.map((h, idx) => {
            const isPeak = peakHour && h.hour === peakHour.hour;
            const intensity =
              h.count > 0
                ? Math.max(0.15, h.count / Math.max(...range.map((r) => r.count), 1))
                : 0;
            return (
              <div
                key={h.hour}
                className="flex-1 rounded-[2px]"
                title={`${h.hour}:00 — ${h.count} sipariş`}
                style={{
                  background: isPeak
                    ? 'var(--accent)'
                    : intensity > 0
                    ? `color-mix(in srgb, var(--accent) ${intensity * 75}%, transparent)`
                    : 'var(--paper-2)',
                  animation: `hcHeatIn 0.5s ease-out ${idx * 0.02 + 0.5}s both`,
                  transformOrigin: 'bottom',
                }}
              />
            );
          })}
        </div>
        <style jsx>{`
          @keyframes hcHeatIn {
            from {
              transform: scaleY(0.3);
              opacity: 0;
            }
            to {
              transform: scaleY(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE — gün başlamamış / sipariş yok
// ============================================================
function EmptyChart({
  fromHour,
  toHour,
}: {
  fromHour: number;
  toHour: number;
}) {
  const hours = Array.from(
    { length: toHour - fromHour + 1 },
    (_, i) => fromHour + i
  );

  return (
    <div
      className="flex flex-col items-center justify-center py-10 px-4"
      style={{ minHeight: 180 }}
    >
      <div
        className="text-4xl mb-3"
        style={{
          opacity: 0.35,
          animation: 'hcSunRise 4s ease-in-out infinite',
        }}
      >
        🌅
      </div>
      <p
        className="text-center text-sm mb-4"
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          maxWidth: 320,
        }}
      >
        Henüz sipariş yok, ama gün daha bitmedi.
      </p>

      {/* Mini boş heatmap - saatler */}
      <div className="w-full">
        <div
          className="flex gap-0.5 mb-1"
          style={{ height: 6 }}
        >
          {hours.map((h, idx) => (
            <div
              key={h}
              className="flex-1 rounded-[1px]"
              style={{
                background: 'var(--paper-2)',
                animation: `hcEmptyIn 0.4s ease-out ${idx * 0.03}s both`,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </div>
        <div
          className="flex justify-between"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}
        >
          <span>{fromHour.toString().padStart(2, '0')}:00</span>
          <span>{toHour.toString().padStart(2, '0')}:00</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes hcSunRise {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        @keyframes hcEmptyIn {
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
