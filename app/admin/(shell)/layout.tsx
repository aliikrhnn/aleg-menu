import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';

export default async function AdminShellLayout({
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

  // Süper admin bilgilerini çek
  const { data: adminInfo } = await supabase
    .from('super_admins')
    .select('full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminInfo) {
    redirect('/giris?error=not_authorized');
  }

  return (
    <div data-theme="swiss" className="flex h-screen overflow-hidden bg-paper text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          user={{
            email: user.email,
            full_name: adminInfo?.full_name,
          }}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
