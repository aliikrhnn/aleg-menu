import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PanelHomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, full_name')
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

  // Ürün ve masa sayıları
  const { count: productCount } = business
    ? await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
    : { count: 0 };

  const { count: tableCount } = business
    ? await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
    : { count: 0 };

  const firstName = membership?.full_name?.split(' ')[0] || 'dostum';
  const greeting = getGreeting();

  // Kuruluş günlerini hesapla
  const daysSinceCreation = business?.created_at
    ? Math.floor((Date.now() - new Date(business.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto">
      {/* Hero */}
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
          ANA SAYFA · {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
          {daysSinceCreation === 0 ? 'Hoşgeldin — kafene bakalım.' : `${daysSinceCreation} gündür Aleg'tesin.`}
        </p>
      </div>

      {/* 3 kart - özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <MetricCard
          label="DURUM"
          value={statusLabel(business?.subscription_status)}
          sublabel={plan?.name ? `${plan.name} plan` : ''}
        />
        <MetricCard
          label="MENÜDEKİ ÜRÜN"
          value={(productCount ?? 0).toString()}
          sublabel="aktif ürün sayısı"
        />
        <MetricCard
          label="MASA"
          value={(tableCount ?? 0).toString()}
          sublabel="kayıtlı masa"
        />
      </div>

      {/* İki kolon: QR preview + Sonraki adımlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        {/* QR Menu önizleme */}
        <div className="bg-card border border-line rounded-[var(--r)] p-6">
          <div
            className="text-ink-3 uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            QR MENÜ URL
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
            className="mb-3"
          >
            Müşterilerin göreceği link
          </h2>
          <a
            href={`https://${business?.slug}.alegstudio.com`}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline text-sm break-all"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            {business?.slug}.alegstudio.com ↗
          </a>
          <div className="mt-4 text-sm text-ink-3">
            Bu linki QR koda çevirip masalarınıza yapıştırabilirsiniz. Müşteriler telefonlarıyla
            okutup menünüze anında erişir.
          </div>
        </div>

        {/* Sıradaki adımlar */}
        <div className="bg-accent/5 border border-accent/20 rounded-[var(--r)] p-6">
          <div
            className="text-accent uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            BAŞLAMAK İÇİN
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
            className="mb-4"
          >
            İlk 3 adım
          </h2>

          <div className="space-y-3">
            <Step
              n={1}
              title="Kategorilerinizi ekleyin"
              desc="Kahve, yiyecek, tatlı..."
              href="/menu"
            />
            <Step
              n={2}
              title="Ürünleri ekleyin"
              desc="Fotoğraf, fiyat, açıklama"
              href="/menu"
            />
            <Step
              n={3}
              title="QR koddan test edin"
              desc="Müşteri gözünden bakın"
              href={`https://${business?.slug}.alegstudio.com`}
              external
            />
          </div>
        </div>
      </div>

      {/* Yakında bölümü */}
      <div className="bg-card border border-line rounded-[var(--r)] p-6">
        <div
          className="text-ink-3 uppercase mb-3"
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
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
          className="mb-4"
        >
          Çalışmaları süren özellikler
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <FeatureBox icon="◉" title="POS & Masa Yönetimi" desc="Sipariş alma, ödeme, hesap bölüşme" />
          <FeatureBox icon="◈" title="KDS (Mutfak Ekranı)" desc="Siparişleri gerçek zamanlı takip" />
          <FeatureBox icon="◌" title="Raporlar" desc="Günlük satış, popüler ürünler" />
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

function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    trial: 'Deneme',
    active: 'Aktif',
    past_due: 'Gecikmiş',
    cancelled: 'İptal',
    suspended: 'Askıda',
  };
  return labels[status || ''] || '—';
}

// ============================================================
// Bileşenler
// ============================================================

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5 min-h-[120px] grid gap-2 content-between">
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
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1,
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

function Step({
  n,
  title,
  desc,
  href,
  external,
}: {
  n: number;
  title: string;
  desc: string;
  href: string;
  external?: boolean;
}) {
  const Component = external ? 'a' : Link;
  const extraProps = external ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <Component
      href={href}
      {...extraProps}
      className="flex items-start gap-3 py-2.5 group cursor-pointer"
    >
      <div
        className="w-7 h-7 rounded-full bg-accent text-card flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {n}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-ink group-hover:text-accent transition-colors">
          {title} {external && <span className="text-xs">↗</span>}
        </div>
        <div className="text-xs text-ink-3 mt-0.5">{desc}</div>
      </div>
    </Component>
  );
}

function FeatureBox({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-[var(--r-sm)] bg-paper-2 border border-line">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-[var(--r-sm)] bg-accent/10 text-accent flex items-center justify-center flex-shrink-0"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-ink">{title}</div>
          <div className="text-xs text-ink-3 mt-0.5">{desc}</div>
        </div>
      </div>
    </div>
  );
}
