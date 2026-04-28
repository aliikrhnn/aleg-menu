import Link from 'next/link';
import { getAdminDashboard, type AdminDashboardData } from '@/lib/actions/admin-dashboard';
import {
  Eyebrow,
  SerifTitle,
  MetricCard,
  Money,
  SerifNum,
  Pill,
  StatusDot,
  LogoTile,
  TurkiyeMap,
  BarChart,
  FilterChip,
} from '@/components/admin/primitives';

// Greeting helper
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function turkishDate() {
  return new Date()
    .toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    })
    .toUpperCase();
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();
  const { user, metrics, trends, signups7d, activity, pendingPayments, cities, funnel } = data;

  // Trend yüzdesi (son ay vs önceki ay)
  const bizTrend = trends.businesses.length >= 2
    ? Math.round(
        ((trends.businesses[trends.businesses.length - 1] -
          trends.businesses[trends.businesses.length - 2]) /
          (trends.businesses[trends.businesses.length - 2] || 1)) *
          100 *
          10,
      ) / 10
    : 0;

  const revTrend = trends.revenue.length >= 2 && trends.revenue[trends.revenue.length - 2] > 0
    ? Math.round(
        ((trends.revenue[trends.revenue.length - 1] -
          trends.revenue[trends.revenue.length - 2]) /
          trends.revenue[trends.revenue.length - 2]) *
          100 *
          10,
      ) / 10
    : 0;

  // Signup haftalık
  const signupsThis7 = signups7d.reduce((s, r) => s + r.count, 0);
  const peakDay = signups7d.reduce(
    (max, r) => (r.count > max.count ? r : max),
    { count: 0, label: '—', day: '' },
  );
  const avgPerDay = signupsThis7 / 7;

  // Pending toplam
  const pendingTotal = pendingPayments.reduce((s, p) => s + p.amount, 0);

  // Funnel oranları
  const trialRate =
    funnel.signups > 0 ? Math.round((funnel.started_trial / funnel.signups) * 100) : 0;
  const conversionRate =
    funnel.started_trial > 0
      ? Math.round((funnel.converted / funnel.started_trial) * 100)
      : 0;

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto grid gap-6">
      {/* ============== HEADER ============== */}
      <div className="grid gap-2">
        <Eyebrow>
          {turkishDate()} ·{' '}
          {new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Eyebrow>
        <SerifTitle size={56}>
          {getGreeting()},{' '}
          <span style={{ color: 'var(--super)' }}>{user.first_name}.</span>
        </SerifTitle>
        <p className="text-ink-2 text-base mt-2 leading-relaxed max-w-[640px]">
          Platformda bugün{' '}
          <strong className="text-ink">{metrics.new_today} yeni işletme</strong> kayıt oldu,{' '}
          {metrics.pending_count > 0 ? (
            <>
              <strong style={{ color: 'var(--danger)' }}>
                {metrics.pending_count} fatura
              </strong>{' '}
              ödeme bekliyor
            </>
          ) : (
            <strong style={{ color: 'var(--ok)' }}>bekleyen ödeme yok</strong>
          )}{' '}
          ve{' '}
          {metrics.at_risk_count === 0 ? (
            <strong style={{ color: 'var(--ok)' }}>tüm servisler</strong>
          ) : (
            <strong style={{ color: 'var(--warn)' }}>
              {metrics.at_risk_count} işletme
            </strong>
          )}{' '}
          {metrics.at_risk_count === 0 ? 'sağlıklı çalışıyor.' : 'risk altında.'}
        </p>

        <div className="flex gap-2 mt-2">
          <Link
            href="/istatistikler"
            className="h-10 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 hover:border-line-2 transition-colors text-sm font-medium flex items-center"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            Detaylı istatistikler →
          </Link>
          <Link
            href="/isletmeler/yeni"
            className="h-10 px-4 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
            Yeni işletme
          </Link>
        </div>
      </div>

      {/* ============== METRIC CARDS (4) ============== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="TOPLAM İŞLETME"
          value={metrics.total_businesses}
          trend={bizTrend}
          trendLabel="Geçen aya göre"
          sparkline={trends.businesses}
          sparkColor="var(--super)"
        />
        <MetricCard
          label="AKTİF ABONELİK"
          value={metrics.active_subscriptions}
          trend={
            metrics.active_subscriptions > 0
              ? Math.round(
                  (metrics.paid_count / metrics.active_subscriptions) * 100,
                )
              : 0
          }
          trendLabel={`${metrics.trial_count} trial · ${metrics.paid_count} ödenmiş`}
          sparkline={trends.businesses}
          sparkColor="var(--olive)"
        />
        <MetricCard
          label="AYLIK GELİR (MRR)"
          value={metrics.mrr}
          currency
          trend={revTrend}
          trendLabel={`Bu ay tahsil: ₺${metrics.this_month_paid.toLocaleString('tr-TR')}`}
          sparkline={trends.revenue}
          sparkColor="var(--gold)"
          accent="var(--ink)"
        />
        <MetricCard
          label="BUGÜN YENİ KAYIT"
          value={metrics.new_today}
          trend={
            signups7d.length >= 2
              ? signups7d[signups7d.length - 2].count > 0
                ? Math.round(
                    ((metrics.new_today -
                      signups7d[signups7d.length - 2].count) /
                      signups7d[signups7d.length - 2].count) *
                      100,
                  )
                : metrics.new_today > 0
                  ? 100
                  : 0
              : 0
          }
          trendLabel={`Son 7g toplam: ${metrics.new_7d}`}
          sparkline={signups7d.map((s) => s.count)}
          sparkColor="var(--accent)"
          accent="var(--accent)"
        />
      </div>

      {/* ============== EKSTRA: FUNNEL + CHURN RISK STRIPI ============== */}
      <div className="bg-card border border-line rounded-[var(--r)] p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Eyebrow tone="super">SON 30 GÜN HUNİSİ</Eyebrow>
          <div className="flex items-baseline gap-2 mt-2">
            <SerifNum size={28}>{funnel.signups}</SerifNum>
            <span className="text-ink-3 text-xs" style={{ fontFamily: 'var(--f-mono)' }}>
              KAYIT
            </span>
          </div>
        </div>
        <FunnelStep
          label="TRIAL BAŞLATTI"
          value={funnel.started_trial}
          pct={trialRate}
          tone="super"
        />
        <FunnelStep
          label="ÜCRETLİYE GEÇTİ"
          value={funnel.converted}
          pct={conversionRate}
          tone="ok"
        />
        <div>
          <Eyebrow tone={metrics.churn_risk_count > 0 ? 'warn' : 'muted'}>
            CHURN RİSK
          </Eyebrow>
          <div className="flex items-baseline gap-2 mt-2">
            <SerifNum
              size={28}
              tone={
                metrics.churn_risk_count > 0 ? 'var(--warn)' : 'var(--ink-3)'
              }
            >
              {metrics.churn_risk_count}
            </SerifNum>
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
            >
              7G GİRİŞ YOK
            </span>
          </div>
        </div>
      </div>

      {/* ============== AKTİVİTE + KRİTİK ÖDEMELER (2 sütun) ============== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Activity feed */}
        <div className="bg-card border border-line rounded-[var(--r)] grid grid-rows-[auto_1fr] min-h-[420px]">
          <div className="px-5 py-4 border-b border-line flex justify-between items-center">
            <div>
              <Eyebrow>PLATFORM AKIŞI</Eyebrow>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 400,
                  marginTop: 2,
                }}
              >
                Son aktiviteler
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot tone="ok" pulse />
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  color: 'var(--ok)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                CANLI
              </span>
            </div>
          </div>
          <div className="overflow-y-auto py-2">
            {activity.length === 0 ? (
              <EmptyActivity />
            ) : (
              activity.map((a, i) => (
                <ActivityRow key={a.id} a={a} last={i === activity.length - 1} />
              ))
            )}
          </div>
        </div>

        {/* Pending payments — kritik */}
        <div
          className="bg-card border rounded-[var(--r)] grid grid-rows-[auto_1fr_auto]"
          style={{ borderColor: 'var(--accent-soft)' }}
        >
          <div
            className="px-5 py-4 border-b border-line"
            style={{
              background: 'color-mix(in oklab, var(--accent) 7%, transparent)',
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <Eyebrow tone="accent">KRİTİK</Eyebrow>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                    marginTop: 2,
                  }}
                >
                  Ödemesi bekleyenler
                </div>
              </div>
              <Pill tone="danger">{metrics.pending_count} adet</Pill>
            </div>
          </div>
          <div>
            {pendingPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-ink-3 text-sm">
                <div className="text-2xl mb-2">✓</div>
                Bekleyen ödeme yok — tüm faturalar zamanında.
              </div>
            ) : (
              pendingPayments.map((p, i) => (
                <PendingRow
                  key={p.id}
                  p={p}
                  last={i === pendingPayments.length - 1}
                />
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-line flex justify-between items-center">
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10.5,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
              }}
            >
              TOPLAM ₺{pendingTotal.toLocaleString('tr-TR')}
            </span>
            <Link
              href="/odemeler"
              className="h-8 px-3 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 hover:border-line-2 text-xs font-medium flex items-center transition-colors"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Hepsini gör →
            </Link>
          </div>
        </div>
      </div>

      {/* ============== 7 GÜN GRAFİK + HARİTA ============== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4">
        {/* 7 günlük signup */}
        <div className="bg-card border border-line rounded-[var(--r)] p-5 grid gap-3.5">
          <div className="flex justify-between items-start">
            <div>
              <Eyebrow>SON 7 GÜN</Eyebrow>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 400,
                  marginTop: 2,
                }}
              >
                Yeni kayıtlar
              </div>
            </div>
            <div className="text-right">
              <SerifNum size={36} tone="var(--super)">
                {signupsThis7}
              </SerifNum>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  color: signupsThis7 > 0 ? 'var(--ok)' : 'var(--ink-3)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}
              >
                ▲ TOPLAM
              </div>
            </div>
          </div>
          <BarChart
            data={signups7d.map((s) => s.count)}
            labels={signups7d.map((s) => s.label)}
            color="var(--olive)"
            width={300}
            height={96}
          />
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
            <div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.06em',
                }}
              >
                ORTALAMA
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'var(--ink)',
                }}
              >
                {avgPerDay.toFixed(1)} / gün
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.06em',
                }}
              >
                EN YÜKSEK
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'var(--ink)',
                }}
              >
                {peakDay.label} · {peakDay.count}
              </div>
            </div>
          </div>
        </div>

        {/* Türkiye haritası */}
        <div className="bg-card border border-line rounded-[var(--r)] p-5 grid gap-3.5">
          <div className="flex justify-between items-start">
            <div>
              <Eyebrow>COĞRAFİ DAĞILIM</Eyebrow>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 400,
                  marginTop: 2,
                }}
              >
                Aktif işletmeler
              </div>
            </div>
            <div className="flex gap-1.5">
              <FilterChip label="TÜR" value="Hepsi" />
              <FilterChip label="PLAN" value="Hepsi" />
            </div>
          </div>
          {cities.length > 0 ? (
            <TurkiyeMap dots={cities} accent="var(--super)" />
          ) : (
            <div className="aspect-[2/1] bg-paper-2 border border-line rounded-[var(--r)] flex items-center justify-center text-ink-3 text-sm">
              Henüz şehir verisi yok
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Yardımcı bileşenler
// ============================================================

function FunnelStep({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: 'super' | 'ok' | 'warn' | 'danger';
}) {
  const colorMap = {
    super: 'var(--super)',
    ok: 'var(--ok)',
    warn: 'var(--warn)',
    danger: 'var(--danger)',
  };
  return (
    <div>
      <Eyebrow tone={tone}>{label}</Eyebrow>
      <div className="flex items-baseline gap-2 mt-2">
        <SerifNum size={28}>{value}</SerifNum>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: colorMap[tone],
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

type ActivityItem = AdminDashboardData['activity'][number];

function ActivityRow({
  a,
  last,
}: {
  a: ActivityItem;
  last: boolean;
}) {
  const actionLabel = humanizeAction(a.action);
  const what = a.target_label || a.business_name || a.action;

  return (
    <div
      className="grid items-center gap-3 px-5 py-3"
      style={{
        gridTemplateColumns: '60px 1fr auto',
        borderBottom: last ? 'none' : '1px solid var(--line)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          letterSpacing: '0.04em',
        }}
      >
        {a.age}
      </span>
      <div className="grid gap-0.5 min-w-0">
        <span className="text-[13px] font-semibold text-ink truncate">
          {a.business_name || what}
        </span>
        <span className="text-xs text-ink-2 truncate">
          {a.is_system ? (
            <span style={{ color: 'var(--olive)', fontWeight: 700 }}>
              [system]
            </span>
          ) : (
            a.actor
          )}{' '}
          · {actionLabel}
        </span>
      </div>
      <Pill tone={a.tone}>{a.action.split('.')[0]}</Pill>
    </div>
  );
}

function PendingRow({
  p,
  last,
}: {
  p: {
    id: string;
    invoice_no: string;
    business_name: string;
    amount: number;
    days_overdue: number;
    logo: string;
  };
  last: boolean;
}) {
  return (
    <div
      className="grid items-center gap-3 px-5 py-3.5"
      style={{
        gridTemplateColumns: 'auto 1fr auto',
        borderBottom: last ? 'none' : '1px solid var(--line)',
      }}
    >
      <LogoTile logo={p.logo} tint="var(--accent)" size={32} />
      <div className="grid gap-0.5 min-w-0">
        <span className="text-[13px] font-semibold text-ink truncate">
          {p.business_name}
        </span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {p.invoice_no} · {p.days_overdue} gün geçti
        </span>
      </div>
      <div className="text-right">
        <Money amount={p.amount} size={22} tone="var(--accent)" />
      </div>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="px-5 py-12 text-center text-ink-3 text-sm">
      <div className="text-3xl mb-3">○</div>
      <div>Henüz hiç aktivite yok.</div>
      <div className="text-xs mt-1">
        İlk işletme oluşturulduğunda burası dolacak.
      </div>
    </div>
  );
}

// Action ID'lerini insanca yaz
function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    'business.signup': 'yeni işletme kaydı',
    'business.approve': 'işletmeyi onayladı',
    'business.suspend': 'işletmeyi askıya aldı',
    'business.delete': 'işletmeyi sildi',
    'business.plan.upgrade': 'plan yükseltildi',
    'business.plan.downgrade': 'plan düşürüldü',
    'invoice.generate': 'fatura oluşturuldu',
    'invoice.paid': 'fatura ödendi',
    'invoice.failed': 'ödeme başarısız',
    'payment.retry': 'ödeme yeniden denendi',
    'plan.edit': 'plan düzenlendi',
    'auth.login': 'giriş yaptı',
    'admin.impersonate': 'işletme paneline giriş yaptı (login-as)',
    'module.toggle': 'modül değiştirildi',
    'ticket.reply': 'destek talebine yanıt',
    'support.assign': 'destek talebi atandı',
  };
  return map[action] || action;
}
