'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// İzin kontrolü — oturum açmış işletme üyesi mi?
// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Giriş yapmamışsınız');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    throw new Error('İşletme üyeliği bulunamadı');
  }

  return { supabase, user, businessId: membership.business_id };
}

// ============================================================
// Aktif siparişleri getir (son 24 saat, tamamlanmamış)
// ============================================================

export type ActiveOrder = {
  id: string;
  order_no: string; // id'nin ilk 8 karakteri
  order_type: 'dine_in' | 'pickup' | 'delivery';
  status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'on_way' | 'delivered' | 'cancelled';
  table_id: string | null;
  table_label: string | null; // masa adı, join ile gelir
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
  subtotal: number;
  total: number;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    note: string | null;
  }>;
};

export async function getActiveOrders(): Promise<{
  success: boolean;
  orders?: ActiveOrder[];
  businessId?: string;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Son 24 saat + tamamlanmamış siparişler
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await admin
      .from('orders')
      .select(
        `
        id,
        order_type,
        status,
        table_id,
        customer_name,
        customer_phone,
        note,
        subtotal,
        total,
        created_at,
        tables(name)
      `
      )
      .eq('business_id', businessId)
      .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way'])
      .gte('created_at', yesterday)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getActiveOrders error:', error);
      return { success: false, error: error.message };
    }

    if (!orders || orders.length === 0) {
      return { success: true, orders: [], businessId };
    }

    // Sipariş kalemlerini ayrı sorgu (1 sorguda daha verimli)
    const orderIds = orders.map((o) => o.id);
    const { data: items } = await admin
      .from('order_items')
      .select('id, order_id, product_name, quantity, unit_price, note')
      .in('order_id', orderIds);

    // Kalemleri sipariş bazında grupla
    const itemsByOrder = new Map<string, ActiveOrder['items']>();
    (items || []).forEach((item) => {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id)!.push({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        note: item.note,
      });
    });

    const formatted: ActiveOrder[] = orders.map((o) => {
      const tableData = Array.isArray(o.tables) ? o.tables[0] : o.tables;
      return {
        id: o.id,
        order_no: o.id.slice(0, 8).toUpperCase(),
        order_type: o.order_type as ActiveOrder['order_type'],
        status: o.status as ActiveOrder['status'],
        table_id: o.table_id,
        table_label: tableData?.name || null,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        note: o.note,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        created_at: o.created_at,
        items: itemsByOrder.get(o.id) || [],
      };
    });

    return { success: true, orders: formatted, businessId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Sipariş durumunu güncelle
// ============================================================

type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'ready' | 'on_way' | 'delivered' | 'cancelled';

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Önce siparişin bu işletmeye ait olduğunu doğrula (güvenlik)
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    // Durumu güncelle
    const { error } = await admin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/pos');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Sipariş iptal et
// ============================================================

export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    const { error } = await admin
      .from('orders')
      .update({
        status: 'cancelled',
        note: reason ? `[İptal sebebi: ${reason}]` : undefined,
      })
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/pos');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
