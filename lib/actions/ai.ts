'use server';

import { createClient } from '@/lib/supabase/server';
import { generateProductDescription, generateCategoryDescription, translateText } from '@/lib/ai/claude';

// ============================================================
// Permission helper
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
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    throw new Error('İşletme üyeliği bulunamadı');
  }

  return { user, businessId: membership.business_id };
}

// ============================================================
// Ürün açıklaması üret
// ============================================================
export async function aiGenerateProductDescription(params: {
  name: string;
  category?: string;
  language?: 'tr' | 'en';
}): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    await requireBusinessAccess();

    if (!params.name || params.name.trim().length < 2) {
      return { success: false, error: 'Önce ürün adını yaz' };
    }

    const result = await generateProductDescription(params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, description: result.description };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'AI hatası',
    };
  }
}

// ============================================================
// Kategori açıklaması üret
// ============================================================
export async function aiGenerateCategoryDescription(params: {
  name: string;
  language?: 'tr' | 'en';
}): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    await requireBusinessAccess();

    if (!params.name || params.name.trim().length < 2) {
      return { success: false, error: 'Önce kategori adını yaz' };
    }

    const result = await generateCategoryDescription(params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, description: result.description };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'AI hatası',
    };
  }
}

// ============================================================
// Çeviri
// ============================================================
export async function aiTranslateText(params: {
  text: string;
  from: 'tr' | 'en';
  to: 'tr' | 'en';
}): Promise<{ success: boolean; translated?: string; error?: string }> {
  try {
    await requireBusinessAccess();

    if (!params.text || params.text.trim().length < 1) {
      return { success: false, error: 'Çevrilecek metin yok' };
    }

    const result = await translateText(params);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, translated: result.translated };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'AI hatası',
    };
  }
}
