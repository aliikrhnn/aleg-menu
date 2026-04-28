'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================

export type BusinessListRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  last_login_at: string | null;
  approved_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  owner_user_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  plan_price: number;
  orders_30d: number;
  logo: string;
  owner_email: string | null;
  owner_name: string | null;
};

export type BusinessDetail = BusinessListRow & {
  // Detay sayfası ek bilgiler
  revenue30d: Array<{ day: string; amount: number }>;
  recentInvoices: Array<{
    id: string;
    invoice_no: string;
    amount: number;
    status: string;
    due_at: string;
    paid_at: string | null;
  }>;
  recentActivity: Array<{
    id: number;
    ts: string;
    age: string;
    actor: string;
    action: string;
    target_label: string | null;
    tone: string;
  }>;
  members: Array<{
    user_id: string;
    full_name: string | null;
    email: string | null;
    role_name: string | null;
    is_owner: boolean;
    last_sign_in_at: string | null;
    status: string;
  }>;
};

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

// Yaş formatı
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

// Audit helper (cast'li çünkü generated types henüz yok)
async function logAudit(
  client: ReturnType<typeof createClient>,
  action: string,
  targetId: string | null,
  targetLabel: string | null,
  businessId: string | null,
  meta: Record<string, unknown>,
  tone: string,
) {
  try {
    await (client.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ error: unknown }>)('log_audit', {
      p_action: action,
      p_target_type: 'business',
      p_target_id: targetId,
      p_target_label: targetLabel,
      p_business_id: businessId,
      p_meta: meta,
      p_tone: tone,
    });
  } catch (e) {
    // Audit hata vermesin — önemli ama uygulama akışını bloklamasın
    console.error('Audit log hatası:', e);
  }
}

// ============================================================
// LISTE
// ============================================================
export async function getBusinessList(opts?: {
  search?: string;
  status?: string;
  planSlug?: string;
  city?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: BusinessListRow[]; total: number }> {
  await requireSuperAdmin();
  const supabase = createClient();

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase.from('v_admin_business_list').select('*', { count: 'exact' });

  if (opts?.search) {
    const s = opts.search.trim();
    query = query.or(
      `name.ilike.%${s}%,slug.ilike.%${s}%,city.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }
  if (opts?.status && opts.status !== 'all') {
    query = query.eq('subscription_status', opts.status);
  }
  if (opts?.planSlug && opts.planSlug !== 'all') {
    query = query.eq('plan_slug', opts.planSlug);
  }
  if (opts?.city && opts.city !== 'all') {
    query = query.eq('city', opts.city);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    items: ((data || []) as unknown as BusinessListRow[]).map((r) => ({
      ...r,
      logo: r.logo || '?',
    })),
    total: count ?? 0,
  };
}

// ============================================================
// DETAY
// ============================================================
export async function getBusinessDetail(id: string): Promise<BusinessDetail | null> {
  await requireSuperAdmin();
  const supabase = createClient();

  // 1) Ana bilgi
  const { data: bizRaw } = await supabase
    .from('v_admin_business_list')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!bizRaw) return null;
  const biz = bizRaw as unknown as BusinessListRow;

  // 2) Revenue 30d
  const { data: revRaw } = await supabase
    .from('v_admin_business_revenue_30d')
    .select('day, amount')
    .eq('business_id', id)
    .order('day', { ascending: true });

  type RevRow = { day: string; amount: number | string };
  const revenue30d = ((revRaw || []) as unknown as RevRow[]).map((r) => ({
    day: r.day,
    amount: Number(r.amount),
  }));

  // 3) Son faturalar
  const { data: invRaw } = await supabase
    .from('platform_invoices')
    .select('id, invoice_no, amount, status, due_at, paid_at')
    .eq('business_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  type InvRow = {
    id: string;
    invoice_no: string;
    amount: number | string;
    status: string;
    due_at: string;
    paid_at: string | null;
  };
  const recentInvoices = ((invRaw || []) as unknown as InvRow[]).map((r) => ({
    id: r.id,
    invoice_no: r.invoice_no,
    amount: Number(r.amount),
    status: r.status,
    due_at: r.due_at,
    paid_at: r.paid_at,
  }));

  // 4) Son aktivite
  const { data: actRaw } = await supabase
    .from('platform_audit_logs')
    .select('id, ts, actor_email, actor_name, is_system, action, target_label, tone')
    .eq('business_id', id)
    .order('ts', { ascending: false })
    .limit(15);

  type ActRow = {
    id: number | string;
    ts: string;
    actor_email: string | null;
    actor_name: string | null;
    is_system: boolean | null;
    action: string;
    target_label: string | null;
    tone: string | null;
  };
  const recentActivity = ((actRaw || []) as unknown as ActRow[]).map((r) => ({
    id: Number(r.id),
    ts: r.ts,
    age: formatAge(r.ts),
    actor: r.is_system
      ? '[system]'
      : r.actor_name || r.actor_email || 'Bilinmeyen',
    action: r.action,
    target_label: r.target_label,
    tone: r.tone || 'muted',
  }));

  // 5) Üyeler
  const { data: memRaw } = await supabase
    .from('v_admin_business_members')
    .select('user_id, full_name, email, role_name, is_owner, last_sign_in_at, status')
    .eq('business_id', id);

  type MemRow = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role_name: string | null;
    is_owner: boolean | null;
    last_sign_in_at: string | null;
    status: string;
  };
  const members = ((memRaw || []) as unknown as MemRow[]).map((r) => ({
    user_id: r.user_id,
    full_name: r.full_name,
    email: r.email,
    role_name: r.role_name,
    is_owner: !!r.is_owner,
    last_sign_in_at: r.last_sign_in_at,
    status: r.status,
  }));

  return {
    ...biz,
    logo: biz.logo || '?',
    revenue30d,
    recentInvoices,
    recentActivity,
    members,
  };
}

// ============================================================
// BEKLEYEN İŞLETMELER
// ============================================================
export async function getPendingBusinesses(): Promise<BusinessListRow[]> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('v_admin_business_list')
    .select('*')
    .eq('subscription_status', 'pending_approval')
    .order('created_at', { ascending: false });

  return ((data || []) as unknown as BusinessListRow[]).map((r) => ({
    ...r,
    logo: r.logo || '?',
  }));
}

// ============================================================
// AKSİYON: Onayla
// ============================================================
export async function approveBusiness(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!biz) return { success: false, error: 'İşletme bulunamadı' };

    const { error } = await admin
      .from('businesses')
      .update({
        subscription_status: 'trial',
        approved_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logAudit(
      supabase,
      'business.approve',
      id,
      biz.name,
      id,
      { trial_days: 14 },
      'ok',
    );

    revalidatePath('/isletmeler');
    revalidatePath('/isletmeler/bekleyen');
    revalidatePath(`/isletmeler/${id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
    return { success: false, error: msg };
  }
}

// ============================================================
// AKSİYON: Askıya al
// ============================================================
export async function suspendBusiness(
  id: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!biz) return { success: false, error: 'İşletme bulunamadı' };

    const { error } = await admin
      .from('businesses')
      .update({
        subscription_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || null,
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logAudit(
      supabase,
      'business.suspend',
      id,
      biz.name,
      id,
      { reason: reason || null },
      'warn',
    );

    revalidatePath('/isletmeler');
    revalidatePath(`/isletmeler/${id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
    return { success: false, error: msg };
  }
}

// ============================================================
// AKSİYON: Geri aç
// ============================================================
export async function restoreBusiness(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name, plan_id')
      .eq('id', id)
      .single();

    if (!biz) return { success: false, error: 'İşletme bulunamadı' };

    // Plan varsa active'e, yoksa trial'a
    const newStatus = biz.plan_id ? 'active' : 'trial';

    const { error } = await admin
      .from('businesses')
      .update({
        subscription_status: newStatus,
        suspended_at: null,
        suspended_reason: null,
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logAudit(
      supabase,
      'business.restore',
      id,
      biz.name,
      id,
      { new_status: newStatus },
      'ok',
    );

    revalidatePath('/isletmeler');
    revalidatePath(`/isletmeler/${id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
    return { success: false, error: msg };
  }
}

// ============================================================
// AKSİYON: Plan değiştir
// ============================================================
export async function updateBusinessPlan(
  id: string,
  planId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name, plan_id')
      .eq('id', id)
      .single();

    if (!biz) return { success: false, error: 'İşletme bulunamadı' };

    const oldPlanId = biz.plan_id;

    const { error } = await admin
      .from('businesses')
      .update({ plan_id: planId })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logAudit(
      supabase,
      'business.plan.change',
      id,
      biz.name,
      id,
      { from_plan_id: oldPlanId, to_plan_id: planId },
      'super',
    );

    revalidatePath('/isletmeler');
    revalidatePath(`/isletmeler/${id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
    return { success: false, error: msg };
  }
}

// ============================================================
// AKSİYON: Bulk — birden fazla işletme askıya al
// ============================================================
export async function bulkSuspendBusinesses(
  ids: string[],
  reason?: string,
): Promise<{ success: boolean; succeeded: number; failed: number }> {
  await requireSuperAdmin();
  let succeeded = 0;
  let failed = 0;

  for (const id of ids) {
    const r = await suspendBusiness(id, reason);
    if (r.success) succeeded++;
    else failed++;
  }

  return { success: failed === 0, succeeded, failed };
}

// ============================================================
// AKSİYON: Bulk — plan değiştir
// ============================================================
export async function bulkChangePlan(
  ids: string[],
  planId: string,
): Promise<{ success: boolean; succeeded: number; failed: number }> {
  await requireSuperAdmin();
  let succeeded = 0;
  let failed = 0;

  for (const id of ids) {
    const r = await updateBusinessPlan(id, planId);
    if (r.success) succeeded++;
    else failed++;
  }

  return { success: failed === 0, succeeded, failed };
}

// ============================================================
// CSV EXPORT
// ============================================================
export async function exportBusinessesCSV(): Promise<string> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('v_admin_business_list')
    .select('*')
    .order('created_at', { ascending: false });

  const items = (data || []) as unknown as BusinessListRow[];

  const headers = [
    'ID',
    'Slug',
    'Ad',
    'Şehir',
    'E-posta',
    'Telefon',
    'Plan',
    'Plan Ücreti',
    'Durum',
    'Sipariş 30g',
    'Son Giriş',
    'Kayıt Tarihi',
  ];
  const rows = items.map((b) => [
    b.id,
    b.slug,
    b.name,
    b.city || '',
    b.email || '',
    b.phone || '',
    b.plan_name || '',
    String(b.plan_price || 0),
    b.subscription_status,
    String(b.orders_30d),
    b.last_login_at || '',
    b.created_at,
  ]);

  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

  const csv =
    '\uFEFF' + // BOM (Excel Türkçe karakter için)
    headers.map(escape).join(',') +
    '\n' +
    rows.map((r) => r.map(escape).join(',')).join('\n');

  return csv;
}

// ============================================================
// PLANLAR (wizard için)
// ============================================================
export async function getPlansForSelection(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    description: string | null;
    features: string[] | null;
  }>
> {
  await requireSuperAdmin();
  const supabase = createClient();

  type PlanRow = {
    id: string;
    name: string;
    slug: string;
    price_monthly: number | string | null;
    description: string | null;
    features: string[] | null;
  };

  const { data } = await supabase
    .from('platform_plans')
    .select('id, name, slug, price_monthly, description, features')
    .order('price_monthly', { ascending: true });

  return ((data || []) as unknown as PlanRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_monthly: Number(p.price_monthly || 0),
    description: p.description,
    features: p.features,
  }));
}

// ============================================================
// ŞEHİR LİSTESİ (filtre dropdown için)
// ============================================================
export async function getCityList(): Promise<string[]> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('businesses')
    .select('city')
    .not('city', 'is', null)
    .order('city');

  type CityRow = { city: string | null };
  const cities = new Set<string>();
  ((data || []) as unknown as CityRow[]).forEach((r) => {
    if (r.city) cities.add(r.city);
  });
  return Array.from(cities).sort((a, b) => a.localeCompare(b, 'tr'));
}
