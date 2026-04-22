'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { LocalizedText } from '@/types/database';

// ============================================================
// Types
// ============================================================

export type PresetValue = {
  id: string;
  name: LocalizedText;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
};

export type Preset = {
  id: string;
  name: LocalizedText;
  type: 'single' | 'multi';
  required: boolean;
  sort_order: number;
  values: PresetValue[];
  product_count?: number;
  product_names?: string[]; // hangi ürünlerde kullanılıyor (görüntü için)
  product_ids?: string[]; // hangi ürünlerde kullanılıyor (modal'da seçili göstermek için)
};

export type PresetInput = {
  name_tr: string;
  name_en?: string;
  type: 'single' | 'multi';
  required: boolean;
  values: Array<{
    name_tr: string;
    name_en?: string;
    price_delta: number;
    is_default: boolean;
  }>;
};

async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');

  return { supabase, businessId: membership.business_id, userId: user.id };
}

// ============================================================
// TÜM ŞABLONLARI GETİR (ürün sayısı ile)
// ============================================================

export async function getPresets(): Promise<{
  success: boolean;
  presets?: Preset[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Presets + values
    const { data: presets, error: presetsError } = await admin
      .from('option_presets')
      .select('id, name, type, required, sort_order, created_at, updated_at')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (presetsError) return { success: false, error: presetsError.message };

    const presetIds = (presets || []).map((p) => p.id);

    // Tüm values'ları topluca çek
    const { data: values } = presetIds.length
      ? await admin
          .from('option_preset_values')
          .select('id, preset_id, name, price_delta, is_default, sort_order')
          .in('preset_id', presetIds)
          .order('sort_order', { ascending: true })
      : { data: [] };

    // Her preset için ürün ID + adlarını çek
    const { data: productLinks } = presetIds.length
      ? await admin
          .from('product_option_presets')
          .select('preset_id, product_id')
          .in('preset_id', presetIds)
      : { data: [] };

    // Tüm ilgili ürünlerin adlarını çek
    const allProductIds = [...new Set((productLinks || []).map((pl) => pl.product_id))];
    const { data: productList } = allProductIds.length
      ? await admin
          .from('products')
          .select('id, name')
          .in('id', allProductIds)
      : { data: [] };

    const productNameMap = new Map<string, string>();
    (productList || []).forEach((p) => {
      const nm = p.name as { tr?: string; en?: string };
      productNameMap.set(p.id, nm?.tr || 'Ürün');
    });

    // Preset → ürün adları + id'leri listesi (sıralama: products tablosunun sort_order'ına yakın değil ama eklenme sırasıyla)
    const presetProductNamesMap = new Map<string, string[]>();
    const presetProductIdsMap = new Map<string, string[]>();
    (productLinks || []).forEach((link) => {
      if (!presetProductNamesMap.has(link.preset_id)) {
        presetProductNamesMap.set(link.preset_id, []);
        presetProductIdsMap.set(link.preset_id, []);
      }
      const productName = productNameMap.get(link.product_id);
      if (productName) {
        presetProductNamesMap.get(link.preset_id)!.push(productName);
        presetProductIdsMap.get(link.preset_id)!.push(link.product_id);
      }
    });

    const result: Preset[] = (presets || []).map((p) => ({
      id: p.id,
      name: p.name as LocalizedText,
      type: p.type,
      required: p.required,
      sort_order: p.sort_order,
      values: (values || [])
        .filter((v) => v.preset_id === p.id)
        .map((v) => ({
          id: v.id,
          name: v.name as LocalizedText,
          price_delta: Number(v.price_delta),
          is_default: v.is_default,
          sort_order: v.sort_order,
        })),
      product_count: (presetProductNamesMap.get(p.id) || []).length,
      product_names: presetProductNamesMap.get(p.id) || [],
      product_ids: presetProductIdsMap.get(p.id) || [],
    }));

    return { success: true, presets: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// TEK ŞABLON ID İLE
// ============================================================

export async function getPreset(
  presetId: string
): Promise<{ success: boolean; preset?: Preset; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: preset, error } = await admin
      .from('option_presets')
      .select('id, name, type, required, sort_order')
      .eq('id', presetId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (error || !preset) {
      return { success: false, error: error?.message || 'Şablon bulunamadı' };
    }

    const { data: values } = await admin
      .from('option_preset_values')
      .select('id, name, price_delta, is_default, sort_order')
      .eq('preset_id', presetId)
      .order('sort_order', { ascending: true });

    return {
      success: true,
      preset: {
        id: preset.id,
        name: preset.name as LocalizedText,
        type: preset.type,
        required: preset.required,
        sort_order: preset.sort_order,
        values: (values || []).map((v) => ({
          id: v.id,
          name: v.name as LocalizedText,
          price_delta: Number(v.price_delta),
          is_default: v.is_default,
          sort_order: v.sort_order,
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
// ŞABLON OLUŞTUR
// ============================================================

export async function createPreset(
  input: PresetInput
): Promise<{ success: boolean; presetId?: string; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.name_tr.trim()) {
      return { success: false, error: 'Şablon adı gerekli' };
    }
    if (input.values.length < 2) {
      return { success: false, error: 'En az 2 değer gerekli' };
    }

    // Sort order - en yüksek + 1
    const { data: lastPreset } = await admin
      .from('option_presets')
      .select('sort_order')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = (lastPreset?.sort_order ?? -1) + 1;

    // Preset oluştur
    const { data: preset, error: presetError } = await admin
      .from('option_presets')
      .insert({
        business_id: businessId,
        name: { tr: input.name_tr, en: input.name_en || '' },
        type: input.type,
        required: input.required,
        sort_order: nextSort,
      })
      .select('id')
      .single();

    if (presetError || !preset) {
      return { success: false, error: presetError?.message || 'Şablon oluşturulamadı' };
    }

    // Değerleri ekle
    const valueInserts = input.values.map((v, idx) => ({
      preset_id: preset.id,
      name: { tr: v.name_tr, en: v.name_en || '' },
      price_delta: v.price_delta,
      is_default: v.is_default,
      sort_order: idx,
    }));

    const { error: valuesError } = await admin
      .from('option_preset_values')
      .insert(valueInserts);

    if (valuesError) {
      // Rollback preset
      await admin.from('option_presets').delete().eq('id', preset.id);
      return { success: false, error: valuesError.message };
    }

    revalidatePath('/panel/menu/varyasyonlar');
    revalidatePath('/panel/menu/urunler');

    return { success: true, presetId: preset.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ŞABLON GÜNCELLE (değerler dahil)
// ============================================================

export async function updatePreset(
  presetId: string,
  input: PresetInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Ownership kontrolü
    const { data: preset } = await admin
      .from('option_presets')
      .select('id')
      .eq('id', presetId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!preset) return { success: false, error: 'Şablon bulunamadı' };

    if (!input.name_tr.trim()) {
      return { success: false, error: 'Şablon adı gerekli' };
    }
    if (input.values.length < 2) {
      return { success: false, error: 'En az 2 değer gerekli' };
    }

    // Preset güncelle
    await admin
      .from('option_presets')
      .update({
        name: { tr: input.name_tr, en: input.name_en || '' },
        type: input.type,
        required: input.required,
      })
      .eq('id', presetId);

    // Eski değerleri sil, yenilerini ekle
    await admin
      .from('option_preset_values')
      .delete()
      .eq('preset_id', presetId);

    const valueInserts = input.values.map((v, idx) => ({
      preset_id: presetId,
      name: { tr: v.name_tr, en: v.name_en || '' },
      price_delta: v.price_delta,
      is_default: v.is_default,
      sort_order: idx,
    }));

    const { error: valuesError } = await admin
      .from('option_preset_values')
      .insert(valueInserts);

    if (valuesError) {
      return { success: false, error: valuesError.message };
    }

    revalidatePath('/panel/menu/varyasyonlar');
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
// ŞABLON SİL
// ============================================================

export async function deletePreset(
  presetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: preset } = await admin
      .from('option_presets')
      .select('id')
      .eq('id', presetId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!preset) return { success: false, error: 'Şablon bulunamadı' };

    // CASCADE ile values ve product_option_presets de silinecek
    await admin.from('option_presets').delete().eq('id', presetId);

    revalidatePath('/panel/menu/varyasyonlar');
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
// ŞABLONU ÜRÜNLERE UYGULA (çoklu)
// ============================================================

export async function attachPresetToProducts(
  presetId: string,
  productIds: string[]
): Promise<{ success: boolean; added?: number; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Preset ownership
    const { data: preset } = await admin
      .from('option_presets')
      .select('id')
      .eq('id', presetId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!preset) return { success: false, error: 'Şablon bulunamadı' };

    // Ürünlerin bu businessa ait olduğunu kontrol et
    const { data: validProducts } = await admin
      .from('products')
      .select('id')
      .in('id', productIds)
      .eq('business_id', businessId);

    const validIds = (validProducts || []).map((p) => p.id);
    if (validIds.length === 0) {
      return { success: false, error: 'Geçerli ürün bulunamadı' };
    }

    // Mevcut bağlantıları kontrol et (duplicate olmasın)
    const { data: existing } = await admin
      .from('product_option_presets')
      .select('product_id')
      .eq('preset_id', presetId)
      .in('product_id', validIds);

    const existingIds = new Set((existing || []).map((e) => e.product_id));
    const newIds = validIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return { success: true, added: 0 };
    }

    const inserts = newIds.map((productId, idx) => ({
      product_id: productId,
      preset_id: presetId,
      sort_order: idx,
    }));

    const { error } = await admin
      .from('product_option_presets')
      .insert(inserts);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/menu/varyasyonlar');
    revalidatePath('/panel/menu/urunler');
    revalidatePath('/menu/[slug]', 'page');

    return { success: true, added: newIds.length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ŞABLONUN ÜRÜN LİSTESİNİ TAM SENKRONIZE ET (ekle + çıkar)
// ============================================================

export async function syncPresetProducts(
  presetId: string,
  productIds: string[]
): Promise<{
  success: boolean;
  added?: number;
  removed?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Preset ownership
    const { data: preset } = await admin
      .from('option_presets')
      .select('id')
      .eq('id', presetId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!preset) return { success: false, error: 'Şablon bulunamadı' };

    // Geçerli ürün id'leri
    const { data: validProducts } = productIds.length
      ? await admin
          .from('products')
          .select('id')
          .in('id', productIds)
          .eq('business_id', businessId)
      : { data: [] };

    const validIds = new Set((validProducts || []).map((p) => p.id));

    // Mevcut bağlantılar
    const { data: existing } = await admin
      .from('product_option_presets')
      .select('product_id')
      .eq('preset_id', presetId);

    const existingIds = new Set((existing || []).map((e) => e.product_id));

    // Eklenecekler: validIds içinde olup existing'de olmayanlar
    const toAdd = Array.from(validIds).filter((id) => !existingIds.has(id));
    // Silinecekler: existing'de olup validIds içinde olmayanlar
    const toRemove = Array.from(existingIds).filter((id) => !validIds.has(id));

    // Sil
    if (toRemove.length > 0) {
      await admin
        .from('product_option_presets')
        .delete()
        .eq('preset_id', presetId)
        .in('product_id', toRemove);
    }

    // Ekle
    if (toAdd.length > 0) {
      const inserts = toAdd.map((productId, idx) => ({
        product_id: productId,
        preset_id: presetId,
        sort_order: idx,
      }));
      const { error } = await admin
        .from('product_option_presets')
        .insert(inserts);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/panel/menu/varyasyonlar');
    revalidatePath('/panel/menu/urunler');
    revalidatePath('/menu/[slug]', 'page');

    return { success: true, added: toAdd.length, removed: toRemove.length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ÜRÜNDEN ŞABLON KALDIR
// ============================================================

export async function detachPresetFromProduct(
  productId: string,
  presetId: string
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

    await admin
      .from('product_option_presets')
      .delete()
      .eq('product_id', productId)
      .eq('preset_id', presetId);

    revalidatePath('/panel/menu/varyasyonlar');
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
// ÜRÜNÜN ŞABLONLARINI GETİR (ürün düzenleme modalı için)
// ============================================================

export async function getProductPresets(productId: string): Promise<{
  success: boolean;
  presets?: Preset[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: product } = await admin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!product) return { success: false, error: 'Ürün bulunamadı' };

    // Ürüne bağlı preset'ler (sort_order ile)
    const { data: links } = await admin
      .from('product_option_presets')
      .select('preset_id, sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    const presetIds = (links || []).map((l) => l.preset_id);
    if (presetIds.length === 0) {
      return { success: true, presets: [] };
    }

    const { data: presets } = await admin
      .from('option_presets')
      .select('id, name, type, required, sort_order')
      .in('id', presetIds);

    const { data: values } = await admin
      .from('option_preset_values')
      .select('id, preset_id, name, price_delta, is_default, sort_order')
      .in('preset_id', presetIds)
      .order('sort_order', { ascending: true });

    // links sırasında dön
    const presetsMap = new Map(
      (presets || []).map((p) => [p.id, p])
    );

    const result: Preset[] = (links || [])
      .map((l) => {
        const p = presetsMap.get(l.preset_id);
        if (!p) return null;
        return {
          id: p.id,
          name: p.name as LocalizedText,
          type: p.type,
          required: p.required,
          sort_order: l.sort_order,
          values: (values || [])
            .filter((v) => v.preset_id === p.id)
            .map((v) => ({
              id: v.id,
              name: v.name as LocalizedText,
              price_delta: Number(v.price_delta),
              is_default: v.is_default,
              sort_order: v.sort_order,
            })),
        };
      })
      .filter((p): p is Preset => p !== null);

    return { success: true, presets: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
