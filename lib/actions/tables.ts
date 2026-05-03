'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// Masa Yönetimi - Server Actions
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
// Types
// ============================================================

export type TableZone = {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  table_count: number;
};

export type TableItem = {
  id: string;
  name: string;
  capacity: number;
  zone_id: string | null;
  zone_name: string | null;
  zone_color: string | null;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  active_orders_count: number;
};

// ============================================================
// LIST — Masalar + Bölgeler
// ============================================================

export async function getTablesWithZones(): Promise<{
  success: boolean;
  tables?: TableItem[];
  zones?: TableZone[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Bölgeler
    const { data: zonesRaw, error: zonesError } = await admin
      .from('table_zones')
      .select('id, name, color, sort_order')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true });

    if (zonesError) {
      return { success: false, error: zonesError.message };
    }

    // Masalar
    const { data: tablesRaw, error: tablesError } = await admin
      .from('tables')
      .select('id, name, capacity, zone_id, status, table_zones(name, color)')
      .eq('business_id', businessId)
      .neq('status', 'inactive')
      .order('name', { ascending: true });

    if (tablesError) {
      return { success: false, error: tablesError.message };
    }

    // Aktif sipariş sayısını hesapla (hangi masa şu an dolu?)
    const tableIds = (tablesRaw || []).map((t) => t.id);
    const activeCounts = new Map<string, number>();
    if (tableIds.length > 0) {
      const { data: activeOrders } = await admin
        .from('orders')
        .select('table_id')
        .in('table_id', tableIds)
        .in('status', ['received', 'confirmed', 'preparing', 'ready']);

      (activeOrders || []).forEach((o) => {
        if (o.table_id) {
          activeCounts.set(o.table_id, (activeCounts.get(o.table_id) || 0) + 1);
        }
      });
    }

    // Her bölgedeki masa sayısı
    const zoneCounts = new Map<string, number>();
    (tablesRaw || []).forEach((t) => {
      if (t.zone_id) {
        zoneCounts.set(t.zone_id, (zoneCounts.get(t.zone_id) || 0) + 1);
      }
    });

    const zones: TableZone[] = (zonesRaw || []).map((z) => ({
      id: z.id,
      name: z.name,
      color: z.color,
      sort_order: z.sort_order,
      table_count: zoneCounts.get(z.id) || 0,
    }));

    const tables: TableItem[] = (tablesRaw || []).map((t) => {
      const zoneData = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones;
      return {
        id: t.id,
        name: t.name,
        capacity: t.capacity,
        zone_id: t.zone_id,
        zone_name: zoneData?.name || null,
        zone_color: zoneData?.color || null,
        status: t.status as TableItem['status'],
        active_orders_count: activeCounts.get(t.id) || 0,
      };
    });

    return { success: true, tables, zones };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// TABLE CRUD
// ============================================================

export type TableInput = {
  name: string;
  capacity?: number;
  zone_id?: string | null;
};

export async function createTable(
  input: TableInput
): Promise<{ success: boolean; error?: string; table_id?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.name?.trim()) {
      return { success: false, error: 'Masa adı gerekli' };
    }
    if (input.name.length > 50) {
      return { success: false, error: 'Masa adı 50 karakteri geçemez' };
    }

    const { data, error } = await admin
      .from('tables')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        capacity: Math.max(1, Math.min(20, input.capacity || 2)),
        zone_id: input.zone_id || null,
        status: 'available',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true, table_id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function updateTable(
  tableId: string,
  input: Partial<TableInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Güvenlik: bu masa bu işletmeye mi ait?
    const { data: table } = await admin
      .from('tables')
      .select('id, business_id')
      .eq('id', tableId)
      .maybeSingle();

    if (!table || table.business_id !== businessId) {
      return { success: false, error: 'Masa bulunamadı' };
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) {
        return { success: false, error: 'Masa adı boş olamaz' };
      }
      updates.name = input.name.trim().slice(0, 50);
    }
    if (input.capacity !== undefined) {
      updates.capacity = Math.max(1, Math.min(20, input.capacity));
    }
    if (input.zone_id !== undefined) {
      updates.zone_id = input.zone_id || null;
    }

    const { error } = await admin
      .from('tables')
      .update(updates)
      .eq('id', tableId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function deleteTable(
  tableId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Güvenlik
    const { data: table } = await admin
      .from('tables')
      .select('id, business_id, name')
      .eq('id', tableId)
      .maybeSingle();

    if (!table || table.business_id !== businessId) {
      return { success: false, error: 'Masa bulunamadı' };
    }

    // Aktif sipariş var mı?
    const { count: activeCount } = await admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('table_id', tableId)
      .in('status', ['received', 'confirmed', 'preparing', 'ready']);

    if ((activeCount ?? 0) > 0) {
      return {
        success: false,
        error: 'Bu masada aktif sipariş var. Önce siparişi tamamlayın.',
      };
    }

    // Açık (ödenmemiş) ticket var mı?
    const { count: openTicketCount } = await admin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('table_id', tableId)
      .eq('status', 'open');

    if ((openTicketCount ?? 0) > 0) {
      return {
        success: false,
        error: 'Bu masada açık hesap var. Önce hesabı kapatın.',
      };
    }

    // Bekleyen garson çağrısı varsa otomatik temizle (silinen masa için anlamsız)
    await admin
      .from('waiter_calls')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('table_id', tableId)
      .in('status', ['pending', 'acknowledged']);

    // GERÇEK SİLME — DB'den tamamen kaldır.
    // FK constraint'leri otomatik halleder:
    //   - orders.table_id → SET NULL (geçmiş sipariş kalır)
    //   - tickets.table_id → SET NULL (kapanmış fişler kalır)
    //   - order_logs.table_id → SET NULL (audit log korunur)
    //   - waiter_calls.table_id → SET NULL (çağrı geçmişi korunur)
    //   - qr_codes.table_id → CASCADE (QR otomatik silinir, masa yoksa kullanılamaz)
    const { error } = await admin.from('tables').delete().eq('id', tableId);

    if (error) {
      return { success: false, error: error.message };
    }

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
// Hızlı Toplu Ekleme — "Masa 1'den 15'e kadar" gibi
// ============================================================

export type BulkCreateInput = {
  prefix: string; // "Masa " ya da "T"
  startNo: number; // 1
  endNo: number; // 15
  capacity?: number;
  zone_id?: string | null;
};

export async function bulkCreateTables(
  input: BulkCreateInput
): Promise<{ success: boolean; created?: number; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (input.endNo < input.startNo) {
      return { success: false, error: 'Bitiş numarası başlangıçtan küçük' };
    }
    if (input.endNo - input.startNo > 100) {
      return { success: false, error: 'En fazla 100 masa aynı anda eklenebilir' };
    }

    // Mevcut masa isimlerini çek — duplicate kontrolü
    const { data: existing } = await admin
      .from('tables')
      .select('name')
      .eq('business_id', businessId)
      .neq('status', 'inactive');

    const existingNames = new Set((existing || []).map((t) => t.name));

    const rows: Array<{
      business_id: string;
      name: string;
      capacity: number;
      zone_id: string | null;
      status: 'available';
    }> = [];
    for (let i = input.startNo; i <= input.endNo; i++) {
      const name = `${input.prefix}${i}`.trim();
      if (existingNames.has(name)) continue; // atla, tekrarlama
      rows.push({
        business_id: businessId,
        name,
        capacity: Math.max(1, Math.min(20, input.capacity || 2)),
        zone_id: input.zone_id || null,
        status: 'available' as const,
      });
    }

    if (rows.length === 0) {
      return {
        success: false,
        error: 'Bu isimlerin tümü zaten var. Farklı aralık seç.',
      };
    }

    const { error } = await admin.from('tables').insert(rows);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true, created: rows.length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Status Değiştir — Manuel (Boş / Rezerve / Dolu)
// ============================================================

export async function setTableStatus(
  tableId: string,
  newStatus: 'available' | 'reserved' | 'occupied'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: table } = await admin
      .from('tables')
      .select('id, business_id')
      .eq('id', tableId)
      .maybeSingle();

    if (!table || table.business_id !== businessId) {
      return { success: false, error: 'Masa bulunamadı' };
    }

    const { error } = await admin
      .from('tables')
      .update({ status: newStatus })
      .eq('id', tableId);

    if (error) {
      return { success: false, error: error.message };
    }

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
// ZONE CRUD
// ============================================================

export type ZoneInput = {
  name: string;
  color?: string | null;
};

export async function createZone(
  input: ZoneInput
): Promise<{ success: boolean; error?: string; zone_id?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.name?.trim()) {
      return { success: false, error: 'Bölge adı gerekli' };
    }

    // Sıra numarası belirle - en son + 1
    const { data: last } = await admin
      .from('table_zones')
      .select('sort_order')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = ((last?.sort_order as number) || 0) + 1;

    const { data, error } = await admin
      .from('table_zones')
      .insert({
        business_id: businessId,
        name: input.name.trim().slice(0, 50),
        color: input.color || null,
        sort_order: nextSort,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true, zone_id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function updateZone(
  zoneId: string,
  input: ZoneInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: zone } = await admin
      .from('table_zones')
      .select('id, business_id')
      .eq('id', zoneId)
      .maybeSingle();

    if (!zone || zone.business_id !== businessId) {
      return { success: false, error: 'Bölge bulunamadı' };
    }

    if (!input.name?.trim()) {
      return { success: false, error: 'Bölge adı boş olamaz' };
    }

    const { error } = await admin
      .from('table_zones')
      .update({
        name: input.name.trim().slice(0, 50),
        color: input.color || null,
      })
      .eq('id', zoneId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function deleteZone(
  zoneId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: zone } = await admin
      .from('table_zones')
      .select('id, business_id')
      .eq('id', zoneId)
      .maybeSingle();

    if (!zone || zone.business_id !== businessId) {
      return { success: false, error: 'Bölge bulunamadı' };
    }

    // Bu bölgeye bağlı masalar varsa onları "zonesuz" yap
    await admin
      .from('tables')
      .update({ zone_id: null })
      .eq('zone_id', zoneId);

    const { error } = await admin
      .from('table_zones')
      .delete()
      .eq('id', zoneId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
