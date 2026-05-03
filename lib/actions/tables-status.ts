'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { closeOrderAndMaybeFreeTable, ensureOpenCashSession } from './payments';
import { logAction, fetchPerformerInfo } from './audit-log';
import { revalidatePath } from 'next/cache';

// ============================================================
// Lokalize alan okuyucu — name/description gibi alanlar
// JSONB i18n obje veya düz string olabilir; null safe.
// typeof null === 'object' olduğu için ayrıca null kontrolü şart.
// ============================================================
function pickLocalized(
  raw: unknown,
  fallback: string = ''
): string {
  if (raw == null) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as { tr?: unknown; en?: unknown };
    if (typeof obj.tr === 'string' && obj.tr) return obj.tr;
    if (typeof obj.en === 'string' && obj.en) return obj.en;
    return fallback;
  }
  return String(raw);
}

// ============================================================
// İzin kontrolü
// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Panel oturumu yoksa cashier cookie + subdomain dene (yeni subdomain rotaları için)
  if (!user) {
    const { tryCashierFallback } = await import('@/lib/security/auth-context');
    const fallback = await tryCashierFallback();
    if (fallback) {
      return {
        user: null as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'],
        businessId: fallback.businessId,
        memberId: null as unknown as string,
      };
    }
    throw new Error('Giriş yapmamışsınız');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('id, business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { user, businessId: membership.business_id, memberId: membership.id };
}

// ============================================================
// TYPES
// ============================================================

export type TableZoneWithTables = {
  zone: {
    id: string;
    name: string;
    color: string | null;
    sort_order: number;
  } | null; // bölgesi olmayanlar için
  tables: TableWithStatus[];
};

export type TableWithStatus = {
  id: string;
  name: string;
  capacity: number;
  zone_id: string | null;
  shape: 'square' | 'round' | 'rect';
  db_status: 'available' | 'occupied' | 'reserved' | 'inactive';
  // Canlı durum (aktif siparişlerden türetilir)
  live_status: 'empty' | 'active' | 'unpaid' | 'ready' | 'new' | 'reserved';
  active_order_count: number;
  total_amount: number;
  oldest_order_at: string | null;
  has_unpaid: boolean;
  has_new_items: boolean;     // mutfağa yollanmamış kalem var mı
  has_ready_items: boolean;   // teslim edilmemiş hazır kalem var mı
};

// ============================================================
// Masa durumuyla birlikte tüm masaları getir (bölgelere göre)
// ============================================================
export async function getTablesWithStatus(): Promise<{
  success: boolean;
  zones?: TableZoneWithTables[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // 1) Bölgeler
    const { data: zones } = await admin
      .from('table_zones')
      .select('id, name, color, sort_order')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true });

    // 2) Tüm masalar
    const { data: tables } = await admin
      .from('tables')
      .select('id, name, capacity, zone_id, shape, status')
      .eq('business_id', businessId)
      .neq('status', 'inactive')
      .order('name', { ascending: true });

    if (!tables) return { success: true, zones: [] };

    // 3) Aktif siparişler (son 24 saat)
    // Aktif = in-process status VEYA delivered ama ödenmemiş
    // İki ayrı sorgu, sonra birleştir (or() syntax sorunlarını önle)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const yesterdayIso = yesterday.toISOString();

    const [inProcessResp, deliveredUnpaidResp] = await Promise.all([
      admin
        .from('orders')
        .select('id, table_id, total, payment_status, status, created_at')
        .eq('business_id', businessId)
        .not('table_id', 'is', null)
        .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way'])
        .gte('created_at', yesterdayIso),
      admin
        .from('orders')
        .select('id, table_id, total, payment_status, status, created_at')
        .eq('business_id', businessId)
        .not('table_id', 'is', null)
        .eq('status', 'delivered')
        .not('payment_status', 'in', '(paid,refunded)')
        .gte('created_at', yesterdayIso),
    ]);

    // Birleştir + dedup (aynı id gelmeyecek aslında ama garantiye alalım)
    const ordersMap = new Map<string, NonNullable<typeof inProcessResp.data>[number]>();
    (inProcessResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    (deliveredUnpaidResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    const orders = Array.from(ordersMap.values());

    // 4) Yeni/hazır kalem kontrolü için item status'ları
    const orderIds = (orders || []).map((o) => o.id);
    const itemsMap = new Map<string, { hasNew: boolean; hasReady: boolean }>();
    if (orderIds.length > 0) {
      const { data: items } = await admin
        .from('order_items')
        .select('order_id, status')
        .in('order_id', orderIds);

      (items || []).forEach((it) => {
        const existing = itemsMap.get(it.order_id) || { hasNew: false, hasReady: false };
        if (it.status === 'ordered') existing.hasNew = true;
        if (it.status === 'ready') existing.hasReady = true;
        itemsMap.set(it.order_id, existing);
      });
    }

    // 5) Masa başına sipariş özeti
    const tableStats = new Map<string, {
      count: number;
      total: number;
      oldest: string | null;
      hasUnpaid: boolean;
      hasNew: boolean;
      hasReady: boolean;
    }>();

    (orders || []).forEach((o) => {
      if (!o.table_id) return;
      const existing = tableStats.get(o.table_id) || {
        count: 0,
        total: 0,
        oldest: null,
        hasUnpaid: false,
        hasNew: false,
        hasReady: false,
      };
      const itemFlags = itemsMap.get(o.id) || { hasNew: false, hasReady: false };
      tableStats.set(o.table_id, {
        count: existing.count + 1,
        total: existing.total + Number(o.total),
        oldest:
          !existing.oldest || o.created_at < existing.oldest
            ? o.created_at
            : existing.oldest,
        hasUnpaid:
          existing.hasUnpaid ||
          (o.payment_status !== 'paid' && o.payment_status !== 'refunded'),
        hasNew: existing.hasNew || itemFlags.hasNew,
        hasReady: existing.hasReady || itemFlags.hasReady,
      });
    });

    // 6) Live status belirleme
    function liveStatus(tableId: string, dbStatus: string): TableWithStatus['live_status'] {
      if (dbStatus === 'reserved') return 'reserved';
      const stats = tableStats.get(tableId);
      if (!stats || stats.count === 0) return 'empty';
      if (stats.hasNew) return 'new';
      if (stats.hasReady) return 'ready';
      if (stats.hasUnpaid) return 'active';
      return 'active';
    }

    const tablesWithStatus: TableWithStatus[] = tables.map((t) => {
      const stats = tableStats.get(t.id);
      return {
        id: t.id,
        name: t.name,
        capacity: t.capacity || 2,
        zone_id: t.zone_id,
        shape: (t.shape as TableWithStatus['shape']) || 'square',
        db_status: t.status as TableWithStatus['db_status'],
        live_status: liveStatus(t.id, t.status),
        active_order_count: stats?.count || 0,
        total_amount: stats?.total || 0,
        oldest_order_at: stats?.oldest || null,
        has_unpaid: stats?.hasUnpaid || false,
        has_new_items: stats?.hasNew || false,
        has_ready_items: stats?.hasReady || false,
      };
    });

    // 7) Bölgelere göre grupla
    const grouped: TableZoneWithTables[] = [];

    (zones || []).forEach((z) => {
      const zoneTables = tablesWithStatus.filter((t) => t.zone_id === z.id);
      if (zoneTables.length > 0) {
        grouped.push({
          zone: z,
          tables: zoneTables,
        });
      }
    });

    // Bölgesiz masalar
    const orphanTables = tablesWithStatus.filter((t) => !t.zone_id);
    if (orphanTables.length > 0) {
      grouped.push({ zone: null, tables: orphanTables });
    }

    return { success: true, zones: grouped };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Ürün kataloğunu sipariş için getir (kasiyerin göreceği)
// ============================================================

export type OptionPresetForPos = {
  preset_id: string;
  preset_name: string;
  type: 'single' | 'multi';
  required: boolean;
  sort_order: number;
  values: Array<{
    id: string;
    name: string;
    price_delta: number;
    is_default: boolean;
  }>;
};

export type ProductForPos = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  status: string;
  hero_image_url: string | null;
  hero_icon: string | null;
  badge: string | null;
  print_station: string | null;
  dietary_tags: string[];
  variants: Array<{
    id: string;
    name: string;
    price_delta: number;
  }>;
  option_presets: OptionPresetForPos[];
};

export type CategoryForPos = {
  id: string;
  name: string;
  sort_order: number;
  hero_icon: string | null;
  badge: string | null;
};

export async function getPosMenu(): Promise<{
  success: boolean;
  categories?: CategoryForPos[];
  products?: ProductForPos[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Önce kategoriler + ürünler + presetler paralel (bunlarda business_id var)
    const [catResp, prodResp, presetResp, prodPresetResp] = await Promise.all([
      admin
        .from('categories')
        .select('id, name, sort_order, hero_icon, badge')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      admin
        .from('products')
        .select('id, name, description, price, category_id, status, hero_image_url, hero_icon, badge, print_station, dietary_tags, sort_order')
        .eq('business_id', businessId)
        .in('status', ['active', 'soldout'])
        .order('sort_order', { ascending: true }),
      // Option presets (işletme geneli)
      admin
        .from('option_presets')
        .select('id, name, type, required, sort_order')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true }),
      // Ürün <-> preset eşleşmesi (product_id JOIN edilebilir, ama bunu sonra filtreliyoruz)
      admin
        .from('product_option_presets')
        .select('product_id, preset_id, sort_order')
        .order('sort_order', { ascending: true }),
    ]);

    if (catResp.error) return { success: false, error: catResp.error.message };
    if (prodResp.error) return { success: false, error: prodResp.error.message };

    // Şimdi business'a ait product ID ve preset ID'leri elde ettiğimize göre
    // child tabloları (variants, preset_values) güvenli ve hızlı filtreleyelim
    const productIds = (prodResp.data || []).map((p) => p.id);
    const presetIds = (presetResp.data || []).map((p) => p.id);

    const [variantResp, valueResp] = await Promise.all([
      productIds.length > 0
        ? admin
            .from('product_variants')
            .select('id, product_id, name, price_delta, sort_order')
            .in('product_id', productIds)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [], error: null } as const),
      presetIds.length > 0
        ? admin
            .from('option_preset_values')
            .select('id, preset_id, name, price_delta, is_default, sort_order')
            .in('preset_id', presetIds)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    // Varyantları ürünlere grupla
    const variantsByProduct = new Map<
      string,
      ProductForPos['variants']
    >();
    (variantResp.data || []).forEach((v) => {
      const arr = variantsByProduct.get(v.product_id) || [];
      arr.push({
        id: v.id,
        name: pickLocalized(v.name),
        price_delta: Number(v.price_delta || 0),
      });
      variantsByProduct.set(v.product_id, arr);
    });

    // Option preset'leri hazırla (id -> OptionPresetForPos)
    const presetMap = new Map<string, OptionPresetForPos>();
    (presetResp.data || []).forEach((pr) => {
      presetMap.set(pr.id, {
        preset_id: pr.id,
        preset_name: pickLocalized(pr.name),
        type: pr.type as 'single' | 'multi',
        required: !!pr.required,
        sort_order: pr.sort_order || 0,
        values: [],
      });
    });

    // Preset value'ları ilgili preset'e ekle
    (valueResp.data || []).forEach((v) => {
      const preset = presetMap.get(v.preset_id);
      if (!preset) return;
      preset.values.push({
        id: v.id,
        name: pickLocalized(v.name),
        price_delta: Number(v.price_delta || 0),
        is_default: !!v.is_default,
      });
    });

    // Ürün bazlı preset listesi (product_id -> OptionPresetForPos[])
    const presetsByProduct = new Map<string, OptionPresetForPos[]>();
    (prodPresetResp.data || []).forEach((pp) => {
      const preset = presetMap.get(pp.preset_id);
      if (!preset) return;
      const arr = presetsByProduct.get(pp.product_id) || [];
      arr.push(preset);
      presetsByProduct.set(pp.product_id, arr);
    });

    // Kategori adlarını flat TR string yap
    const categories: CategoryForPos[] = (catResp.data || []).map((c) => ({
      id: c.id,
      name: pickLocalized(c.name),
      sort_order: c.sort_order || 0,
      hero_icon: c.hero_icon || null,
      badge: c.badge || null,
    }));

    const products: ProductForPos[] = (prodResp.data || []).map((p) => {
      const desc = pickLocalized(p.description, '');
      return {
        id: p.id,
        name: pickLocalized(p.name),
        description: desc || null,
        price: Number(p.price),
        category_id: p.category_id,
        status: p.status,
        hero_image_url: p.hero_image_url,
        hero_icon: p.hero_icon,
        badge: p.badge,
        print_station: p.print_station,
        dietary_tags: p.dietary_tags || [],
        variants: variantsByProduct.get(p.id) || [],
        option_presets: presetsByProduct.get(p.id) || [],
      };
    });

    return { success: true, categories, products };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Manuel sipariş oluştur (kasiyerin masaya açtığı)
// ============================================================

export type CreateManualOrderInput = {
  tableId: string | null; // null = hızlı satış
  orderType?: 'dine_in' | 'pickup' | 'delivery';
  cashierId: string;
  note?: string;
  // Sipariş kaynağı (SERT vardiya kontrolü için kullanılır)
  // 'manual' = kasa, kasa ile sipariş alır → vardiya AÇIK olmak ZORUNDA
  // 'waiter' = garson tablet'inden gelen sipariş → vardiya kontrolü YOK
  // (garson siparişi akabinde kasada ödenir, vardiya orada kontrol edilir)
  source?: 'manual' | 'waiter';
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    options?: Array<{
      preset_name: string;
      value_name: string;
      price_delta: number;
    }>;
    note?: string;
    isComplimentary?: boolean;
    complimentaryReason?: string;
    printStation?: string;
  }>;
  sendToKitchen?: boolean; // true: siparişi direkt mutfağa yolla (status='confirmed')
  syncClientId?: string;
};

export async function createManualOrder(input: CreateManualOrderInput): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
  alreadyCreated?: boolean;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // İdempotency
    if (input.syncClientId) {
      const { data: existing } = await admin
        .from('orders')
        .select('id')
        .eq('business_id', businessId)
        .eq('sync_client_id', input.syncClientId)
        .maybeSingle();

      if (existing) {
        return { success: true, alreadyCreated: true, orderId: existing.id };
      }
    }

    if (input.items.length === 0) {
      return { success: false, error: 'En az bir ürün ekle' };
    }

    // ╔════════════════════════════════════════════════════════════╗
    // ║ SERT VARDIYA MODU                                          ║
    // ║ POS'tan yeni sipariş oluşturmak için vardiya AÇIK olmalı.  ║
    // ║ QR kod / garson siparişi (source !== 'manual') muaf.       ║
    // ║ Sadece kasiyer manuel siparişlerinde kontrol var.          ║
    // ╚════════════════════════════════════════════════════════════╝
    if (input.source === 'manual' || !input.source) {
      const shiftCheck = await ensureOpenCashSession(admin, businessId);
      if (!shiftCheck.ok) {
        return { success: false, error: shiftCheck.error };
      }
    }

    // Cashier güvenliği
    const { data: cashier } = await admin
      .from('cashier_accounts')
      .select('id, business_id, is_active')
      .eq('id', input.cashierId)
      .maybeSingle();

    if (!cashier || cashier.business_id !== businessId || !cashier.is_active) {
      return { success: false, error: 'Kasiyer bulunamadı' };
    }

    // Masa güvenliği (varsa)
    if (input.tableId) {
      const { data: table } = await admin
        .from('tables')
        .select('id, business_id')
        .eq('id', input.tableId)
        .maybeSingle();

      if (!table || table.business_id !== businessId) {
        return { success: false, error: 'Masa bulunamadı' };
      }
    }

    // Totaller
    let subtotal = 0;
    let complimentaryTotal = 0;
    input.items.forEach((it) => {
      const optDelta = (it.options || []).reduce(
        (sum, o) => sum + (o.price_delta || 0),
        0
      );
      const lineTotal = (it.unitPrice + optDelta) * it.quantity;
      if (it.isComplimentary) {
        complimentaryTotal += lineTotal;
      } else {
        subtotal += lineTotal;
      }
    });

    const total = subtotal; // indirim yok şimdilik

    // Order oluştur
    const orderType = input.orderType || (input.tableId ? 'dine_in' : 'pickup');
    const status = input.sendToKitchen ? 'confirmed' : 'received';
    const source = input.tableId ? 'manual' : 'quick_sale';

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        business_id: businessId,
        order_type: orderType,
        status,
        table_id: input.tableId,
        note: input.note || null,
        subtotal,
        total,
        complimentary_total: complimentaryTotal,
        created_by_cashier: input.cashierId,
        source,
        sync_client_id: input.syncClientId || null,
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (orderErr || !order) {
      return { success: false, error: orderErr?.message || 'Sipariş oluşturulamadı' };
    }

    // Kalemler
    const itemsToInsert = input.items.map((it) => {
      const optDelta = (it.options || []).reduce(
        (sum, o) => sum + (o.price_delta || 0),
        0
      );
      return {
        order_id: order.id,
        product_id: it.productId,
        variant_id: it.variantId || null,
        product_name: it.variantName
          ? `${it.productName} · ${it.variantName}`
          : it.productName,
        quantity: it.quantity,
        unit_price: it.unitPrice + optDelta,
        options: it.options || [],
        note: it.note || null,
        is_complimentary: it.isComplimentary || false,
        complimentary_reason: it.complimentaryReason || null,
        status: input.sendToKitchen ? 'ordered' : 'ordered',
      };
    });

    const { error: itemsErr } = await admin.from('order_items').insert(itemsToInsert);

    if (itemsErr) {
      // Rollback
      await admin.from('orders').delete().eq('id', order.id);
      return { success: false, error: itemsErr.message };
    }

    // Masa durumunu "occupied" yap
    if (input.tableId) {
      await admin
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', input.tableId);
    }

    // Mutfak fişi — sendToKitchen=true ise otomatik
    if (input.sendToKitchen) {
      try {
        // Dinamik import — printers.ts bu dosyaya import etmezse döngüsel bağımlılık olmaz
        const { requestKitchenReprint } = await import('@/lib/actions/printers');
        await requestKitchenReprint(order.id, null);
      } catch (e) {
        // Print başarısız olursa siparişi iptal etme — UI toast ile bildir
        console.warn('[aleg] Kitchen print failed but order created:', e);
      }
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return { success: true, orderId: order.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Bir masadaki aktif siparişleri + kalemleri getir
// ============================================================

export type TableOrderDetail = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  note: string | null;
  source: string | null;
  subtotal: number;
  total: number;
  complimentary_total: number;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    status: string;
    note: string | null;
    is_complimentary: boolean;
    complimentary_reason: string | null;
  }>;
};

export async function getTableOrders(tableId: string): Promise<{
  success: boolean;
  tableName?: string;
  orders?: TableOrderDetail[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Masa güvenliği
    const { data: table } = await admin
      .from('tables')
      .select('id, name, business_id')
      .eq('id', tableId)
      .maybeSingle();

    if (!table || table.business_id !== businessId) {
      return { success: false, error: 'Masa bulunamadı' };
    }

    // Son 24 saatin aktif siparişleri — 2 ayrı sorgu + birleştir
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const yesterdayIso = yesterday.toISOString();

    const orderSelect = `
      id, status, payment_status, payment_method,
      created_at, note, source,
      subtotal, total, complimentary_total
    `;

    const [inProcessResp, deliveredUnpaidResp, recentlyPaidResp] = await Promise.all([
      admin
        .from('orders')
        .select(orderSelect)
        .eq('business_id', businessId)
        .eq('table_id', tableId)
        .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way'])
        .gte('created_at', yesterdayIso),
      admin
        .from('orders')
        .select(orderSelect)
        .eq('business_id', businessId)
        .eq('table_id', tableId)
        .eq('status', 'delivered')
        .not('payment_status', 'in', '(paid,refunded)')
        .gte('created_at', yesterdayIso),
      // Yakın zamanda ödenmiş siparişler — UI'da "ÖDENDİ" rozeti ile gösterilir
      // (4 saat içinde ödenenler)
      admin
        .from('orders')
        .select(orderSelect)
        .eq('business_id', businessId)
        .eq('table_id', tableId)
        .eq('payment_status', 'paid')
        .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()),
    ]);

    if (inProcessResp.error || deliveredUnpaidResp.error || recentlyPaidResp.error) {
      return {
        success: false,
        error: (
          inProcessResp.error ||
          deliveredUnpaidResp.error ||
          recentlyPaidResp.error
        )!.message,
      };
    }

    // Birleştir + dedup + ters kronolojik (en yeni önde)
    const ordersMap = new Map<string, NonNullable<typeof inProcessResp.data>[number]>();
    (inProcessResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    (deliveredUnpaidResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    (recentlyPaidResp.data || []).forEach((o) => ordersMap.set(o.id, o));
    const orders = Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (orders.length === 0) {
      return { success: true, tableName: table.name, orders: [] };
    }

    const orderIds = orders.map((o) => o.id);
    const { data: items } = await admin
      .from('order_items')
      .select(
        'id, order_id, product_name, quantity, unit_price, status, note, is_complimentary, complimentary_reason'
      )
      .in('order_id', orderIds);

    const itemsByOrder = new Map<string, TableOrderDetail['items']>();
    (items || []).forEach((it) => {
      const arr = itemsByOrder.get(it.order_id) || [];
      arr.push({
        id: it.id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        status: it.status,
        note: it.note,
        is_complimentary: it.is_complimentary || false,
        complimentary_reason: it.complimentary_reason,
      });
      itemsByOrder.set(it.order_id, arr);
    });

    // Tamamen ikram edilmiş ve ödenmiş siparişleri modal'dan hariç tut.
    // Bunlar zaten geçmiş — masaya yeni ürün eklendiğinde kafa karıştırıyor.
    // Yarısı ikram + yarısı ödenmiş normal siparişler kalsın (ödendi rozeti
    // ve fiş tekrar baskı için gerekli).
    const filteredOrders = orders.filter((o) => {
      if (o.payment_status !== 'paid') return true;
      const orderItems = itemsByOrder.get(o.id) || [];
      if (orderItems.length === 0) return false; // boş sipariş zaten gösterilmesin
      // Tüm aktif (cancelled olmayan) kalemler ikram mı?
      const activeItems = orderItems.filter(
        (it) => it.status !== 'cancelled'
      );
      if (activeItems.length === 0) return false;
      const allComplimentary = activeItems.every((it) => it.is_complimentary);
      // Tamamen ikram edilmiş ödenmiş sipariş → gösterme
      return !allComplimentary;
    });

    const formatted: TableOrderDetail[] = filteredOrders.map((o) => {
      const orderItems = itemsByOrder.get(o.id) || [];

      // Aktif (cancelled olmayan) ve ödememiş kalemlerden subtotal/total hesapla
      // Bu sayede iptal edilen kalemler total'a girmez (eski veri tutarsızlıklarını da temizler)
      const activeItems = orderItems.filter(
        (it) => it.status !== 'cancelled'
      );
      const computedSubtotal = activeItems.reduce((s, it) => {
        if (it.is_complimentary) return s; // ikram total'a etki etmez
        return s + it.unit_price * it.quantity;
      }, 0);
      const computedComp = activeItems.reduce((s, it) => {
        if (!it.is_complimentary) return s;
        return s + it.unit_price * it.quantity;
      }, 0);

      // DB'deki total ile hesaplanan farklıysa hesaplananı güvenir kullan
      // (eski iptal kayıtlarında DB total güncellenmemiş olabilir)
      const dbTotal = Number(o.total);
      const dbSubtotal = Number(o.subtotal);
      const useComputed =
        Math.abs(dbSubtotal - computedSubtotal) > 0.01 ||
        Math.abs(dbTotal - computedSubtotal) > 0.01;

      return {
        id: o.id,
        order_no: o.id.slice(0, 8).toUpperCase(),
        status: o.status,
        payment_status: o.payment_status,
        payment_method: o.payment_method,
        created_at: o.created_at,
        note: o.note,
        source: o.source,
        subtotal: useComputed ? computedSubtotal : dbSubtotal,
        total: useComputed ? computedSubtotal : dbTotal,
        complimentary_total: useComputed
          ? computedComp
          : Number(o.complimentary_total || 0),
        items: orderItems,
      };
    });

    // Lazy reconcile: hepsi cancelled olmuş ama hâlâ aktif görünen siparişleri
    // arka planda kapat ve masayı boşalt (await değil — UI bekletilmesin)
    const stuckOrders = formatted.filter(
      (o) =>
        o.payment_status !== 'paid' &&
        o.items.length > 0 &&
        o.items.every((it) => it.status === 'cancelled')
    );
    if (stuckOrders.length > 0) {
      // Fire-and-forget: bu siparişleri kapat
      const stuckIds = stuckOrders.map((o) => o.id);
      void admin
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Tüm kalemler iptal (reconcile)',
          subtotal: 0,
          total: 0,
        })
        .in('id', stuckIds)
        .then(async () => {
          // Masada başka aktif sipariş yoksa boşalt
          const { data: stillActive } = await admin
            .from('orders')
            .select('id')
            .eq('table_id', tableId)
            .eq('business_id', businessId)
            .not('status', 'in', '(cancelled,delivered)')
            .neq('payment_status', 'paid')
            .limit(1);

          if (!stillActive || stillActive.length === 0) {
            await admin
              .from('tables')
              .update({ status: 'available' })
              .eq('id', tableId);
          }
        });

      // UI'da bunları boş göster (görsel olarak da temizle)
      const cleanedFormatted = formatted.map((o) =>
        stuckIds.includes(o.id)
          ? { ...o, total: 0, subtotal: 0, items: [] }
          : o
      );
      // Stuck olanları tamamen filtreleyip boş listede dön
      const visibleOrders = cleanedFormatted.filter(
        (o) => !stuckIds.includes(o.id)
      );
      return {
        success: true,
        tableName: table.name,
        orders: visibleOrders,
      };
    }

    return { success: true, tableName: table.name, orders: formatted };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Var olan siparişe yeni kalemler ekle
// ============================================================

export async function addItemsToOrder(input: {
  orderId: string;
  cashierId: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    note?: string;
    isComplimentary?: boolean;
    complimentaryReason?: string;
    options?: Array<{
      preset_name: string;
      value_name: string;
      price_delta: number;
    }>;
  }>;
  sendToKitchen?: boolean;
  syncClientId?: string;
}): Promise<{
  success: boolean;
  error?: string;
  alreadyAdded?: boolean;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Idempotency (basit - items.note'a sync id sakla)
    if (input.items.length === 0) {
      return { success: false, error: 'En az bir ürün ekle' };
    }

    // ╔════════════════════════════════════════════════════════════╗
    // ║ SERT VARDIYA MODU                                          ║
    // ║ Kasadan mevcut siparişe kalem ekleme = satış hareketi      ║
    // ║ Vardiya AÇIK olmak zorunda.                                ║
    // ╚════════════════════════════════════════════════════════════╝
    const shiftCheck = await ensureOpenCashSession(admin, businessId);
    if (!shiftCheck.ok) {
      return { success: false, error: shiftCheck.error };
    }

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, subtotal, total, complimentary_total, status, payment_status')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    if (order.payment_status === 'paid') {
      return { success: false, error: 'Ödenmiş siparişe ürün eklenemez' };
    }

    // Yeni kalem totallarını hesapla
    let addSubtotal = 0;
    let addComplimentary = 0;
    input.items.forEach((it) => {
      const optDelta = (it.options || []).reduce(
        (sum, o) => sum + (o.price_delta || 0),
        0
      );
      const lineTotal = (it.unitPrice + optDelta) * it.quantity;
      if (it.isComplimentary) addComplimentary += lineTotal;
      else addSubtotal += lineTotal;
    });

    // Kalemleri ekle
    const itemsToInsert = input.items.map((it) => {
      const optDelta = (it.options || []).reduce(
        (sum, o) => sum + (o.price_delta || 0),
        0
      );
      return {
        order_id: input.orderId,
        product_id: it.productId,
        variant_id: it.variantId || null,
        product_name: it.variantName
          ? `${it.productName} · ${it.variantName}`
          : it.productName,
        quantity: it.quantity,
        unit_price: it.unitPrice + optDelta,
        options: it.options || [],
        note: it.note || null,
        is_complimentary: it.isComplimentary || false,
        complimentary_reason: it.complimentaryReason || null,
        status: 'ordered',
      };
    });

    const { error: itemsErr } = await admin.from('order_items').insert(itemsToInsert);

    if (itemsErr) {
      return { success: false, error: itemsErr.message };
    }

    // Order totallarını güncelle
    const newSubtotal = Number(order.subtotal) + addSubtotal;
    const newTotal = Number(order.total) + addSubtotal;
    const newComp = Number(order.complimentary_total || 0) + addComplimentary;

    await admin
      .from('orders')
      .update({
        subtotal: newSubtotal,
        total: newTotal,
        complimentary_total: newComp,
        // Eğer mutfağa yollandıysa ve sipariş hâlâ received'daysa → confirmed'a çek
        status:
          input.sendToKitchen && order.status === 'received' ? 'confirmed' : order.status,
      })
      .eq('id', input.orderId);

    // Mutfak fişi — sendToKitchen=true ise tüm sipariş için tekrar bas
    // (yeni eklenen kalemleri de içerir, barista bütün siparişi görür)
    if (input.sendToKitchen) {
      try {
        const { requestKitchenReprint } = await import('@/lib/actions/printers');
        await requestKitchenReprint(input.orderId, null);
      } catch (e) {
        console.warn('[aleg] addItemsToOrder kitchen print failed:', e);
      }
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Var olan siparişte bazı kalemleri ikram olarak işaretle
// ============================================================
// Parça parça ikram: "Bu müdavim — cheesecake'i benden"
// Tek kalem veya birden fazla kalem birden ikram edilebilir

export async function makeItemsComplimentary(input: {
  orderId: string;
  itemIds: string[];
  reason: string;
  // Eğer set edilirse: itemIds'in TEK bir kalemi olmalı, o kalemden
  // sadece partialQty kadar ikram edilir, kalanı normal kalem olarak
  // ayrı satıra bölünür.
  partialQty?: number;
}): Promise<{
  success: boolean;
  newTotal?: number;
  newComplimentaryTotal?: number;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.itemIds || input.itemIds.length === 0) {
      return { success: false, error: 'En az bir ürün seç' };
    }
    if (!input.reason || !input.reason.trim()) {
      return { success: false, error: 'İkram sebebi gerekli' };
    }
    if (input.partialQty != null && input.itemIds.length !== 1) {
      return {
        success: false,
        error: 'Partial ikramda sadece tek kalem seç',
      };
    }
    if (input.partialQty != null && input.partialQty < 1) {
      return { success: false, error: 'Partial qty 1 veya daha büyük olmalı' };
    }

    // Order güvenliği
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, payment_status, subtotal, total, complimentary_total')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }
    if (order.payment_status === 'paid') {
      return { success: false, error: 'Ödenmiş siparişe ikram uygulanamaz' };
    }

    // İkram edilecek kalemlerin bilgisini al (önceden ikramlıysa atla)
    const { data: items } = await admin
      .from('order_items')
      .select('*')
      .in('id', input.itemIds)
      .eq('order_id', input.orderId);

    if (!items || items.length === 0) {
      return { success: false, error: 'Kalem bulunamadı' };
    }

    const toFlip = items.filter((it) => !it.is_complimentary);
    if (toFlip.length === 0) {
      return { success: false, error: 'Seçili kalemlerin hepsi zaten ikram' };
    }

    // PARTIAL QTY MODU
    // ───────────────────────────────────────────────────
    // Tek kalem var, partialQty < quantity → kalemi böl:
    //   • Mevcut kalem quantity = partialQty, is_complimentary=true
    //   • Yeni satır: quantity = (quantity - partialQty), is_complimentary=false
    if (input.partialQty != null && toFlip.length === 1) {
      const orig = toFlip[0];
      const origQty = orig.quantity;
      const giftQty = input.partialQty;

      if (giftQty > origQty) {
        return {
          success: false,
          error: `Bu kalemde sadece ${origQty} adet var, ${giftQty} ikram edilemez`,
        };
      }

      // Tüm qty istendiyse normal akışa düş (bölme yok, hepsi ikram)
      if (giftQty === origQty) {
        // partialQty'i null gibi davran — aşağıdaki normal akış halleder
      } else {
        // BÖL
        const remainingQty = origQty - giftQty;
        const giftAmount = Number(orig.unit_price) * giftQty;

        // 1) Mevcut kalemi ikrama çevir + qty düşür
        const { error: updErr } = await admin
          .from('order_items')
          .update({
            quantity: giftQty,
            is_complimentary: true,
            complimentary_reason: input.reason.trim(),
          })
          .eq('id', orig.id);

        if (updErr) {
          return {
            success: false,
            error: `Kalem güncelleme hatası: ${updErr.message}`,
          };
        }

        // 2) Kalan qty için yeni satır ekle (normal, ödenecek)
        // Mevcut kalemin tüm bilgilerini kopyalayıp sadece qty + flag değiştir
        const newRow = {
          ...orig,
          // id'yi sil, DB yeni UUID üretsin
          id: undefined,
          quantity: remainingQty,
          is_complimentary: false,
          complimentary_reason: null,
          paid_by_log_id: null,
          // created_at ve diğer otomatik alanlar
          created_at: undefined,
        };
        // undefined kolonları temizle
        Object.keys(newRow).forEach((k) => {
          if ((newRow as Record<string, unknown>)[k] === undefined) {
            delete (newRow as Record<string, unknown>)[k];
          }
        });

        const { error: insErr } = await admin
          .from('order_items')
          .insert(newRow);

        if (insErr) {
          // Rollback
          await admin
            .from('order_items')
            .update({
              quantity: origQty,
              is_complimentary: false,
              complimentary_reason: null,
            })
            .eq('id', orig.id);
          return {
            success: false,
            error: `Yeni satır eklenemedi: ${insErr.message}`,
          };
        }

        // Order totallarını güncelle
        // Subtotal/Total: gift kadar düşer
        // Complimentary_total: gift kadar artar
        const newSubtotal = Math.max(
          0,
          Number(order.subtotal) - giftAmount
        );
        const newTotal = Math.max(0, Number(order.total) - giftAmount);
        const newComp =
          Number(order.complimentary_total || 0) + giftAmount;

        await admin
          .from('orders')
          .update({
            subtotal: newSubtotal,
            total: newTotal,
            complimentary_total: newComp,
          })
          .eq('id', input.orderId);

        // AUDIT LOG
        const performer = await fetchPerformerInfo(memberId);
        void logAction({
          businessId,
          orderId: input.orderId,
          action: 'item_complimentary',
          details: {
            itemId: orig.id,
            productName: orig.product_name,
            quantity: giftQty,
            unitPrice: Number(orig.unit_price),
            amount: giftAmount,
            reason: input.reason.trim(),
            partial: true,
            originalQty: origQty,
          },
          ...performer,
        });

        revalidatePath('/kasa');
        revalidatePath('/panel/masalar');

        return {
          success: true,
          newTotal,
          newComplimentaryTotal: newComp,
        };
      }
    }

    // İkram edilen tutar toplamı (normal akış)
    const flippedTotal = toFlip.reduce(
      (s, it) => s + Number(it.unit_price) * it.quantity,
      0
    );

    // Kalemleri ikrama çevir
    await admin
      .from('order_items')
      .update({
        is_complimentary: true,
        complimentary_reason: input.reason.trim(),
      })
      .in('id', toFlip.map((it) => it.id));

    // Order totallarını güncelle
    const newSubtotal = Math.max(0, Number(order.subtotal) - flippedTotal);
    const newTotal = Math.max(0, Number(order.total) - flippedTotal);
    const newComp = Number(order.complimentary_total || 0) + flippedTotal;

    await admin
      .from('orders')
      .update({
        subtotal: newSubtotal,
        total: newTotal,
        complimentary_total: newComp,
      })
      .eq('id', input.orderId);

    // AUDIT LOG: ikram edilen her kalem
    const performer = await fetchPerformerInfo(memberId);
    for (const it of toFlip) {
      void logAction({
        businessId,
        orderId: input.orderId,
        action: 'item_complimentary',
        details: {
          itemId: it.id,
          productName: it.product_name,
          quantity: it.quantity,
          unitPrice: Number(it.unit_price),
          amount: Number(it.unit_price) * it.quantity,
          reason: input.reason.trim(),
        },
        ...performer,
      });
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return {
      success: true,
      newTotal,
      newComplimentaryTotal: newComp,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Tek sipariş bilgisini getir (ödeme için)
// ============================================================

export type OrderForPayment = {
  id: string;
  order_no: string;
  total: number;
  table_label: string | null;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    is_complimentary?: boolean;
    complimentary_reason?: string | null;
  }>;
};

export async function getOrderForPayment(orderId: string): Promise<{
  success: boolean;
  order?: OrderForPayment;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, total, table_id, tables(name)')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    const { data: items } = await admin
      .from('order_items')
      .select('id, product_name, quantity, unit_price, is_complimentary, complimentary_reason')
      .eq('order_id', orderId);

    const tableJoin = order.tables as unknown as { name?: string } | { name?: string }[] | null;
    const tableName = Array.isArray(tableJoin)
      ? tableJoin[0]?.name || null
      : tableJoin?.name || null;

    return {
      success: true,
      order: {
        id: order.id,
        order_no: order.id.slice(0, 8).toUpperCase(),
        total: Number(order.total),
        table_label: tableName,
        items: (items || []).map((it) => ({
          id: it.id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          is_complimentary: it.is_complimentary || false,
          complimentary_reason: it.complimentary_reason || null,
        })),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Tek sipariş'i HesapPanel'e uygun TableOrderDetail formatında getirir.
// Hızlı satış akışında kullanılır (tableId yok).
// ============================================================
export async function getOrderAsDetail(orderId: string): Promise<{
  success: boolean;
  order?: TableOrderDetail;
  tableName?: string;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Order ve items paralel — sequential 2 round-trip yerine 1
    const [orderResp, itemsResp] = await Promise.all([
      admin
        .from('orders')
        .select(`
          id, business_id, order_no, status, payment_status, payment_method,
          created_at, note, table_id, subtotal, total, complimentary_total,
          tables(name)
        `)
        .eq('id', orderId)
        .maybeSingle(),
      admin
        .from('order_items')
        .select(`
          id, product_name, quantity, unit_price, status, note,
          is_complimentary, complimentary_reason
        `)
        .eq('order_id', orderId),
    ]);

    const { data: order, error: orderErr } = orderResp;
    if (orderErr) return { success: false, error: orderErr.message };
    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    const items = itemsResp.data;

    const tableJoin = order.tables as unknown as { name?: string } | { name?: string }[] | null;
    const tableName = Array.isArray(tableJoin)
      ? tableJoin[0]?.name || ''
      : tableJoin?.name || '';

    const detail: TableOrderDetail = {
      id: order.id,
      order_no: order.order_no || order.id.slice(0, 8).toUpperCase(),
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      created_at: order.created_at,
      note: order.note,
      source: 'manual',
      subtotal: Number(order.subtotal || 0),
      total: Number(order.total || 0),
      complimentary_total: Number(order.complimentary_total || 0),
      items: (items || []).map((it) => ({
        id: it.id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        status: it.status,
        note: it.note,
        is_complimentary: it.is_complimentary || false,
        complimentary_reason: it.complimentary_reason || null,
      })),
    };

    return { success: true, order: detail, tableName };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// MASA YÖNETİMİ — DEĞİŞTİR / BİRLEŞTİR / BÖL
// ============================================================

// 1) Masa Değiştir — bu siparişi başka masaya taşı
export async function changeOrderTable(input: {
  orderId: string;
  newTableId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Sipariş bilgisi
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, table_id, payment_status')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }
    if (order.payment_status === 'paid') {
      return { success: false, error: 'Ödenmiş sipariş taşınamaz' };
    }
    if (order.table_id === input.newTableId) {
      return { success: false, error: 'Sipariş zaten bu masada' };
    }

    // Yeni masa güvenliği
    const { data: newTable } = await admin
      .from('tables')
      .select('id, business_id, status')
      .eq('id', input.newTableId)
      .maybeSingle();

    if (!newTable || newTable.business_id !== businessId) {
      return { success: false, error: 'Yeni masa bulunamadı' };
    }

    const oldTableId = order.table_id;

    // Siparişi yeni masaya bağla
    await admin
      .from('orders')
      .update({ table_id: input.newTableId })
      .eq('id', input.orderId);

    // Yeni masa occupied
    await admin
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', input.newTableId);

    // Eski masa — başka aktif sipariş yoksa boşalt
    if (oldTableId) {
      const [inProc, delivUnpaid] = await Promise.all([
        admin.from('orders').select('id').eq('business_id', businessId)
          .eq('table_id', oldTableId)
          .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way']),
        admin.from('orders').select('id').eq('business_id', businessId)
          .eq('table_id', oldTableId)
          .eq('status', 'delivered')
          .not('payment_status', 'in', '(paid,refunded)'),
      ]);
      const otherActive = (inProc.data?.length || 0) + (delivUnpaid.data?.length || 0);
      if (otherActive === 0) {
        await admin
          .from('tables')
          .update({ status: 'available' })
          .eq('id', oldTableId);
      }
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// 2) Masa Birleştir — fromTableId'deki tüm aktif siparişleri toTableId'ye taşı
export async function mergeTables(input: {
  fromTableId: string;
  toTableId: string;
}): Promise<{
  success: boolean;
  movedCount?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (input.fromTableId === input.toTableId) {
      return { success: false, error: 'Aynı masa seçilemez' };
    }

    // Masaların güvenliği
    const { data: tables } = await admin
      .from('tables')
      .select('id, business_id, name')
      .in('id', [input.fromTableId, input.toTableId]);

    if (!tables || tables.length !== 2) {
      return { success: false, error: 'Masalar bulunamadı' };
    }
    if (tables.some((t) => t.business_id !== businessId)) {
      return { success: false, error: 'Yetkisiz masa' };
    }

    // From'daki aktif siparişleri bul
    const [inProc, delivUnpaid] = await Promise.all([
      admin.from('orders').select('id').eq('business_id', businessId)
        .eq('table_id', input.fromTableId)
        .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way']),
      admin.from('orders').select('id').eq('business_id', businessId)
        .eq('table_id', input.fromTableId)
        .eq('status', 'delivered')
        .not('payment_status', 'in', '(paid,refunded)'),
    ]);
    const movingIds = [
      ...(inProc.data || []).map((o) => o.id),
      ...(delivUnpaid.data || []).map((o) => o.id),
    ];

    if (movingIds.length === 0) {
      return { success: false, error: 'Taşınacak aktif sipariş yok' };
    }

    // Hepsini yeni masaya bağla
    await admin
      .from('orders')
      .update({ table_id: input.toTableId })
      .in('id', movingIds);

    // Yeni masa occupied, eski masa available
    await admin.from('tables').update({ status: 'occupied' }).eq('id', input.toTableId);
    await admin.from('tables').update({ status: 'available' }).eq('id', input.fromTableId);

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return { success: true, movedCount: movingIds.length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// 3) Masa Böl — bir siparişteki bazı kalemleri YENİ bir siparişe taşı
// Yeni sipariş başka masada veya aynı masada "ayrı hesap" olarak kalabilir
export async function splitOrderItems(input: {
  orderId: string;
  itemIds: string[];
  targetTableId: string; // aynı masa da olabilir (ayrı hesap) veya farklı masa
  cashierId: string;
}): Promise<{
  success: boolean;
  newOrderId?: string;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.itemIds || input.itemIds.length === 0) {
      return { success: false, error: 'En az bir ürün seç' };
    }

    // Mevcut sipariş
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, table_id, subtotal, total, complimentary_total, payment_status, order_type, source, created_by_cashier')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }
    if (order.payment_status === 'paid') {
      return { success: false, error: 'Ödenmiş sipariş bölünemez' };
    }

    // Hedef masa güvenlik
    const { data: targetTable } = await admin
      .from('tables')
      .select('id, business_id')
      .eq('id', input.targetTableId)
      .maybeSingle();
    if (!targetTable || targetTable.business_id !== businessId) {
      return { success: false, error: 'Hedef masa bulunamadı' };
    }

    // Taşınacak kalemleri al
    const { data: items, error: itemsErr } = await admin
      .from('order_items')
      .select('id, order_id, product_id, variant_id, product_name, quantity, unit_price, options, note, is_complimentary, complimentary_reason, status, paid_by_log_id')
      .in('id', input.itemIds)
      .eq('order_id', input.orderId);

    if (itemsErr) {
      return { success: false, error: 'Ürünler sorgulanamadı: ' + itemsErr.message };
    }
    if (!items || items.length === 0) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    // Ödenmiş (partial) kalemleri taşıma
    const movable = items.filter((it) => !it.paid_by_log_id);
    if (movable.length === 0) {
      return { success: false, error: 'Seçili ürünler zaten ödenmiş, taşınamaz' };
    }

    // Yeni siparişin total hesabı
    let newSubtotal = 0;
    let newComp = 0;
    movable.forEach((it) => {
      const lineTotal = Number(it.unit_price) * it.quantity;
      if (it.is_complimentary) newComp += lineTotal;
      else newSubtotal += lineTotal;
    });
    const newOrderTotal = newSubtotal;

    // Yeni sipariş oluştur (mevcut siparişin kopyası ama yeni id + yeni masa)
    const { data: newOrder, error: newOrderErr } = await admin
      .from('orders')
      .insert({
        business_id: businessId,
        table_id: input.targetTableId,
        order_type: order.order_type,
        status: 'confirmed', // zaten mutfakta, devam
        payment_status: 'pending',
        subtotal: newSubtotal,
        total: newOrderTotal,
        complimentary_total: newComp,
        source: 'manual',
        created_by_cashier: input.cashierId,
        note: 'Masa Böl (kaynak: ' + input.orderId.slice(0, 8) + ')',
      })
      .select('id')
      .single();

    if (newOrderErr || !newOrder) {
      return { success: false, error: newOrderErr?.message || 'Yeni sipariş oluşturulamadı' };
    }

    // Kalemleri yeni siparişe bağla
    await admin
      .from('order_items')
      .update({ order_id: newOrder.id })
      .in('id', movable.map((it) => it.id));

    // Eski siparişin totali güncelle
    const oldSubtotal = Math.max(0, Number(order.subtotal) - newSubtotal);
    const oldTotal = Math.max(0, Number(order.total) - newOrderTotal);
    const oldComp = Math.max(0, Number(order.complimentary_total || 0) - newComp);

    await admin
      .from('orders')
      .update({
        subtotal: oldSubtotal,
        total: oldTotal,
        complimentary_total: oldComp,
      })
      .eq('id', input.orderId);

    // Hedef masa occupied
    await admin.from('tables').update({ status: 'occupied' }).eq('id', input.targetTableId);

    // Eğer eski siparişte hiç kalem kalmadıysa eski siparişi iptal et + eski masayı kontrol et
    const { data: remainingItems } = await admin
      .from('order_items')
      .select('id')
      .eq('order_id', input.orderId);

    if (!remainingItems || remainingItems.length === 0) {
      await admin
        .from('orders')
        .update({ status: 'cancelled', total: 0, subtotal: 0 })
        .eq('id', input.orderId);
    }

    // Eski masanın güncel durumu
    if (order.table_id && order.table_id !== input.targetTableId) {
      const [inProc, delivUnpaid] = await Promise.all([
        admin.from('orders').select('id').eq('business_id', businessId)
          .eq('table_id', order.table_id)
          .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way']),
        admin.from('orders').select('id').eq('business_id', businessId)
          .eq('table_id', order.table_id)
          .eq('status', 'delivered')
          .not('payment_status', 'in', '(paid,refunded)'),
      ]);
      const otherActive = (inProc.data?.length || 0) + (delivUnpaid.data?.length || 0);
      if (otherActive === 0) {
        await admin.from('tables').update({ status: 'available' }).eq('id', order.table_id);
      }
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return { success: true, newOrderId: newOrder.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Mevcut tüm boş masaları + aktif tabelaları döner (masa değiştir picker için)
export async function listTablesForMove(): Promise<{
  success: boolean;
  tables?: Array<{
    id: string;
    name: string;
    status: string;
    zone_name: string | null;
    is_occupied: boolean;
  }>;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Zones ve tables ayrı çekilir (join syntax sorunlarından kaçınmak için)
    const [zonesResp, tablesResp] = await Promise.all([
      admin
        .from('table_zones')
        .select('id, name')
        .eq('business_id', businessId),
      admin
        .from('tables')
        .select('id, name, status, zone_id')
        .eq('business_id', businessId)
        .neq('status', 'inactive')
        .order('name', { ascending: true }),
    ]);

    if (tablesResp.error) {
      return { success: false, error: tablesResp.error.message };
    }

    const zoneMap = new Map<string, string>();
    (zonesResp.data || []).forEach((z) => zoneMap.set(z.id, z.name));

    const tables = (tablesResp.data || []).map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      zone_name: t.zone_id ? zoneMap.get(t.zone_id) || null : null,
      is_occupied: t.status === 'occupied',
    }));

    return { success: true, tables };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ÇOKLU SİPARİŞ KALEMLERİNİ AYIR — Masa böl için gelişmiş
// ============================================================
// Birden fazla siparişten kalemler seçilir, HEPSİ tek yeni siparişe taşınır
// (aynı masada ayrı hesap veya başka masa)

export async function splitItemsFromMultipleOrders(input: {
  itemIds: string[];
  targetTableId: string | null; // null ise masasız sipariş (hızlı satış parsiyel)
  cashierId: string;
}): Promise<{
  success: boolean;
  newOrderId?: string;
  movedCount?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.itemIds || input.itemIds.length === 0) {
      return { success: false, error: 'En az bir ürün seç' };
    }

    // Hedef masa güvenliği (null ise atla — masasız split)
    if (input.targetTableId) {
      const { data: targetTable } = await admin
        .from('tables')
        .select('id, business_id')
        .eq('id', input.targetTableId)
        .maybeSingle();
      if (!targetTable || targetTable.business_id !== businessId) {
        return { success: false, error: 'Hedef masa bulunamadı' };
      }
    }

    // Taşınacak kalemleri topla — hangi siparişlerden olduğu önemli
    const { data: items, error: itemsErr } = await admin
      .from('order_items')
      .select('id, order_id, product_id, variant_id, product_name, quantity, unit_price, options, note, is_complimentary, complimentary_reason, status, paid_by_log_id')
      .in('id', input.itemIds);

    if (itemsErr) {
      return { success: false, error: 'Ürünler sorgulanamadı: ' + itemsErr.message };
    }
    if (!items || items.length === 0) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    // Ödenmiş kalemler taşınamaz
    const movable = items.filter((it) => !it.paid_by_log_id);
    if (movable.length === 0) {
      return { success: false, error: 'Seçili ürünler zaten ödenmiş' };
    }

    // Kaynak siparişler — her biri için ayrı işlem yapacağız
    const sourceOrderIds = [...new Set(movable.map((it) => it.order_id))];

    // Kaynak siparişlerin bilgilerini al (güvenlik + total güncelleme)
    const { data: sourceOrders } = await admin
      .from('orders')
      .select('id, business_id, table_id, subtotal, total, complimentary_total, payment_status, order_type, source, created_by_cashier')
      .in('id', sourceOrderIds);

    if (!sourceOrders || sourceOrders.length !== sourceOrderIds.length) {
      return { success: false, error: 'Kaynak siparişler bulunamadı' };
    }
    if (sourceOrders.some((o) => o.business_id !== businessId)) {
      return { success: false, error: 'Yetkisiz sipariş' };
    }
    if (sourceOrders.some((o) => o.payment_status === 'paid')) {
      return { success: false, error: 'Ödenmiş sipariş varsa bölünemez' };
    }

    // Yeni siparişin toplamını hesapla
    let newSubtotal = 0;
    let newComp = 0;
    movable.forEach((it) => {
      const lineTotal = Number(it.unit_price) * it.quantity;
      if (it.is_complimentary) newComp += lineTotal;
      else newSubtotal += lineTotal;
    });

    const firstOrder = sourceOrders[0];
    const orderType = firstOrder.order_type;

    // Yeni sipariş kaydı
    const sourceIdsShort = sourceOrderIds.map((id) => id.slice(0, 8)).join(', ');
    const { data: newOrder, error: newOrderErr } = await admin
      .from('orders')
      .insert({
        business_id: businessId,
        table_id: input.targetTableId,
        order_type: orderType,
        status: 'confirmed',
        payment_status: 'pending',
        subtotal: newSubtotal,
        total: newSubtotal,
        complimentary_total: newComp,
        source: 'manual',
        created_by_cashier: input.cashierId,
        note: 'Masa Böl (kaynak: ' + sourceIdsShort + ')',
      })
      .select('id')
      .single();

    if (newOrderErr || !newOrder) {
      return { success: false, error: newOrderErr?.message || 'Yeni sipariş oluşturulamadı' };
    }

    // Tüm kalemleri yeni siparişe bağla
    await admin
      .from('order_items')
      .update({ order_id: newOrder.id })
      .in('id', movable.map((it) => it.id));

    // Her kaynak sipariş için total güncellemesi + boş kaldıysa iptal
    for (const srcOrder of sourceOrders) {
      const movedFromThis = movable.filter((it) => it.order_id === srcOrder.id);
      if (movedFromThis.length === 0) continue;

      let removedSubtotal = 0;
      let removedComp = 0;
      movedFromThis.forEach((it) => {
        const lineTotal = Number(it.unit_price) * it.quantity;
        if (it.is_complimentary) removedComp += lineTotal;
        else removedSubtotal += lineTotal;
      });

      const newSrcSubtotal = Math.max(0, Number(srcOrder.subtotal) - removedSubtotal);
      const newSrcTotal = Math.max(0, Number(srcOrder.total) - removedSubtotal);
      const newSrcComp = Math.max(0, Number(srcOrder.complimentary_total || 0) - removedComp);

      await admin
        .from('orders')
        .update({
          subtotal: newSrcSubtotal,
          total: newSrcTotal,
          complimentary_total: newSrcComp,
        })
        .eq('id', srcOrder.id);

      // Kaynak siparişte kalem kaldı mı?
      const { data: remaining } = await admin
        .from('order_items')
        .select('id')
        .eq('order_id', srcOrder.id);

      if (!remaining || remaining.length === 0) {
        // Boş kaldı → cancelled
        await admin
          .from('orders')
          .update({ status: 'cancelled', total: 0, subtotal: 0 })
          .eq('id', srcOrder.id);
      }
    }

    // Hedef masa occupied (null ise atla — masasız split)
    if (input.targetTableId) {
      await admin.from('tables').update({ status: 'occupied' }).eq('id', input.targetTableId);
    }

    // Kaynak masalar — başka aktif sipariş yoksa boşalt
    const sourceTableIds = [...new Set(
      sourceOrders
        .map((o) => o.table_id)
        .filter((tid): tid is string => !!tid && tid !== input.targetTableId)
    )];

    for (const srcTableId of sourceTableIds) {
      const [inProc, delivUnpaid] = await Promise.all([
        admin.from('orders').select('id').eq('business_id', businessId)
          .eq('table_id', srcTableId)
          .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way']),
        admin.from('orders').select('id').eq('business_id', businessId)
          .eq('table_id', srcTableId)
          .eq('status', 'delivered')
          .not('payment_status', 'in', '(paid,refunded)'),
      ]);
      const otherActive = (inProc.data?.length || 0) + (delivUnpaid.data?.length || 0);
      if (otherActive === 0) {
        await admin.from('tables').update({ status: 'available' }).eq('id', srcTableId);
      }
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return {
      success: true,
      newOrderId: newOrder.id,
      movedCount: movable.length,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// CANCEL ORDER ITEMS — Seçili kalemleri iptal et
// ============================================================
export async function cancelOrderItems(input: {
  itemIds: string[];
  reason?: string;
  // Eğer set edilirse: itemIds tek kalem olmalı, o kalemden sadece
  // partialQty kadar iptal edilir, kalanı normal kalem olarak ayrı
  // satıra bölünür.
  partialQty?: number;
}): Promise<{
  success: boolean;
  cancelledCount?: number;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.itemIds || input.itemIds.length === 0) {
      return { success: false, error: 'En az bir kalem seç' };
    }
    if (input.partialQty != null && input.itemIds.length !== 1) {
      return {
        success: false,
        error: 'Partial iptalde sadece tek kalem seç',
      };
    }
    if (input.partialQty != null && input.partialQty < 1) {
      return { success: false, error: 'Partial qty 1 veya daha büyük olmalı' };
    }

    // Kalemleri al + sipariş güvenlik kontrolü
    const { data: items } = await admin
      .from('order_items')
      .select('*')
      .in('id', input.itemIds);

    if (!items || items.length === 0) {
      return { success: false, error: 'Kalem bulunamadı' };
    }

    // Ödenmiş kalemler iptal edilemez
    const paidItems = items.filter((it) => it.paid_by_log_id);
    if (paidItems.length > 0) {
      return { success: false, error: 'Ödenmiş kalemler iptal edilemez' };
    }

    // Zaten iptal edilmiş olanları çıkar
    const toCancel = items.filter((it) => it.status !== 'cancelled');
    if (toCancel.length === 0) {
      return { success: false, error: 'Seçili kalemler zaten iptal' };
    }

    // Sipariş güvenliği
    const orderIds = [...new Set(toCancel.map((it) => it.order_id))];
    const { data: orders } = await admin
      .from('orders')
      .select('id, business_id, subtotal, total, complimentary_total, payment_status')
      .in('id', orderIds);

    if (!orders || orders.some((o) => o.business_id !== businessId)) {
      return { success: false, error: 'Yetkisiz sipariş' };
    }
    if (orders.some((o) => o.payment_status === 'paid')) {
      return { success: false, error: 'Ödenmiş sipariş kalemleri iptal edilemez' };
    }

    const cancelReasonText = input.reason?.trim() || 'Kasiyer iptal';

    // ═══════════════════════════════════════════════════
    // PARTIAL QTY MODU
    // ═══════════════════════════════════════════════════
    // Tek kalem var, partialQty < quantity → kalemi böl:
    //   • Mevcut kalem: quantity = partialQty, status='cancelled'
    //   • Yeni satır:   quantity = (orig - partialQty), status normal
    if (input.partialQty != null && toCancel.length === 1) {
      const orig = toCancel[0];
      const origQty = orig.quantity;
      const cancelQty = input.partialQty;

      if (cancelQty > origQty) {
        return {
          success: false,
          error: `Bu kalemde sadece ${origQty} adet var, ${cancelQty} iptal edilemez`,
        };
      }

      // Tüm qty istendiyse normal akışa düş (bölme yok)
      if (cancelQty < origQty) {
        const remainingQty = origQty - cancelQty;
        const cancelAmount = orig.is_complimentary
          ? 0
          : Number(orig.unit_price) * cancelQty;
        const cancelCompAmount = orig.is_complimentary
          ? Number(orig.unit_price) * cancelQty
          : 0;

        // 1) Mevcut kalemi cancel et + qty düşür
        // Önce cancel_reason ile dene
        const { error: updErr1 } = await admin
          .from('order_items')
          .update({
            quantity: cancelQty,
            status: 'cancelled',
            cancel_reason: cancelReasonText,
          })
          .eq('id', orig.id);

        if (updErr1) {
          // Fallback: cancel_reason kolonu yoksa
          const { error: updErr2 } = await admin
            .from('order_items')
            .update({
              quantity: cancelQty,
              status: 'cancelled',
            })
            .eq('id', orig.id);
          if (updErr2) {
            return {
              success: false,
              error: `Kalem güncelleme hatası: ${updErr2.message}`,
            };
          }
        }

        // 2) Kalan qty için yeni satır ekle (normal)
        const newRow = {
          ...orig,
          id: undefined,
          quantity: remainingQty,
          status: orig.status === 'cancelled' ? 'ordered' : orig.status,
          cancel_reason: null,
          paid_by_log_id: null,
          created_at: undefined,
        };
        Object.keys(newRow).forEach((k) => {
          if ((newRow as Record<string, unknown>)[k] === undefined) {
            delete (newRow as Record<string, unknown>)[k];
          }
        });

        const { error: insErr } = await admin
          .from('order_items')
          .insert(newRow);

        if (insErr) {
          // Rollback
          await admin
            .from('order_items')
            .update({
              quantity: origQty,
              status: orig.status,
              cancel_reason: null,
            })
            .eq('id', orig.id);
          return {
            success: false,
            error: `Yeni satır eklenemedi: ${insErr.message}`,
          };
        }

        // Order totallarını güncelle
        const order = orders.find((o) => o.id === orig.order_id);
        if (order) {
          const newSubtotal = Math.max(
            0,
            Number(order.subtotal) - cancelAmount
          );
          const newTotal = Math.max(0, Number(order.total) - cancelAmount);
          const newComp = Math.max(
            0,
            Number(order.complimentary_total || 0) - cancelCompAmount
          );

          await admin
            .from('orders')
            .update({
              subtotal: newSubtotal,
              total: newTotal,
              complimentary_total: newComp,
            })
            .eq('id', orig.order_id);
        }

        // AUDIT LOG
        const performer = await fetchPerformerInfo(memberId);
        void logAction({
          businessId,
          orderId: orig.order_id,
          action: 'item_cancelled',
          details: {
            itemId: orig.id,
            productName: orig.product_name,
            quantity: cancelQty,
            unitPrice: Number(orig.unit_price),
            amount: cancelAmount,
            reason: cancelReasonText,
            wasComplimentary: orig.is_complimentary || false,
            partial: true,
            originalQty: origQty,
          },
          ...performer,
        });

        return {
          success: true,
          cancelledCount: cancelQty,
        };
      }
    }

    // ═══════════════════════════════════════════════════
    // NORMAL AKIŞ (tüm seçili kalemleri iptal)
    // ═══════════════════════════════════════════════════
    // Önce cancel_reason ile dene (yeni schema)
    const { error: updateError1 } = await admin
      .from('order_items')
      .update({
        status: 'cancelled',
        cancel_reason: cancelReasonText,
      })
      .in('id', toCancel.map((it) => it.id));

    if (updateError1) {
      // cancel_reason kolonu yoksa eski yöntem dene (sadece status)
      const { error: updateError2 } = await admin
        .from('order_items')
        .update({
          status: 'cancelled',
        })
        .in('id', toCancel.map((it) => it.id));

      if (updateError2) {
        return {
          success: false,
          error: `Kalem iptal hatası: ${updateError2.message}`,
        };
      }
    }

    // Sipariş bazlı total güncelle
    const closedOrderIds: string[] = [];
    for (const order of orders) {
      const orderItems = toCancel.filter((it) => it.order_id === order.id);
      const cancelledAmount = orderItems.reduce((s, it) => {
        if (it.is_complimentary) return s; // ikram zaten total'a etki etmiyor
        return s + Number(it.unit_price) * it.quantity;
      }, 0);
      const cancelledComp = orderItems.reduce((s, it) => {
        if (!it.is_complimentary) return s;
        return s + Number(it.unit_price) * it.quantity;
      }, 0);

      const newSubtotal = Math.max(0, Number(order.subtotal) - cancelledAmount);
      const newTotal = Math.max(0, Number(order.total) - cancelledAmount);
      const newComp = Math.max(
        0,
        Number(order.complimentary_total) - cancelledComp
      );

      // Siparişin geri kalan aktif kalemlerini kontrol et
      // Eğer hiç aktif kalem kalmadıysa siparişi de kapatalım
      const { data: remainingItems } = await admin
        .from('order_items')
        .select('id, status')
        .eq('order_id', order.id);

      const stillActive = (remainingItems || []).filter(
        (it) => it.status !== 'cancelled'
      );

      const updatePayload: {
        subtotal: number;
        total: number;
        complimentary_total: number;
        payment_status?: string;
        status?: string;
        cancelled_at?: string;
        cancel_reason?: string;
      } = {
        subtotal: newSubtotal,
        total: newTotal,
        complimentary_total: newComp,
      };

      if (stillActive.length === 0) {
        // Hiç aktif kalem yok — siparişi tümüyle iptal say
        updatePayload.status = 'cancelled';
        updatePayload.cancelled_at = new Date().toISOString();
        updatePayload.cancel_reason =
          input.reason?.trim() || 'Tüm kalemler iptal';
        closedOrderIds.push(order.id);
      }

      await admin
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id);
    }

    // Tüm kalemleri iptal edilen siparişlerin masalarını boşaltmayı dene
    // (closeOrderAndMaybeFreeTable benzeri logic, ama tabloyu sadece
    // o masada başka aktif sipariş yoksa boşalt)
    if (closedOrderIds.length > 0) {
      // Bu siparişlerin table_id'lerini al
      const { data: closedOrders } = await admin
        .from('orders')
        .select('id, table_id')
        .in('id', closedOrderIds);

      const tableIds = [
        ...new Set(
          (closedOrders || [])
            .map((o) => o.table_id as string | null)
            .filter((tid): tid is string => !!tid)
        ),
      ];

      for (const tableId of tableIds) {
        // Bu masada başka aktif sipariş var mı?
        const { data: activeOrders } = await admin
          .from('orders')
          .select('id')
          .eq('table_id', tableId)
          .eq('business_id', businessId)
          .not('status', 'in', '(cancelled,delivered)')
          .neq('payment_status', 'paid')
          .limit(1);

        if (!activeOrders || activeOrders.length === 0) {
          // Masayı boşalt
          await admin
            .from('tables')
            .update({ status: 'available' })
            .eq('id', tableId);
        }
      }
    }

    // AUDIT LOG: her iptal edilen kalem için ayrı kayıt
    const performer = await fetchPerformerInfo(memberId);
    for (const it of toCancel) {
      void logAction({
        businessId,
        orderId: it.order_id,
        action: 'item_cancelled',
        details: {
          itemId: it.id,
          productName: it.product_name,
          quantity: it.quantity,
          unitPrice: Number(it.unit_price),
          amount: Number(it.unit_price) * it.quantity,
          reason: cancelReasonText,
          wasComplimentary: it.is_complimentary || false,
        },
        ...performer,
      });
    }

    return {
      success: true,
      cancelledCount: toCancel.length,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// CLOSE ORDER ON ACCOUNT — Açık hesap (cari) olarak kapat
// ============================================================
export async function closeOrderOnAccount(input: {
  orderId: string;
  cashierId: string;
  customerId: string; // ZORUNLU - kayıtlı cari kullanıcı
  customerNote?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Input validation
    if (!input.orderId) {
      return { success: false, error: 'Sipariş ID boş (orderId yok)' };
    }
    if (!input.customerId) {
      return { success: false, error: 'Kullanıcı seçilmedi' };
    }
    if (!input.cashierId) {
      return { success: false, error: 'Kasiyer bilgisi yok' };
    }

    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Sipariş güvenliği — detaylı hata
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, business_id, payment_status, total, order_no, table_id')
      .eq('id', input.orderId)
      .maybeSingle();

    if (orderErr) {
      return { success: false, error: `Sipariş query hatası: ${orderErr.message}` };
    }
    if (!order) {
      return {
        success: false,
        error: `Sipariş bulunamadı (ID: ${input.orderId.slice(0, 8)}…). Sayfayı yenileyin.`,
      };
    }
    if (order.business_id !== businessId) {
      return {
        success: false,
        error: 'Sipariş başka bir işletmeye ait',
      };
    }
    if (order.payment_status === 'paid') {
      return {
        success: false,
        error: `Sipariş #${order.order_no} zaten ödenmiş. Sayfayı yenileyin.`,
      };
    }
    if (order.payment_status === 'refunded') {
      return {
        success: false,
        error: `Sipariş #${order.order_no} iade edildi`,
      };
    }

    // Cari kullanıcı güvenliği
    const { data: customer, error: custErr } = await admin
      .from('customers')
      .select('id, business_id, name, is_active')
      .eq('id', input.customerId)
      .maybeSingle();

    if (custErr) {
      return { success: false, error: `Kullanıcı query hatası: ${custErr.message}` };
    }
    if (!customer) {
      return { success: false, error: 'Seçilen kullanıcı bulunamadı' };
    }
    if (customer.business_id !== businessId) {
      return { success: false, error: 'Kullanıcı başka işletmeye ait' };
    }
    if (!customer.is_active) {
      return { success: false, error: `${customer.name} pasif kullanıcı` };
    }

    const totalAmount = Number(order.total);
    const noteText = input.customerNote?.trim()
      ? `Açık hesap (${customer.name}): ${input.customerNote.trim()}`
      : `Açık hesap (${customer.name})`;

    // payment_logs'a kayıt — ciro takip için
    // Not: 'other' method kullanılıyor çünkü gerçek nakit/kart girişi YOK,
    // sadece sipariş kaydedildi. Asıl ödeme cari sayfasından alınacak.
    await admin.from('payment_logs').insert({
      business_id: businessId,
      order_id: input.orderId,
      cashier_id: input.cashierId,
      action: 'payment',
      amount: totalAmount,
      payment_method: 'other',
      note: noteText,
    });

    // Sipariş'i bağla + paid olarak işaretle
    await admin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: 'other',
        note: noteText,
        customer_id: input.customerId,
      })
      .eq('id', input.orderId);

    // customer_transactions'a 'charge' kaydı (kullanıcıya borç eklendi)
    await admin.from('customer_transactions').insert({
      business_id: businessId,
      customer_id: input.customerId,
      type: 'charge',
      amount: totalAmount,
      order_id: input.orderId,
      cashier_id: input.cashierId,
      member_id: memberId,
      note: input.customerNote?.trim() || null,
    });

    // customers.balance + counters'ı yeniden hesapla
    const { data: allTxs } = await admin
      .from('customer_transactions')
      .select('type, amount, created_at')
      .eq('customer_id', input.customerId);

    let balance = 0;
    let totalCharged = 0;
    let totalPaid = 0;
    let lastAt: string | null = null;
    (allTxs || []).forEach((t) => {
      const amt = Number(t.amount);
      if (t.type === 'charge' || t.type === 'manual_charge') {
        balance -= amt;
        totalCharged += amt;
      } else {
        balance += amt;
        totalPaid += amt;
      }
      if (!lastAt || t.created_at > lastAt) lastAt = t.created_at;
    });

    await admin
      .from('customers')
      .update({
        balance,
        total_charged: totalCharged,
        total_paid: totalPaid,
        transaction_count: allTxs?.length || 0,
        last_transaction_at: lastAt,
      })
      .eq('id', input.customerId);

    // Masada başka aktif sipariş yoksa masayı boşalt
    await closeOrderAndMaybeFreeTable(
      admin,
      businessId,
      input.orderId,
      order.table_id
    );

    revalidatePath('/kasa');
    revalidatePath('/panel/cari-hesaplar');

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}
