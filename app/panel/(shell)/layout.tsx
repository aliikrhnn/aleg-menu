import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PanelSidebar } from '@/components/panel/sidebar';
import { PanelTopbar } from '@/components/panel/topbar';
import { AiAssistant } from '@/components/panel/ai-assistant';
import { PrintQueueListener } from '@/components/panel/print-queue-listener';

export default async function PanelShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/panel/giris');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, full_name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    redirect('/panel/giris?error=no_business');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, logo_url, subscription_status')
    .eq('id', membership.business_id)
    .maybeSingle();

  // Aktif istasyonları çek (sidebar'da KDS alt menüsü için)
  const { data: stationsRaw } = await supabase
    .from('stations')
    .select('id, name, slug, icon, color, sort_order')
    .eq('business_id', membership.business_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const initialStations = (stationsRaw || []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    slug: (s.slug as string) || (s.id as string).slice(0, 8),
    icon: (s.icon as string) || '●',
    color: (s.color as string) || '#C4553A',
  }));

  return (
    <div data-theme="warm" className="flex h-screen overflow-hidden bg-paper text-ink">
      <PanelSidebar
        businessName={business?.name || 'İşletme'}
        logoUrl={business?.logo_url || null}
        businessId={membership.business_id}
        initialStations={initialStations}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PanelTopbar
          user={{
            email: user.email,
            full_name: membership.full_name,
          }}
          businessStatus={business?.subscription_status}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <AiAssistant businessName={business?.name} />
      <PrintQueueListener businessId={membership.business_id} />
    </div>
  );
}
