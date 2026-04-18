import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';

export default async function AdminHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Süper admin bilgilerini çek
  const { data: adminInfo } = await supabase
    .from('super_admins')
    .select('full_name')
    .eq('user_id', user?.id || '')
    .maybeSingle();

  // Test için işletme sayısını çek
  const { count: businessCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  return (
    <div data-theme="swiss" className="min-h-screen bg-paper">
      {/* Topbar */}
      <header className="border-b border-line bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-ink flex items-center justify-center">
              <span className="text-paper font-display font-bold text-lg">A</span>
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">Aleg</div>
              <div className="label-mono text-ink-3 text-[10px] mt-0.5">SÜPER ADMİN</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{adminInfo?.full_name || user?.email}</div>
              <div className="text-xs text-ink-3">{user?.email}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="label-mono text-ink-3 mb-2">DASHBOARD</div>
          <h1 className="font-serif-italic text-5xl leading-tight mb-3">
            Hoşgeldin, {adminInfo?.full_name?.split(' ')[0] || 'admin'}
          </h1>
          <p className="text-ink-2 text-lg">Platform yönetim paneli — gerçek veriye bağlı.</p>
        </div>

        {/* Hızlı stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatCard
            label="TOPLAM İŞLETME"
            value={businessCount?.toString() || '0'}
            sublabel="aktif tenant"
          />
          <StatCard
            label="GİRİŞ DURUMUN"
            value="✓"
            sublabel="süper admin doğrulandı"
          />
          <StatCard
            label="VERSİYON"
            value="v0.1"
            sublabel="iskelet sürümü"
          />
        </div>

        {/* Sıradaki adımlar */}
        <div className="bg-card rounded-[14px] border border-line p-8">
          <div className="label-mono text-accent mb-3">SIRADA NE VAR</div>
          <h2 className="font-serif-italic text-3xl mb-6">Süper admin tasarımı aktarılacak</h2>

          <div className="space-y-3 text-ink-2">
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-ink-3 mt-1">01</span>
              <span>İşletmeler listesi ve detay ekranları</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-ink-3 mt-1">02</span>
              <span>Yeni işletme oluşturma akışı (mail + plan)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-ink-3 mt-1">03</span>
              <span>Faturalar ve abonelik yönetimi</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-ink-3 mt-1">04</span>
              <span>Destek talepleri ve sistem ayarları</span>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-[10px] bg-paper-2 border border-line text-sm text-ink-2">
            ✅ <strong>Auth sistemi çalışıyor.</strong> Bu sayfayı görüyorsan, doğru giriş yaptın
            ve süper admin yetkin var. Sıradaki adımda Claude Design&apos;daki tasarımları aktaracağız.
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-card rounded-[14px] border border-line p-6">
      <div className="label-mono text-ink-3 mb-3">{label}</div>
      <div className="font-serif-italic text-4xl mb-1">{value}</div>
      <div className="text-xs text-ink-3">{sublabel}</div>
    </div>
  );
}
