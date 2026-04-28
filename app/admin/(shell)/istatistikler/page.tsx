import { getAdminStats } from '@/lib/actions/admin-dashboard';
import {
  Eyebrow,
  SerifTitle,
  Sparkline,
  Money,
  SerifNum,
  TurkiyeMap,
  PageHeader,
} from '@/components/admin/primitives';

const monthShort = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { month: 'short' }).toLowerCase();
};

export default async function StatsPage() {
  const { metrics, growth12m, revenue12m, cities } = await getAdminStats();

  // Yıllık karşılaştırma
  const yearAgoBiz = growth12m[0]?.count || 0;
  const nowBiz = growth12m[growth12m.length - 1]?.count || 0;
  const bizYearDelta = nowBiz - yearAgoBiz;
  const bizYearPct = yearAgoBiz > 0
    ? Math.round((bizYearDelta / yearAgoBiz) * 100)
    : 0;

  // Son ay revenue (12 aydan biri)
  const yearAgoRev = revenue12m[0]?.revenue || 0;
  const nowRev = revenue12m[revenue12m.length - 1]?.revenue || 0;
  const revYearDelta = nowRev - yearAgoRev;
  const revYearPct = yearAgoRev > 0
    ? Math.round((revYearDelta / yearAgoRev) * 100)
    : 0;

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto grid gap-5">
      <PageHeader
        eyebrow="PLATFORM İSTATİSTİKLERİ"
        title="İstatistikler"
        description="Platformdaki büyüme, gelir ve coğrafi dağılım metrikleri."
      />

      {/* === Üst grid: işletme büyümesi + MRR === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-line rounded-[var(--r)] p-6">
          <Eyebrow>İŞLETME BÜYÜMESİ · 12 AY</Eyebrow>
          <div className="flex justify-between items-end mt-2">
            <SerifNum size={48}>{metrics.total_businesses}</SerifNum>
            <Sparkline
              data={growth12m.map((g) => g.count)}
              width={300}
              height={90}
              stroke="var(--super)"
              showArea
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: bizYearDelta >= 0 ? 'var(--ok)' : 'var(--danger)',
              letterSpacing: '0.04em',
              marginTop: 8,
              fontWeight: 700,
            }}
          >
            {bizYearDelta >= 0 ? '▲' : '▼'} {bizYearDelta >= 0 ? '+' : ''}
            {bizYearDelta} YENİ İŞLETME · {bizYearDelta >= 0 ? '+' : ''}
            {bizYearPct}% YIL
          </div>
        </div>

        <div className="bg-card border border-line rounded-[var(--r)] p-6">
          <Eyebrow>AYLIK TEKRARLAYAN GELİR (MRR)</Eyebrow>
          <div className="flex justify-between items-end mt-2">
            <Money amount={metrics.mrr} size={48} />
            <Sparkline
              data={revenue12m.map((r) => r.revenue || 0)}
              width={300}
              height={90}
              stroke="var(--gold)"
              showArea
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: revYearDelta >= 0 ? 'var(--ok)' : 'var(--danger)',
              letterSpacing: '0.04em',
              marginTop: 8,
              fontWeight: 700,
            }}
          >
            {revYearDelta >= 0 ? '▲' : '▼'} ₺
            {Math.abs(revYearDelta).toLocaleString('tr-TR')} ·{' '}
            {revYearDelta >= 0 ? '+' : ''}
            {revYearPct}% YIL
          </div>
        </div>
      </div>

      {/* === Detay metric strip === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DetailMetric
          label="ARR (Yıllık tahmin)"
          value={metrics.mrr * 12}
          currency
          color="var(--gold)"
        />
        <DetailMetric
          label="Tahsil Edilen (Bu ay)"
          value={metrics.this_month_paid}
          currency
          color="var(--ok)"
        />
        <DetailMetric
          label="Bekleyen Ödeme"
          value={metrics.pending_amount}
          currency
          color={metrics.pending_amount > 0 ? 'var(--warn)' : 'var(--ink-3)'}
        />
        <DetailMetric
          label="Risk Altında"
          value={metrics.at_risk_count}
          color={metrics.at_risk_count > 0 ? 'var(--danger)' : 'var(--ink-3)'}
        />
      </div>

      {/* === Coğrafi dağılım === */}
      <div className="bg-card border border-line rounded-[var(--r)] p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Eyebrow>COĞRAFİ DAĞILIM</Eyebrow>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                marginTop: 2,
              }}
            >
              Şehir bazında aktif işletme
            </div>
          </div>
        </div>

        {cities.length === 0 ? (
          <div className="py-12 text-center text-ink-3">
            <div className="text-3xl mb-2">○</div>
            Henüz şehir verisi yok
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TurkiyeMap dots={cities} accent="var(--super)" />

            <div className="grid gap-1">
              {cities.map((c) => (
                <div
                  key={c.city}
                  className="grid items-center gap-3 py-1.5"
                  style={{ gridTemplateColumns: '120px 1fr 50px' }}
                >
                  <span className="text-[13px] font-medium truncate">
                    {c.city}
                  </span>
                  <div
                    style={{
                      height: 6,
                      background: 'var(--paper-2)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(c.pct * 3, 100)}%`,
                        height: '100%',
                        background: 'var(--super)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: 'right',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  currency,
  color = 'var(--ink)',
}: {
  label: string;
  value: number;
  currency?: boolean;
  color?: string;
}) {
  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-2">
        {currency ? (
          <Money amount={value} size={28} tone={color} />
        ) : (
          <SerifNum size={28} tone={color}>
            {value.toLocaleString('tr-TR')}
          </SerifNum>
        )}
      </div>
    </div>
  );
}
