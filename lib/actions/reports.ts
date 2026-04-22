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

export type BestDay = {
  weekday: string; // Pazartesi, Salı, ...
  avg_revenue: number;
  avg_orders: number;
  reason?: string;
};

export type ReportsData = {
  summary: DailyDelta;
  topProducts: TopProduct[];
  heatmap: HourlyHeatmap;
  orderTypes: OrderTypeBreakdown;
  bestDay: BestDay;
};

// ============================================================
// Helper - tarih aralıkları
// ============================================================

function getDateRange(daysAgo: number): { from: string; to: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

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

// ============================================================
// Ana rapor fetcher
// ============================================================

export async function getReportsData(): Promise<{
  success: boolean;
  data?: ReportsData;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Son 30 günün tüm siparişleri (tamamlanmış/teslim edilmiş veya ödenmiş)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, total, order_type, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', monthAgo.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (ordersError) {
      return { success: false, error: ordersError.message };
    }

    const orderList = orders || [];

    // Tüm sipariş ID'leri
    const orderIds = orderList.map((o) => o.id);

    // Kalemler (top products için)
    const { data: items } = orderIds.length
      ? await admin
          .from('order_items')
          .select('order_id, product_id, product_name, quantity, unit_price')
          .in('order_id', orderIds)
      : { data: [] };

    const itemList = items || [];

    // ============ 1. ÖZET (Bugün/Dün/Hafta/Ay) ============
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6); // son 7 gün (bugün dahil)
    const monthStart = monthAgo;

    function summarize(from: Date, to: Date): DailySummary {
      const filtered = orderList.filter((o) => {
        const d = new Date(o.created_at);
        return d >= from && d < to;
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

    // ============ 2. TOP ÜRÜNLER (son 7 gün) ============
    const weekOrderIds = new Set(
      orderList
        .filter((o) => new Date(o.created_at) >= weekStart)
        .map((o) => o.id)
    );

    const productStats = new Map<
      string,
      { name: string; qty: number; revenue: number }
    >();

    itemList
      .filter((i) => weekOrderIds.has(i.order_id))
      .forEach((i) => {
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

    // ============ 3. SAATLIK HEATMAP (son 30 gün) ============
    // [weekday][hour]
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    orderList.forEach((o) => {
      const d = new Date(o.created_at);
      // Pzt=0, Sal=1 ... Paz=6
      const weekday = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      grid[weekday][hour] += 1;
    });

    let maxHeatmap = 0;
    grid.forEach((row) => row.forEach((v) => {
      if (v > maxHeatmap) maxHeatmap = v;
    }));

    // Ortalama bir günün saatlik dağılımı (toplam / son 30 gün)
    // Saat başına toplam - sonra 30'a böl
    const hourlyTotal = Array(24).fill(0);
    grid.forEach((row) => {
      row.forEach((v, hour) => {
        hourlyTotal[hour] += v;
      });
    });
    // Günlük ortalama değil, hafta ortalaması gibi dursun: toplam sipariş / 30 (gün)
    const hourlyAvg: number[] = hourlyTotal.map((total) =>
      Number((total / 30).toFixed(1))
    );

    // 3 peak: sabah (5-11), öğle (11-17), akşam (17-23)
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

    // ============ 4. SİPARİŞ TİPİ DAĞILIMI (son 7 gün) ============
    const orderTypes: OrderTypeBreakdown = {
      dine_in: { count: 0, revenue: 0 },
      pickup: { count: 0, revenue: 0 },
      delivery: { count: 0, revenue: 0 },
    };

    orderList
      .filter((o) => new Date(o.created_at) >= weekStart)
      .forEach((o) => {
        const t = o.order_type as keyof OrderTypeBreakdown;
        if (orderTypes[t]) {
          orderTypes[t].count += 1;
          orderTypes[t].revenue += Number(o.total);
        }
      });

    // ============ 5. HAFTANIN EN İYİ GÜNÜ (son 30 gün) ============
    const weekdayNames = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar',
    ];

    // Her gün için toplam ciro ve sipariş sayısı + kaç kez görüldü
    const dayStats: Record<
      number,
      { totalRev: number; totalOrders: number; occurrences: number }
    > = {};

    for (let i = 0; i < 7; i++) {
      dayStats[i] = { totalRev: 0, totalOrders: 0, occurrences: 0 };
    }

    // Tarihleri gün bazında grupla
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

    // Gün başına ortalama ciro hesapla, en yükseği al
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
