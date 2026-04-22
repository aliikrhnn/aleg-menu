'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// Müşteri Sipariş Oluşturma
// ============================================================
// Bu action anonim müşteriler için çalışır.
// DB yazma işlemi için admin client (service role) kullanır -
// müşterinin direkt yazması değil, server action'ın yazması
// daha güvenli bir pattern.
// ============================================================

export type SubmitOrderOption = {
  preset_id: string;
  preset_name: string;
  value_id: string;
  value_name: string;
  price_delta: number;
};

export type SubmitOrderItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options?: SubmitOrderOption[];
};

export type SubmitOrderInput = {
  business_id: string;
  order_type: 'dine_in' | 'pickup' | 'delivery';
  items: SubmitOrderItem[];
  table_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_note?: string;
};

export type SubmitOrderResult =
  | { success: true; order_id: string; order_no: string }
  | { success: false; error: string };

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  try {
    // DB yazma için admin client (RLS bypass)
    // Müşteri anonim olduğu için normal client RLS'ye takılır
    const supabase = createAdminClient();

    // Validasyon
    if (!input.business_id) {
      return { success: false, error: 'İşletme bilgisi eksik' };
    }
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Sepetinizde ürün bulunmuyor' };
    }
    if (!['dine_in', 'pickup', 'delivery'].includes(input.order_type)) {
      return { success: false, error: 'Geçersiz sipariş türü' };
    }

    // Ürünleri doğrula — fiyat değiştiyse yakala (güvenlik)
    const productIds = input.items.map((i) => i.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, status, business_id, station_id')
      .in('id', productIds)
      .eq('business_id', input.business_id);

    if (productsError) {
      console.error('Products check error:', productsError);
      return {
        success: false,
        error: `Ürünler kontrol edilemedi: ${productsError.message}`,
      };
    }
    if (!products || products.length === 0) {
      console.error('No products found', { productIds, businessId: input.business_id });
      return {
        success: false,
        error: 'Ürünler bulunamadı. Menü güncellenmiş olabilir, sayfayı yenileyin.',
      };
    }
    if (products.length !== input.items.length) {
      console.error('Product count mismatch', {
        expected: input.items.length,
        found: products.length,
        productIds,
        foundIds: products.map((p) => p.id),
      });
      return {
        success: false,
        error: `Bazı ürünler artık mevcut değil (${products.length}/${input.items.length} bulundu)`,
      };
    }

    // Tükenen ürün varsa reddet
    const soldOut = products.filter((p) => p.status === 'soldout');
    if (soldOut.length > 0) {
      return {
        success: false,
        error: `Tükenen ürünler: ${soldOut.map((p) => (p.name as { tr?: string })?.tr || '').join(', ')}`,
      };
    }

    // Fiyatları SERVER'dan oku (client manipülasyonu engelle)
    // Options için client'tan gelen value_id'leri DB'den doğrula
    const allOptionValueIds = input.items.flatMap(
      (i) => (i.options || []).map((o) => o.value_id)
    );

    const { data: validValues } = allOptionValueIds.length
      ? await supabase
          .from('option_preset_values')
          .select('id, preset_id, name, price_delta')
          .in('id', allOptionValueIds)
      : { data: [] };

    const validValuesMap = new Map(
      (validValues || []).map((v) => [v.id, v])
    );

    // Preset isimlerini de çekelim
    const allPresetIds = [...new Set((validValues || []).map((v) => v.preset_id))];
    const { data: validPresets } = allPresetIds.length
      ? await supabase
          .from('option_presets')
          .select('id, name')
          .in('id', allPresetIds)
      : { data: [] };

    const presetNameMap = new Map(
      (validPresets || []).map((p) => [p.id, p.name])
    );

    let subtotal = 0;
    const itemRows = input.items.map((clientItem) => {
      const product = products.find((p) => p.id === clientItem.product_id)!;
      const baseRealPrice = Number(product.price);
      const quantity = Math.max(1, Math.floor(clientItem.quantity));

      // Options'tan server-side delta hesapla
      let optionDelta = 0;
      const serverOptions: Array<{
        preset_id: string;
        preset_name: string;
        value_id: string;
        value_name: string;
        price_delta: number;
      }> = [];

      (clientItem.options || []).forEach((opt) => {
        const dbValue = validValuesMap.get(opt.value_id);
        if (dbValue) {
          const delta = Number(dbValue.price_delta);
          optionDelta += delta;
          const presetNameObj = presetNameMap.get(dbValue.preset_id) as { tr?: string; en?: string } | undefined;
          const valueNameObj = dbValue.name as { tr?: string; en?: string };
          serverOptions.push({
            preset_id: dbValue.preset_id,
            preset_name: presetNameObj?.tr || '',
            value_id: dbValue.id,
            value_name: valueNameObj?.tr || '',
            price_delta: delta,
          });
        }
      });

      const realUnitPrice = baseRealPrice + optionDelta;
      subtotal += realUnitPrice * quantity;

      return {
        product_id: product.id,
        product_name: (product.name as { tr?: string })?.tr || 'Ürün',
        product_snapshot: product.name,
        quantity,
        unit_price: realUnitPrice,
        note: clientItem.note || null,
        station_id: (product as { station_id?: string | null }).station_id || null,
        options: serverOptions,
      };
    });

    // Sipariş oluştur
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        business_id: input.business_id,
        order_type: input.order_type,
        table_id: input.table_id || null,
        customer_name: input.customer_name?.slice(0, 80) || null,
        customer_phone: input.customer_phone?.slice(0, 30) || null,
        status: 'received',
        subtotal,
        total: subtotal,
        note: input.customer_note?.slice(0, 500) || null,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return { success: false, error: 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.' };
    }

    // Kalemleri ekle
    const itemsWithOrderId = itemRows.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);

    if (itemsError) {
      // Rollback — siparişi sil
      await supabase.from('orders').delete().eq('id', order.id);
      console.error('Order items insert error:', itemsError);
      return { success: false, error: 'Sipariş kalemleri kaydedilemedi' };
    }

    // Auto-print job'larını oluştur (arka planda, sipariş akışını bloklamaz)
    try {
      const { triggerAutoPrint } = await import('@/lib/printer/auto-print');
      await triggerAutoPrint({
        businessId: input.business_id,
        orderId: order.id,
        orderType: input.order_type,
      });
    } catch (err) {
      console.error('[auto-print] tetiklenemedi:', err);
    }

    return {
      success: true,
      order_id: order.id,
      order_no: order.id.slice(0, 8).toUpperCase(),
    };
  } catch (err) {
    console.error('submitOrder exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu',
    };
  }
}

// ============================================================
// Sipariş Durum Takibi (müşteri tarafı)
// ============================================================

export async function getOrderStatus(
  orderId: string
): Promise<{
  success: boolean;
  status?: string;
  order_no?: string;
  total?: number;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    return {
      success: true,
      status: data.status,
      order_no: data.id.slice(0, 8).toUpperCase(),
      total: Number(data.total),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}
