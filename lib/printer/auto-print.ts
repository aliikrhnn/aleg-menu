/**
 * Auto-print hook
 *
 * Yeni sipariş geldiğinde:
 * 1. Siparişin item'larını istasyonlara böl
 * 2. Her istasyonun mutfak yazıcıları için kitchen job oluştur
 * 3. Gel-al/paket ise kasa yazıcıları için de cashier job oluştur
 *
 * Client tarafında realtime listener print_jobs tablosunu dinler,
 * pending job gelince yazıcıya gönderir, status'ü günceller.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export async function triggerAutoPrint(params: {
  businessId: string;
  orderId: string;
  orderType: 'dine_in' | 'pickup' | 'delivery';
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { businessId, orderId, orderType } = params;

    // Siparişin item'larını ve product → station eşleşmesini çek
    const { data: items } = await admin
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId);

    const productIds = [
      ...new Set((items || []).map((i) => i.product_id).filter(Boolean)),
    ] as string[];

    const stationIds: string[] = [];
    if (productIds.length > 0) {
      const { data: products } = await admin
        .from('products')
        .select('station_id')
        .in('id', productIds);

      const seen = new Set<string>();
      (products || []).forEach((p) => {
        if (p.station_id && !seen.has(p.station_id as string)) {
          seen.add(p.station_id as string);
          stationIds.push(p.station_id as string);
        }
      });
    }

    // ===== KITCHEN JOBLARI =====
    if (stationIds.length > 0) {
      const { data: kitchenPrinters } = await admin
        .from('printers')
        .select('id, station_id')
        .eq('business_id', businessId)
        .eq('role', 'kitchen')
        .eq('is_active', true)
        .eq('auto_print_new_orders', true)
        .in('station_id', stationIds);

      const kitchenJobs = (kitchenPrinters || []).map((p) => ({
        business_id: businessId,
        printer_id: p.id,
        order_id: orderId,
        station_id: p.station_id,
        job_type: 'kitchen' as const,
        status: 'pending' as const,
        triggered_by: 'auto',
      }));

      if (kitchenJobs.length > 0) {
        await admin.from('print_jobs').insert(kitchenJobs);
      }
    }

    // ===== CASHIER JOBLARI (sadece gel-al/paket) =====
    if (orderType === 'pickup' || orderType === 'delivery') {
      const { data: cashierPrinters } = await admin
        .from('printers')
        .select('id')
        .eq('business_id', businessId)
        .eq('role', 'cashier')
        .eq('is_active', true)
        .eq('auto_print_takeaway', true);

      const cashierJobs = (cashierPrinters || []).map((p) => ({
        business_id: businessId,
        printer_id: p.id,
        order_id: orderId,
        job_type: 'cashier' as const,
        status: 'pending' as const,
        triggered_by: 'auto',
      }));

      if (cashierJobs.length > 0) {
        await admin.from('print_jobs').insert(cashierJobs);
      }
    }
  } catch (err) {
    // Yazdırma hatası sipariş akışını bozmasın — sadece logla
    console.error('[auto-print] error:', err);
  }
}
