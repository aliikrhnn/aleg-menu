import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKitchenOrders } from '@/lib/actions/kds';
import { KitchenBoard } from './kitchen-board';

export const dynamic = 'force-dynamic';

export default async function KdsPage() {
  // Auth kontrolü (bu sayfanın kendi layout'u yok, manuel)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/panel/giris');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    redirect('/panel/giris?error=no_business');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', membership.business_id)
    .maybeSingle();

  // İlk veriyi çek
  const result = await getKitchenOrders();

  if (!result.success || !result.businessId) {
    return (
      <div
        data-theme="espresso"
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--paper)', color: 'var(--ink)' }}
      >
        <div className="text-center max-w-md">
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 32,
              fontWeight: 400,
              color: 'var(--accent)',
            }}
            className="mb-3"
          >
            Mutfak ekranı açılamadı
          </div>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {result.error}
          </p>
          <a
            href="/panel/masalar"
            className="inline-block mt-6 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
            }}
          >
            Panele dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <KitchenBoard
      initialOrders={result.orders || []}
      initialStations={result.stations || []}
      initialStationSlug={null}
      businessId={result.businessId}
      businessName={business?.name || 'İşletme'}
    />
  );
}
