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
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  paid_at: string | null;
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
    is_complimentary?: boolean;
    complimentary_reason?: string | null;
    options: Array<{
      preset_name: string;
      value_name: string;
      price_delta: number;
    }>;
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
    // Son 2 saatteki ödenmiş siparişler de görünsün (kasiyer "tamam mı" diye bakabilsin)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Aktif = in-process status VEYA delivered ama ödenmemiş
    // Ayrıca: son 2 saatin ödenmiş siparişleri de dahil
    const selectFields = `
      id,
      order_type,
      status,
      payment_status,
      payment_method,
      paid_at,
      table_id,
      customer_name,
      customer_phone,
      note,
      subtotal,
      total,
      created_at,
      tables(name)
    `;

    const [inProcessResp, deliveredUnpaidResp, recentlyPaidResp] = await Promise.all([
      admin
        .from('orders')
        .select(selectFields)
        .eq('business_id', businessId)
        .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way'])
        .gte('created_at', yesterday),
      admin
        .from('orders')
        .select(selectFields)
        .eq('business_id', businessId)
        .eq('status', 'delivered')
        .not('payment_status', 'in', '(paid,refunded)')
        .gte('created_at', yesterday),
      // Son 2 saatteki ödenmiş siparişler (hızlı satış dahil)
      admin
        .from('orders')
        .select(selectFields)
        .eq('business_id', businessId)
        .eq('payment_status', 'paid')
        .gte('paid_at', twoHoursAgo),
    ]);

    if (inProcessResp.error || deliveredUnpaidResp.error || recentlyPaidResp.error) {
      const error = inProcessResp.error || deliveredUnpaidResp.error || recentlyPaidResp.error;
      console.error('getActiveOrders error:', error);
      return { success: false, error: error!.message };
    }

    // Birleştir + dedup + kronolojik sırala (en yeni önce)
    const ordersMap = new Map<string, NonNullable<typeof inProcessResp.data>[number]>();
    (inProcessResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    (deliveredUnpaidResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    (recentlyPaidResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    const orders = Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (!orders || orders.length === 0) {
      return { success: true, orders: [], businessId };
    }

    // Sipariş kalemlerini ayrı sorgu (1 sorguda daha verimli)
    const orderIds = orders.map((o) => o.id);
    const { data: items } = await admin
      .from('order_items')
      .select('id, order_id, product_name, quantity, unit_price, note, options, is_complimentary, complimentary_reason')
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
        is_complimentary: item.is_complimentary || false,
        complimentary_reason: item.complimentary_reason || null,
        options: Array.isArray(item.options)
          ? (item.options as Array<{
              preset_name: string;
              value_name: string;
              price_delta: number;
            }>)
          : [],
      });
    });

    const formatted: ActiveOrder[] = orders.map((o) => {
      const tableData = Array.isArray(o.tables) ? o.tables[0] : o.tables;
      return {
        id: o.id,
        order_no: o.id.slice(0, 8).toUpperCase(),
        order_type: o.order_type as ActiveOrder['order_type'],
        status: o.status as ActiveOrder['status'],
        payment_status: (o.payment_status as ActiveOrder['payment_status']) || 'pending',
        payment_method: o.payment_method || null,
        paid_at: o.paid_at || null,
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
