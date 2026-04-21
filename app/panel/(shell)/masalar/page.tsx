import { getTablesWithZones } from '@/lib/actions/tables';
import { getAllTablesWithQr } from '@/lib/actions/qr';
import { TablesManager } from './tables-manager';

export const dynamic = 'force-dynamic';

export default async function TablesPage() {
  const [tablesResult, qrResult] = await Promise.all([
    getTablesWithZones(),
    getAllTablesWithQr(),
  ]);

  if (!tablesResult.success) {
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
            Masalar yüklenemedi
          </h2>
          <p className="text-ink-2 text-sm">{tablesResult.error}</p>
        </div>
      </div>
    );
  }

  // QR URL'lerini table_id → url map'ine dönüştür
  const qrByTableId = new Map<string, { slug: string; url: string }>();
  if (qrResult.success && qrResult.tables) {
    qrResult.tables.forEach((t) => {
      qrByTableId.set(t.table_id, { slug: t.qr_slug, url: t.qr_url });
    });
  }

  // businessName — sadece bir kere çekildi (qrResult üzerinden business slug var)
  // ama asıl display name için ayrıca çekelim
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user?.id || '')
    .eq('status', 'active')
    .maybeSingle();
  const { data: business } = membership
    ? await supabase
        .from('businesses')
        .select('name')
        .eq('id', membership.business_id)
        .maybeSingle()
    : { data: null };

  return (
    <TablesManager
      initialTables={tablesResult.tables || []}
      initialZones={tablesResult.zones || []}
      businessName={business?.name || 'İşletme'}
      qrByTableId={Object.fromEntries(qrByTableId)}
    />
  );
}
