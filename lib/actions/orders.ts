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

    // ──────────────────────────────────────────────────────────────
    // GÜVENLİK: İşletme online sipariş kabul ediyor mu?
    // Bazı işletmeler "sadece menü görüntüleme" modunu seçebilir.
    // UI gizli olsa bile birinin direkt API çağırabileceği için
    // server tarafında da kontrol şart.
    // ──────────────────────────────────────────────────────────────
    const { data: bizConfig } = await supabase
      .from('businesses')
      .select('order_config')
      .eq('id', input.business_id)
      .maybeSingle();

    if (bizConfig?.order_config) {
      const config = bizConfig.order_config as {
        online_enabled?: boolean;
        modes?: { dinein?: boolean; pickup?: boolean; delivery?: boolean };
      };

      // online_enabled false ise tümden engellenir
      if (config.online_enabled === false) {
        return {
          success: false,
          error: 'Bu işletme şu anda online sipariş almıyor. Lütfen garsona haber verin.',
        };
      }

      // Belirli mod kapalıysa sadece o mod engellenir
      if (config.modes) {
        const modeKey =
          input.order_type === 'dine_in'
            ? 'dinein'
            : input.order_type === 'pickup'
              ? 'pickup'
              : 'delivery';

        if (config.modes[modeKey] === false) {
          const modeName =
            modeKey === 'dinein'
              ? 'Masada sipariş'
              : modeKey === 'pickup'
                ? 'Gel-al sipariş'
                : 'Adrese teslim';
          return {
            success: false,
            error: `${modeName} şu anda kapalı. Lütfen başka bir sipariş türü seçin.`,
          };
        }
      }
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
        source: 'qr', // QR menü kaynak — kasiyer/rapor breakdown için
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

// ============================================================
// Müşteri Sipariş Takibi - tam detay (polling için)
// ============================================================

export type OrderTrackingItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type RelatedOrderSummary = {
  id: string;
  order_no: string;
  status: string;
  total: number;
  created_at: string;
};

export type OrderTrackingData = {
  id: string;
  order_no: string;
  status: string; // received | preparing | ready | delivered | cancelled
  order_type: string;
  total: number;
  customer_name: string | null;
  table_name: string | null;
  items: OrderTrackingItem[];
  created_at: string;
  business: {
    id: string;
    name: string;
    slug: string;
  };
  has_review: boolean;
  // Akıllı yönlendirme ayarları (4-5 yıldız → Google'a)
  review_smart_redirect: boolean;
  google_place_id: string;
  // Aynı masada başka aktif siparişler (sadece dine_in için)
  related_orders: RelatedOrderSummary[];
};

export async function getOrderTracking(
  orderId: string,
  businessSlug: string
): Promise<{
  success: boolean;
  data?: OrderTrackingData;
  error?: string;
}> {
  try {
    if (!orderId || orderId.length < 8) {
      return { success: false, error: 'Geçersiz sipariş kodu' };
    }

    const admin = createAdminClient();

    // Order çek
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select(
        'id, status, order_type, total, customer_name, business_id, table_id, created_at'
      )
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    // Business kontrol — slug uyumlu mu (güvenlik)
    const { data: business } = await admin
      .from('businesses')
      .select('id, name, slug, receipt_settings')
      .eq('id', order.business_id)
      .maybeSingle();

    if (!business || (business.slug as string) !== businessSlug) {
      return { success: false, error: 'Sipariş bu işletmeye ait değil' };
    }

    // Review ayarları receipt_settings içinden çıkar
    const receiptSettings = (business.receipt_settings as Record<string, unknown> | null) || {};
    const reviewSmartRedirect = Boolean(receiptSettings.review_smart_redirect);
    const googlePlaceId = String(receiptSettings.google_place_id || '');

    // Masa adı
    let tableName: string | null = null;
    if (order.table_id) {
      const { data: table } = await admin
        .from('tables')
        .select('name')
        .eq('id', order.table_id)
        .maybeSingle();
      tableName = (table?.name as string) || null;
    }

    // Sipariş kalemleri
    const { data: items } = await admin
      .from('order_items')
      .select('id, product_name, quantity, unit_price')
      .eq('order_id', orderId)
      .order('id', { ascending: true });

    // Bu sipariş için review var mı (5b için)
    const { data: existingReview } = await admin
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    // Aynı masada başka aktif/yakın zamanlı siparişler — multi-order desteği
    // dine_in olmayan siparişlerde related yok
    let relatedOrders: RelatedOrderSummary[] = [];
    if (order.table_id) {
      // Son 6 saatte aynı masaya verilen, bu sipariş hariç tüm siparişler
      // (terminal durumdakiler dahil — müşteri kim hangi siparişi verdi
      // anlayabilsin)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: relatedRows } = await admin
        .from('orders')
        .select('id, status, total, created_at')
        .eq('business_id', order.business_id)
        .eq('table_id', order.table_id)
        .neq('id', orderId)
        .gte('created_at', sixHoursAgo)
        .order('created_at', { ascending: false })
        .limit(8);

      relatedOrders = (relatedRows || []).map((r) => ({
        id: r.id as string,
        order_no: (r.id as string).slice(0, 8).toUpperCase(),
        status: r.status as string,
        total: Number(r.total),
        created_at: r.created_at as string,
      }));
    }

    return {
      success: true,
      data: {
        id: order.id as string,
        order_no: (order.id as string).slice(0, 8).toUpperCase(),
        status: order.status as string,
        order_type: order.order_type as string,
        total: Number(order.total),
        customer_name: (order.customer_name as string | null) || null,
        table_name: tableName,
        items: (items || []).map((i) => ({
          id: i.id as string,
          product_name: i.product_name as string,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
        created_at: order.created_at as string,
        business: {
          id: business.id as string,
          name: business.name as string,
          slug: business.slug as string,
        },
        has_review: !!existingReview,
        review_smart_redirect: reviewSmartRedirect,
        google_place_id: googlePlaceId,
        related_orders: relatedOrders,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}

// ============================================================
// Müşteri "Siparişlerim" - localStorage'taki ID listesinden batch sorgu
// ============================================================
export type CustomerOrderSummary = {
  id: string;
  order_no: string;
  status: string;
  total: number;
  created_at: string;
  table_name: string | null;
  order_type: string;
  has_review: boolean;
};

/**
 * Müşterinin localStorage'da tuttuğu sipariş ID'lerini batch olarak sorgular.
 * Sadece businessSlug'a ait olanları döner (güvenlik).
 * En yeni sipariş üstte.
 */
export async function getCustomerOrdersBatch(
  orderIds: string[],
  businessSlug: string
): Promise<{
  success: boolean;
  orders?: CustomerOrderSummary[];
  error?: string;
}> {
  try {
    if (!orderIds || orderIds.length === 0) {
      return { success: true, orders: [] };
    }
    // Limit — kötüye kullanım önleme
    const safeIds = orderIds.slice(0, 50).filter((id) => {
      // UUID formatı kontrolü
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    });
    if (safeIds.length === 0) {
      return { success: true, orders: [] };
    }

    const admin = createAdminClient();

    // Önce işletmeyi slug'a göre bul (güvenlik için)
    const { data: business } = await admin
      .from('businesses')
      .select('id')
      .eq('slug', businessSlug)
      .maybeSingle();

    if (!business) {
      return { success: false, error: 'İşletme bulunamadı' };
    }

    // Sadece bu işletmeye ait siparişleri getir
    const { data: rows, error } = await admin
      .from('orders')
      .select('id, status, total, created_at, table_id, order_type, business_id')
      .in('id', safeIds)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    if (!rows || rows.length === 0) {
      return { success: true, orders: [] };
    }

    // Masa adlarını topluca al
    const tableIds = Array.from(
      new Set(
        rows
          .map((r) => r.table_id as string | null)
          .filter((v): v is string => !!v)
      )
    );
    const tableNameMap = new Map<string, string>();
    if (tableIds.length > 0) {
      const { data: tables } = await admin
        .from('tables')
        .select('id, name')
        .in('id', tableIds);
      (tables || []).forEach((t) => {
        tableNameMap.set(t.id as string, t.name as string);
      });
    }

    // Hangi sipariş için review yapılmış?
    const orderIdList = rows.map((r) => r.id as string);
    const { data: reviews } = await admin
      .from('reviews')
      .select('order_id')
      .in('order_id', orderIdList);
    const reviewedSet = new Set(
      (reviews || []).map((r) => r.order_id as string)
    );

    return {
      success: true,
      orders: rows.map((r) => ({
        id: r.id as string,
        order_no: (r.id as string).slice(0, 8).toUpperCase(),
        status: r.status as string,
        total: Number(r.total),
        created_at: r.created_at as string,
        table_name: r.table_id
          ? tableNameMap.get(r.table_id as string) || null
          : null,
        order_type: r.order_type as string,
        has_review: reviewedSet.has(r.id as string),
      })),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}
