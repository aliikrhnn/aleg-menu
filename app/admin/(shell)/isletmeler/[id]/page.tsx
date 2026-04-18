import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { BusinessActions } from './actions';

interface Props {
  params: { id: string };
}

export default async function BusinessDetailPage({ params }: Props) {
  const supabase = createClient();

  // İşletme bilgisini çek
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!business) {
    notFound();
  }

  // Plan bilgisi
  const { data: plan } = business.plan_id
    ? await supabase
        .from('platform_plans')
        .select('*')
        .eq('id', business.plan_id)
        .maybeSingle()
    : { data: null };

  // Kullanıcıları çek
  const { data: members } = await supabase
    .from('business_members')
    .select('id, user_id, full_name, phone, status, joined_at, role_id')
    .eq('business_id', business.id)
    .order('joined_at', { ascending: true });

  // Roller
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, is_owner')
    .eq('business_id', business.id);

  const roleMap = new Map(roles?.map((r) => [r.id, r]) || []);

  // Stats
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  const { count: tableCount } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/isletmeler" className="text-ink-3 hover:text-ink-2 transition-colors">
          İşletmeler
        </Link>
        <span className="text-ink-3">/</span>
        <span className="text-ink-2">{business.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-[var(--r)] bg-super-soft text-super flex items-center justify-center flex-shrink-0"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 500,
            }}
          >
            {business.name.charAt(0)}
          </div>
          <div>
            <div
              className="text-super uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
              }}
            >
              İŞLETME DETAYI
            </div>
            <h1
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 42,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              {business.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-ink-3">
              <a
                href={`https://${business.slug}.alegstudio.com`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-super transition-colors"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {business.slug}.alegstudio.com ↗
              </a>
              {business.city && (
                <>
                  <span>·</span>
                  <span>{business.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <StatusBadge status={business.subscription_status} />
        </div>
      </div>

      {/* 3 ana kolon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <InfoCard label="TOPLAM ÜRÜN" value={productCount?.toString() || '0'} />
        <InfoCard label="MASA SAYISI" value={tableCount?.toString() || '0'} />
        <InfoCard label="KULLANICI" value={members?.length.toString() || '0'} />
      </div>

      {/* İki kolon layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sol: Abonelik */}
        <div className="bg-card border border-line rounded-[var(--r)] p-6">
          <div
            className="text-ink-3 uppercase mb-4"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            ABONELİK
          </div>

          <div className="space-y-4">
            <DetailRow label="Plan" value={plan?.name || 'Yok'} />
            <DetailRow label="Fiyat" value={plan ? `₺${plan.price_monthly}/ay` : '—'} />
            <DetailRow label="Durum" value={statusLabel(business.subscription_status)} />
            {business.trial_ends_at && (
              <DetailRow
                label="Deneme Bitiş"
                value={formatDate(business.trial_ends_at)}
                mono
              />
            )}
            {business.subscription_ends_at && (
              <DetailRow
                label="Abonelik Bitiş"
                value={formatDate(business.subscription_ends_at)}
                mono
              />
            )}
            <DetailRow label="Kayıt" value={formatDate(business.created_at)} mono />
          </div>
        </div>

        {/* Orta + Sağ: Kullanıcılar + İletişim */}
        <div className="lg:col-span-2 space-y-4">
          {/* Kullanıcılar */}
          <div className="bg-card border border-line rounded-[var(--r)] p-6">
            <div
              className="text-ink-3 uppercase mb-4"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
              }}
            >
              KULLANICILAR ({members?.length || 0})
            </div>

            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((m) => {
                  const role = m.role_id ? roleMap.get(m.role_id) : null;
                  const initials = (m.full_name || '?')
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 py-2 border-b border-line last:border-0"
                    >
                      <div
                        className="w-9 h-9 rounded-full bg-paper-2 text-ink-2 flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ fontFamily: 'var(--f-sans)' }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">
                          {m.full_name || 'İsimsiz'}
                        </div>
                        <div
                          className="text-xs text-ink-3"
                          style={{ fontFamily: 'var(--f-mono)' }}
                        >
                          {m.phone || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {role?.is_owner && (
                          <span
                            className="text-xs px-2 py-0.5 rounded bg-super/15 text-super uppercase"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                            }}
                          >
                            SAHİP
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            m.status === 'active'
                              ? 'bg-ok/10 text-ok'
                              : 'bg-warn/10 text-warn'
                          }`}
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {m.status === 'active' ? 'AKTİF' : 'DAVETLİ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-ink-3 text-sm">Henüz kullanıcı yok</div>
            )}
          </div>

          {/* İletişim */}
          <div className="bg-card border border-line rounded-[var(--r)] p-6">
            <div
              className="text-ink-3 uppercase mb-4"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
              }}
            >
              İLETİŞİM
            </div>
            <div className="space-y-3">
              <DetailRow label="E-posta" value={business.email || '—'} mono />
              <DetailRow label="Telefon" value={business.phone || '—'} mono />
            </div>
          </div>
        </div>
      </div>

      {/* Aksiyonlar — Tehlikeli zone */}
      <div className="mt-6 bg-card border border-line rounded-[var(--r)] p-6">
        <div
          className="text-ink-3 uppercase mb-4"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          YÖNETİM EYLEMLERİ
        </div>
        <BusinessActions
          businessId={business.id}
          businessName={business.name}
          currentStatus={business.subscription_status}
        />
      </div>
    </div>
  );
}

// ============================================================
// Yardımcı bileşenler
// ============================================================

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5">
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
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-ink-3">{label}</span>
      <span
        className="text-ink-2 text-right"
        style={mono ? { fontFamily: 'var(--f-mono)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    trial: { label: 'DENEME', color: 'var(--super)', bg: 'var(--super-soft)' },
    active: { label: 'AKTİF', color: 'var(--ok)', bg: 'color-mix(in oklab, var(--ok) 15%, transparent)' },
    past_due: { label: 'GECİKMİŞ', color: 'var(--warn)', bg: 'color-mix(in oklab, var(--warn) 15%, transparent)' },
    cancelled: { label: 'İPTAL', color: 'var(--danger)', bg: 'color-mix(in oklab, var(--danger) 15%, transparent)' },
    suspended: { label: 'ASKIDA', color: 'var(--ink-3)', bg: 'var(--paper-2)' },
  };

  const c = config[status] || config.trial;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: 'var(--f-mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    trial: 'Deneme',
    active: 'Aktif',
    past_due: 'Gecikmiş',
    cancelled: 'İptal',
    suspended: 'Askıda',
  };
  return labels[status] || status;
}
