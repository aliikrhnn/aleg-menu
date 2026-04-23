'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import Link from 'next/link';

export function HourlyChart({
  hourly,
  peakHour,
  totalRevenue,
}: {
  hourly: Array<{ hour: number; revenue: number; count: number }>;
  peakHour: { hour: number; revenue: number; count: number } | null;
  totalRevenue: number;
}) {
  // Açılış-kapanış tahmini: ilk ve son sipariş saatine göre kapsa, yoksa 8-23
  const firstActive = hourly.find((h) => h.count > 0)?.hour ?? 8;
  const lastActive = [...hourly].reverse().find((h) => h.count > 0)?.hour ?? 22;
  const fromHour = Math.min(firstActive - 1, 7);
  const toHour = Math.max(lastActive + 1, 23);
  const range = hourly.filter((h) => h.hour >= fromHour && h.hour <= toHour);

  const maxCount = Math.max(...hourly.map((h) => h.count), 1);

  // Boşsa özel mesaj
  const hasData = totalRevenue > 0;

  return (
    <Link
      href="/panel/raporlar?preset=today"
      className="group block bg-card border border-line rounded-[var(--r)] p-6 transition-colors hover:border-[var(--line-2)]"
      style={{ minHeight: 260 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div
            className="text-ink-3 uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            BUGÜN · SAATLİK CİRO
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
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
          className="text-ink-3 group-hover:text-accent transition-colors text-sm"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          Raporlar ↗
        </span>
      </div>

      {hasData ? (
        <>
          {/* Area chart */}
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <AreaChart
                data={range}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => `${h}`}
                  interval={2}
                  stroke="var(--ink-3)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--ink-3)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v === 0 ? '' : `₺${Math.round(v / 1000)}k`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const p = payload[0].payload as {
                      hour: number;
                      revenue: number;
                      count: number;
                    };
                    return (
                      <div
                        className="rounded-[10px] p-2.5"
                        style={{
                          background: 'var(--card-2)',
                          border: '1px solid var(--line)',
                          fontFamily: 'var(--f-mono)',
                          fontSize: 11,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div className="text-ink-3 mb-1">
                          {p.hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="text-ink font-semibold">
                          ₺{Math.round(p.revenue).toLocaleString('tr-TR')}
                        </div>
                        <div className="text-ink-2">{p.count} sipariş</div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
                {peakHour && (
                  <ReferenceDot
                    x={peakHour.hour}
                    y={peakHour.revenue}
                    r={4}
                    fill="var(--accent)"
                    stroke="var(--card-2)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Heatbar — saat saat yoğunluk */}
          <div className="mt-3 flex gap-0.5" style={{ height: 8 }}>
            {range.map((h) => {
              const intensity = h.count / maxCount;
              const isPeak = peakHour && h.hour === peakHour.hour;
              return (
                <div
                  key={h.hour}
                  className="flex-1 rounded-[2px] transition-colors"
                  title={`${h.hour}:00 — ${h.count} sipariş`}
                  style={{
                    background: isPeak
                      ? 'var(--accent)'
                      : intensity > 0
                        ? `color-mix(in srgb, var(--accent) ${Math.max(15, intensity * 80)}%, transparent)`
                        : 'var(--paper-2)',
                  }}
                />
              );
            })}
          </div>
          <div
            className="flex justify-between mt-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}
          >
            <span>{fromHour.toString().padStart(2, '0')}:00</span>
            <span>{toHour.toString().padStart(2, '0')}:00</span>
          </div>
        </>
      ) : (
        <div
          className="flex items-center justify-center flex-col py-10"
          style={{ minHeight: 180 }}
        >
          <div className="text-4xl mb-3 opacity-30">🌅</div>
          <p className="text-ink-2 text-sm text-center max-w-xs">
            Henüz sipariş yok, ama gün daha bitmedi.
          </p>
        </div>
      )}
    </Link>
  );
}
