'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// KDS (Mutfak Ekranı) - Server Actions
// ============================================================
// Mutfak çalışanı için özelleştirilmiş veri:
// - Sadece mutfağı ilgilendiren durumlar (received, preparing)
// - Ödeme/fiyat bilgisi yok
// - Tek aksiyon: "Başla" (received→preparing) veya "Hazır" (preparing→ready)
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
// Mutfak siparişlerini getir
// ============================================================

export type KitchenOrder = {
  id: string;
  order_no: string; // id'nin ilk 8 karakteri
  status: 'received' | 'preparing' | 'ready';
  order_type: 'dine_in' | 'pickup' | 'delivery';
  table_label: string | null;
  customer_name: string | null;
  note: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    note: string | null;
    station_id: string | null;
    options: Array<{
      preset_name: string;
      value_name: string;
      price_delta: number;
    }>;
  }>;
};

export type KitchenStation = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
};

export async function getKitchenOrders(): Promise<{
  success: boolean;
  orders?: KitchenOrder[];
  stations?: KitchenStation[];
  businessId?: string;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Son 12 saat (mutfakta eski siparişler anlamsız — fazla süre ekranı karıştırır)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await admin
      .from('orders')
      .select(
        `
        id,
        order_type,
        status,
        table_id,
        customer_name,
        note,
        created_at,
        tables(name)
      `
      )
      .eq('business_id', businessId)
      .in('status', ['received', 'preparing'])
      .gte('created_at', twelveHoursAgo)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // İstasyonları her zaman çek — sipariş olmasa bile sayfa açılabilmeli
    const { data: stationsData } = await admin
      .from('stations')
      .select('id, name, slug, icon, color, sort_order')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const stationsList: KitchenStation[] = (stationsData || []).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      slug: (s.slug as string) || (s.id as string).slice(0, 8),
      icon: (s.icon as string) || '●',
      color: (s.color as string) || '#C4553A',
    }));

    if (!orders || orders.length === 0) {
      return {
        success: true,
        orders: [],
        stations: stationsList,
        businessId,
      };
    }

    const orderIds = orders.map((o) => o.id);
    const { data: items } = await admin
      .from('order_items')
      .select('id, order_id, product_id, product_name, quantity, note, options')
      .in('order_id', orderIds);

    // Ürünlerin station_id'lerini çek
    const productIds = [
      ...new Set((items || []).map((i) => i.product_id).filter(Boolean)),
    ] as string[];

    const { data: products } = productIds.length
      ? await admin
          .from('products')
          .select('id, station_id')
          .in('id', productIds)
      : { data: [] };

    const productStationMap = new Map<string, string | null>();
    (products || []).forEach((p) => {
      productStationMap.set(p.id, (p.station_id as string | null) || null);
    });

    const itemsByOrder = new Map<string, KitchenOrder['items']>();
    (items || []).forEach((item) => {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id)!.push({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        note: item.note,
        station_id: item.product_id
          ? productStationMap.get(item.product_id) || null
          : null,
        options: Array.isArray(item.options)
          ? (item.options as Array<{
              preset_name: string;
              value_name: string;
              price_delta: number;
            }>)
          : [],
      });
    });

    const formatted: KitchenOrder[] = orders.map((o) => {
      const tableData = Array.isArray(o.tables) ? o.tables[0] : o.tables;
      return {
        id: o.id,
        order_no: o.id.slice(0, 8).toUpperCase(),
        status: o.status as KitchenOrder['status'],
        order_type: o.order_type as KitchenOrder['order_type'],
        table_label: tableData?.name || null,
        customer_name: o.customer_name,
        note: o.note,
        created_at: o.created_at,
        items: itemsByOrder.get(o.id) || [],
      };
    });

    return { success: true, orders: formatted, stations: stationsList, businessId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Sipariş durumunu mutfak tarafından ilerlet
// received → preparing (Başla)
// preparing → ready (Hazır)
// ============================================================

export async function advanceKitchenOrder(
  orderId: string
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Güvenlik: sipariş bu işletmeye ait mi?
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    // Sadece received veya preparing'ten ilerlet
    let newStatus: 'preparing' | 'ready';
    if (order.status === 'received') {
      newStatus = 'preparing';
    } else if (order.status === 'preparing') {
      newStatus = 'ready';
    } else {
      return { success: false, error: 'Bu sipariş zaten hazırlanmış' };
    }

    const { error } = await admin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, newStatus };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
