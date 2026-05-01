/**
 * Claude AI Helper - Aleg için merkezi AI entegrasyonu.
 *
 * API key Vercel env variable'dan alınır (ANTHROPIC_API_KEY).
 * Her kafe bu merkezi key'i kullanır — kafe sahipleri key almaz.
 */

import Anthropic from '@anthropic-ai/sdk';

// Lazy-init client
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY eksik. Vercel env variables kontrol et.');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ============================================================
// MODEL SEÇİMİ
// ============================================================
// Claude Haiku — en uygun fiyatlı, kısa metinler için yeterli kalite
// Ürün açıklaması / çeviri için mükemmel
const MODEL = 'claude-haiku-4-5-20251001';

// ============================================================
// ÜRÜN AÇIKLAMASI ÜRET
// ============================================================
export async function generateProductDescription(params: {
  name: string;
  category?: string;
  language?: 'tr' | 'en';
}): Promise<{ success: true; description: string } | { success: false; error: string }> {
  try {
    const lang = params.language || 'tr';
    const isEnglish = lang === 'en';

    const systemPrompt = isEnglish
      ? `You write elegant, appetizing menu descriptions for specialty cafes and restaurants. 
Style guide:
- Maximum 15 words
- Evocative but not flowery
- Focus on ingredients, origin, or preparation method
- No marketing clichés ("the best", "amazing")
- No exclamation marks
Return ONLY the description text, no preamble.`
      : `Uzman bir menü yazarısın. Kafe ve restoran için iştah açıcı, zarif açıklamalar yazıyorsun.
Stil kuralları:
- Maksimum 15 kelime
- Şiirsel ama abartısız
- Malzemeye, menşeine veya hazırlığa odaklan
- Pazarlama klişesi yok ("en iyi", "muhteşem")
- Ünlem işareti yok
SADECE açıklama metnini döndür, başka hiçbir şey ekleme.`;

    const userMessage = isEnglish
      ? `Product name: ${params.name}${params.category ? ` (Category: ${params.category})` : ''}`
      : `Ürün adı: ${params.name}${params.category ? ` (Kategori: ${params.category})` : ''}`;

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      return { success: false, error: 'Boş yanıt alındı' };
    }

    return { success: true, description: text };
  } catch (e) {
    console.error('AI generate error:', e);
    const message = e instanceof Error ? e.message : 'AI hatası';
    return { success: false, error: message };
  }
}

// ============================================================
// KATEGORİ AÇIKLAMASI ÜRET
// ============================================================
export async function generateCategoryDescription(params: {
  name: string;
  language?: 'tr' | 'en';
}): Promise<{ success: true; description: string } | { success: false; error: string }> {
  try {
    const lang = params.language || 'tr';
    const isEnglish = lang === 'en';

    const systemPrompt = isEnglish
      ? `You write short, elegant category introductions for cafe/restaurant menus.
Style guide:
- Maximum 10 words
- Tells customer what's in this category with character
- Not a definition, but an invitation
- No marketing clichés
Return ONLY the description text, no preamble.`
      : `Kafe/restoran menüsü için kategori başlıklarının altında görünecek kısa, zarif tanıtım yazıları yazıyorsun.
Stil kuralları:
- Maksimum 10 kelime
- Ne olduğunu tanımlamak değil, davet etmek
- Pazarlama klişesi yok
SADECE açıklama metnini döndür, başka hiçbir şey ekleme.

Örnekler:
Kategori: Espresso Bazlı → "Günün başladığı, ritualin koyulaştığı yer"
Kategori: Mevsim Kahveleri → "Taze mevsim dokusuyla hazırlanmış limitli seri"
Kategori: Brunch → "Sakin bir hafta sonu sabahının mutfak hikayesi"`;

    const userMessage = isEnglish ? `Category: ${params.name}` : `Kategori: ${params.name}`;

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      return { success: false, error: 'Boş yanıt alındı' };
    }

    return { success: true, description: text };
  } catch (e) {
    console.error('AI generate error:', e);
    const message = e instanceof Error ? e.message : 'AI hatası';
    return { success: false, error: message };
  }
}

// ============================================================
// ÇEVİRİ (TR ↔ EN)
// ============================================================
export async function translateText(params: {
  text: string;
  from: 'tr' | 'en';
  to: 'tr' | 'en';
}): Promise<{ success: true; translated: string } | { success: false; error: string }> {
  try {
    if (!params.text.trim()) {
      return { success: false, error: 'Çevrilecek metin boş' };
    }

    if (params.from === params.to) {
      return { success: true, translated: params.text };
    }

    const systemPrompt = `You translate cafe/restaurant menu items between Turkish and English.
Rules:
- Preserve the style and tone
- Keep proper nouns (Chemex, V60, Matcha, etc.)
- Return ONLY the translation, no explanation
- Keep same length and feel`;

    const userMessage = `Translate from ${params.from === 'tr' ? 'Turkish' : 'English'} to ${params.to === 'tr' ? 'Turkish' : 'English'}:\n\n${params.text}`;

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      return { success: false, error: 'Boş yanıt alındı' };
    }

    return { success: true, translated: text };
  } catch (e) {
    console.error('AI translate error:', e);
    const message = e instanceof Error ? e.message : 'AI hatası';
    return { success: false, error: message };
  }
}

// ============================================================
// BESLENME & ALERJEN BİLGİSİ ÜRET (TÜRKİYE YASAL UYUM)
// ============================================================
// Türkiye Tarım & Ticaret Bakanlığı 1 Temmuz 2026 yönetmeliği
// 14 ana alerjen (EU 1169/2011 uyumlu)
// ============================================================

export type NutritionInfo = {
  allergens: string[]; // ['gluten', 'milk', 'egg'] gibi
  calories: number; // kcal porsiyon başına
  serving_size: string; // "1 porsiyon (350gr)"
  ingredients_tr: string;
  ingredients_en: string;
  contains_alcohol: boolean;
  ai_notes: string; // İşletmeciye not (kontrol et, değişkenlik gibi)
};

export const ALLERGEN_KEYS = [
  'gluten',     // buğday, arpa, çavdar, yulaf
  'crustaceans', // kabuklu deniz ürünleri (karides, yengeç)
  'eggs',
  'fish',
  'peanuts',    // yer fıstığı
  'soybeans',   // soya
  'milk',       // süt/laktoz
  'nuts',       // kuruyemiş (fındık, ceviz, badem)
  'celery',     // kereviz
  'mustard',    // hardal
  'sesame',     // susam
  'sulphites',  // sülfit
  'lupin',      // acı bakla
  'molluscs',   // yumuşakçalar
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

export async function generateNutritionInfo(params: {
  productName: string;
  description?: string;
  category?: string;
  price?: number;
}): Promise<{ success: true; nutrition: NutritionInfo } | { success: false; error: string }> {
  try {
    const systemPrompt = `Sen bir gıda alerjen ve beslenme uzmanısın. 
Türkiye'deki kafe/restoran ürünlerini analiz edip beslenme bilgisi çıkarıyorsun.

Görevin: Ürünü analiz et, JSON formatında DÖN — başka HİÇBİR ŞEY ekleme.

KURALLAR:
1. KONSERVATIF OL — emin değilsen alerjeni İŞARETLE.
   Yanlış uyarı, atlanan uyarıdan iyidir (anafilaksi riski).
   
2. 14 ANA ALERJEN (sadece bunları kullan):
   gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, nuts, 
   celery, mustard, sesame, sulphites, lupin, molluscs

3. YAYGIN İÇERIKLER → ALERJEN MAPPING:
   - Buğday/un/ekmek/makarna/bulgur → gluten
   - Süt/peynir/yoğurt/krema/tereyağı → milk
   - Yumurta/mayonez → eggs
   - Karides/yengeç/midye → crustaceans
   - Balık → fish
   - Fındık/ceviz/badem/fıstık (yer fıstığı hariç) → nuts
   - Soya sosu/tofu → soybeans
   - Susam/tahin → sesame
   - Şarap/kuru üzüm → sulphites
   
4. KALORİ — porsiyon başına makul tahmin (ortalama porsiyon).
   Ana yemek: 400-900 kcal | Tatlı: 200-500 | Kahve: 5-300 | Salata: 150-400

5. PORSIYON — Türkçe yaz: "1 porsiyon (350gr)" / "200ml" / "1 adet"

6. İÇERİK LİSTESİ — alerjenleri **kalın markdown** ile vurgula.
   Örnek (TR): "180gr dana eti, ekmek (**buğday**), cheddar peyniri (**süt**)..."
   Örnek (EN): "180g beef, bun (**wheat**), cheddar (**milk**)..."

7. ALKOL — şarap/bira/likör/rom/votka varsa true. Türk kahvesi/çay/kafein false.

8. AI_NOTES — kısa Türkçe not (15 kelime altı), olası belirsizlikleri belirt.
   Örnekler: "Soslar değişebilir, kontrol et" / "Glütensiz versiyonu olabilir" / "Boş bırak"

JSON ŞEMASI:
{
  "allergens": ["gluten", "milk"],
  "calories": 720,
  "serving_size": "1 porsiyon (350gr)",
  "ingredients_tr": "180gr dana eti, ekmek (**buğday**)...",
  "ingredients_en": "180g beef, bun (**wheat**)...",
  "contains_alcohol": false,
  "ai_notes": "Soslar değişkenlik gösterebilir"
}

SADECE JSON DÖN. Markdown code block KULLANMA. ÖN/SON METİN EKLEME.`;

    const userMessage = `Ürün adı: ${params.productName}
${params.description ? `Açıklama: ${params.description}` : ''}
${params.category ? `Kategori: ${params.category}` : ''}
${params.price ? `Fiyat: ${params.price} TL` : ''}`;

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      return { success: false, error: 'Boş yanıt alındı' };
    }

    // JSON parse — bazen LLM ```json``` ile sarabiliyor
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { success: false, error: 'JSON parse hatası: ' + cleaned.slice(0, 100) };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Geçersiz JSON' };
    }

    const data = parsed as Record<string, unknown>;

    // Validation
    const allergens = Array.isArray(data.allergens) ? data.allergens : [];
    const validAllergens = allergens.filter(
      (a): a is AllergenKey =>
        typeof a === 'string' && ALLERGEN_KEYS.includes(a as AllergenKey)
    );

    const nutrition: NutritionInfo = {
      allergens: validAllergens,
      calories: typeof data.calories === 'number' ? Math.round(data.calories) : 0,
      serving_size: typeof data.serving_size === 'string' ? data.serving_size : '1 porsiyon',
      ingredients_tr: typeof data.ingredients_tr === 'string' ? data.ingredients_tr : '',
      ingredients_en: typeof data.ingredients_en === 'string' ? data.ingredients_en : '',
      contains_alcohol: data.contains_alcohol === true,
      ai_notes: typeof data.ai_notes === 'string' ? data.ai_notes : '',
    };

    return { success: true, nutrition };
  } catch (e) {
    console.error('AI nutrition error:', e);
    const message = e instanceof Error ? e.message : 'AI hatası';
    return { success: false, error: message };
  }
}
