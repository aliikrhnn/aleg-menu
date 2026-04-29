import {
  getInvoiceList,
  getBusinessOptions,
  getBillingMetrics,
} from '@/lib/actions/admin-billing';
import { Eyebrow, SerifTitle, SerifNum, Money } from '@/components/admin/primitives';
import { InvoicesListClient } from '@/components/admin/invoices-list-client';

type Props = {
  searchParams: {
    q?: string;
    status?: string;
    business?: string;
  };
};

export default async function InvoicesPage({ searchParams }: Props) {
  const filters = {
    search: searchParams.q,
    status: searchParams.status,
    businessId: searchParams.business,
  };

  const [{ items, total }, businesses, metrics] = await Promise.all([
    getInvoiceList(filters),
    getBusinessOptions(),
    getBillingMetrics(),
  ]);

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto grid gap-5">
      <div>
        <Eyebrow>BİLLİNG · FATURALAR</Eyebrow>
        <SerifTitle size={42} className="mt-2">
          Faturalar
        </SerifTitle>
        <p className="text-ink-2 text-base mt-3 max-w-[640px]">
          Platform faturalarını yönet. Filtrele, ödeme hatırlatması gönder, manuel
          fatura oluştur veya CSV olarak dışa aktar.
        </p>
      </div>

      {/* Üst metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-line rounded-[var(--r)] p-4">
          <Eyebrow>BU AY TAHSİL EDİLEN</Eyebrow>
          <Money amount={metrics.collected_this_month} size={26} />
          <div
            className="mt-1 text-xs"
            style={{
              fontFamily: 'var(--f-mono)',
              color:
                metrics.mom_change_pct === null
                  ? 'var(--ink-3)'
                  : metrics.mom_change_pct >= 0
                    ? 'var(--ok)'
                    : 'var(--warn)',
            }}
          >
            {metrics.mom_change_pct === null
              ? '—'
              : `${metrics.mom_change_pct >= 0 ? '↑' : '↓'} %${Math.abs(
                  metrics.mom_change_pct,
                )} geçen aya göre`}
          </div>
        </div>

        <div className="bg-card border border-line rounded-[var(--r)] p-4">
          <Eyebrow tone="warn">BEKLEYEN</Eyebrow>
          <SerifNum size={26} tone="var(--warn)">
            ₺{metrics.pending_amount.toLocaleString('tr-TR')}
          </SerifNum>
          <div
            className="mt-1 text-xs"
            style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
          >
            {metrics.pending_count} fatura
          </div>
        </div>

        <div className="bg-card border border-line rounded-[var(--r)] p-4">
          <Eyebrow tone="danger">VADE GEÇMİŞ</Eyebrow>
          <SerifNum size={26} tone="var(--danger)">
            ₺{metrics.overdue_amount.toLocaleString('tr-TR')}
          </SerifNum>
          <div
            className="mt-1 text-xs"
            style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
          >
            {metrics.overdue_count} fatura · acil
          </div>
        </div>

        <div className="bg-card border border-line rounded-[var(--r)] p-4">
          <Eyebrow>BU AY ÖDEME SAYISI</Eyebrow>
          <SerifNum size={26}>{metrics.payment_count_this_month}</SerifNum>
          <div
            className="mt-1 text-xs"
            style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
          >
            başarılı işlem
          </div>
        </div>
      </div>

      <InvoicesListClient
        initialItems={items}
        total={total}
        businesses={businesses}
        initialFilters={filters}
      />
    </div>
  );
}
