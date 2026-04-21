import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkLimit, recordUsage } from '@/lib/ai/rate-limit';

// Auth'lu bir işletme üyesi miyiz?
async function checkAuth(): Promise<{ businessId: string; userId: string } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return null;
  return { businessId: membership.business_id, userId: user.id };
}

// GET - rate limit durumu
export async function GET() {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  const limit = await checkLimit(auth.businessId, 'slogan');
  return NextResponse.json({
    rateLimit: {
      used: limit.used,
      limit: limit.limit,
      resetsIn: limit.resetsIn,
    },
  });
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  // Rate limit kontrolü
  const limit = await checkLimit(auth.businessId, 'slogan');
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Günlük slogan limitine ulaştın (${limit.limit}/gün). ${limit.resetsIn} saat sonra yenilenir.`,
        rateLimit: { used: limit.used, limit: limit.limit, resetsIn: limit.resetsIn },
      },
      { status: 429 }
    );
  }

  try {
    const { businessName, description, style, lang } = await request.json();

    if (!businessName || typeof businessName !== 'string') {
      return NextResponse.json(
        { error: 'İşletme adı gerekli' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI servisi yapılandırılmamış' },
        { status: 500 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const styleMap: Record<string, string> = {
      minimal: 'kısa ve çarpıcı (3-5 kelime max)',
      poetic: 'şiirsel ve hissi',
      playful: 'eğlenceli ve sıcak',
      modern: 'modern ve profesyonel',
      classic: 'klasik ve zarif',
    };

    const styleDesc = styleMap[style || 'minimal'] || styleMap.minimal;
    const targetLang = lang === 'en' ? 'İngilizce' : 'Türkçe';

    const systemPrompt = `Sen bir marka stratejisti ve copywriter'sın. Kafe/restoran/butik işletmeler için akılda kalıcı, marka bilinci yaratan SLOGANLAR üretiyorsun.

Kurallar:
- Her slogan 4-8 kelime arasında olsun
- Klişe olmasın, özgün olsun ("lezzetin adresi" GİBİ DEĞİL)
- Tipografi dostu (tırnak işareti kullanma)
- Marka hissi yaratsın (duygu, detay, karakter)
- Türkçe doğal akışta olsun (çeviri gibi durmasın)

Örnek iyi sloganlar:
- "Üçüncü nesil, ilk izlenim."
- "Her fincanda bir hikaye."
- "Kahvenin en Karaköylü hali."
- "Sabahı yeniden tanımla."

SADECE JSON döndür, hiçbir açıklama yapma:
{"slogans": ["slogan 1", "slogan 2", "slogan 3", "slogan 4"]}`;

    const userMessage = `İŞLETME: ${businessName}
${description ? `AÇIKLAMA: ${description}` : ''}
TARZ: ${styleDesc}
DİL: ${targetLang}

4 farklı slogan öner. Her biri farklı bir yönü vurgulasın.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AI yanıt vermedi' },
        { status: 500 }
      );
    }

    // JSON parse et
    const text = textBlock.text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: 'AI formatı hatalı' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(match[0]);
    const slogans: string[] = parsed.slogans || [];

    // Başarılı - kullanımı kaydet
    if (slogans.length > 0) {
      await recordUsage(auth.businessId, auth.userId, 'slogan', response.usage?.output_tokens || 0);
    }

    return NextResponse.json({
      slogans,
      rateLimit: {
        used: limit.used + 1,
        limit: limit.limit,
      },
    });
  } catch (err) {
    console.error('Slogan API error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'AI hatası',
      },
      { status: 500 }
    );
  }
}
