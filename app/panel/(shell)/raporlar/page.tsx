import { getReportsData } from '@/lib/actions/reports';
import { getBusinessSettings } from '@/lib/actions/settings';
import { ReportsView } from './reports-view';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const [reportsResult, settingsResult] = await Promise.all([
    getReportsData(),
    getBusinessSettings(),
  ]);

  if (!reportsResult.success || !reportsResult.data) {
    return (
      <div className="px-8 py-10 max-w-[1200px] mx-auto">
        <div className="bg-card border border-line rounded-[var(--r)] p-8 text-center">
          <div className="text-accent text-3xl mb-3">⚠</div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            Rapor yüklenemedi
          </h2>
          <p className="text-ink-3 text-sm">
            {reportsResult.error || 'Bir sorun oluştu, lütfen tekrar deneyin.'}
          </p>
        </div>
      </div>
    );
  }

  const businessName =
    settingsResult.success && settingsResult.settings
      ? (settingsResult.settings.name as { tr?: string })?.tr || 'İşletme'
      : 'İşletme';

  return <ReportsView data={reportsResult.data} businessName={businessName} />;
}
