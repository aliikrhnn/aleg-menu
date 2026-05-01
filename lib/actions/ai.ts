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

// ============================================================
// BESLENME & ALERJEN BİLGİSİ (TÜRKİYE YASAL UYUM)
// ============================================================
import { generateNutritionInfo, type NutritionInfo, ALLERGEN_KEYS } from '@/lib/ai/claude';
import { checkLimit, recordUsage } from '@/lib/ai/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// Tek ürün için beslenme bilgisi üret + DB'ye yaz
export async function aiGenerateProductNutrition(params: {
  productId: string;
  overwriteExisting?: boolean; // mevcut bilgi varsa üzerine yaz mı
}): Promise<{
  success: boolean;
  nutrition?: NutritionInfo;
  error?: string;
  rateLimited?: boolean;
}> {
  try {
    const { businessId, user } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Rate limit
    const limit = await checkLimit(businessId, 'nutrition');
    if (!limit.allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Günlük AI limiti doldu (${limit.used}/${limit.limit}). ${limit.resetsIn} saat sonra sıfırlanır.`,
      };
    }

    // Ürünü çek
    const { data: product } = await admin
      .from('products')
      .select('id, business_id, name, description, price, category_id, calories, allergens, ingredients')
      .eq('id', params.productId)
      .maybeSingle();

    if (!product || product.business_id !== businessId) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    // Mevcut bilgi varsa ve overwrite false ise atla
    const hasExisting =
      product.calories ||
      (Array.isArray(product.allergens) && product.allergens.length > 0) ||
      (product.ingredients && (product.ingredients.tr || product.ingredients.en));

    if (hasExisting && !params.overwriteExisting) {
      return {
        success: false,
        error: 'Bu ürünün beslenme bilgisi zaten var. Üzerine yazmak için onayla.',
      };
    }

    // Kategori adını al (TR)
    let categoryName: string | undefined;
    if (product.category_id) {
      const { data: cat } = await admin
        .from('categories')
        .select('name')
        .eq('id', product.category_id)
        .maybeSingle();
      if (cat?.name) {
        const n = cat.name as { tr?: string; en?: string };
        categoryName = n.tr || n.en;
      }
    }

    // Ürün adı (jsonb name)
    const productName =
      typeof product.name === 'object' && product.name !== null
        ? ((product.name as { tr?: string; en?: string }).tr ||
           (product.name as { tr?: string; en?: string }).en ||
           '')
        : String(product.name);

    const productDesc =
      typeof product.description === 'object' && product.description !== null
        ? ((product.description as { tr?: string; en?: string }).tr ||
           (product.description as { tr?: string; en?: string }).en ||
           '')
        : String(product.description || '');

    if (!productName || productName.trim().length < 2) {
      return { success: false, error: 'Ürün adı çok kısa, AI analiz yapamaz' };
    }

    // AI çağrısı
    const result = await generateNutritionInfo({
      productName,
      description: productDesc,
      category: categoryName,
      price: typeof product.price === 'number' ? product.price : undefined,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // DB'ye yaz
    const { error: updateErr } = await admin
      .from('products')
      .update({
        allergens: result.nutrition.allergens,
        calories: result.nutrition.calories,
        serving_size: result.nutrition.serving_size,
        ingredients: {
          tr: result.nutrition.ingredients_tr,
          en: result.nutrition.ingredients_en,
        },
        contains_alcohol: result.nutrition.contains_alcohol,
        ai_notes: result.nutrition.ai_notes,
        nutrition_ai_generated: true,
        // verify edilmedi (kullanıcı tercih etti — direkt görünür)
      })
      .eq('id', product.id);

    if (updateErr) {
      return { success: false, error: 'DB yazılamadı: ' + updateErr.message };
    }

    // Kullanım kaydı
    await recordUsage(businessId, user.id, 'nutrition');

    revalidatePath('/panel/menu');

    return { success: true, nutrition: result.nutrition };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'AI hatası',
    };
  }
}

// ============================================================
// TOPLU ÜRETİM — eksik beslenme bilgisi olan ürünleri AI ile doldur
// Asenkron, tek tek API çağrısı yapar (rate limit'e dikkat)
// ============================================================
export async function aiGenerateNutritionForAllProducts(params: {
  // Hangi modda çalışsın
  mode: 'missing' | 'all'; // missing = sadece bilgisi eksikleri, all = hepsi (overwrite)
  maxProducts?: number; // güvenlik limiti (default 50)
}): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors?: string[];
  rateLimited?: boolean;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const maxProducts = Math.min(params.maxProducts || 50, 200);

    // Hangi ürünler işlenecek
    const query = admin
      .from('products')
      .select('id, name, calories, allergens, ingredients')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(maxProducts);

    const { data: products, error } = await query;

    if (error) {
      return { success: false, processed: 0, failed: 0, skipped: 0, errors: [error.message] };
    }

    if (!products || products.length === 0) {
      return { success: true, processed: 0, failed: 0, skipped: 0 };
    }

    // missing modunda filter — beslenme bilgisi eksik olanlar
    const toProcess =
      params.mode === 'missing'
        ? products.filter((p) => {
            const noCalories = !p.calories;
            const noAllergens = !Array.isArray(p.allergens) || p.allergens.length === 0;
            const ing = p.ingredients as { tr?: string; en?: string } | null;
            const noIngredients = !ing || (!ing.tr && !ing.en);
            return noCalories && noAllergens && noIngredients;
          })
        : products;

    const skipped = products.length - toProcess.length;
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Tek tek işle (rate limit + DB stress'i azaltmak için)
    for (const product of toProcess) {
      // Limit kontrolü her seferinde
      const limit = await checkLimit(businessId, 'nutrition');
      if (!limit.allowed) {
        errors.push(`Limit doldu (${processed} işlendi, kalan atlandı)`);
        break;
      }

      const result = await aiGenerateProductNutrition({
        productId: product.id,
        overwriteExisting: params.mode === 'all',
      });

      if (result.success) {
        processed++;
      } else {
        failed++;
        if (errors.length < 5) {
          // İlk 5 hatayı göster
          const productName =
            typeof product.name === 'object' && product.name !== null
              ? ((product.name as { tr?: string }).tr || 'bilinmeyen')
              : String(product.name);
          errors.push(`${productName}: ${result.error}`);
        }
      }

      // Hafif throttle — Anthropic API'ye stress vermesin
      await new Promise((r) => setTimeout(r, 200));
    }

    revalidatePath('/panel/menu');

    return {
      success: true,
      processed,
      failed,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (e) {
    return {
      success: false,
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [e instanceof Error ? e.message : 'AI hatası'],
    };
  }
}

// ============================================================
// MANUEL DÜZENLE — işletmeci AI çıktısını veya manual girilen bilgiyi günceller
// ============================================================
export async function updateProductNutrition(params: {
  productId: string;
  allergens: string[];
  calories: number | null;
  serving_size: string;
  ingredients_tr: string;
  ingredients_en: string;
  contains_alcohol: boolean;
  markAsVerified?: boolean; // işletmeci doğruladı mı (UI'da rozet için)
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId, user } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Ürün bu işletmenin mi
    const { data: product } = await admin
      .from('products')
      .select('id, business_id')
      .eq('id', params.productId)
      .maybeSingle();

    if (!product || product.business_id !== businessId) {
      return { success: false, error: 'Ürün bulunamadı' };
    }

    // Alerjen validation — sadece bilinen 14 alerjen
    const validAllergens = params.allergens.filter((a) =>
      (ALLERGEN_KEYS as readonly string[]).includes(a)
    );

    // memberId — verify için
    let verifiedBy: string | null = null;
    let verifiedAt: string | null = null;
    if (params.markAsVerified) {
      const { data: member } = await admin
        .from('business_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .maybeSingle();
      if (member) {
        verifiedBy = member.id;
        verifiedAt = new Date().toISOString();
      }
    }

    const { error: updateErr } = await admin
      .from('products')
      .update({
        allergens: validAllergens,
        calories: params.calories,
        serving_size: params.serving_size,
        ingredients: {
          tr: params.ingredients_tr,
          en: params.ingredients_en,
        },
        contains_alcohol: params.contains_alcohol,
        nutrition_verified_at: verifiedAt,
        nutrition_verified_by: verifiedBy,
        // ai_generated flag DEĞİŞMEZ — bilgi AI'dan geldiyse o flag kalır
      })
      .eq('id', product.id);

    if (updateErr) {
      return { success: false, error: 'DB yazılamadı: ' + updateErr.message };
    }

    revalidatePath('/panel/menu');

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Hata',
    };
  }
}

// ============================================================
// STATELESS NUTRITION — kaydedilmemiş ürün için AI üret (DB'ye yazmaz)
// Yeni ürün ekleme formu kullanır, sonuç form state'ine yazılır
// Kaydet butonuna basıldığında createProduct ile birlikte DB'ye gider
// ============================================================
export async function aiGenerateNutritionFromText(params: {
  name: string;
  description?: string;
  category?: string;
  price?: number;
}): Promise<{
  success: boolean;
  nutrition?: NutritionInfo;
  error?: string;
  rateLimited?: boolean;
}> {
  try {
    const { businessId, user } = await requireBusinessAccess();

    if (!params.name || params.name.trim().length < 2) {
      return { success: false, error: 'Önce ürün adını yaz' };
    }

    // Rate limit
    const limit = await checkLimit(businessId, 'nutrition');
    if (!limit.allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Günlük AI limiti doldu (${limit.used}/${limit.limit}). ${limit.resetsIn} saat sonra sıfırlanır.`,
      };
    }

    const result = await generateNutritionInfo({
      productName: params.name,
      description: params.description,
      category: params.category,
      price: params.price,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Kullanım kaydı
    await recordUsage(businessId, user.id, 'nutrition');

    return { success: true, nutrition: result.nutrition };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'AI hatası',
    };
  }
}
