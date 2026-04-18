import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminInfo } = await supabase
    .from('super_admins')
    .select('full_name')
    .eq('user_id', user?.id || '')
    .maybeSingle();

  // Gerçek istatistikler
  const { count: businessCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  const { count: activeCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .in('subscription_status', ['active', 'trial']);

  const firstName = adminInfo?.full_name?.split(' ')[0] || 'admin';
  const greeting = getGreeting();

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div
          className="text-super uppercase mb-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          GÖSTERGE PANELİ · {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {greeting}, {firstName}
        </h1>
        <p className="text-ink-2 text-base mt-3">
          Platform&apos;daki son durum ve önemli metrikler.
        </p>
      </div>

      {/* Hero metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard
          label="TOPLAM İŞLETME"
          value={businessCount?.toString() || '0'}
          sublabel="kayıtlı tenant"
          accent="super"
        />
        <MetricCard
          label="AKTİF ABONELİK"
          value={activeCount?.toString() || '0'}
          sublabel="trial veya ödenmiş"
          accent="ok"
        />
        <MetricCard
          label="BU AY GELİR"
          value="₺0"
          sublabel="henüz fatura kesilmedi"
          accent="ink"
        />
        <MetricCard
          label="ONAY BEKLEYEN"
          value="0"
          sublabel="işletme yok"
          accent="warn"
        />
      </div>

      {/* Two column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-line rounded-[var(--r)] p-6">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div
                className="text-ink-3 uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                }}
              >
                SON AKTİVİTELER
              </div>
              <h2
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                Bugün ne oldu?
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            <ActivityItem
              icon="◉"
              title="Aleg Karaköy oluşturuldu"
              meta="Test verisi · İstanbul · Pro plan"
              time="bugün"
              tone="ok"
            />
            <ActivityItem
              icon="◐"
              title="Süper admin hesabı aktif edildi"
              meta={user?.email || ''}
              time="şimdi"
              tone="super"
            />
            <div className="text-center py-8 text-ink-3 text-sm">
              <div className="mb-2 text-2xl">○</div>
              <div>İlk gerçek müşteri kaydolduğunda buradan görebileceksin.</div>
            </div>
          </div>
        </div>

        {/* Right: System Status */}
        <div className="bg-card border border-line rounded-[var(--r)] p-6">
          <div
            className="text-ink-3 uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            SİSTEM DURUMU
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
            className="mb-5"
          >
            Her şey yolunda
          </h2>

          <div className="space-y-3">
            <SystemStatus label="Veritabanı" status="ok" detail="Supabase · Frankfurt" />
            <SystemStatus label="Auth" status="ok" detail="Çalışıyor" />
            <SystemStatus label="Deploy" status="ok" detail="Vercel · v0.1" />
            <SystemStatus label="Domain" status="ok" detail="alegstudio.com" />
          </div>

          <div className="mt-6 pt-5 border-t border-line">
            <div
              className="text-ink-3 uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
              }}
            >
              VERSİYON
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
              }}
            >
              v0.1 <span className="text-ink-3 text-base">iskelet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sıradakiler bölümü */}
      <div className="mt-10 p-6 rounded-[var(--r)] bg-super/5 border border-super/20">
        <div
          className="text-super uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          SIRADA NE VAR
        </div>
        <h3
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 24,
            fontWeight: 400,
          }}
          className="mb-4"
        >
          İşletme yönetimi ekranları aktarılacak
        </h3>
        <div className="text-ink-2 text-sm leading-relaxed">
          Sol menüden &quot;İşletmeler&quot; tıkladığında henüz boş — birlikte aktaracağız. Sonrasında
          yeni işletme oluşturma akışı (mail + plan seçimi), faturalar, destek talepleri ve sistem
          ayarları gelecek.
        </div>
      </div>
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

// =============================================================
// Bileşenler
// =============================================================

function MetricCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: 'super' | 'ok' | 'warn' | 'ink';
}) {
  const accentColor =
    accent === 'super'
      ? 'var(--super)'
      : accent === 'ok'
        ? 'var(--ok)'
        : accent === 'warn'
          ? 'var(--warn)'
          : 'var(--ink)';

  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5 min-h-[140px] grid gap-3 content-between">
      <div
        className="text-ink-3 uppercase"
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
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 42,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: accentColor,
        }}
      >
        {value}
      </div>
      <div className="text-xs text-ink-3" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
        {sublabel}
      </div>
    </div>
  );
}

function ActivityItem({
  icon,
  title,
  meta,
  time,
  tone,
}: {
  icon: string;
  title: string;
  meta: string;
  time: string;
  tone: 'ok' | 'super' | 'warn';
}) {
  const toneColor = tone === 'ok' ? 'var(--ok)' : tone === 'super' ? 'var(--super)' : 'var(--warn)';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: `color-mix(in oklab, ${toneColor} 12%, transparent)`,
          color: toneColor,
          fontFamily: 'var(--f-mono)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink leading-tight">{title}</div>
        <div className="text-xs text-ink-3 mt-0.5 truncate">{meta}</div>
      </div>
      <div
        className="text-ink-3 text-xs uppercase flex-shrink-0"
        style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
      >
        {time}
      </div>
    </div>
  );
}

function SystemStatus({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'ok' | 'warn' | 'down';
  detail: string;
}) {
  const color = status === 'ok' ? 'var(--ok)' : status === 'warn' ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
        <span className="text-ink-2">{label}</span>
      </div>
      <span
        className="text-ink-3 text-xs"
        style={{ fontFamily: 'var(--f-mono)' }}
      >
        {detail}
      </span>
    </div>
  );
}
