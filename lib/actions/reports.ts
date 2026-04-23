'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// Types
// ============================================================

export type DailySummary = {
  revenue: number;
  order_count: number;
  avg_basket: number;
};

export type DailyDelta = {
  today: DailySummary;
  yesterday: DailySummary;
  week: DailySummary;
  month: DailySummary;
  revenue_change_pct: number; // bugün vs dün
  order_change_pct: number; // bugün vs dün
};

export type TopProduct = {
  product_id: string;
  product_name: string;
  quantity: number;
  revenue: number;
  share_pct: number;
};

export type HourlyHeatmap = {
  // [weekday 0-6 (Mon=0)][hour 0-23] = sipariş sayısı
  grid: number[][];
  max: number;
  // Yeni: ortalama bir günün saatlik dağılımı (24 sayı - toplam / 30 gün)
  hourlyAvg: number[];
  // 3 peak: sabah (5-11), öğle (11-17), akşam (17-23)
  peaks: {
    morning: { hour: number; count: number };
    afternoon: { hour: number; count: number };
    evening: { hour: number; count: number };
  };
};

export type OrderTypeBreakdown = {
  dine_in: { count: number; revenue: number };
  pickup: { count: number; revenue: number };
  delivery: { count: number; revenue: number };
};

export type StationBreakdown = Array<{
  station_id: string | null;
  station_name: string;
  station_icon: string;
  station_color: string;
  item_count: number;
  revenue: number;
  share_pct: number;
}>;

export type BestDay = {
  weekday: string; // Pazartesi, Salı, ...
  avg_revenue: number;
  avg_orders: number;
  reason?: string;
};

export type ReportsData = {
  range: {
    from: string; // ISO date
    to: string; // ISO date
    preset: 'today' | 'yesterday' | 'week' | 'month' | 'last7' | 'last30' | 'custom';
    days: number;
  };
  summary: DailyDelta;
  topProducts: TopProduct[];
  heatmap: HourlyHeatmap;
  orderTypes: OrderTypeBreakdown;
  stationBreakdown: StationBreakdown;
  bestDay: BestDay;
};

// ============================================================
// Helper
// ============================================================

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

// ============================================================
// İşletme erişim kontrolü
// ============================================================

async function requireBusinessAccess(): Promise<{ businessId: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

// Preset tarih aralıkları için helper
function computeRange(
  preset: 'today' | 'yesterday' | 'week' | 'month' | 'last7' | 'last30' | 'custom',
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date; days: number } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (preset) {
    case 'today':
      return { from: todayStart, to: tomorrow, days: 1 };
    case 'yesterday': {
      const yest = new Date(todayStart);
      yest.setDate(yest.getDate() - 1);
      return { from: yest, to: todayStart, days: 1 };
    }
    case 'week': {
      // Bu hafta (Pazartesi başlangıç)
      const weekStart = new Date(todayStart);
      const wd = (todayStart.getDay() + 6) % 7; // Pzt=0
      weekStart.setDate(weekStart.getDate() - wd);
      return { from: weekStart, to: tomorrow, days: wd + 1 };
    }
    case 'month': {
      // Bu ay (ayın 1'inden bugüne)
      const monthStart = new Date(
        todayStart.getFullYear(),
        todayStart.getMonth(),
        1
      );
      const days =
        Math.floor((tomorrow.getTime() - monthStart.getTime()) / 86400000);
      return { from: monthStart, to: tomorrow, days };
    }
    case 'last7': {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 6);
      return { from, to: tomorrow, days: 7 };
    }
    case 'last30': {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 29);
      return { from, to: tomorrow, days: 30 };
    }
    case 'custom': {
      const from = customFrom ? new Date(customFrom) : todayStart;
      const to = customTo ? new Date(customTo) : tomorrow;
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      const days = Math.max(
        1,
        Math.floor((to.getTime() - from.getTime()) / 86400000) + 1
      );
      return { from, to, days };
    }
  }
}

// ============================================================
// Ana rapor fetcher
// ============================================================

export async function getReportsData(
  preset: 'today' | 'yesterday' | 'week' | 'month' | 'last7' | 'last30' | 'custom' = 'last30',
  customFrom?: string,
  customTo?: string
): Promise<{
  success: boolean;
  data?: ReportsData;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Seçilen aralık
    const { from, to, days } = computeRange(preset, customFrom, customTo);

    // "Bugün vs dün" delta için son 30 gün her zaman lazım (dün kıyası)
    // Ama ana rapor seçilen aralığa göre
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    // Hangi tarih aralığı kullanılacak? En erken olanı fetch edelim
    const fetchFrom = from < monthAgo ? from : monthAgo;

    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, total, order_type, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', fetchFrom.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (ordersError) {
      return { success: false, error: ordersError.message };
    }

    const allOrders = orders || [];

    // Seçilen aralığa göre filtrelenmiş siparişler (ana rapor için)
    const orderList = allOrders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= from && d < to;
    });

    // Tüm sipariş ID'leri (sadece seçilen aralık)
    const orderIds = orderList.map((o) => o.id);

    // Kalemler - station_id de çekiyoruz
    const { data: items } = orderIds.length
      ? await admin
          .from('order_items')
          .select('order_id, product_id, product_name, quantity, unit_price, station_id')
          .in('order_id', orderIds)
      : { data: [] };

    const itemList = items || [];

    // İstasyonlar (breakdown için)
    const { data: stationsData } = await admin
      .from('stations')
      .select('id, name, icon, color')
      .eq('business_id', businessId);

    const stationMap = new Map<string, { name: string; icon: string; color: string }>();
    (stationsData || []).forEach((s) => {
      stationMap.set(s.id as string, {
        name: s.name as string,
        icon: (s.icon as string) || '●',
        color: (s.color as string) || '#C4553A',
      });
    });

    // ============ 1. ÖZET (Bugün/Dün/Hafta/Ay) - DAİMA bugünkü verilere göre ============
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6); // son 7 gün
    const monthStart = monthAgo;

    function summarize(fromD: Date, toD: Date): DailySummary {
      const filtered = allOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= fromD && d < toD;
      });
      const revenue = filtered.reduce((s, o) => s + Number(o.total), 0);
      const order_count = filtered.length;
      return {
        revenue,
        order_count,
        avg_basket: order_count > 0 ? revenue / order_count : 0,
      };
    }

    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const today = summarize(todayStart, tomorrow);
    const yesterday = summarize(yesterdayStart, todayStart);
    const week = summarize(weekStart, tomorrow);
    const month = summarize(monthStart, tomorrow);

    const revenue_change_pct =
      yesterday.revenue > 0
        ? ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100
        : 0;
    const order_change_pct =
      yesterday.order_count > 0
        ? ((today.order_count - yesterday.order_count) / yesterday.order_count) *
          100
        : 0;

    // ============ 2. TOP ÜRÜNLER (seçilen aralık) ============
    const productStats = new Map<
      string,
      { name: string; qty: number; revenue: number }
    >();

    itemList.forEach((i) => {
      const key = i.product_id || i.product_name;
      const cur = productStats.get(key) || {
        name: i.product_name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += Number(i.quantity);
      cur.revenue += Number(i.quantity) * Number(i.unit_price);
      productStats.set(key, cur);
    });

    const totalRevenue = Array.from(productStats.values()).reduce(
      (s, p) => s + p.revenue,
      0
    );

    const topProducts: TopProduct[] = Array.from(productStats.entries())
      .map(([key, v]) => ({
        product_id: key,
        product_name: v.name,
        quantity: v.qty,
        revenue: v.revenue,
        share_pct: totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ============ 3. SAATLIK HEATMAP (seçilen aralık) ============
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    orderList.forEach((o) => {
      const d = new Date(o.created_at);
      const weekday = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      grid[weekday][hour] += 1;
    });

    let maxHeatmap = 0;
    grid.forEach((row) => row.forEach((v) => {
      if (v > maxHeatmap) maxHeatmap = v;
    }));

    const hourlyTotal = Array(24).fill(0);
    grid.forEach((row) => {
      row.forEach((v, hour) => {
        hourlyTotal[hour] += v;
      });
    });
    // Günlük ortalama (seçilen gün sayısına göre)
    const hourlyAvg: number[] = hourlyTotal.map((total) =>
      Number((total / Math.max(1, days)).toFixed(1))
    );

    function findPeak(fromHour: number, toHour: number) {
      let peakHour = fromHour;
      let peakCount = 0;
      for (let h = fromHour; h < toHour; h++) {
        if (hourlyTotal[h] > peakCount) {
          peakCount = hourlyTotal[h];
          peakHour = h;
        }
      }
      return { hour: peakHour, count: peakCount };
    }
    const peaks = {
      morning: findPeak(5, 11),
      afternoon: findPeak(11, 17),
      evening: findPeak(17, 23),
    };

    // ============ 4. SİPARİŞ TİPİ DAĞILIMI (seçilen aralık) ============
    const orderTypes: OrderTypeBreakdown = {
      dine_in: { count: 0, revenue: 0 },
      pickup: { count: 0, revenue: 0 },
      delivery: { count: 0, revenue: 0 },
    };

    orderList.forEach((o) => {
      const t = o.order_type as keyof OrderTypeBreakdown;
      if (orderTypes[t]) {
        orderTypes[t].count += 1;
        orderTypes[t].revenue += Number(o.total);
      }
    });

    // ============ 4b. İSTASYON DAĞILIMI (seçilen aralık) ============
    // Her ürün bir istasyona ait, order_item.station_id snapshot olarak var
    const stationStats = new Map<
      string,
      { item_count: number; revenue: number }
    >();

    itemList.forEach((i) => {
      const sid = i.station_id || '__none__';
      const cur = stationStats.get(sid) || { item_count: 0, revenue: 0 };
      cur.item_count += Number(i.quantity);
      cur.revenue += Number(i.quantity) * Number(i.unit_price);
      stationStats.set(sid, cur);
    });

    const stationTotalRevenue = Array.from(stationStats.values()).reduce(
      (s, v) => s + v.revenue,
      0
    );

    const stationBreakdown: StationBreakdown = Array.from(stationStats.entries())
      .map(([sid, v]) => {
        const isNone = sid === '__none__';
        const stInfo = !isNone ? stationMap.get(sid) : null;
        return {
          station_id: isNone ? null : sid,
          station_name: stInfo?.name || 'İstasyonsuz',
          station_icon: stInfo?.icon || '○',
          station_color: stInfo?.color || '#9C8D79',
          item_count: v.item_count,
          revenue: v.revenue,
          share_pct:
            stationTotalRevenue > 0 ? (v.revenue / stationTotalRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // ============ 5. HAFTANIN EN İYİ GÜNÜ (seçilen aralık) ============
    const weekdayNames = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar',
    ];

    const dayStats: Record<
      number,
      { totalRev: number; totalOrders: number; occurrences: number }
    > = {};

    for (let i = 0; i < 7; i++) {
      dayStats[i] = { totalRev: 0, totalOrders: 0, occurrences: 0 };
    }

    const dayBuckets = new Map<
      string,
      { weekday: number; revenue: number; count: number }
    >();

    orderList.forEach((o) => {
      const d = new Date(o.created_at);
      const dayKey = d.toISOString().slice(0, 10);
      const weekday = (d.getDay() + 6) % 7;
      const cur = dayBuckets.get(dayKey) || { weekday, revenue: 0, count: 0 };
      cur.revenue += Number(o.total);
      cur.count += 1;
      dayBuckets.set(dayKey, cur);
    });

    dayBuckets.forEach((b) => {
      dayStats[b.weekday].totalRev += b.revenue;
      dayStats[b.weekday].totalOrders += b.count;
      dayStats[b.weekday].occurrences += 1;
    });

    let bestWeekday = 0;
    let bestAvg = -1;
    for (let i = 0; i < 7; i++) {
      const s = dayStats[i];
      const avg = s.occurrences > 0 ? s.totalRev / s.occurrences : 0;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestWeekday = i;
      }
    }

    const bestDayData = dayStats[bestWeekday];
    const bestDay: BestDay = {
      weekday: weekdayNames[bestWeekday],
      avg_revenue:
        bestDayData.occurrences > 0
          ? bestDayData.totalRev / bestDayData.occurrences
          : 0,
      avg_orders:
        bestDayData.occurrences > 0
          ? bestDayData.totalOrders / bestDayData.occurrences
          : 0,
    };

    return {
      success: true,
      data: {
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
          preset,
          days,
        },
        summary: {
          today,
          yesterday,
          week,
          month,
          revenue_change_pct,
          order_change_pct,
        },
        topProducts,
        heatmap: { grid, max: maxHeatmap, hourlyAvg, peaks },
        orderTypes,
        stationBreakdown,
        bestDay,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
