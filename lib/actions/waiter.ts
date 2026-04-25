'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ReadyOrder = {
  id: string;
  business_id: string;
  table_id: string | null;
  table_name?: string | null;
  total: number;
  source: string;
  created_at: string;
  ready_at?: string | null;
  status: string;
  item_count: number;
};

// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { businessId: membership.business_id };
}

/**
 * Mutfaktan hazır olarak çıkmış, henüz teslim edilmemiş siparişler
 */
export async function getReadyOrders(): Promise<{
  success: boolean;
  orders?: ReadyOrder[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('orders')
      .select('id, business_id, table_id, total, source, created_at, status, updated_at')
      .eq('business_id', businessId)
      .eq('status', 'ready')
      .order('updated_at', { ascending: true }); // ilk hazırlanan ilk teslim edilsin

    if (error) return { success: false, error: error.message };

    const orders = ((data || []) as unknown[]).map((o) => {
      const oo = o as ReadyOrder & { updated_at: string };
      return {
        id: oo.id,
        business_id: oo.business_id,
        table_id: oo.table_id,
        total: oo.total,
        source: oo.source,
        created_at: oo.created_at,
        ready_at: oo.updated_at,
        status: oo.status,
        item_count: 0,
      } as ReadyOrder;
    });

    if (orders.length === 0) {
      return { success: true, orders: [] };
    }

    // Item sayılarını çek (tek query)
    const orderIds = orders.map((o) => o.id);
    const { data: items } = await admin
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', orderIds);

    const itemCountMap = new Map<string, number>();
    ((items || []) as unknown[]).forEach((it) => {
      const i = it as { order_id: string; quantity: number };
      itemCountMap.set(i.order_id, (itemCountMap.get(i.order_id) || 0) + i.quantity);
    });
    orders.forEach((o) => {
      o.item_count = itemCountMap.get(o.id) || 0;
    });

    // Masa adlarını topla
    const tableIds = orders
      .map((o) => o.table_id)
      .filter((id): id is string => !!id);

    if (tableIds.length > 0) {
      const { data: tables } = await admin
        .from('tables')
        .select('id, name')
        .in('id', tableIds);

      const tableMap = new Map<string, string>();
      ((tables || []) as unknown[]).forEach((t) => {
        const tt = t as { id: string; name: string };
        tableMap.set(tt.id, tt.name);
      });

      orders.forEach((o) => {
        if (o.table_id) o.table_name = tableMap.get(o.table_id) || null;
      });
    }

    return { success: true, orders };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Garson siparişi teslim etti - status: ready → delivered
 */
export async function markOrderDelivered(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }
    if (order.status !== 'ready') {
      return {
        success: false,
        error: 'Sipariş hazır durumda değil',
      };
    }

    const { error } = await admin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
