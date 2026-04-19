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

    const systemPrompt = `You translate cafe/restaurant menu items between Turkish and Turkish.
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
