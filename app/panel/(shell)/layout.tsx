import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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

  // Business üyeliği var mı?
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, full_name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    redirect('/giris?error=no_business');
  }

  return (
    <div data-theme="warm" className="min-h-screen bg-paper text-ink">
      {children}
    </div>
  );
}
