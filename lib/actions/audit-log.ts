'use server';

/**
 * Audit log helper.
 *
 * Server action'lar içinde kullanılır:
 *   await logAction({
 *     businessId,
 *     orderId,
 *     action: 'item_cancelled',
 *     details: { itemName: 'am suyu', amount: 300 },
 *     performedBy: memberId,
 *   });
 *
 * Hata olursa SESSİZCE geçer (audit log eksikliği business akışını
 * kesmez — log yazılamadıysa konsola düşer ama operasyon devam eder).
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'order_created'
  | 'order_status_changed'
  | 'item_added'
  | 'item_removed'
  | 'item_quantity_changed'
  | 'item_cancelled'
  | 'item_complimentary'
  | 'item_status_changed'
  | 'note_changed'
  | 'discount_applied'
  | 'tip_applied'
  | 'table_moved'
  | 'tables_merged'
  | 'tables_split'
  | 'order_cancelled'
  | 'split_payment_started';

export type AuditLogInput = {
  businessId: string;
  orderId?: string | null;
  tableId?: string | null;
  action: AuditAction;
  details?: Record<string, unknown>;
  performedBy?: string | null;
  performedByName?: string | null;
  performedByRole?: string | null;
};

/**
 * Audit log kaydı oluşturur. Hata olursa konsola düşer ve true/false döner.
 * Çağıran action akışını kesmez.
 */
export async function logAction(input: AuditLogInput): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('order_logs').insert({
      business_id: input.businessId,
      order_id: input.orderId || null,
      table_id: input.tableId || null,
      action: input.action,
      details: input.details || {},
      performed_by: input.performedBy || null,
      performed_by_name: input.performedByName || null,
      performed_by_role: input.performedByRole || null,
      performed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[audit-log] insert failed:', error.message, input);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[audit-log] exception:', err, input);
    return false;
  }
}

/**
 * Performer bilgilerini bir kerede çek (member_id ve session bilgisinden).
 * Action içinde businessAccess çekildikten sonra performer bilgisi gerekir.
 */
export async function fetchPerformerInfo(
  memberId: string | null
): Promise<{
  performedBy: string | null;
  performedByName: string | null;
  performedByRole: string | null;
}> {
  if (!memberId) {
    return {
      performedBy: null,
      performedByName: null,
      performedByRole: null,
    };
  }
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('business_members')
      .select('id, full_name, role_id, roles(slug)')
      .eq('id', memberId)
      .maybeSingle();
    const roleData = data?.roles as { slug?: string } | { slug?: string }[] | null;
    const roleSlug = Array.isArray(roleData)
      ? roleData[0]?.slug
      : roleData?.slug;
    return {
      performedBy: memberId,
      performedByName: data?.full_name || null,
      performedByRole: roleSlug || null,
    };
  } catch {
    return {
      performedBy: memberId,
      performedByName: null,
      performedByRole: null,
    };
  }
}

// ============================================================
// Query: Audit log listesi
// ============================================================
export type OrderLogRow = {
  id: string;
  business_id: string;
  order_id: string | null;
  table_id: string | null;
  action: AuditAction;
  details: Record<string, unknown>;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  performed_at: string;
  // join'lerden
  table_name?: string | null;
};

export async function getOrderLogs(input?: {
  startDate?: string; // ISO
  endDate?: string; // ISO
  action?: AuditAction;
  performerId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  logs?: OrderLogRow[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Giriş yapmamışsınız' };

    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) return { success: false, error: 'Yetkisiz erişim' };

    const admin = createAdminClient();
    let query = admin
      .from('order_logs')
      .select('*, tables(name)')
      .eq('business_id', membership.business_id)
      .order('performed_at', { ascending: false })
      .limit(input?.limit || 200);

    if (input?.startDate) {
      query = query.gte('performed_at', input.startDate);
    }
    if (input?.endDate) {
      query = query.lte('performed_at', input.endDate);
    }
    if (input?.action) {
      query = query.eq('action', input.action);
    }
    if (input?.performerId) {
      query = query.eq('performed_by', input.performerId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const logs: OrderLogRow[] = (data || []).map((row) => {
      const tableData = row.tables as { name?: string } | { name?: string }[] | null;
      const tableName = Array.isArray(tableData)
        ? tableData[0]?.name
        : tableData?.name;
      return {
        id: row.id,
        business_id: row.business_id,
        order_id: row.order_id,
        table_id: row.table_id,
        action: row.action,
        details: row.details || {},
        performed_by: row.performed_by,
        performed_by_name: row.performed_by_name,
        performed_by_role: row.performed_by_role,
        performed_at: row.performed_at,
        table_name: tableName || null,
      };
    });

    return { success: true, logs };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Özet: Bir günde kim ne kadar iptal/ikram etti?
// ============================================================
export type AuditSummaryRow = {
  performed_by: string;
  performed_by_name: string | null;
  performed_by_role: string | null;
  cancellations: number;
  cancellation_amount: number;
  complimentaries: number;
  complimentary_amount: number;
  discounts: number;
  discount_amount: number;
};

export async function getAuditSummary(input: {
  startDate: string;
  endDate: string;
}): Promise<{
  success: boolean;
  rows?: AuditSummaryRow[];
  error?: string;
}> {
  try {
    const result = await getOrderLogs({
      startDate: input.startDate,
      endDate: input.endDate,
      limit: 5000,
    });
    if (!result.success || !result.logs) {
      return { success: false, error: result.error };
    }

    const map = new Map<string, AuditSummaryRow>();
    for (const log of result.logs) {
      const key = log.performed_by || 'system';
      if (!map.has(key)) {
        map.set(key, {
          performed_by: key,
          performed_by_name: log.performed_by_name,
          performed_by_role: log.performed_by_role,
          cancellations: 0,
          cancellation_amount: 0,
          complimentaries: 0,
          complimentary_amount: 0,
          discounts: 0,
          discount_amount: 0,
        });
      }
      const row = map.get(key)!;
      const amount = Number(log.details.amount || 0);
      if (log.action === 'item_cancelled') {
        row.cancellations += 1;
        row.cancellation_amount += amount;
      } else if (log.action === 'item_complimentary') {
        row.complimentaries += 1;
        row.complimentary_amount += amount;
      } else if (log.action === 'discount_applied') {
        row.discounts += 1;
        row.discount_amount += amount;
      }
    }

    const rows = Array.from(map.values()).sort(
      (a, b) =>
        b.cancellation_amount +
        b.complimentary_amount -
        (a.cancellation_amount + a.complimentary_amount)
    );

    return { success: true, rows };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
