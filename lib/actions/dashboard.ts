'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// Types
// ============================================================

export type DashboardData = {
  business: {
    id: string;
    name: string;
    slug: string;
    subscription_status: string | null;
    plan_name: string | null;
    created_at: string;
    days_since_creation: number;
    product_count: number;
    table_count: number;
  };
  user: {
    full_name: string;
    first_name: string;
  };
  today: {
    revenue: number;
    order_count: number;
    avg_basket: number;
    first_order_at: string | null;
    // Dünle kıyas
    revenue_change_pct: number; // -50 ile 999 arası
    order_change_pct: number;
  };
  month: {
    revenue: number;
    order_count: number;
  };
  // Bugünün saat saat ciro dizisi (0-23)
  hourly: Array<{ hour: number; revenue: number; count: number }>;
  peakHour: { hour: number; revenue: number; count: number } | null;
  // Bugünün popüler ürünleri
  topProducts: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    revenue: number;
  }>;
  // Şu anki canlı durum
  live: {
    activeOrders: number; // received + confirmed + preparing + ready + on_way
    newOrders: number; // received
    preparingOrders: number; // confirmed + preparing
    readyOrders: number; // ready + on_way
    occupiedTables: number;
    pendingWaiterCalls: number;
  };
  // Son 7 günün günlük cirosu/sipariş sayısı (sparkline için, en eski → en yeni)
  last7Days: Array<{
    date: string; // YYYY-MM-DD
    revenue: number;
    count: number;
    isToday: boolean;
  }>;
  // Son değerlendirme (varsa)
  latestReview: {
    id: string;
    rating: number;
    comment: string | null;
    customer_name: string | null;
    created_at: string;
    is_replied: boolean;
  } | null;
};

// ============================================================
// Helper: iş günü Türkiye saatiyle başlangıç/bitiş (00:00-23:59)
// ============================================================

function turkeyDayRange(daysAgo: number = 0): { from: string; to: string } {
  const now = new Date();
  // Türkiye UTC+3 → yerel günü UTC'ye çevir
  const turkeyOffsetMs = 3 * 60 * 60 * 1000;
  const turkeyNow = new Date(now.getTime() + turkeyOffsetMs);
  const y = turkeyNow.getUTCFullYear();
  const m = turkeyNow.getUTCMonth();
  const d = turkeyNow.getUTCDate() - daysAgo;
  // Gün başı: 00:00 Türkiye = 21:00 UTC önceki gün
  const from = new Date(Date.UTC(y, m, d, 0, 0, 0) - turkeyOffsetMs);
  const to = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - turkeyOffsetMs);
  return { from: from.toISOString(), to: to.toISOString() };
}

function monthStartIso(): string {
  const now = new Date();
  const turkeyOffsetMs = 3 * 60 * 60 * 1000;
  const turkeyNow = new Date(now.getTime() + turkeyOffsetMs);
  const y = turkeyNow.getUTCFullYear();
  const m = turkeyNow.getUTCMonth();
  return new Date(Date.UTC(y, m, 1, 0, 0, 0) - turkeyOffsetMs).toISOString();
}

function pctChange(now: number, prev: number): number {
  if (prev === 0) return now > 0 ? 999 : 0;
  return Math.round(((now - prev) / prev) * 100);
}

// ============================================================
// Main
// ============================================================

export async function getDashboardData(): Promise<{
  success: boolean;
  data?: DashboardData;
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
      .select('business_id, full_name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) return { success: false, error: 'İşletme bulunamadı' };

    const admin = createAdminClient();
    const businessId = membership.business_id as string;

    // ============== Paralel sorgular ==============
    const todayRange = turkeyDayRange(0);
    const yesterdayRange = turkeyDayRange(1);
    const monthStart = monthStartIso();
    // Son 7 günün başlangıcı (bugün dahil) — sparkline için
    const sevenDaysAgo = turkeyDayRange(6).from;

    const [
      businessRes,
      planCountsRes,
      todayOrdersRes,
      yesterdayOrdersRes,
      monthOrdersRes,
      liveOrdersRes,
      tablesRes,
      waiterCallsRes,
      latestReviewRes,
      last7DaysRes,
    ] = await Promise.all([
      // İşletme bilgisi
      admin.from('businesses').select('*').eq('id', businessId).maybeSingle(),
      // Ürün ve masa sayıları
      Promise.all([
        admin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId),
        admin
          .from('tables')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId),
      ]),
      // Bugünün siparişleri (detaylı)
      admin
        .from('orders')
        .select('id, total, created_at, status, items:order_items(product_id, product_name, quantity, unit_price)')
        .eq('business_id', businessId)
        .gte('created_at', todayRange.from)
        .lte('created_at', todayRange.to)
        .neq('status', 'cancelled'),
      // Dünün siparişleri (özet)
      admin
        .from('orders')
        .select('total')
        .eq('business_id', businessId)
        .gte('created_at', yesterdayRange.from)
        .lte('created_at', yesterdayRange.to)
        .neq('status', 'cancelled'),
      // Bu ayın siparişleri (özet)
      admin
        .from('orders')
        .select('total')
        .eq('business_id', businessId)
        .gte('created_at', monthStart)
        .neq('status', 'cancelled'),
      // Aktif siparişler (status-based sayım)
      admin
        .from('orders')
        .select('id, status')
        .eq('business_id', businessId)
        .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way']),
      // Dolu masalar
      admin
        .from('tables')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'occupied'),
      // Bekleyen garson çağrıları
      admin
        .from('waiter_calls')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'pending'),
      // Son değerlendirme
      admin
        .from('reviews')
        .select('id, rating, comment, customer_name, created_at, reply_text')
        .eq('business_id', businessId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Son 7 günün siparişleri (sparkline için)
      admin
        .from('orders')
        .select('total, created_at')
        .eq('business_id', businessId)
        .gte('created_at', sevenDaysAgo)
        .neq('status', 'cancelled'),
    ]);

    const business = businessRes.data;
    if (!business) return { success: false, error: 'İşletme verisi alınamadı' };

    const [productCountRes, tableCountRes] = planCountsRes;
    const productCount = productCountRes.count || 0;
    const tableCount = tableCountRes.count || 0;

    // Plan adı
    let planName: string | null = null;
    if (business.plan_id) {
      const { data: plan } = await admin
        .from('platform_plans')
        .select('name')
        .eq('id', business.plan_id as string)
        .maybeSingle();
      planName = (plan?.name as string) || null;
    }

    // Bugünün özeti
    const todayOrders = todayOrdersRes.data || [];
    const todayRevenue = todayOrders.reduce(
      (s, o) => s + parseFloat(String(o.total || 0)),
      0
    );
    const todayCount = todayOrders.length;
    const avgBasket = todayCount > 0 ? todayRevenue / todayCount : 0;
    const firstOrderAt =
      todayOrders.length > 0
        ? todayOrders
            .slice()
            .sort((a, b) =>
              String(a.created_at).localeCompare(String(b.created_at))
            )[0].created_at
        : null;

    // Dünün özeti
    const yesterdayOrders = yesterdayOrdersRes.data || [];
    const yesterdayRevenue = yesterdayOrders.reduce(
      (s, o) => s + parseFloat(String(o.total || 0)),
      0
    );
    const yesterdayCount = yesterdayOrders.length;

    // Bu ay özeti
    const monthOrders = monthOrdersRes.data || [];
    const monthRevenue = monthOrders.reduce(
      (s, o) => s + parseFloat(String(o.total || 0)),
      0
    );

    // Saatlik dağılım (bugün, 0-23)
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      revenue: 0,
      count: 0,
    }));
    todayOrders.forEach((o) => {
      const dt = new Date(o.created_at as string);
      // Türkiye saatine çevir
      const trHour = (dt.getUTCHours() + 3) % 24;
      hourly[trHour].revenue += parseFloat(String(o.total || 0));
      hourly[trHour].count += 1;
    });

    const peakHour =
      hourly.reduce((max, h) => (h.count > max.count ? h : max), hourly[0])
        .count > 0
        ? hourly.reduce((max, h) => (h.count > max.count ? h : max), hourly[0])
        : null;

    // Popüler ürünler (bugün) - order_items.product_name snapshot kullanılıyor (her zaman string)
    const productMap = new Map<
      string,
      { quantity: number; revenue: number; product_id: string; product_name: string }
    >();
    todayOrders.forEach((o) => {
      const items = (o.items as unknown as Array<{
        product_id: string | null;
        product_name: string;
        quantity: number;
        unit_price: number;
      }>) || [];
      items.forEach((it) => {
        // product_id null olabilir (silinmiş ürün) → product_name'i key yap
        const key = it.product_id || `name:${it.product_name || 'unknown'}`;
        const existing = productMap.get(key) || {
          quantity: 0,
          revenue: 0,
          product_id: it.product_id || '',
          product_name: it.product_name || 'Silinmiş ürün',
        };
        existing.quantity += it.quantity || 0;
        existing.revenue += (it.quantity || 0) * parseFloat(String(it.unit_price || 0));
        productMap.set(key, existing);
      });
    });

    const topProducts = Array.from(productMap.values())
      .map((p) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        quantity: p.quantity,
        revenue: p.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Canlı durum
    const liveOrders = liveOrdersRes.data || [];
    const live = {
      activeOrders: liveOrders.length,
      newOrders: liveOrders.filter((o) => o.status === 'received').length,
      preparingOrders: liveOrders.filter(
        (o) => o.status === 'confirmed' || o.status === 'preparing'
      ).length,
      readyOrders: liveOrders.filter(
        (o) => o.status === 'ready' || o.status === 'on_way'
      ).length,
      occupiedTables: tablesRes.count || 0,
      pendingWaiterCalls: waiterCallsRes.count || 0,
    };

    // Son değerlendirme
    const lr = latestReviewRes.data;
    const latestReview = lr
      ? {
          id: lr.id as string,
          rating: lr.rating as number,
          comment: (lr.comment as string) || null,
          customer_name: (lr.customer_name as string) || null,
          created_at: lr.created_at as string,
          is_replied: !!lr.reply_text,
        }
      : null;

    // Son 7 günün günlük cirosu — sparkline için
    // Türkiye saatine göre günü belirle, en eski → en yeni
    const last7DaysOrders = last7DaysRes.data || [];
    const dayBuckets = new Map<string, { revenue: number; count: number }>();
    // 7 günlük slotları önceden 0'la
    const todayTr = new Date(Date.now() + 3 * 60 * 60 * 1000); // UTC+3
    const todayKey = `${todayTr.getUTCFullYear()}-${String(todayTr.getUTCMonth() + 1).padStart(2, '0')}-${String(todayTr.getUTCDate()).padStart(2, '0')}`;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayTr.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      dayBuckets.set(key, { revenue: 0, count: 0 });
    }
    last7DaysOrders.forEach((o) => {
      const dt = new Date(o.created_at as string);
      const trDate = new Date(dt.getTime() + 3 * 60 * 60 * 1000);
      const key = `${trDate.getUTCFullYear()}-${String(trDate.getUTCMonth() + 1).padStart(2, '0')}-${String(trDate.getUTCDate()).padStart(2, '0')}`;
      const bucket = dayBuckets.get(key);
      if (bucket) {
        bucket.revenue += parseFloat(String(o.total || 0));
        bucket.count += 1;
      }
    });
    const last7Days = Array.from(dayBuckets.entries()).map(([date, v]) => ({
      date,
      revenue: v.revenue,
      count: v.count,
      isToday: date === todayKey,
    }));

    const fullName = (membership.full_name as string) || 'dostum';
    const firstName = fullName.split(' ')[0];

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(business.created_at as string).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const data: DashboardData = {
      business: {
        id: business.id as string,
        name: business.name as string,
        slug: business.slug as string,
        subscription_status:
          (business.subscription_status as string) || null,
        plan_name: planName,
        created_at: business.created_at as string,
        days_since_creation: daysSinceCreation,
        product_count: productCount,
        table_count: tableCount,
      },
      user: {
        full_name: fullName,
        first_name: firstName,
      },
      today: {
        revenue: todayRevenue,
        order_count: todayCount,
        avg_basket: avgBasket,
        first_order_at: firstOrderAt as string | null,
        revenue_change_pct: pctChange(todayRevenue, yesterdayRevenue),
        order_change_pct: pctChange(todayCount, yesterdayCount),
      },
      month: {
        revenue: monthRevenue,
        order_count: monthOrders.length,
      },
      hourly,
      peakHour,
      topProducts,
      live,
      last7Days,
      latestReview,
    };

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
