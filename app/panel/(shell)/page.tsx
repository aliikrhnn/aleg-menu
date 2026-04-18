import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';

export default async function PanelHomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Kullanıcının işletmesini getir
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, full_name, role_id')
    .eq('user_id', user?.id || '')
    .eq('status', 'active')
    .maybeSingle();

  const { data: business } = membership
    ? await supabase
        .from('businesses')
        .select('*')
        .eq('id', membership.business_id)
        .maybeSingle()
    : { data: null };

  const { data: plan } = business?.plan_id
    ? await supabase
        .from('platform_plans')
        .select('name')
        .eq('id', business.plan_id)
        .maybeSingle()
    : { data: null };

  const firstName = membership?.full_name?.split(' ')[0] || 'dostum';
  const greeting = getGreeting();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="border-b border-line bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] bg-accent flex items-center justify-center"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 20,
                fontWeight: 500,
                color: '#FAF5EA',
                letterSpacing: '-0.04em',
              }}
            >
              a
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                {business?.name || 'Aleg'}
              </div>
              <div
                className="text-ink-3 uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                }}
              >
                İŞLETME PANELİ
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{membership?.full_name}</div>
              <div className="text-xs text-ink-3">{user?.email}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <div className="mb-10">
          <div
            className="text-accent uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            HOŞGELDİN
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 56,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
            className="mb-4"
          >
            {greeting}, {firstName}
          </h1>
          <p className="text-ink-2 text-lg leading-relaxed">
            {business?.name} paneline başarıyla giriş yaptın. Menü, masalar, sipariş ve raporlar
            yakında burada olacak — şu an sadece iskelet hazır.
          </p>
        </div>

        {/* Bilgi kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <InfoCard label="DURUM" value={statusLabel(business?.subscription_status)} />
          <InfoCard label="PLAN" value={plan?.name || 'Yok'} />
          <InfoCard
            label="SUBDOMAIN"
            value={`${business?.slug}.alegstudio.com`}
            mono
          />
        </div>

        {/* Sıradaki özellikler */}
        <div className="bg-card border border-line rounded-[14px] p-8">
          <div
            className="text-accent uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            YAKINDA
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
            className="mb-4"
          >
            Aktarılacak ekranlar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-ink-2">
            <FeatureItem icon="◉" title="Menü yönetimi" desc="Kategoriler ve ürünler" />
            <FeatureItem icon="◇" title="POS & Masa" desc="Sipariş ve ödeme" />
            <FeatureItem icon="◈" title="KDS" desc="Mutfak ekranı" />
            <FeatureItem icon="◍" title="Raporlar" desc="Günlük satış, popüler ürünler" />
            <FeatureItem icon="✆" title="Sadakat" desc="Müşteri kulübü" />
            <FeatureItem icon="⚙" title="Ayarlar" desc="Tema, çalışma saatleri" />
          </div>

          <div className="mt-6 pt-6 border-t border-line text-sm text-ink-3">
            Önceliklendirmek istediğin özellik varsa Aleg ekibiyle iletişime geçebilirsin.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-ink-3" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
          <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 14 }}>Aleg</span>
          <span className="mx-2">·</span>
          Kafe işletim sistemi
          <span className="mx-2">·</span>
          v0.1
        </div>
      </footer>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    trial: '30 günlük deneme',
    active: 'Aktif',
    past_due: 'Gecikmiş ödeme',
    cancelled: 'İptal edildi',
    suspended: 'Askıda',
  };
  return labels[status || ''] || '—';
}

// ============================================================
// Bileşenler
// ============================================================

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-card border border-line rounded-[14px] p-5">
      <div
        className="text-ink-3 uppercase mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
      <div
        className="text-ink"
        style={
          mono
            ? {
                fontFamily: 'var(--f-mono)',
                fontSize: 14,
                wordBreak: 'break-all',
              }
            : {
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }
        }
      >
        {value}
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className="w-9 h-9 rounded-[10px] bg-accent/10 text-accent flex items-center justify-center flex-shrink-0"
        style={{ fontFamily: 'var(--f-mono)' }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs text-ink-3 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
