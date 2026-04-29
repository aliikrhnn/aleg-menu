'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string[] | Record<string, unknown> | null;
  max_branches: number | null;
  max_products: number | null;
  max_team_members: number | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type PlanWithStats = PlanRow & {
  active_count: number;
  trial_count: number;
  total_count: number;
  mrr_contribution: number;
};

export type InvoiceRow = {
  id: string;
  invoice_no: string;
  business_id: string;
  business_name: string | null;
  business_slug: string | null;
  business_logo: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  period_start: string;
  period_end: string;
  due_at: string;
  paid_at: string | null;
  retry_count: number;
  notes: string | null;
  created_at: string;
  days_overdue: number;
  due_soon: boolean;
};

export type PaymentRow = {
  id: string;
  invoice_id: string | null;
  business_id: string;
  business_name: string | null;
  business_slug: string | null;
  business_logo: string | null;
  invoice_no: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
  recorded_by_email: string | null;
};

export type BillingMetrics = {
  collected_this_month: number;
  payment_count_this_month: number;
  collected_last_month: number;
  mom_change_pct: number | null;
  pending_count: number;
  pending_amount: number;
  overdue_count: number;
  overdue_amount: number;
  failed_count: number;
};

export type MonthlyPayment = {
  month_start: string;
  month_label: string;
  amount: number;
  payment_count: number;
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
      p_target_type: action.split('.')[0],
      p_target_id: targetId,
      p_target_label: targetLabel,
      p_business_id: businessId,
      p_meta: meta,
      p_tone: tone,
    });
  } catch (e) {
    console.error('Audit log hatası:', e);
  }
}

// ============================================================
// PLANS
// ============================================================

export async function getPlansWithStats(): Promise<PlanWithStats[]> {
  await requireSuperAdmin();
  const supabase = createClient();

  const [{ data: plansRaw }, { data: statsRaw }] = await Promise.all([
    supabase
      .from('platform_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('price_monthly', { ascending: true }),
    supabase.from('v_admin_plan_subscriber_count').select('*'),
  ]);

  type StatRow = {
    plan_id: string;
    active_count: number;
    trial_count: number;
    total_count: number;
    mrr_contribution: number | string;
  };

  const stats = ((statsRaw || []) as unknown as StatRow[]).reduce<
    Record<string, StatRow>
  >((acc, r) => {
    acc[r.plan_id] = r;
    return acc;
  }, {});

  return ((plansRaw || []) as unknown as PlanRow[]).map((p) => {
    const s = stats[p.id];
    return {
      ...p,
      price_monthly: p.price_monthly !== null ? Number(p.price_monthly) : null,
      price_yearly: p.price_yearly !== null ? Number(p.price_yearly) : null,
      active_count: s?.active_count ?? 0,
      trial_count: s?.trial_count ?? 0,
      total_count: s?.total_count ?? 0,
      mrr_contribution: Number(s?.mrr_contribution ?? 0),
    };
  });
}

export async function getPlan(id: string): Promise<PlanRow | null> {
  await requireSuperAdmin();
  const supabase = createClient();
  const { data } = await supabase
    .from('platform_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const p = data as unknown as PlanRow;
  return {
    ...p,
    price_monthly: p.price_monthly !== null ? Number(p.price_monthly) : null,
    price_yearly: p.price_yearly !== null ? Number(p.price_yearly) : null,
  };
}

export type PlanInput = {
  slug: string;
  name: string;
  description?: string;
  price_monthly?: number | null;
  price_yearly?: number | null;
  features?: string[];
  max_branches?: number | null;
  max_products?: number | null;
  max_team_members?: number | null;
  active?: boolean;
  sort_order?: number;
};

export async function createPlan(
  input: PlanInput,
): Promise<{ success: boolean; error?: string; plan_id?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    if (!input.name || input.name.length < 2)
      return { success: false, error: 'Plan adı en az 2 karakter olmalı' };
    if (!input.slug || input.slug.length < 2)
      return { success: false, error: 'Plan slug en az 2 karakter olmalı' };
    if (!/^[a-z0-9-]+$/.test(input.slug))
      return { success: false, error: 'Slug sadece küçük harf, rakam ve - olabilir' };

    // Slug çakışıyor mu
    const { data: existing } = await admin
      .from('platform_plans')
      .select('id')
      .eq('slug', input.slug)
      .maybeSingle();
    if (existing) return { success: false, error: `"${input.slug}" slug'ı zaten kullanılıyor` };

    const { data, error } = await admin
      .from('platform_plans')
      .insert({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        price_monthly: input.price_monthly ?? null,
        price_yearly: input.price_yearly ?? null,
        features: input.features ?? [],
        max_branches: input.max_branches ?? null,
        max_products: input.max_products ?? null,
        max_team_members: input.max_team_members ?? null,
        active: input.active ?? true,
        sort_order: input.sort_order ?? 0,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message };

    await logAudit(
      supabase,
      'plan.create',
      data.id,
      input.name,
      null,
      { slug: input.slug, price: input.price_monthly },
      'super',
    );

    revalidatePath('/planlar');
    return { success: true, plan_id: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

export async function updatePlan(
  id: string,
  input: Partial<PlanInput>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    const { data: oldPlan } = await admin
      .from('platform_plans')
      .select('name, slug')
      .eq('id', id)
      .single();

    if (!oldPlan) return { success: false, error: 'Plan bulunamadı' };

    if (input.slug && input.slug !== oldPlan.slug) {
      if (!/^[a-z0-9-]+$/.test(input.slug))
        return { success: false, error: 'Slug sadece küçük harf, rakam ve - olabilir' };
      const { data: clash } = await admin
        .from('platform_plans')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', id)
        .maybeSingle();
      if (clash) return { success: false, error: `"${input.slug}" slug'ı zaten kullanılıyor` };
    }

    const updateData: Record<string, unknown> = {};
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price_monthly !== undefined) updateData.price_monthly = input.price_monthly;
    if (input.price_yearly !== undefined) updateData.price_yearly = input.price_yearly;
    if (input.features !== undefined) updateData.features = input.features;
    if (input.max_branches !== undefined) updateData.max_branches = input.max_branches;
    if (input.max_products !== undefined) updateData.max_products = input.max_products;
    if (input.max_team_members !== undefined) updateData.max_team_members = input.max_team_members;
    if (input.active !== undefined) updateData.active = input.active;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

    const { error } = await admin
      .from('platform_plans')
      .update(updateData)
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logAudit(
      supabase,
      'plan.update',
      id,
      oldPlan.name,
      null,
      { fields: Object.keys(updateData) },
      'super',
    );

    revalidatePath('/planlar');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

export async function archivePlan(id: string): Promise<{ success: boolean; error?: string }> {
  return updatePlan(id, { active: false });
}

export async function restorePlan(id: string): Promise<{ success: boolean; error?: string }> {
  return updatePlan(id, { active: true });
}

export async function reorderPlans(
  ids: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();

    for (let i = 0; i < ids.length; i++) {
      await admin
        .from('platform_plans')
        .update({ sort_order: i })
        .eq('id', ids[i]);
    }

    revalidatePath('/planlar');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

// ============================================================
// INVOICES
// ============================================================

export async function getInvoiceList(opts?: {
  search?: string;
  status?: string;
  businessId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: InvoiceRow[]; total: number }> {
  await requireSuperAdmin();
  const supabase = createClient();

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from('v_admin_invoices_list')
    .select('*', { count: 'exact' });

  if (opts?.search) {
    const s = opts.search.trim();
    query = query.or(
      `invoice_no.ilike.%${s}%,business_name.ilike.%${s}%,business_slug.ilike.%${s}%`,
    );
  }
  if (opts?.status && opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }
  if (opts?.businessId) {
    query = query.eq('business_id', opts.businessId);
  }
  if (opts?.fromDate) {
    query = query.gte('created_at', opts.fromDate);
  }
  if (opts?.toDate) {
    query = query.lte('created_at', opts.toDate);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const items = ((data || []) as unknown as InvoiceRow[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));

  return { items, total: count ?? 0 };
}

export async function getInvoiceDetail(
  id: string,
): Promise<{ invoice: InvoiceRow; payments: PaymentRow[] } | null> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data: invRaw } = await supabase
    .from('v_admin_invoices_list')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!invRaw) return null;

  const invoice = invRaw as unknown as InvoiceRow;
  invoice.amount = Number(invoice.amount);

  const { data: payRaw } = await supabase
    .from('v_admin_payments_list')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false });

  const payments = ((payRaw || []) as unknown as PaymentRow[]).map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));

  return { invoice, payments };
}

export async function markInvoicePaid(
  id: string,
  paymentMethod: string = 'manual',
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inv } = await admin
      .from('platform_invoices')
      .select('id, invoice_no, business_id, amount, status')
      .eq('id', id)
      .single();

    if (!inv) return { success: false, error: 'Fatura bulunamadı' };
    if (inv.status === 'paid') return { success: false, error: 'Fatura zaten ödenmiş' };

    const now = new Date().toISOString();

    // 1) Invoice'ı paid yap
    const { error: invErr } = await admin
      .from('platform_invoices')
      .update({ status: 'paid', payment_method: paymentMethod, paid_at: now })
      .eq('id', id);

    if (invErr) return { success: false, error: invErr.message };

    // 2) platform_payments kaydı oluştur
    const { error: payErr } = await admin
      .from('platform_payments')
      .insert({
        invoice_id: id,
        business_id: inv.business_id,
        amount: inv.amount,
        currency: 'TRY',
        payment_method: paymentMethod,
        status: 'succeeded',
        paid_at: now,
        recorded_by: user?.id || null,
        notes: notes || null,
      });

    if (payErr) {
      // Invoice'ı geri al
      await admin
        .from('platform_invoices')
        .update({ status: inv.status, paid_at: null })
        .eq('id', id);
      return { success: false, error: `Ödeme kaydı hatası: ${payErr.message}` };
    }

    await logAudit(
      supabase,
      'invoice.mark_paid',
      id,
      inv.invoice_no,
      inv.business_id,
      { amount: inv.amount, method: paymentMethod },
      'ok',
    );

    revalidatePath('/faturalar');
    revalidatePath(`/faturalar/${id}`);
    revalidatePath('/odemeler');
    revalidatePath('/odemeler/bekleyen');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

export async function cancelInvoice(
  id: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    const { data: inv } = await admin
      .from('platform_invoices')
      .select('id, invoice_no, business_id, status')
      .eq('id', id)
      .single();

    if (!inv) return { success: false, error: 'Fatura bulunamadı' };

    const newNotes = reason ? `[İptal sebebi] ${reason}` : null;

    const { error } = await admin
      .from('platform_invoices')
      .update({ status: 'cancelled', notes: newNotes })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logAudit(
      supabase,
      'invoice.cancel',
      id,
      inv.invoice_no,
      inv.business_id,
      { reason: reason || null },
      'warn',
    );

    revalidatePath('/faturalar');
    revalidatePath(`/faturalar/${id}`);
    revalidatePath('/odemeler/bekleyen');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

export async function bulkSendReminder(
  ids: string[],
): Promise<{ success: boolean; succeeded: number }> {
  await requireSuperAdmin();
  const supabase = createClient();

  // Şimdilik gerçek e-posta yok — sadece audit log + retry_count++
  const admin = createAdminClient();

  for (const id of ids) {
    const { data: inv } = await admin
      .from('platform_invoices')
      .select('id, invoice_no, business_id, retry_count')
      .eq('id', id)
      .single();

    if (!inv) continue;

    await admin
      .from('platform_invoices')
      .update({ retry_count: (inv.retry_count || 0) + 1 })
      .eq('id', id);

    await logAudit(
      supabase,
      'invoice.reminder_sent',
      id,
      inv.invoice_no,
      inv.business_id,
      { retry_count: (inv.retry_count || 0) + 1 },
      'super',
    );
  }

  revalidatePath('/faturalar');
  revalidatePath('/odemeler/bekleyen');
  return { success: true, succeeded: ids.length };
}

export async function exportInvoicesCSV(): Promise<string> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('v_admin_invoices_list')
    .select('*')
    .order('created_at', { ascending: false });

  const items = (data || []) as unknown as InvoiceRow[];

  const headers = [
    'Fatura No',
    'İşletme',
    'Tutar',
    'Para Birimi',
    'Durum',
    'Dönem Başı',
    'Dönem Sonu',
    'Vade',
    'Ödeme Tarihi',
    'Yöntem',
    'Tekrar Sayısı',
    'Oluşturulma',
  ];
  const rows = items.map((i) => [
    i.invoice_no,
    i.business_name || '',
    String(i.amount),
    i.currency,
    i.status,
    i.period_start,
    i.period_end,
    i.due_at,
    i.paid_at || '',
    i.payment_method || '',
    String(i.retry_count),
    i.created_at,
  ]);

  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return (
    '\uFEFF' +
    headers.map(escape).join(',') +
    '\n' +
    rows.map((r) => r.map(escape).join(',')).join('\n')
  );
}

// ============================================================
// PENDING INVOICES
// ============================================================

export async function getPendingInvoices(): Promise<{
  overdue: InvoiceRow[];
  dueSoon: InvoiceRow[];
  upcoming: InvoiceRow[];
}> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('v_admin_pending_invoices')
    .select('*');

  const items = ((data || []) as unknown as InvoiceRow[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));

  const overdue = items.filter((i) => i.days_overdue > 0);
  const dueSoon = items.filter((i) => i.days_overdue === 0 && i.due_soon);
  const upcoming = items.filter((i) => i.days_overdue === 0 && !i.due_soon);

  return { overdue, dueSoon, upcoming };
}

// ============================================================
// PAYMENTS
// ============================================================

export async function getPaymentsList(opts?: {
  search?: string;
  method?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: PaymentRow[]; total: number }> {
  await requireSuperAdmin();
  const supabase = createClient();

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from('v_admin_payments_list')
    .select('*', { count: 'exact' });

  if (opts?.search) {
    const s = opts.search.trim();
    query = query.or(
      `business_name.ilike.%${s}%,invoice_no.ilike.%${s}%,transaction_id.ilike.%${s}%`,
    );
  }
  if (opts?.method && opts.method !== 'all') {
    query = query.eq('payment_method', opts.method);
  }
  if (opts?.status && opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }
  if (opts?.fromDate) {
    query = query.gte('paid_at', opts.fromDate);
  }
  if (opts?.toDate) {
    query = query.lte('paid_at', opts.toDate);
  }

  query = query.order('paid_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const items = ((data || []) as unknown as PaymentRow[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));

  return { items, total: count ?? 0 };
}

export async function recordManualPayment(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paidAt?: string;
  transactionId?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; payment_id?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inv } = await admin
      .from('platform_invoices')
      .select('id, invoice_no, business_id, amount, status, currency')
      .eq('id', input.invoiceId)
      .single();

    if (!inv) return { success: false, error: 'Fatura bulunamadı' };

    const { data, error } = await admin
      .from('platform_payments')
      .insert({
        invoice_id: input.invoiceId,
        business_id: inv.business_id,
        amount: input.amount,
        currency: inv.currency || 'TRY',
        payment_method: input.paymentMethod,
        status: 'succeeded',
        transaction_id: input.transactionId || null,
        paid_at: input.paidAt || new Date().toISOString(),
        recorded_by: user?.id || null,
        notes: input.notes || null,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message };

    // Tutar tam ödendiyse invoice'ı paid yap
    if (input.amount >= Number(inv.amount) && inv.status !== 'paid') {
      await admin
        .from('platform_invoices')
        .update({
          status: 'paid',
          payment_method: input.paymentMethod,
          paid_at: input.paidAt || new Date().toISOString(),
        })
        .eq('id', input.invoiceId);
    }

    await logAudit(
      supabase,
      'payment.record_manual',
      data.id,
      inv.invoice_no,
      inv.business_id,
      { amount: input.amount, method: input.paymentMethod },
      'ok',
    );

    revalidatePath('/odemeler');
    revalidatePath('/faturalar');
    revalidatePath(`/faturalar/${input.invoiceId}`);
    return { success: true, payment_id: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

// ============================================================
// METRICS
// ============================================================

export async function getBillingMetrics(): Promise<BillingMetrics> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('v_admin_billing_metrics')
    .select('*')
    .maybeSingle();

  const m = (data || {}) as Partial<BillingMetrics>;
  return {
    collected_this_month: Number(m.collected_this_month || 0),
    payment_count_this_month: Number(m.payment_count_this_month || 0),
    collected_last_month: Number(m.collected_last_month || 0),
    mom_change_pct: m.mom_change_pct !== null && m.mom_change_pct !== undefined
      ? Number(m.mom_change_pct)
      : null,
    pending_count: Number(m.pending_count || 0),
    pending_amount: Number(m.pending_amount || 0),
    overdue_count: Number(m.overdue_count || 0),
    overdue_amount: Number(m.overdue_amount || 0),
    failed_count: Number(m.failed_count || 0),
  };
}

export async function getPaymentsMonthly(): Promise<MonthlyPayment[]> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('v_admin_payments_monthly')
    .select('*')
    .order('month_start', { ascending: true });

  return ((data || []) as unknown as MonthlyPayment[]).map((m) => ({
    ...m,
    amount: Number(m.amount),
  }));
}

// ============================================================
// FATURA OLUŞTUR (manuel — test ve gerçek senaryolar için)
// ============================================================
export async function createManualInvoice(input: {
  businessId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  invoiceNo?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; invoice_id?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();
    const supabase = createClient();

    // Fatura no üret
    const invoiceNo =
      input.invoiceNo ||
      `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const { data, error } = await admin
      .from('platform_invoices')
      .insert({
        business_id: input.businessId,
        invoice_no: invoiceNo,
        amount: input.amount,
        currency: 'TRY',
        status: 'pending',
        period_start: input.periodStart,
        period_end: input.periodEnd,
        due_at: input.dueAt,
        notes: input.notes || null,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message };

    await logAudit(
      supabase,
      'invoice.create',
      data.id,
      invoiceNo,
      input.businessId,
      { amount: input.amount },
      'super',
    );

    revalidatePath('/faturalar');
    revalidatePath('/odemeler/bekleyen');
    return { success: true, invoice_id: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Bir hata oluştu' };
  }
}

export async function getBusinessOptions(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  await requireSuperAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .order('name');

  return ((data || []) as unknown as Array<{ id: string; name: string; slug: string }>);
}
