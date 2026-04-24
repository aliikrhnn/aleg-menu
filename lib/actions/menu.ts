'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { LocalizedText } from '@/types/database';

// ============================================================
// Permission helper - kullanıcı bu business'ın aktif üyesi mi?
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
// KATEGORİ İŞLEMLERİ
// ============================================================

export type CategoryInput = {
  name_tr: string;
  name_en?: string;
  description_tr?: string;
  description_en?: string;
  hero_icon?: string;
  sort_order?: number;
  active?: boolean;
};

export async function createCategory(
  input: CategoryInput
): Promise<{ success: boolean; error?: string; category_id?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    if (!input.name_tr || input.name_tr.length < 2) {
      return { success: false, error: 'Kategori adı en az 2 karakter olmalı' };
    }

    // Sıra belirle - en son kategorinin sırası + 1
    let sortOrder = input.sort_order;
    if (sortOrder === undefined) {
      const { data: existing } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder = (existing?.sort_order || 0) + 1;
    }

    const name: LocalizedText = { tr: input.name_tr };
    if (input.name_en) name.en = input.name_en;

    const description: LocalizedText | null =
      input.description_tr || input.description_en
        ? { tr: input.description_tr || '', ...(input.description_en ? { en: input.description_en } : {}) }
        : null;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        business_id: businessId,
        name,
        description,
        hero_icon: input.hero_icon || null,
        sort_order: sortOrder,
        active: input.active !== false,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu');
    return { success: true, category_id: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    // Güvenlik: kategori bu business'a mı ait?
    const { data: existing } = await supabase
      .from('categories')
      .select('business_id')
      .eq('id', categoryId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Kategori bulunamadı veya erişim yok' };
    }

    const updates: Record<string, unknown> = {};

    if (input.name_tr !== undefined || input.name_en !== undefined) {
      const { data: current } = await supabase
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single();

      const currentName = (current?.name as LocalizedText) || { tr: '' };
      updates.name = {
        ...currentName,
        ...(input.name_tr !== undefined && { tr: input.name_tr }),
        ...(input.name_en !== undefined && { en: input.name_en }),
      };
    }

    if (input.description_tr !== undefined || input.description_en !== undefined) {
      const { data: current } = await supabase
        .from('categories')
        .select('description')
        .eq('id', categoryId)
        .single();

      const currentDesc = (current?.description as LocalizedText) || { tr: '' };
      updates.description = {
        ...currentDesc,
        ...(input.description_tr !== undefined && { tr: input.description_tr }),
        ...(input.description_en !== undefined && { en: input.description_en }),
      };
    }

    if (input.hero_icon !== undefined) updates.hero_icon = input.hero_icon || null;
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
    if (input.active !== undefined) updates.active = input.active;

    const { error } = await supabase.from('categories').update(updates).eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

export async function deleteCategory(
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    // Güvenlik: bu business'a mı ait?
    const { data: existing } = await supabase
      .from('categories')
      .select('business_id')
      .eq('id', categoryId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Kategori bulunamadı veya erişim yok' };
    }

    // İçinde ürün var mı?
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if ((productCount ?? 0) > 0) {
      return {
        success: false,
        error: `Bu kategoride ${productCount} ürün var. Önce ürünleri başka kategoriye taşı veya sil.`,
      };
    }

    const { error } = await supabase.from('categories').delete().eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

export async function reorderCategories(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    // Her kategorinin sıra numarasını güncelle
    const updates = orderedIds.map((id, index) =>
      supabase.from('categories').update({ sort_order: index + 1 }).eq('id', id).eq('business_id', businessId)
    );

    await Promise.all(updates);

    revalidatePath('/panel/menu');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

// ============================================================
// ÜRÜN İŞLEMLERİ
// ============================================================

export type ProductInput = {
  category_id: string | null;
  name_tr: string;
  name_en?: string;
  description_tr?: string;
  description_en?: string;
  price: number;
  status?: 'active' | 'soldout' | 'draft' | 'archived';
  print_station?: string;
  station_id?: string | null;
  is_featured?: boolean;
  hero_icon?: string;
};

export async function createProduct(
  input: ProductInput
): Promise<{ success: boolean; error?: string; product_id?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    if (!input.name_tr || input.name_tr.length < 2) {
      return { success: false, error: 'Ürün adı en az 2 karakter olmalı' };
    }
    if (input.price < 0) {
      return { success: false, error: 'Fiyat negatif olamaz' };
    }

    // Kategori varsa - bu business'a mı ait kontrol et
    if (input.category_id) {
      const { data: cat } = await supabase
        .from('categories')
        .select('business_id')
        .eq('id', input.category_id)
        .maybeSingle();

      if (!cat || cat.business_id !== businessId) {
        return { success: false, error: 'Geçersiz kategori' };
      }
    }

    const name: LocalizedText = { tr: input.name_tr };
    if (input.name_en) name.en = input.name_en;

    const description: LocalizedText | null =
      input.description_tr || input.description_en
        ? { tr: input.description_tr || '', ...(input.description_en ? { en: input.description_en } : {}) }
        : null;

    // Sıra belirle - aynı kategorideki en son ürün + 1
    let sortOrder = 1;
    if (input.category_id) {
      const { data: existing } = await supabase
        .from('products')
        .select('sort_order')
        .eq('category_id', input.category_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder = (existing?.sort_order || 0) + 1;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: businessId,
        category_id: input.category_id,
        name,
        description,
        price: input.price,
        status: input.status || 'active',
        print_station: input.print_station || null,
        station_id: input.station_id || null,
        is_featured: input.is_featured || false,
        hero_icon: input.hero_icon || null,
        sort_order: sortOrder,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu');
    revalidatePath('/panel/menu/urunler');
    return { success: true, product_id: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    const { data: existing } = await supabase
      .from('products')
      .select('business_id')
      .eq('id', productId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Ürün bulunamadı veya erişim yok' };
    }

    const updates: Record<string, unknown> = {};

    if (input.name_tr !== undefined || input.name_en !== undefined) {
      const { data: current } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      const currentName = (current?.name as LocalizedText) || { tr: '' };
      updates.name = {
        ...currentName,
        ...(input.name_tr !== undefined && { tr: input.name_tr }),
        ...(input.name_en !== undefined && { en: input.name_en }),
      };
    }

    if (input.description_tr !== undefined || input.description_en !== undefined) {
      const { data: current } = await supabase
        .from('products')
        .select('description')
        .eq('id', productId)
        .single();

      const currentDesc = (current?.description as LocalizedText) || { tr: '' };
      updates.description = {
        ...currentDesc,
        ...(input.description_tr !== undefined && { tr: input.description_tr }),
        ...(input.description_en !== undefined && { en: input.description_en }),
      };
    }

    if (input.category_id !== undefined) updates.category_id = input.category_id;
    if (input.price !== undefined) updates.price = input.price;
    if (input.status !== undefined) updates.status = input.status;
    if (input.print_station !== undefined) updates.print_station = input.print_station || null;
    if (input.station_id !== undefined) updates.station_id = input.station_id || null;
    if (input.is_featured !== undefined) updates.is_featured = input.is_featured;
    if (input.hero_icon !== undefined) updates.hero_icon = input.hero_icon || null;

    const { error } = await supabase.from('products').update(updates).eq('id', productId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu');
    revalidatePath('/panel/menu/urunler');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

export async function deleteProduct(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    const { data: existing } = await supabase
      .from('products')
      .select('business_id')
      .eq('id', productId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Ürün bulunamadı veya erişim yok' };
    }

    const { error } = await supabase.from('products').delete().eq('id', productId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu');
    revalidatePath('/panel/menu/urunler');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

export async function updateProductStatus(
  productId: string,
  status: 'active' | 'soldout' | 'draft' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  return updateProduct(productId, { status });
}

// ============================================================
// ÜRÜN RESİMLERİ
// ============================================================

/**
 * Ürün resmi yükle (data URL alır, Supabase Storage'a koyar)
 * Client tarafında kırpılmış resim data URL olarak gelir.
 */
export async function uploadProductImage(
  productId: string,
  dataUrl: string,
  mimeType: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Ürünün bu businessa ait olduğunu doğrula
    const { data: product } = await admin
      .from('products')
      .select('id, business_id')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!product) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    // data URL'i buffer'a çevir
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      return { success: false, error: 'Geçersiz görsel verisi' };
    }

    const buffer = Buffer.from(base64, 'base64');

    // Max 5MB (sıkıştırılmış olmalı)
    if (buffer.length > 5 * 1024 * 1024) {
      return { success: false, error: 'Resim 5MB üzerinde olamaz' };
    }

    // Uzantı belirle
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const ext = extMap[mimeType] || 'jpg';

    // Yol: {business_id}/products/{product_id}-{timestamp}.{ext}
    const ts = Date.now();
    const path = `${businessId}/products/${productId}-${ts}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from('business-assets')
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Public URL
    const { data: urlData } = admin.storage
      .from('business-assets')
      .getPublicUrl(path);

    const imageUrl = urlData.publicUrl;

    // products.hero_image_url güncelle
    const { error: updateError } = await admin
      .from('products')
      .update({ hero_image_url: imageUrl })
      .eq('id', productId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/panel/menu/urunler');
    revalidatePath('/menu/[slug]', 'page');

    return { success: true, imageUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Ürün resmi kaldır
 */
export async function removeProductImage(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Ürünün bu businessa ait olduğunu doğrula
    const { data: product } = await admin
      .from('products')
      .select('id, business_id, hero_image_url')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!product) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    // DB'den hero_image_url temizle
    await admin
      .from('products')
      .update({ hero_image_url: null })
      .eq('id', productId);

    // Storage'daki dosyaları temizle
    const { data: files } = await admin.storage
      .from('business-assets')
      .list(`${businessId}/products`, { limit: 100 });

    if (files) {
      const productFiles = files.filter((f) => f.name.startsWith(`${productId}-`));
      if (productFiles.length > 0) {
        const paths = productFiles.map((f) => `${businessId}/products/${f.name}`);
        await admin.storage.from('business-assets').remove(paths);
      }
    }

    revalidatePath('/panel/menu/urunler');
    revalidatePath('/menu/[slug]', 'page');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}


// ============================================================
// TOPLU ISTASYON ATAMA
// ============================================================

export async function bulkAssignStation(
  productIds: string[],
  stationId: string | null
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    if (!productIds || productIds.length === 0) {
      return { success: false, updated: 0, error: 'Ürün seçilmedi' };
    }

    // Güvenlik: bu business'a ait ürünleri süz
    const { data: owned } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
      .in('id', productIds);

    const ownedIds = (owned || []).map((p) => p.id as string);
    if (ownedIds.length === 0) {
      return { success: false, updated: 0, error: 'Erişim yok' };
    }

    const { error } = await supabase
      .from('products')
      .update({ station_id: stationId })
      .in('id', ownedIds);

    if (error) return { success: false, updated: 0, error: error.message };

    revalidatePath('/panel/menu');
    revalidatePath('/panel/menu/urunler');
    return { success: true, updated: ownedIds.length };
  } catch (err) {
    return {
      success: false,
      updated: 0,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}


// ============================================================
// STOK TOGGLE (tek tıkla) + TOPLU STATUS ATAMA
// ============================================================

export async function toggleSoldOut(
  productId: string
): Promise<{ success: boolean; newStatus?: 'active' | 'soldout'; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    const { data: existing } = await supabase
      .from('products')
      .select('status, business_id')
      .eq('id', productId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Ürün bulunamadı veya erişim yok' };
    }

    // Sadece active <-> soldout arası geçiş (draft/archived'a dokunmuyoruz)
    const current = existing.status as string;
    if (current !== 'active' && current !== 'soldout') {
      return {
        success: false,
        error: 'Sadece aktif veya tükenmiş ürünler için kullanılabilir',
      };
    }

    const next: 'active' | 'soldout' =
      current === 'active' ? 'soldout' : 'active';

    const { error } = await supabase
      .from('products')
      .update({ status: next })
      .eq('id', productId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/menu/urunler');
    revalidatePath('/panel');
    revalidatePath('/menu/[slug]', 'page');
    return { success: true, newStatus: next };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function bulkSetStatus(
  productIds: string[],
  status: 'active' | 'soldout'
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    if (!productIds || productIds.length === 0) {
      return { success: false, updated: 0, error: 'Ürün seçilmedi' };
    }

    // Güvenlik: bu business'a ait olanları süz (draft/archived hariç)
    const { data: owned } = await supabase
      .from('products')
      .select('id, status')
      .eq('business_id', businessId)
      .in('id', productIds)
      .in('status', ['active', 'soldout']);

    const ownedIds = (owned || []).map((p) => p.id as string);
    if (ownedIds.length === 0) {
      return {
        success: false,
        updated: 0,
        error: 'Erişim yok veya ürünler stok dışı statüde',
      };
    }

    const { error } = await supabase
      .from('products')
      .update({ status })
      .in('id', ownedIds);

    if (error) return { success: false, updated: 0, error: error.message };

    revalidatePath('/panel/menu');
    revalidatePath('/panel/menu/urunler');
    revalidatePath('/panel');
    revalidatePath('/menu/[slug]', 'page');
    return { success: true, updated: ownedIds.length };
  } catch (err) {
    return {
      success: false,
      updated: 0,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// TÜKENDİ ÖZETİ (dashboard için)
// ============================================================

export async function getSoldOutSummary(): Promise<{
  success: boolean;
  count: number;
  products?: Array<{
    id: string;
    name: string;
    hours_ago: number | null;
  }>;
  error?: string;
}> {
  try {
    const { supabase, businessId } = await requireBusinessAccess();

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, updated_at')
      .eq('business_id', businessId)
      .eq('status', 'soldout')
      .order('updated_at', { ascending: false });

    if (error) return { success: false, count: 0, error: error.message };

    const now = Date.now();
    const list = (products || []).map((p) => {
      const rawName = p.name as unknown;
      let displayName = 'Ürün';
      if (typeof rawName === 'string') displayName = rawName;
      else if (rawName && typeof rawName === 'object') {
        const n = rawName as Record<string, string>;
        displayName = n.tr || n.en || Object.values(n)[0] || 'Ürün';
      }

      const updated = p.updated_at
        ? new Date(p.updated_at as string).getTime()
        : null;
      const hours_ago = updated
        ? Math.floor((now - updated) / (1000 * 60 * 60))
        : null;

      return {
        id: p.id as string,
        name: displayName,
        hours_ago,
      };
    });

    return { success: true, count: list.length, products: list };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// SIK SATILANLAR — son N gün en çok satılan ürünler
// ============================================================

type TopProduct = {
  id: string;
  name: string; // locale'a göre text (cashier için tek dilde)
  price: number;
  hero_image_url: string | null;
  hero_icon: string | null;
  sold_count: number; // son N gün toplam quantity
};

// Basit memory cache (5 dakika)
const TOP_PRODUCTS_CACHE = new Map<string, { data: TopProduct[]; expiresAt: number }>();
const TOP_PRODUCTS_TTL_MS = 5 * 60 * 1000;

export async function getTopProducts(options?: {
  limit?: number;
  daysBack?: number;
  bypassCache?: boolean;
}): Promise<{
  success: boolean;
  products?: TopProduct[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();
    const limit = options?.limit ?? 6;
    const daysBack = options?.daysBack ?? 30;

    const cacheKey = `${businessId}:${limit}:${daysBack}`;
    if (!options?.bypassCache) {
      const cached = TOP_PRODUCTS_CACHE.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { success: true, products: cached.data };
      }
    }

    const sinceDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // İptal edilmemiş siparişlerdeki order_items'ları çek
    const { data: itemsRaw, error: itemsErr } = await admin
      .from('order_items')
      .select(`
        product_id,
        quantity,
        orders!inner (
          id,
          business_id,
          status,
          created_at
        )
      `)
      .eq('orders.business_id', businessId)
      .neq('orders.status', 'cancelled')
      .gte('orders.created_at', sinceDate)
      .not('product_id', 'is', null)
      .limit(5000); // güvenlik — büyük işletmeler için sınır

    if (itemsErr) {
      return { success: false, error: 'Satış verileri alınamadı: ' + itemsErr.message };
    }

    if (!itemsRaw || itemsRaw.length === 0) {
      TOP_PRODUCTS_CACHE.set(cacheKey, { data: [], expiresAt: Date.now() + TOP_PRODUCTS_TTL_MS });
      return { success: true, products: [] };
    }

    // product_id bazlı quantity toplamı
    const soldMap = new Map<string, number>();
    for (const it of itemsRaw) {
      if (!it.product_id) continue;
      soldMap.set(it.product_id, (soldMap.get(it.product_id) || 0) + (it.quantity || 0));
    }

    // En çok satılan N ürün id'si
    const topIds = [...soldMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) {
      TOP_PRODUCTS_CACHE.set(cacheKey, { data: [], expiresAt: Date.now() + TOP_PRODUCTS_TTL_MS });
      return { success: true, products: [] };
    }

    // Ürün detaylarını çek — sadece aktif ürünler
    const { data: products, error: prodErr } = await admin
      .from('products')
      .select('id, name, price, hero_image_url, hero_icon, status')
      .eq('business_id', businessId)
      .in('id', topIds)
      .eq('status', 'active');

    if (prodErr) {
      return { success: false, error: 'Ürün bilgileri alınamadı: ' + prodErr.message };
    }

    // Satış sırasına göre sırala + localize et
    const byId = new Map(products?.map((p) => [p.id, p]) || []);
    const result: TopProduct[] = [];
    for (const pid of topIds) {
      const p = byId.get(pid);
      if (!p) continue; // iptal edilmiş / silinmiş / pasif → atla

      // name JSONB olabilir (tr/en) — tr öncelikli
      let name = 'Ürün';
      if (typeof p.name === 'string') {
        name = p.name;
      } else if (p.name && typeof p.name === 'object') {
        const n = p.name as LocalizedText;
        name = n.tr || n.en || Object.values(n)[0] || 'Ürün';
      }

      result.push({
        id: p.id,
        name,
        price: Number(p.price),
        hero_image_url: p.hero_image_url,
        hero_icon: p.hero_icon,
        sold_count: soldMap.get(pid) || 0,
      });
    }

    TOP_PRODUCTS_CACHE.set(cacheKey, { data: result, expiresAt: Date.now() + TOP_PRODUCTS_TTL_MS });

    return { success: true, products: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
