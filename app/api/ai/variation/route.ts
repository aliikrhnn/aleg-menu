import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkLimit, recordUsage } from '@/lib/ai/rate-limit';

export const runtime = 'nodejs';

const FEATURE = 'variation' as const;

// GET - kalan hak bilgisi
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 403 });
    }

    const limit = await checkLimit(membership.business_id, FEATURE);

    return NextResponse.json({
      used: limit.used,
      limit: limit.limit,
      remaining: Math.max(0, limit.limit - limit.used),
      hoursUntilReset: limit.resetsIn,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Hata' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 403 });
    }

    const businessId = membership.business_id;

    // Rate limit
    const limit = await checkLimit(businessId, FEATURE);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Günlük AI varyasyon limitin doldu (${limit.used}/${limit.limit}). ${limit.resetsIn} saat sonra yenilenir.`,
          rateLimited: true,
          hoursUntilReset: limit.resetsIn,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt: string = (body.prompt || '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt gerekli' }, { status: 400 });
    }
    if (prompt.length > 200) {
      return NextResponse.json({ error: 'Prompt çok uzun (max 200 karakter)' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key tanımlı değil' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `Sen bir kafe/restoran menü varyasyon asistanısın. Türkiye'deki kafelerde yaygın varyasyonlar üretirsin.

Kullanıcı bir varyasyon konusu söyler (örnek: "Boy", "Süt çeşidi", "Ek malzeme", "Şeker"), sen JSON formatında uygun bir varyasyon şablonu döndürürsün.

Kurallar:
- name_tr: Kısa ve net (1-2 kelime)
- name_en: İngilizce karşılığı (1-2 kelime)
- type: "single" (tek seçim - Boy, Süt, Şeker) VEYA "multi" (çoklu seçim - Ek malzeme, Toppingler)
- required: Boy ve Süt genelde zorunludur (true), Ek malzeme opsiyoneldir (false)
- values: 3-6 arası değer
- price_delta: TL cinsinden (Türkiye fiyatları). Standart seçenek 0, premium +5 ila +20, indirimli -5 ila -10
- is_default: SADECE "single" tipinde varsa orta/standart seçeneğe true. Multi tipinde tümü false.

ÖRNEKLER:

Input: "Boy"
Output: {"name_tr":"Boy","name_en":"Size","type":"single","required":true,"values":[{"name_tr":"Küçük","name_en":"Small","price_delta":-5,"is_default":false},{"name_tr":"Orta","name_en":"Medium","price_delta":0,"is_default":true},{"name_tr":"Büyük","name_en":"Large","price_delta":10,"is_default":false}]}

Input: "Süt"
Output: {"name_tr":"Süt Çeşidi","name_en":"Milk","type":"single","required":true,"values":[{"name_tr":"Normal","name_en":"Whole","price_delta":0,"is_default":true},{"name_tr":"Yağsız","name_en":"Skim","price_delta":0,"is_default":false},{"name_tr":"Laktozsuz","name_en":"Lactose-free","price_delta":5,"is_default":false},{"name_tr":"Badem Sütü","name_en":"Almond Milk","price_delta":10,"is_default":false},{"name_tr":"Yulaf Sütü","name_en":"Oat Milk","price_delta":10,"is_default":false}]}

Input: "Ek malzeme"
Output: {"name_tr":"Ek Malzeme","name_en":"Extras","type":"multi","required":false,"values":[{"name_tr":"Çift Shot","name_en":"Extra Shot","price_delta":15,"is_default":false},{"name_tr":"Karamel Sos","name_en":"Caramel Sauce","price_delta":5,"is_default":false},{"name_tr":"Vanilya","name_en":"Vanilla","price_delta":5,"is_default":false},{"name_tr":"Çikolata Sos","name_en":"Chocolate Sauce","price_delta":5,"is_default":false},{"name_tr":"Tarçın","name_en":"Cinnamon","price_delta":0,"is_default":false}]}

ÖNEMLİ: Sadece geçerli JSON döndür. Başka hiçbir metin yok, açıklama yok, code fence yok.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const aiText = textBlock?.type === 'text' ? textBlock.text.trim() : '';

    if (!aiText) {
      return NextResponse.json({ error: 'AI yanıt vermedi' }, { status: 500 });
    }

    // JSON parse - code fence varsa temizle
    let parsed: unknown;
    try {
      const cleaned = aiText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI geçersiz format döndü, lütfen tekrar dene' },
        { status: 500 }
      );
    }

    // Validate
    const v = parsed as Record<string, unknown>;
    if (
      typeof v.name_tr !== 'string' ||
      typeof v.type !== 'string' ||
      typeof v.required !== 'boolean' ||
      !Array.isArray(v.values) ||
      v.values.length < 2
    ) {
      return NextResponse.json({ error: 'AI eksik veri döndü' }, { status: 500 });
    }

    // Tek default kontrolü
    if (v.type === 'single') {
      let firstFound = false;
      v.values = (v.values as Array<Record<string, unknown>>).map((val) => {
        if (val.is_default && !firstFound) {
          firstFound = true;
          return val;
        }
        return { ...val, is_default: false };
      });
    } else {
      v.values = (v.values as Array<Record<string, unknown>>).map((val) => ({
        ...val,
        is_default: false,
      }));
    }

    // Rate limit kaydı
    await recordUsage(businessId, user.id, FEATURE, response.usage?.input_tokens || 0);

    return NextResponse.json({
      success: true,
      data: parsed,
      remaining: Math.max(0, limit.limit - limit.used - 1),
      limit: limit.limit,
    });
  } catch (err) {
    console.error('AI variation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI hatası' },
      { status: 500 }
    );
  }
}
