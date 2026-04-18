'use server';

import { createClient } from '@/lib/supabase/server';
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
