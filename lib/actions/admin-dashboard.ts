'use server';

import { createClient } from '@/lib/supabase/server';

// ============================================================
// Internal Row Types — Supabase'den dönen view satırları
// ============================================================

type DashboardMetricsRow = {
  total_businesses: number | string | null;
  active_subscriptions: number | string | null;
  trial_count: number | string | null;
  paid_count: number | string | null;
  at_risk_count: number | string | null;
  new_today: number | string | null;
  new_7d: number | string | null;
  new_30d: number | string | null;
  mrr: number | string | null;
  this_month_paid: number | string | null;
  pending_count: number | string | null;
  pending_amount: number | string | null;
  churn_risk_count: number | string | null;
};

type GrowthRow = { month: string; count: number | string };
type RevenueRow = { month: string; revenue: number | string };
type SignupRow = { day: string; count: number | string; label_short: string | null };
type CityRow = { city: string; count: number | string };
type FunnelRow = {
  signups: number | string | null;
  started_trial: number | string | null;
  converted: number | string | null;
  churned: number | string | null;
};

type AuditRow = {
  id: number | string;
  ts: string;
  actor_email: string | null;
  actor_name: string | null;
  is_system: boolean | null;
  action: string;
  target_label: string | null;
  business_id: string | null;
  meta: Record<string, unknown> | null;
  tone: string | null;
};

type BusinessNameRow = { id: string; name: string };

type PendingRow = {
  id: string;
  invoice_no: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  amount: number | string;
  days_overdue: number | string | null;
  logo: string | null;
};

// ============================================================
// Public Types
// ============================================================

export type AdminDashboardData = {
  user: {
    full_name: string;
    first_name: string;
    email: string;
  };
  metrics: {
    total_businesses: number;
    active_subscriptions: number;
    trial_count: number;
    paid_count: number;
    at_risk_count: number;
    new_today: number;
    new_7d: number;
    new_30d: number;
    mrr: number;
    this_month_paid: number;
    pending_count: number;
    pending_amount: number;
    churn_risk_count: number;
  };
  trends: {
    businesses: number[];
    revenue: number[];
  };
  signups7d: Array<{ day: string; count: number; label: string }>;
  activity: Array<{
    id: number;
    ts: string;
    age: string;
    actor: string;
    action: string;
    target_label: string | null;
    business_id: string | null;
    business_name: string | null;
    tone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive';
    meta: Record<string, unknown>;
    is_system: boolean;
  }>;
  pendingPayments: Array<{
    id: string;
    invoice_no: string;
    business_id: string;
    business_name: string;
    business_slug: string;
    amount: number;
    days_overdue: number;
    logo: string;
  }>;
  cities: Array<{ city: string; count: number }>;
  funnel: {
    signups: number;
    started_trial: number;
    converted: number;
    churned: number;
  };
};

// ============================================================
// Helper — yaş formatı
// ============================================================
function formatAge(ts: string | Date): string {
  const date = typeof ts === 'string' ? new Date(ts) : ts;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}sn`;
  if (diffMin < 60) return `${diffMin}dk`;
  if (diffHr < 24) return `${diffHr}sa`;
  if (diffDay === 1) return 'Dün';
  if (diffDay < 7) return `${diffDay}g`;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

// ============================================================
// Permission check
// ============================================================
async function requireSuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Yetkisiz: giriş yapmamışsınız');

  const { data: admin } = await supabase
    .from('super_admins')
    .select('user_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!admin) throw new Error('Yetkisiz: süper admin değilsiniz');

  return { user, admin };
}

// ============================================================
// MAIN: getAdminDashboard
// ============================================================
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const { user, admin } = await requireSuperAdmin();
  const supabase = createClient();

  const { data: metricsRowRaw } = await supabase
    .from('v_admin_dashboard')
    .select('*')
    .single();
  const metricsRow = metricsRowRaw as unknown as DashboardMetricsRow | null;

  const metrics: AdminDashboardData['metrics'] = {
    total_businesses: Number(metricsRow?.total_businesses || 0),
    active_subscriptions: Number(metricsRow?.active_subscriptions || 0),
    trial_count: Number(metricsRow?.trial_count || 0),
    paid_count: Number(metricsRow?.paid_count || 0),
    at_risk_count: Number(metricsRow?.at_risk_count || 0),
    new_today: Number(metricsRow?.new_today || 0),
    new_7d: Number(metricsRow?.new_7d || 0),
    new_30d: Number(metricsRow?.new_30d || 0),
    mrr: Number(metricsRow?.mrr || 0),
    this_month_paid: Number(metricsRow?.this_month_paid || 0),
    pending_count: Number(metricsRow?.pending_count || 0),
    pending_amount: Number(metricsRow?.pending_amount || 0),
    churn_risk_count: Number(metricsRow?.churn_risk_count || 0),
  };

  const [{ data: growthRowsRaw }, { data: revRowsRaw }] = await Promise.all([
    supabase.from('v_admin_business_growth_12m').select('*'),
    supabase.from('v_admin_mrr_growth_12m').select('*'),
  ]);
  const growthRows = (growthRowsRaw || []) as unknown as GrowthRow[];
  const revRows = (revRowsRaw || []) as unknown as RevenueRow[];

  const trends = {
    businesses: growthRows.map((r) => Number(r.count)),
    revenue: revRows.map((r) => Number(r.revenue)),
  };

  const { data: signupRowsRaw } = await supabase
    .from('v_admin_signups_7d')
    .select('*');
  const signupRows = (signupRowsRaw || []) as unknown as SignupRow[];

  const signups7d = signupRows.map((r) => ({
    day: r.day,
    count: Number(r.count),
    label: r.label_short || '',
  }));

  const { data: auditRowsRaw } = await supabase
    .from('platform_audit_logs')
    .select(
      'id, ts, actor_email, actor_name, is_system, action, target_label, business_id, meta, tone',
    )
    .order('ts', { ascending: false })
    .limit(8);
  const auditRows = (auditRowsRaw || []) as unknown as AuditRow[];

  const businessIds = [
    ...new Set(
      auditRows
        .map((r) => r.business_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  const businessMap = new Map<string, string>();
  if (businessIds.length) {
    const { data: bizRowsRaw } = await supabase
      .from('businesses')
      .select('id, name')
      .in('id', businessIds);
    const bizRows = (bizRowsRaw || []) as unknown as BusinessNameRow[];
    bizRows.forEach((b) => businessMap.set(b.id, b.name));
  }

  type ActivityTone = AdminDashboardData['activity'][number]['tone'];
  const VALID_TONES: ActivityTone[] = [
    'ok', 'warn', 'danger', 'super', 'muted', 'gold', 'olive',
  ];

  const activity: AdminDashboardData['activity'] = auditRows.map((r) => {
    const tone: ActivityTone = VALID_TONES.includes(r.tone as ActivityTone)
      ? (r.tone as ActivityTone)
      : 'muted';
    return {
      id: Number(r.id),
      ts: r.ts,
      age: formatAge(r.ts),
      actor: r.is_system
        ? '[system]'
        : r.actor_name || r.actor_email || 'Bilinmeyen',
      action: r.action,
      target_label: r.target_label,
      business_id: r.business_id,
      business_name: r.business_id
        ? businessMap.get(r.business_id) || null
        : null,
      tone,
      meta: (r.meta || {}) as Record<string, unknown>,
      is_system: !!r.is_system,
    };
  });

  const { data: pendingRowsRaw } = await supabase
    .from('v_admin_pending_payments')
    .select('*')
    .limit(5);
  const pendingRows = (pendingRowsRaw || []) as unknown as PendingRow[];

  const pendingPayments = pendingRows.map((r) => ({
    id: r.id,
    invoice_no: r.invoice_no,
    business_id: r.business_id,
    business_name: r.business_name,
    business_slug: r.business_slug,
    amount: Number(r.amount),
    days_overdue: Number(r.days_overdue || 0),
    logo: r.logo || '?',
  }));

  const { data: cityRowsRaw } = await supabase
    .from('v_admin_city_dist')
    .select('*')
    .limit(15);
  const cityRows = (cityRowsRaw || []) as unknown as CityRow[];

  const cities = cityRows.map((r) => ({
    city: r.city,
    count: Number(r.count),
  }));

  const { data: funnelRowRaw } = await supabase
    .from('v_admin_funnel_30d')
    .select('*')
    .single();
  const funnelRow = funnelRowRaw as unknown as FunnelRow | null;

  const funnel = {
    signups: Number(funnelRow?.signups || 0),
    started_trial: Number(funnelRow?.started_trial || 0),
    converted: Number(funnelRow?.converted || 0),
    churned: Number(funnelRow?.churned || 0),
  };

  const fullName = admin.full_name || user.email?.split('@')[0] || 'Admin';
  const firstName = fullName.split(' ')[0];

  return {
    user: {
      full_name: fullName,
      first_name: firstName,
      email: user.email || '',
    },
    metrics,
    trends,
    signups7d,
    activity,
    pendingPayments,
    cities,
    funnel,
  };
}

// ============================================================
// İstatistikler ekranı
// ============================================================
export type AdminStatsData = {
  metrics: AdminDashboardData['metrics'];
  growth12m: Array<{ month: string; count: number }>;
  revenue12m: Array<{ month: string; revenue: number }>;
  cities: Array<{ city: string; count: number; pct: number }>;
};

export async function getAdminStats(): Promise<AdminStatsData> {
  await requireSuperAdmin();
  const supabase = createClient();

  const [
    { data: mRaw },
    { data: gRaw },
    { data: rRaw },
    { data: cRaw },
  ] = await Promise.all([
    supabase.from('v_admin_dashboard').select('*').single(),
    supabase.from('v_admin_business_growth_12m').select('*'),
    supabase.from('v_admin_mrr_growth_12m').select('*'),
    supabase.from('v_admin_city_dist').select('*'),
  ]);

  const m = mRaw as unknown as DashboardMetricsRow | null;
  const g = (gRaw || []) as unknown as GrowthRow[];
  const r = (rRaw || []) as unknown as RevenueRow[];
  const c = (cRaw || []) as unknown as CityRow[];

  const metrics: AdminStatsData['metrics'] = {
    total_businesses: Number(m?.total_businesses || 0),
    active_subscriptions: Number(m?.active_subscriptions || 0),
    trial_count: Number(m?.trial_count || 0),
    paid_count: Number(m?.paid_count || 0),
    at_risk_count: Number(m?.at_risk_count || 0),
    new_today: Number(m?.new_today || 0),
    new_7d: Number(m?.new_7d || 0),
    new_30d: Number(m?.new_30d || 0),
    mrr: Number(m?.mrr || 0),
    this_month_paid: Number(m?.this_month_paid || 0),
    pending_count: Number(m?.pending_count || 0),
    pending_amount: Number(m?.pending_amount || 0),
    churn_risk_count: Number(m?.churn_risk_count || 0),
  };

  const growth12m = g.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }));
  const revenue12m = r.map((row) => ({
    month: row.month,
    revenue: Number(row.revenue),
  }));

  const totalCities = c.reduce((sum, row) => sum + Number(row.count), 0);
  const cities = c.map((row) => ({
    city: row.city,
    count: Number(row.count),
    pct: totalCities > 0 ? (Number(row.count) / totalCities) * 100 : 0,
  }));

  return { metrics, growth12m, revenue12m, cities };
}
