'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type WaiterOrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  note: string | null;
  station_id: string | null;
  station_name: string | null;
  station_icon: string | null;
  station_color: string | null;
};

export type WaiterOrder = {
  id: string;
  business_id: string;
  table_id: string | null;
  table_name?: string | null;
  total: number;
  source: string;
  order_type: string;
  status: string;
  payment_status: string;
  created_at: string;
  ready_at?: string | null;
  items: WaiterOrderItem[];
};

export type ReadyOrder = {
  id: string;
  business_id: string;
  table_id: string | null;
  table_name?: string | null;
  total: number;
  source: string;
  order_type: string; // 'dinein' | 'pickup' | 'delivery'
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

  // Panel oturumu yoksa cashier cookie + subdomain dene (yeni subdomain rotaları için)
  if (!user) {
    const { tryCashierFallback } = await import('@/lib/security/auth-context');
    const fallback = await tryCashierFallback();
    if (fallback) {
      return { businessId: fallback.businessId };
    }
    throw new Error('Giriş yapmamışsınız');
  }

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
      .select('id, business_id, table_id, total, source, order_type, created_at, status, updated_at')
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
        order_type: oo.order_type || 'dinein',
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
 * Garson - tüm aktif siparişler (received, confirmed, preparing, ready)
 * Her sipariş için: kalemler + her kalemin istasyon bilgisi
 */
export async function getAllActiveOrders(): Promise<{
  success: boolean;
  orders?: WaiterOrder[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Son 24 saatteki aktif siparişler
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: ordersData, error } = await admin
      .from('orders')
      .select(
        'id, business_id, table_id, total, source, order_type, status, payment_status, created_at, updated_at'
      )
      .eq('business_id', businessId)
      .in('status', ['received', 'confirmed', 'preparing', 'ready'])
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const orders = ((ordersData || []) as unknown[]).map((o) => {
      const oo = o as WaiterOrder & { updated_at: string };
      return {
        id: oo.id,
        business_id: oo.business_id,
        table_id: oo.table_id,
        total: Number(oo.total),
        source: oo.source,
        order_type: oo.order_type || 'dinein',
        status: oo.status,
        payment_status: oo.payment_status,
        created_at: oo.created_at,
        ready_at: oo.status === 'ready' ? oo.updated_at : null,
        items: [] as WaiterOrderItem[],
      } as WaiterOrder;
    });

    if (orders.length === 0) {
      return { success: true, orders: [] };
    }

    const orderIds = orders.map((o) => o.id);

    // 1) Kalemler + product_id
    const { data: itemsData } = await admin
      .from('order_items')
      .select('id, order_id, product_id, product_name, quantity, note')
      .in('order_id', orderIds);

    const items = (itemsData || []) as Array<{
      id: string;
      order_id: string;
      product_id: string | null;
      product_name: string;
      quantity: number;
      note: string | null;
    }>;

    // 2) Ürünlerin istasyon bilgisini topluca çek
    const productIds = Array.from(
      new Set(items.map((i) => i.product_id).filter((id): id is string => !!id))
    );

    const stationByProduct = new Map<
      string,
      {
        station_id: string | null;
        station_name: string | null;
        station_icon: string | null;
        station_color: string | null;
      }
    >();

    if (productIds.length > 0) {
      const { data: productsData } = await admin
        .from('products')
        .select('id, station_id, stations(id, name, icon, color)')
        .in('id', productIds);

      ((productsData || []) as unknown[]).forEach((p) => {
        const pp = p as {
          id: string;
          station_id: string | null;
          stations: { id: string; name: string; icon: string; color: string } | null;
        };
        stationByProduct.set(pp.id, {
          station_id: pp.station_id,
          station_name: pp.stations?.name || null,
          station_icon: pp.stations?.icon || null,
          station_color: pp.stations?.color || null,
        });
      });
    }

    // Kalemleri sipariş bazında topla
    const itemsByOrder = new Map<string, WaiterOrderItem[]>();
    items.forEach((it) => {
      const stationInfo = it.product_id
        ? stationByProduct.get(it.product_id) || {
            station_id: null,
            station_name: null,
            station_icon: null,
            station_color: null,
          }
        : {
            station_id: null,
            station_name: null,
            station_icon: null,
            station_color: null,
          };

      if (!itemsByOrder.has(it.order_id)) {
        itemsByOrder.set(it.order_id, []);
      }
      itemsByOrder.get(it.order_id)!.push({
        id: it.id,
        product_name: it.product_name,
        quantity: it.quantity,
        note: it.note,
        ...stationInfo,
      });
    });

    orders.forEach((o) => {
      o.items = itemsByOrder.get(o.id) || [];
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
 * Garson siparişi teslim etti - status: ready/preparing → delivered
 *
 * Yoğun saatlerde mutfak "hazır"a basmadan da müşteriye gidebilir.
 * Bu yüzden 'preparing' siparişleri de teslim edilebilir kabul edilir.
 * Sadece received/cancelled/delivered/closed olanlar reddedilir.
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
    // Hem 'ready' hem 'preparing' siparişler teslim edilebilir
    // ('confirmed' nadir bir aşama; o da kabul edilir)
    if (
      order.status !== 'ready' &&
      order.status !== 'preparing' &&
      order.status !== 'confirmed'
    ) {
      return {
        success: false,
        error: 'Bu sipariş artık teslim edilemez',
      };
    }

    const { error } = await admin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);

    if (error) return { success: false, error: error.message };

    // Panel POS ve dashboard'lar değişikliği görsün
    revalidatePath('/panel/pos');
    revalidatePath('/panel/dashboard');
    revalidatePath('/panel');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
