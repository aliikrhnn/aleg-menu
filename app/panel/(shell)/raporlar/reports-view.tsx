'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import type { ReportsData } from '@/lib/actions/reports';

// ============================================================
// Helpers
// ============================================================

function money(n: number): string {
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n)}%`;
}

function formatNum(n: number): string {
  return n.toLocaleString('tr-TR');
}

const WEEKDAYS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

// ============================================================
// Main component
// ============================================================

export function ReportsView({
  data,
  businessName,
}: {
  data: ReportsData;
  businessName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<{
    ozet: string;
    icgorular: Array<{ baslik: string; icerik: string }>;
  } | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{ used: number; limit: number } | null>(
    null
  );

  async function generateInsights() {
    setLoading(true);
    setInsightError(null);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsData: data, businessName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInsightError(json.error || 'İçgörü üretilemedi');
        if (json.rateLimit) setRateLimit(json.rateLimit);
        return;
      }
      setInsights({ ozet: json.ozet, icgorular: json.icgorular });
      if (json.rateLimit) setRateLimit(json.rateLimit);
    } catch (err) {
      setInsightError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--ink-3)',
            fontWeight: 700,
          }}
        >
          İÇGÖRÜ · RAPORLAR
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
          className="mb-2"
        >
          İşletmen bir bakışta
        </h1>
        <p className="text-ink-2 text-[15px]">
          Son 30 günün özeti. Satış trendleri, en sevilen ürünler ve yoğun saatler.
        </p>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="BUGÜN"
          revenue={data.summary.today.revenue}
          orders={data.summary.today.order_count}
          changePct={data.summary.revenue_change_pct}
          compareLabel="düne göre"
          accent
        />
        <SummaryCard
          label="DÜN"
          revenue={data.summary.yesterday.revenue}
          orders={data.summary.yesterday.order_count}
        />
        <SummaryCard
          label="BU HAFTA"
          revenue={data.summary.week.revenue}
          orders={data.summary.week.order_count}
        />
        <SummaryCard
          label="BU AY"
          revenue={data.summary.month.revenue}
          orders={data.summary.month.order_count}
        />
      </div>

      {/* AI İçgörü */}
      <AiInsightBlock
        loading={loading}
        insights={insights}
        error={insightError}
        rateLimit={rateLimit}
        onGenerate={generateInsights}
      />

      {/* Best Day Banner */}
      <BestDayBanner bestDay={data.bestDay} />

      {/* Top Products + Order Types (2'li grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <TopProductsChart products={data.topProducts} />
        <OrderTypeChart breakdown={data.orderTypes} />
      </div>

      {/* Heatmap */}
      <HourlyHeatmapBlock heatmap={data.heatmap} />

      {/* Yenile */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.refresh()}
          className="text-sm text-ink-3 hover:text-accent transition-colors"
          style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
        >
          ↻ VERİLERİ YENİLE
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Summary Card
// ============================================================

function SummaryCard({
  label,
  revenue,
  orders,
  changePct,
  compareLabel,
  accent,
}: {
  label: string;
  revenue: number;
  orders: number;
  changePct?: number;
  compareLabel?: string;
  accent?: boolean;
}) {
  const positive = (changePct ?? 0) >= 0;
  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{
        background: accent ? 'var(--ink)' : 'var(--card)',
        color: accent ? 'var(--paper)' : 'var(--ink)',
        border: accent ? 'none' : '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          fontWeight: 700,
          opacity: accent ? 0.6 : 1,
          color: accent ? 'var(--paper)' : 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 32,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {money(revenue)}
      </div>
      <div
        className="mt-2 text-[12px]"
        style={{
          fontFamily: 'var(--f-mono)',
          opacity: accent ? 0.75 : 1,
          color: accent ? 'var(--paper)' : 'var(--ink-2)',
        }}
      >
        {formatNum(orders)} sipariş
      </div>
      {changePct !== undefined && (
        <div
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: accent
              ? 'rgba(255,255,255,0.12)'
              : positive
              ? 'color-mix(in srgb, var(--ok) 15%, transparent)'
              : 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: accent ? 'var(--paper)' : positive ? 'var(--ok)' : 'var(--accent)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.04em',
          }}
        >
          {positive ? '↑' : '↓'} {formatPct(changePct)}
          {compareLabel && (
            <span style={{ opacity: 0.7, fontWeight: 500 }}> {compareLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AI Insight Block
// ============================================================

function AiInsightBlock({
  loading,
  insights,
  error,
  rateLimit,
  onGenerate,
}: {
  loading: boolean;
  insights: { ozet: string; icgorular: Array<{ baslik: string; icerik: string }> } | null;
  error: string | null;
  rateLimit: { used: number; limit: number } | null;
  onGenerate: () => void;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-6 mb-8"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--card)), var(--card))',
        border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--line))',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
              color: 'var(--accent)',
              fontSize: 18,
            }}
          >
            ✦
          </div>
          <div className="min-w-0">
            <div
              className="uppercase mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              AI İÇGÖRÜ
            </div>
            <h3
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {insights?.ozet || 'Verini yorumlamamı ister misin?'}
            </h3>
          </div>
        </div>

        {!insights && !loading && (
          <button
            onClick={onGenerate}
            className="flex-shrink-0 h-10 px-5 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--paper)' }}
          >
            İçgörü üret ✦
          </button>
        )}

        {loading && (
          <div
            className="flex-shrink-0 h-10 px-5 rounded-full text-[12px] flex items-center gap-2"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
            YORUMLANIYOR...
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-4 px-3 py-2 rounded-[10px] text-[13px]"
          style={{
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)',
          }}
        >
          {error}
        </div>
      )}

      {insights && insights.icgorular.length > 0 && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.icgorular.map((ic, i) => (
            <div
              key={i}
              className="rounded-[12px] p-4"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="uppercase mb-1.5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                {ic.baslik}
              </div>
              <div className="text-[14px] text-ink-2 leading-relaxed">
                {ic.icerik}
              </div>
            </div>
          ))}
        </div>
      )}

      {rateLimit && (
        <div
          className="mt-4 text-[11px]"
          style={{
            fontFamily: 'var(--f-mono)',
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}
        >
          {rateLimit.used}/{rateLimit.limit} günlük hak kullanıldı
        </div>
      )}
    </div>
  );
}

// ============================================================
// Best Day Banner
// ============================================================

function BestDayBanner({
  bestDay,
}: {
  bestDay: ReportsData['bestDay'];
}) {
  if (!bestDay.avg_revenue || bestDay.avg_revenue <= 0) {
    return null; // veri yoksa gösterme
  }

  return (
    <div
      className="rounded-[var(--r)] p-5 mb-6 flex items-center gap-4"
      style={{
        background: 'color-mix(in srgb, var(--gold) 8%, var(--card))',
        border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--line))',
      }}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--gold) 20%, transparent)',
          color: 'var(--gold)',
          fontSize: 22,
        }}
      >
        ★
      </div>
      <div className="flex-1">
        <div
          className="uppercase mb-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: 'var(--gold)',
          }}
        >
          HAFTANIN EN İYİ GÜNÜ
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
            }}
          >
            {bestDay.weekday}
          </span>
          <span
            className="text-ink-2 text-[13px]"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            ort. {money(bestDay.avg_revenue)} · {Math.round(bestDay.avg_orders)} sipariş
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Top Products Chart
// ============================================================

function TopProductsChart({
  products,
}: {
  products: ReportsData['topProducts'];
}) {
  if (products.length === 0) {
    return (
      <div
        className="rounded-[var(--r)] p-6 min-h-[360px] flex flex-col items-center justify-center"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
      >
        <div className="text-ink-3 text-3xl mb-2">○</div>
        <div className="text-ink-3 text-sm">Henüz sipariş verisi yok</div>
      </div>
    );
  }

  const chartData = products.map((p) => ({
    name: p.product_name.length > 18 ? p.product_name.slice(0, 17) + '…' : p.product_name,
    fullName: p.product_name,
    ciro: Math.round(p.revenue),
    adet: p.quantity,
  }));

  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div className="mb-4">
        <div
          className="uppercase mb-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: 'var(--ink-3)',
          }}
        >
          SON 7 GÜN · TOP 10
        </div>
        <h3
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 400,
          }}
        >
          En çok satan ürünler
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
            tickFormatter={(v) => `₺${v}`}
            axisLine={{ stroke: 'var(--line)' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--ink-2)' }}
            width={110}
            axisLine={{ stroke: 'var(--line)' }}
          />
          <Tooltip
            cursor={{ fill: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
            contentStyle={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value) => [money(Number(value)), 'Ciro']}
          />
          <Bar dataKey="ciro" fill="var(--accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Order Type Chart (Pie)
// ============================================================

function OrderTypeChart({
  breakdown,
}: {
  breakdown: ReportsData['orderTypes'];
}) {
  const typeLabels: Record<string, string> = {
    dine_in: 'Masada',
    pickup: 'Gel-Al',
    delivery: 'Paket',
  };
  const colors = ['var(--accent)', 'var(--gold)', 'var(--ok)'];

  const data = (['dine_in', 'pickup', 'delivery'] as const)
    .map((t, i) => ({
      name: typeLabels[t],
      value: breakdown[t].count,
      revenue: breakdown[t].revenue,
      color: colors[i],
    }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div
        className="rounded-[var(--r)] p-6 min-h-[360px] flex flex-col items-center justify-center"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
      >
        <div className="text-ink-3 text-3xl mb-2">○</div>
        <div className="text-ink-3 text-sm">Henüz sipariş verisi yok</div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div className="mb-4">
        <div
          className="uppercase mb-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: 'var(--ink-3)',
          }}
        >
          SON 7 GÜN
        </div>
        <h3
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 400,
          }}
        >
          Sipariş tipi dağılımı
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={55}
            dataKey="value"
            label={({ percent }: { percent?: number }) =>
              `${Math.round((percent || 0) * 100)}%`
            }
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value, _name, props) => {
              const revenue = (props as { payload?: { revenue?: number } })?.payload?.revenue || 0;
              return [`${value} sipariş · ${money(revenue)}`, ''];
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Hourly Heatmap — Yeni Tasarım (Area chart + Peak chip'ler + Gün şeritleri)
// ============================================================

function HourlyHeatmapBlock({
  heatmap,
}: {
  heatmap: ReportsData['heatmap'];
}) {
  const { grid, max, hourlyAvg, peaks } = heatmap;

  // Ana chart verisi: 24 saat boyunca ortalama
  const chartData = hourlyAvg.map((v, h) => ({
    hour: h,
    label: `${h.toString().padStart(2, '0')}:00`,
    count: v,
  }));

  // Toplam veri var mı kontrol et
  const hasData = hourlyAvg.some((v) => v > 0);

  // Tüm peak'lerin en yükseği (grafikte ReferenceDot için)
  const overallPeak = [peaks.morning, peaks.afternoon, peaks.evening].reduce(
    (a, b) => (b.count > a.count ? b : a),
    peaks.morning
  );

  return (
    <div
      className="rounded-[var(--r)] p-5 mb-6"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            SON 30 GÜN · ORTALAMA
          </div>
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            Saatlik yoğunluk
          </h3>
          <p className="text-ink-3 text-[13px] mt-1">
            Ortalama bir gündeki saatlik sipariş yoğunluğu
          </p>
        </div>
      </div>

      {!hasData ? (
        <div
          className="min-h-[260px] flex flex-col items-center justify-center rounded-[12px]"
          style={{ background: 'var(--paper-2)' }}
        >
          <div className="text-ink-3 text-3xl mb-2">○</div>
          <div className="text-ink-3 text-sm">Henüz sipariş verisi yok</div>
        </div>
      ) : (
        <>
          {/* Peak Chip'ler */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <PeakChip
              icon="☀"
              label="SABAH"
              hour={peaks.morning.hour}
              count={peaks.morning.count}
              isOverall={overallPeak === peaks.morning}
            />
            <PeakChip
              icon="◐"
              label="ÖĞLE"
              hour={peaks.afternoon.hour}
              count={peaks.afternoon.count}
              isOverall={overallPeak === peaks.afternoon}
            />
            <PeakChip
              icon="☾"
              label="AKŞAM"
              hour={peaks.evening.hour}
              count={peaks.evening.count}
              isOverall={overallPeak === peaks.evening}
            />
          </div>

          {/* Ana çizgi grafik (ortalama gün) */}
          <div className="mb-6" style={{ marginLeft: -10 }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--line)"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickFormatter={(h) => h.toString().padStart(2, '0')}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickFormatter={(v) => `${v}`}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelFormatter={(h) =>
                    `${Number(h).toString().padStart(2, '0')}:00`
                  }
                  formatter={(v) => [`${v} ortalama sipariş`, 'Saat']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#heatGradient)"
                  dot={false}
                />
                {/* En yüksek noktada bir işaret */}
                <ReferenceDot
                  x={overallPeak.hour}
                  y={hourlyAvg[overallPeak.hour]}
                  r={6}
                  fill="var(--accent)"
                  stroke="var(--paper)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Haftanın günleri mini şeritleri */}
          <div
            className="uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            HAFTA · GÜN BAZINDA
          </div>
          <div className="space-y-1.5">
            {grid.map((row, wi) => (
              <DayStripe
                key={wi}
                label={WEEKDAYS[wi]}
                counts={row}
                max={max}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Peak Chip component
function PeakChip({
  icon,
  label,
  hour,
  count,
  isOverall,
}: {
  icon: string;
  label: string;
  hour: number;
  count: number;
  isOverall: boolean;
}) {
  const hasData = count > 0;
  return (
    <div
      className="rounded-[12px] p-3 flex items-center gap-3"
      style={{
        background: isOverall
          ? 'color-mix(in srgb, var(--accent) 10%, var(--paper))'
          : 'var(--paper-2)',
        border: '1px solid',
        borderColor: isOverall
          ? 'color-mix(in srgb, var(--accent) 35%, var(--line))'
          : 'var(--line)',
      }}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: isOverall
            ? 'color-mix(in srgb, var(--accent) 18%, transparent)'
            : 'var(--card)',
          color: isOverall ? 'var(--accent)' : 'var(--ink-3)',
          fontSize: 16,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: isOverall ? 'var(--accent)' : 'var(--ink-3)',
          }}
        >
          {label}
          {isOverall && hasData && <span className="ml-1">· ZİRVE</span>}
        </div>
        {hasData ? (
          <div className="flex items-baseline gap-2">
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 20,
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {hour.toString().padStart(2, '0')}:00
            </span>
            <span
              className="text-[11px] text-ink-3"
              style={{ fontFamily: 'var(--f-mono)' }}
            >
              {count} sipariş
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-ink-3 mt-0.5">
            Veri yok
          </div>
        )}
      </div>
    </div>
  );
}

// Günlük şerit (24 mini bar)
function DayStripe({
  label,
  counts,
  max,
}: {
  label: string;
  counts: number[];
  max: number;
}) {
  const dayTotal = counts.reduce((s, c) => s + c, 0);

  return (
    <div className="flex items-center gap-3">
      {/* Gün etiketi */}
      <div
        className="w-[40px] flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </div>

      {/* 24 barlı şerit */}
      <div
        className="flex-1 flex gap-[2px] items-end h-7 rounded"
        style={{ background: 'var(--paper-2)', padding: 2 }}
      >
        {counts.map((c, hi) => {
          const intensity = max === 0 ? 0 : c / max;
          const barHeight = c === 0 ? 10 : Math.max(20, intensity * 100);
          return (
            <div
              key={hi}
              className="flex-1 rounded-[2px]"
              style={{
                height: `${barHeight}%`,
                minHeight: 3,
                background:
                  c === 0
                    ? 'var(--line)'
                    : `color-mix(in srgb, var(--accent) ${Math.round(
                        Math.max(0.15, intensity) * 100
                      )}%, var(--paper))`,
                opacity: c === 0 ? 0.4 : 1,
              }}
              title={`${label} · ${hi.toString().padStart(2, '0')}:00 · ${c} sipariş`}
            />
          );
        })}
      </div>

      {/* Gün toplamı */}
      <div
        className="w-[52px] text-right flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: dayTotal > 0 ? 'var(--ink-2)' : 'var(--ink-3)',
          letterSpacing: '0.04em',
        }}
      >
        {dayTotal}
      </div>
    </div>
  );
}
