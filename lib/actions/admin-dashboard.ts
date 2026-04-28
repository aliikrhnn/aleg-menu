'use server';

import { createClient } from '@/lib/supabase/server';

// ============================================================
// Types
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
  // Trend dizileri (son 12 ay)
  trends: {
    businesses: number[];
    revenue: number[];
  };
  // Son 7 gün signup grafiği
  signups7d: Array<{ day: string; count: number; label: string }>;
  // Aktivite akışı (son 8)
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
  // Bekleyen ödemeler (en kritik 5)
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
  // Şehir dağılımı (TurkiyeMap için)
  cities: Array<{ city: string; count: number }>;
  // Funnel (30 gün)
  funnel: {
    signups: number;
    started_trial: number;
    converted: number;
    churned: number;
  };
};

// ============================================================
// Helper — yaş formatı: "12dk", "2sa", "Dün", "3g"
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

  // 1) Ana metric'ler — view'dan tek satır
  const { data: metricsRow } = await supabase
    .from('v_admin_dashboard')
    .select('*')
    .single();

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

  // 2) Trend serileri (12 ay)
  const [{ data: growthRows }, { data: revRows }] = await Promise.all([
    supabase.from('v_admin_business_growth_12m').select('*'),
    supabase.from('v_admin_mrr_growth_12m').select('*'),
  ]);

  const trends = {
    businesses: (growthRows || []).map((r: any) => Number(r.count)),
    revenue: (revRows || []).map((r: any) => Number(r.revenue)),
  };

  // 3) 7 gün signup grafiği
  const { data: signupRows } = await supabase
    .from('v_admin_signups_7d')
    .select('*');

  const signups7d = (signupRows || []).map((r: any) => ({
    day: r.day,
    count: Number(r.count),
    label: r.label_short || '',
  }));

  // 4) Activity feed
  const { data: auditRows } = await supabase
    .from('platform_audit_logs')
    .select('id, ts, actor_email, actor_name, is_system, action, target_label, business_id, meta, tone')
    .order('ts', { ascending: false })
    .limit(8);

  // İşletme adlarını ayrı çekelim (eğer business_id varsa)
  const businessIds = [
    ...new Set(
      (auditRows || [])
        .map((r: any) => r.business_id)
        .filter((id: string | null) => !!id),
    ),
  ];
  const businessMap = new Map<string, string>();
  if (businessIds.length) {
    const { data: bizRows } = await supabase
      .from('businesses')
      .select('id, name')
      .in('id', businessIds);
    bizRows?.forEach((b: any) => businessMap.set(b.id, b.name));
  }

  const activity = (auditRows || []).map((r: any) => ({
    id: Number(r.id),
    ts: r.ts,
    age: formatAge(r.ts),
    actor: r.is_system ? '[system]' : r.actor_name || r.actor_email || 'Bilinmeyen',
    action: r.action,
    target_label: r.target_label,
    business_id: r.business_id,
    business_name: r.business_id ? businessMap.get(r.business_id) || null : null,
    tone: (r.tone || 'muted') as AdminDashboardData['activity'][number]['tone'],
    meta: r.meta || {},
    is_system: !!r.is_system,
  }));

  // 5) Bekleyen ödemeler (en eski 5)
  const { data: pendingRows } = await supabase
    .from('v_admin_pending_payments')
    .select('*')
    .limit(5);

  const pendingPayments = (pendingRows || []).map((r: any) => ({
    id: r.id,
    invoice_no: r.invoice_no,
    business_id: r.business_id,
    business_name: r.business_name,
    business_slug: r.business_slug,
    amount: Number(r.amount),
    days_overdue: Number(r.days_overdue || 0),
    logo: r.logo || '?',
  }));

  // 6) Şehir dağılımı
  const { data: cityRows } = await supabase
    .from('v_admin_city_dist')
    .select('*')
    .limit(15);

  const cities = (cityRows || []).map((r: any) => ({
    city: r.city,
    count: Number(r.count),
  }));

  // 7) Funnel (30g)
  const { data: funnelRow } = await supabase
    .from('v_admin_funnel_30d')
    .select('*')
    .single();

  const funnel = {
    signups: Number(funnelRow?.signups || 0),
    started_trial: Number(funnelRow?.started_trial || 0),
    converted: Number(funnelRow?.converted || 0),
    churned: Number(funnelRow?.churned || 0),
  };

  // İsim/eposta
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
// İstatistikler ekranı — daha geniş veri
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

  const [{ data: m }, { data: g }, { data: r }, { data: c }] = await Promise.all(
    [
      supabase.from('v_admin_dashboard').select('*').single(),
      supabase.from('v_admin_business_growth_12m').select('*'),
      supabase.from('v_admin_mrr_growth_12m').select('*'),
      supabase.from('v_admin_city_dist').select('*'),
    ],
  );

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

  const growth12m = (g || []).map((row: any) => ({
    month: row.month,
    count: Number(row.count),
  }));
  const revenue12m = (r || []).map((row: any) => ({
    month: row.month,
    revenue: Number(row.revenue),
  }));

  const totalCities = (c || []).reduce(
    (sum: number, row: any) => sum + Number(row.count),
    0,
  );
  const cities = (c || []).map((row: any) => ({
    city: row.city,
    count: Number(row.count),
    pct: totalCities > 0 ? (Number(row.count) / totalCities) * 100 : 0,
  }));

  return { metrics, growth12m, revenue12m, cities };
}

// ============================================================
// Login as business (impersonate) — destek için kritik
// ============================================================
export async function startImpersonation(businessId: string): Promise<{
  redirectTo: string;
}> {
  const { user } = await requireSuperAdmin();
  const supabase = createClient();

  // İşletmeyi al
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('id', businessId)
    .single();

  if (!biz) throw new Error('İşletme bulunamadı');

  // Audit log'a kaydet
  await supabase.rpc('log_audit', {
    p_action: 'admin.impersonate',
    p_target_type: 'business',
    p_target_id: businessId,
    p_target_label: biz.name,
    p_business_id: businessId,
    p_meta: { admin_email: user.email, slug: biz.slug },
    p_tone: 'super',
  });

  // İşletmenin paneline yönlendir (gerçek impersonation token üretimi
  // sonraki paketin işi — şimdilik sadece slug'a yönlendiriyoruz)
  return {
    redirectTo: `/panel?_imp=${biz.id}`,
  };
}
