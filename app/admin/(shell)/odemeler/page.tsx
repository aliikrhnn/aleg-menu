import {
  getPaymentsList,
  getPaymentsMonthly,
  getBillingMetrics,
} from '@/lib/actions/admin-billing';
import {
  Eyebrow,
  SerifTitle,
  SerifNum,
  Money,
  Sparkline,
} from '@/components/admin/primitives';
import { PaymentsListClient } from '@/components/admin/payments-list-client';

type Props = {
  searchParams: {
    q?: string;
    method?: string;
    status?: string;
  };
};

export default async function PaymentsPage({ searchParams }: Props) {
  const filters = {
    search: searchParams.q,
    method: searchParams.method,
    status: searchParams.status,
  };

  const [{ items, total }, monthly, metrics] = await Promise.all([
    getPaymentsList(filters),
    getPaymentsMonthly(),
    getBillingMetrics(),
  ]);

  const totalLast12mo = monthly.reduce((s, m) => s + m.amount, 0);
  const avg = monthly.length > 0 ? totalLast12mo / monthly.length : 0;

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto grid gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>BİLLİNG · ÖDEMELER</Eyebrow>
          <SerifTitle size={42} className="mt-2">
            Ödemeler
          </SerifTitle>
          <p className="text-ink-2 text-base mt-3 max-w-[640px]">
            Platforma yapılan tüm ödemeler. Filtrele, işletme veya faturaya tıkla,
            geçmişi incele.
          </p>
        </div>
      </div>

      {/* Üst metrikler */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr] gap-3">
        {/* Aylık grafik */}
        <div className="bg-card border border-line rounded-[var(--r)] p-5">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <Eyebrow>SON 12 AY</Eyebrow>
              <Money amount={totalLast12mo} size={28} />
            </div>
            <div className="text-right">
              <Eyebrow>AYLIK ORTALAMA</Eyebrow>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'var(--ink-2)',
                }}
              >
                ₺{Math.round(avg).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>
          <Sparkline
            data={monthly.map((m) => m.amount)}
            stroke="var(--gold)"
            width={400}
            height={80}
            showArea
          />
          <div
            className="flex justify-between mt-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}
          >
            <span>
              {monthly.length > 0 &&
                new Date(monthly[0].month_start).toLocaleDateString('tr-TR', {
                  month: 'short',
                  year: '2-digit',
                })}
            </span>
            <span>
              {monthly.length > 0 &&
                new Date(monthly[monthly.length - 1].month_start).toLocaleDateString(
                  'tr-TR',
                  { month: 'short', year: '2-digit' },
                )}
            </span>
          </div>
        </div>

        <div className="bg-card border border-line rounded-[var(--r)] p-4">
          <Eyebrow tone="ok">BU AY TAHSİL EDİLEN</Eyebrow>
          <SerifNum size={28} tone="var(--ok)">
            ₺{metrics.collected_this_month.toLocaleString('tr-TR')}
          </SerifNum>
          <div
            className="mt-1 text-xs"
            style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
          >
            {metrics.payment_count_this_month} işlem
          </div>
          {metrics.mom_change_pct !== null && (
            <div
              className="mt-1 text-xs"
              style={{
                fontFamily: 'var(--f-mono)',
                color:
                  metrics.mom_change_pct >= 0 ? 'var(--ok)' : 'var(--warn)',
              }}
            >
              {metrics.mom_change_pct >= 0 ? '↑' : '↓'} %
              {Math.abs(metrics.mom_change_pct)} geçen aya göre
            </div>
          )}
        </div>

        <div className="bg-card border border-line rounded-[var(--r)] p-4">
          <Eyebrow tone="warn">BEKLEYEN TAHSİLAT</Eyebrow>
          <SerifNum size={28} tone="var(--warn)">
            ₺{metrics.pending_amount.toLocaleString('tr-TR')}
          </SerifNum>
          <div
            className="mt-1 text-xs"
            style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
          >
            {metrics.pending_count} fatura · {metrics.overdue_count} gecikmiş
          </div>
        </div>
      </div>

      <PaymentsListClient
        initialItems={items}
        total={total}
        initialFilters={filters}
      />
    </div>
  );
}
