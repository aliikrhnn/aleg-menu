'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// İzin kontrolü
// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('id, business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { user, businessId: membership.business_id, memberId: membership.id };
}

// ============================================================
// TYPES
// ============================================================

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  balance: number;
  total_charged: number;
  total_paid: number;
  transaction_count: number;
  last_transaction_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerTransaction = {
  id: string;
  business_id: string;
  customer_id: string;
  type: 'charge' | 'payment' | 'manual_charge' | 'manual_credit';
  amount: number;
  order_id: string | null;
  payment_method: string | null;
  payment_log_id: string | null;
  cash_session_id: string | null;
  cashier_id: string | null;
  member_id: string | null;
  note: string | null;
  created_at: string;
  // İlişkili siparişin bilgisi (join'lerden)
  order_info?: {
    order_no: string;
    table_name: string | null;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
    }>;
  } | null;
  cashier_name?: string | null;
};

export type CustomerWithStats = Customer & {
  // İlk hızlı liste için
};

// ============================================================
// LIST CUSTOMERS — sayfalandırılmış liste
// ============================================================
export async function listCustomers(input?: {
  filter?: 'all' | 'debt' | 'zero';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  customers?: CustomerWithStats[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const limit = input?.limit ?? 50;
    const offset = input?.offset ?? 0;

    let query = admin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (input?.filter === 'debt') {
      query = query.lt('balance', 0);
    } else if (input?.filter === 'zero') {
      query = query.eq('balance', 0);
    }

    if (input?.search && input.search.trim()) {
      const s = input.search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data, count, error } = await query
      .order('last_transaction_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      customers: (data || []) as CustomerWithStats[],
      totalCount: count || 0,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// GET CUSTOMER — detay + son transactionlar
// ============================================================
export async function getCustomer(
  customerId: string
): Promise<{
  success: boolean;
  customer?: Customer;
  recentTransactions?: CustomerTransaction[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: customer } = await admin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!customer) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }

    // Son 20 transaction (eski-yeni sıra ters)
    const { data: txs } = await admin
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Order id'leri varsa ürün detaylarını getir
    const orderIds = (txs || [])
      .map((t) => t.order_id)
      .filter(Boolean) as string[];

    const ordersMap = new Map<
      string,
      {
        order_no: string;
        table_name: string | null;
        items: Array<{
          product_name: string;
          quantity: number;
          unit_price: number;
        }>;
      }
    >();

    if (orderIds.length > 0) {
      const { data: orders } = await admin
        .from('orders')
        .select('id, order_no, tables(name)')
        .in('id', orderIds);

      const { data: items } = await admin
        .from('order_items')
        .select('order_id, product_name, quantity, unit_price')
        .in('order_id', orderIds)
        .neq('status', 'cancelled');

      const itemsByOrder = new Map<
        string,
        Array<{ product_name: string; quantity: number; unit_price: number }>
      >();
      (items || []).forEach((it) => {
        const arr = itemsByOrder.get(it.order_id) || [];
        arr.push({
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
        });
        itemsByOrder.set(it.order_id, arr);
      });

      (orders || []).forEach((o) => {
        // tables join: array veya obje olarak gelebilir
        const tableNameRaw = (o as { tables?: unknown }).tables;
        let tableName: string | null = null;
        if (Array.isArray(tableNameRaw) && tableNameRaw[0]) {
          tableName = (tableNameRaw[0] as { name?: string }).name || null;
        } else if (
          tableNameRaw &&
          typeof tableNameRaw === 'object' &&
          'name' in tableNameRaw
        ) {
          tableName =
            (tableNameRaw as { name?: string }).name || null;
        }
        ordersMap.set(o.id, {
          order_no: (o as { order_no: string }).order_no,
          table_name: tableName,
          items: itemsByOrder.get(o.id) || [],
        });
      });
    }

    // Cashier isimleri
    const cashierIds = (txs || [])
      .map((t) => t.cashier_id)
      .filter(Boolean) as string[];
    const cashierMap = new Map<string, string>();
    if (cashierIds.length > 0) {
      const { data: cashiers } = await admin
        .from('cashier_accounts')
        .select('id, name')
        .in('id', cashierIds);
      (cashiers || []).forEach((c) => cashierMap.set(c.id, c.name));
    }

    const recentTransactions: CustomerTransaction[] = ((txs || []) as Array<
      Record<string, unknown> & {
        id: string;
        amount: number | string;
        order_id: string | null;
        cashier_id: string | null;
      }
    >).map((t) => ({
      ...(t as unknown as CustomerTransaction),
      amount: Number(t.amount),
      order_info: t.order_id ? ordersMap.get(t.order_id) || null : null,
      cashier_name: t.cashier_id ? cashierMap.get(t.cashier_id) || null : null,
    }));

    return {
      success: true,
      customer: { ...customer, balance: Number(customer.balance) } as Customer,
      recentTransactions,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// CREATE CUSTOMER
// ============================================================
export async function createCustomer(input: {
  name: string;
  phone?: string;
  email?: string;
  note?: string;
}): Promise<{
  success: boolean;
  customer?: Customer;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.name || !input.name.trim()) {
      return { success: false, error: 'Ad zorunlu' };
    }

    const { data, error } = await admin
      .from('customers')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        note: input.note?.trim() || null,
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/cari-hesaplar');
    return {
      success: true,
      customer: { ...data, balance: Number(data.balance) } as Customer,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// UPDATE CUSTOMER
// ============================================================
export async function updateCustomer(input: {
  customerId: string;
  name?: string;
  phone?: string;
  email?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) {
        return { success: false, error: 'Ad boş olamaz' };
      }
      updates.name = input.name.trim();
    }
    if (input.phone !== undefined) updates.phone = input.phone.trim() || null;
    if (input.email !== undefined) updates.email = input.email.trim() || null;
    if (input.note !== undefined) updates.note = input.note.trim() || null;

    const { error } = await admin
      .from('customers')
      .update(updates)
      .eq('id', input.customerId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/cari-hesaplar');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// DEACTIVATE CUSTOMER (soft delete)
// ============================================================
export async function deactivateCustomer(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { error } = await admin
      .from('customers')
      .update({ is_active: false })
      .eq('id', customerId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/cari-hesaplar');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// GET CUSTOMER TRANSACTIONS — sayfalandırılmış
// ============================================================
export async function getCustomerTransactions(input: {
  customerId: string;
  limit?: number;
  offset?: number;
  type?: 'charge' | 'payment' | 'manual_charge' | 'manual_credit' | 'all';
  fromDate?: string; // ISO date
  toDate?: string;   // ISO date
}): Promise<{
  success: boolean;
  transactions?: CustomerTransaction[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    let q = admin
      .from('customer_transactions')
      .select('*', { count: 'exact' })
      .eq('customer_id', input.customerId)
      .eq('business_id', businessId);

    if (input.type && input.type !== 'all') {
      q = q.eq('type', input.type);
    }
    if (input.fromDate) {
      q = q.gte('created_at', input.fromDate);
    }
    if (input.toDate) {
      q = q.lte('created_at', input.toDate);
    }

    const { data, count, error } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { success: false, error: error.message };

    const txsRaw = (data || []) as Array<{
      id: string;
      amount: number | string;
      order_id: string | null;
      cashier_id: string | null;
      [key: string]: unknown;
    }>;

    // Order detayları
    const orderIds = txsRaw.map((t) => t.order_id).filter(Boolean) as string[];
    const ordersMap = new Map<
      string,
      {
        order_no: string;
        table_name: string | null;
        items: Array<{
          product_name: string;
          quantity: number;
          unit_price: number;
        }>;
      }
    >();

    if (orderIds.length > 0) {
      const { data: orders } = await admin
        .from('orders')
        .select('id, order_no, tables(name)')
        .in('id', orderIds);

      const { data: items } = await admin
        .from('order_items')
        .select('order_id, product_name, quantity, unit_price')
        .in('order_id', orderIds)
        .neq('status', 'cancelled');

      const itemsByOrder = new Map<
        string,
        Array<{ product_name: string; quantity: number; unit_price: number }>
      >();
      (items || []).forEach((it) => {
        const arr = itemsByOrder.get(it.order_id) || [];
        arr.push({
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
        });
        itemsByOrder.set(it.order_id, arr);
      });

      (orders || []).forEach((o) => {
        const tableNameRaw = (o as { tables?: unknown }).tables;
        let tableName: string | null = null;
        if (Array.isArray(tableNameRaw) && tableNameRaw[0]) {
          tableName = (tableNameRaw[0] as { name?: string }).name || null;
        } else if (
          tableNameRaw &&
          typeof tableNameRaw === 'object' &&
          'name' in tableNameRaw
        ) {
          tableName =
            (tableNameRaw as { name?: string }).name || null;
        }
        ordersMap.set(o.id, {
          order_no: (o as { order_no: string }).order_no,
          table_name: tableName,
          items: itemsByOrder.get(o.id) || [],
        });
      });
    }

    // Cashier isimleri
    const cashierIds = txsRaw
      .map((t) => t.cashier_id)
      .filter(Boolean) as string[];
    const cashierMap = new Map<string, string>();
    if (cashierIds.length > 0) {
      const { data: cashiers } = await admin
        .from('cashier_accounts')
        .select('id, name')
        .in('id', cashierIds);
      (cashiers || []).forEach((c) => cashierMap.set(c.id, c.name));
    }

    return {
      success: true,
      transactions: txsRaw.map((t) => ({
        ...(t as unknown as CustomerTransaction),
        amount: Number(t.amount),
        order_info: t.order_id ? ordersMap.get(t.order_id) || null : null,
        cashier_name: t.cashier_id
          ? cashierMap.get(t.cashier_id) || null
          : null,
      })),
      totalCount: count || 0,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// HELPER: customer balance + counters'ı güncelle
// ============================================================
async function recomputeCustomerBalance(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<void> {
  // Tüm transactionları topla
  const { data: txs } = await admin
    .from('customer_transactions')
    .select('type, amount, created_at')
    .eq('customer_id', customerId);

  let balance = 0;
  let totalCharged = 0;
  let totalPaid = 0;
  let lastAt: string | null = null;

  (txs || []).forEach((t) => {
    const amt = Number(t.amount);
    if (t.type === 'charge' || t.type === 'manual_charge') {
      balance -= amt;
      totalCharged += amt;
    } else {
      balance += amt;
      totalPaid += amt;
    }
    if (!lastAt || t.created_at > lastAt) {
      lastAt = t.created_at;
    }
  });

  await admin
    .from('customers')
    .update({
      balance,
      total_charged: totalCharged,
      total_paid: totalPaid,
      transaction_count: txs?.length || 0,
      last_transaction_at: lastAt,
    })
    .eq('id', customerId);
}

// ============================================================
// ADD MANUAL CHARGE — Manuel borç ekle
// ============================================================
export async function addManualCharge(input: {
  customerId: string;
  amount: number;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Geçerli tutar gir' };
    }

    // Kullanıcı güvenliği
    const { data: customer } = await admin
      .from('customers')
      .select('id, business_id, is_active')
      .eq('id', input.customerId)
      .maybeSingle();

    if (!customer || customer.business_id !== businessId) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }
    if (!customer.is_active) {
      return { success: false, error: 'Kullanıcı pasif' };
    }

    const { error } = await admin.from('customer_transactions').insert({
      business_id: businessId,
      customer_id: input.customerId,
      type: 'manual_charge',
      amount: input.amount,
      note: input.note?.trim() || null,
      member_id: memberId,
    });

    if (error) return { success: false, error: error.message };

    await recomputeCustomerBalance(admin, input.customerId);

    revalidatePath('/panel/cari-hesaplar');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ADD MANUAL CREDIT — Manuel alacak (avans/iade)
// ============================================================
export async function addManualCredit(input: {
  customerId: string;
  amount: number;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Geçerli tutar gir' };
    }

    const { data: customer } = await admin
      .from('customers')
      .select('id, business_id, is_active')
      .eq('id', input.customerId)
      .maybeSingle();

    if (!customer || customer.business_id !== businessId) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }
    if (!customer.is_active) {
      return { success: false, error: 'Kullanıcı pasif' };
    }

    const { error } = await admin.from('customer_transactions').insert({
      business_id: businessId,
      customer_id: input.customerId,
      type: 'manual_credit',
      amount: input.amount,
      note: input.note?.trim() || null,
      member_id: memberId,
    });

    if (error) return { success: false, error: error.message };

    await recomputeCustomerBalance(admin, input.customerId);

    revalidatePath('/panel/cari-hesaplar');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// RECORD CUSTOMER PAYMENT — Müşteri ödeme aldı
// (KASA OTURUMU ZORUNLU - payment_logs'a yazılır → gün sonu rapora dahil)
// ============================================================
export async function recordCustomerPayment(input: {
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  cashierId?: string; // PIN ile çalışan kasiyer (opsiyonel - panelden de yapılabilir)
  note?: string;
}): Promise<{
  success: boolean;
  paymentLogId?: string;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Geçerli tutar gir' };
    }

    // Kullanıcı güvenliği
    const { data: customer } = await admin
      .from('customers')
      .select('id, business_id, name, is_active')
      .eq('id', input.customerId)
      .maybeSingle();

    if (!customer || customer.business_id !== businessId) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }
    if (!customer.is_active) {
      return { success: false, error: 'Kullanıcı pasif' };
    }

    // Aktif kasa oturumu BUL — zorunlu
    let cashSessionId: string | null = null;
    let resolvedCashierId: string | null = input.cashierId || null;

    if (input.cashierId) {
      // Kasiyer belirtildi → o kasiyerin açık oturumu
      const { data: session } = await admin
        .from('cash_drawer_sessions')
        .select('id, opened_by_cashier')
        .eq('business_id', businessId)
        .eq('opened_by_cashier', input.cashierId)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        return {
          success: false,
          error: 'Kasiyerin açık oturumu yok. Önce kasayı aç.',
        };
      }
      cashSessionId = session.id;
    } else {
      // Panelden ödeme alma → herhangi bir aktif oturumu kullan
      const { data: session } = await admin
        .from('cash_drawer_sessions')
        .select('id, opened_by_cashier')
        .eq('business_id', businessId)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        return {
          success: false,
          error:
            'Açık kasa oturumu yok. Önce bir kasiyer kasayı açmalı (gün sonu raporu için gerekli).',
        };
      }
      cashSessionId = session.id;
      resolvedCashierId = session.opened_by_cashier;
    }

    // payment_logs'a kayıt — gün sonu raporuna düşer
    const noteText = input.note?.trim()
      ? `Cari ödeme: ${customer.name} — ${input.note.trim()}`
      : `Cari ödeme: ${customer.name}`;

    const { data: paymentLog, error: payErr } = await admin
      .from('payment_logs')
      .insert({
        business_id: businessId,
        order_id: null, // cari ödemenin siparişi yok
        cashier_id: resolvedCashierId,
        cash_session_id: cashSessionId,
        action: 'payment',
        amount: input.amount,
        payment_method: input.paymentMethod,
        note: noteText,
      })
      .select('id')
      .single();

    if (payErr) return { success: false, error: payErr.message };

    // customer_transactions'a payment kaydı
    const { error: txErr } = await admin
      .from('customer_transactions')
      .insert({
        business_id: businessId,
        customer_id: input.customerId,
        type: 'payment',
        amount: input.amount,
        payment_method: input.paymentMethod,
        payment_log_id: paymentLog.id,
        cash_session_id: cashSessionId,
        cashier_id: resolvedCashierId,
        member_id: memberId,
        note: input.note?.trim() || null,
      });

    if (txErr) {
      // payment_log'u silmeye çalış (rollback)
      await admin.from('payment_logs').delete().eq('id', paymentLog.id);
      return { success: false, error: txErr.message };
    }

    await recomputeCustomerBalance(admin, input.customerId);

    revalidatePath('/panel/cari-hesaplar');
    return { success: true, paymentLogId: paymentLog.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// CHARGE CUSTOMER — Sipariş cariye eklendi (Paket 2'de kasada kullanılacak)
// ============================================================
export async function chargeCustomer(input: {
  customerId: string;
  orderId: string;
  amount: number;
  cashierId?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Geçerli tutar gir' };
    }

    // Kullanıcı + sipariş güvenliği
    const { data: customer } = await admin
      .from('customers')
      .select('id, business_id, is_active')
      .eq('id', input.customerId)
      .maybeSingle();

    if (!customer || customer.business_id !== businessId) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }
    if (!customer.is_active) {
      return { success: false, error: 'Kullanıcı pasif' };
    }

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    // Sipariş ile kullanıcıyı bağla
    await admin
      .from('orders')
      .update({ customer_id: input.customerId })
      .eq('id', input.orderId);

    // Charge transaction
    const { error } = await admin.from('customer_transactions').insert({
      business_id: businessId,
      customer_id: input.customerId,
      type: 'charge',
      amount: input.amount,
      order_id: input.orderId,
      cashier_id: input.cashierId || null,
      member_id: memberId,
      note: input.note?.trim() || null,
    });

    if (error) return { success: false, error: error.message };

    await recomputeCustomerBalance(admin, input.customerId);

    revalidatePath('/panel/cari-hesaplar');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}
