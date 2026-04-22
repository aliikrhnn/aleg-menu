'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// Types
// ============================================================

export type Station = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
};

export type StationInput = {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
};

// Türkçe karakterleri temizle ve URL-safe yap
function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', I: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  };
  return text
    .split('')
    .map((ch) => trMap[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// ============================================================
// İşletme erişimi
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
// LİSTE
// ============================================================

export async function getStations(): Promise<{
  success: boolean;
  stations?: Station[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: stations, error } = await admin
      .from('stations')
      .select('id, name, slug, icon, color, sort_order, is_active')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };

    const stationList = stations || [];
    const stationIds = stationList.map((s) => s.id);

    // Her istasyonun ürün sayısını çek
    const countMap = new Map<string, number>();
    if (stationIds.length > 0) {
      const { data: products } = await admin
        .from('products')
        .select('station_id')
        .eq('business_id', businessId)
        .in('station_id', stationIds);

      (products || []).forEach((p) => {
        if (p.station_id) {
          countMap.set(p.station_id, (countMap.get(p.station_id) || 0) + 1);
        }
      });
    }

    const result: Station[] = stationList.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug || slugify(s.name) || s.id.slice(0, 8),
      icon: s.icon || '●',
      color: s.color || '#C4553A',
      sort_order: s.sort_order,
      is_active: s.is_active,
      product_count: countMap.get(s.id) || 0,
    }));

    return { success: true, stations: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// OLUŞTUR
// ============================================================

export async function createStation(
  input: StationInput
): Promise<{ success: boolean; station?: Station; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.name?.trim()) {
      return { success: false, error: 'İstasyon adı gerekli' };
    }

    // En yüksek sort_order bul
    const { data: last } = await admin
      .from('stations')
      .select('sort_order')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (last?.sort_order ?? -1) + 1;

    // Unique slug üret: önce name'den, çakışırsa sayı ekle
    const baseSlug = slugify(input.name.trim()) || 'istasyon';
    let finalSlug = baseSlug;
    let counter = 2;
    while (true) {
      const { data: existing } = await admin
        .from('stations')
        .select('id')
        .eq('business_id', businessId)
        .eq('slug', finalSlug)
        .maybeSingle();
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
      if (counter > 50) {
        // Sonsuz döngü koruması
        finalSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
        break;
      }
    }

    const { data, error } = await admin
      .from('stations')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        slug: finalSlug,
        icon: input.icon || '●',
        color: input.color || '#C4553A',
        sort_order: input.sort_order ?? nextOrder,
        is_active: true,
      })
      .select('id, name, slug, icon, color, sort_order, is_active')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/istasyonlar');
    revalidatePath('/panel/kds');
    revalidatePath('/panel/menu/urunler');

    return {
      success: true,
      station: {
        ...data,
        slug: data.slug || finalSlug,
        product_count: 0,
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
// GÜNCELLE
// ============================================================

export async function updateStation(
  stationId: string,
  input: Partial<StationInput> & { is_active?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Ownership kontrol
    const { data: existing } = await admin
      .from('stations')
      .select('id')
      .eq('id', stationId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'İstasyon bulunamadı' };

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.color !== undefined) updates.color = input.color;
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    const { error } = await admin
      .from('stations')
      .update(updates)
      .eq('id', stationId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/istasyonlar');
    revalidatePath('/panel/kds');
    revalidatePath('/panel/menu/urunler');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// SİL (bağlı ürünler station_id = null olur)
// ============================================================

export async function deleteStation(
  stationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('stations')
      .select('id')
      .eq('id', stationId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'İstasyon bulunamadı' };

    // ON DELETE SET NULL FK yüzünden ürünlerin station_id otomatik null olacak
    const { error } = await admin
      .from('stations')
      .delete()
      .eq('id', stationId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/istasyonlar');
    revalidatePath('/panel/kds');
    revalidatePath('/panel/menu/urunler');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ÜRÜN İSTASYONUNU SET ET
// ============================================================

export async function setProductStation(
  productId: string,
  stationId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Ürün ownership
    const { data: product } = await admin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!product) return { success: false, error: 'Ürün bulunamadı' };

    // Station ownership (null değilse)
    if (stationId) {
      const { data: station } = await admin
        .from('stations')
        .select('id')
        .eq('id', stationId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!station) return { success: false, error: 'İstasyon bulunamadı' };
    }

    const { error } = await admin
      .from('products')
      .update({ station_id: stationId })
      .eq('id', productId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/istasyonlar');
    revalidatePath('/panel/kds');
    revalidatePath('/panel/menu/urunler');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// TOPLU ATAMA (birden fazla ürüne istasyon ata)
// ============================================================

export async function bulkAssignStation(
  productIds: string[],
  stationId: string | null
): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (productIds.length === 0) {
      return { success: true, updated: 0 };
    }

    if (stationId) {
      const { data: station } = await admin
        .from('stations')
        .select('id')
        .eq('id', stationId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!station) return { success: false, error: 'İstasyon bulunamadı' };
    }

    const { error, count } = await admin
      .from('products')
      .update({ station_id: stationId }, { count: 'exact' })
      .in('id', productIds)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/istasyonlar');
    revalidatePath('/panel/kds');
    revalidatePath('/panel/menu/urunler');

    return { success: true, updated: count || 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
