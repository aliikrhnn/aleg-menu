import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PanelSidebar } from '@/components/panel/sidebar';
import { PanelTopbar } from '@/components/panel/topbar';

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
    redirect('/giris');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, full_name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    redirect('/giris?error=no_business');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, subscription_status')
    .eq('id', membership.business_id)
    .maybeSingle();

  return (
    <div data-theme="warm" className="flex h-screen overflow-hidden bg-paper text-ink">
      <PanelSidebar businessName={business?.name || 'İşletme'} />
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
    </div>
  );
}
