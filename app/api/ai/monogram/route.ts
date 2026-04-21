import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkLimit, recordUsage } from '@/lib/ai/rate-limit';

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
  const limit = await checkLimit(auth.businessId, 'monogram');
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
  const limit = await checkLimit(auth.businessId, 'monogram');
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Günlük logo üretim limitine ulaştın (${limit.limit}/gün). ${limit.resetsIn} saat sonra yenilenir.`,
        rateLimit: { used: limit.used, limit: limit.limit, resetsIn: limit.resetsIn },
      },
      { status: 429 }
    );
  }

  try {
    const { businessName, style } = await request.json();

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
      classic:
        'Klasik editorial. İtalik Georgia serif, zarif, letterpress hissi. Çerçeve veya kartpostal detayı olabilir.',
      modern:
        'Modern, minimal. Sans-serif veya geometrik. Temiz hatlar, simetrik.',
      vintage:
        'Vintage, el yapımı. Kalın çerçeveler, ornamentler, eski kafe işaret levhası.',
      warm:
        'Warm, sıcak. Yumuşak renkler, italik serif, kağıt üstünde mürekkep hissi.',
      minimal:
        'Aşırı minimal. Tek harf, sade, çizgi sanat. Daire veya kare çerçeve.',
      bold:
        'Bold, cesur. Kalın harfler, yüksek kontrast, ikonik. Dikkat çeker.',
    };

    const styleDesc = styleMap[style || 'classic'] || styleMap.classic;

    // İşletme adından initials çıkar
    const initials = businessName
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 3)
      .join('')
      .toUpperCase();

    const systemPrompt = `Sen bir grafik tasarımcısın. İşletmeler için SVG monogram logolar üretiyorsun.

Kurallar:
- Her SVG 200x200 viewBox kullansın
- SADECE text, rect, circle, line, path, g ve polygon elementleri kullan
- Renkler: fill/stroke attribute ile, HEX formatı (#C4553A gibi)
- Fontlar için Georgia, "Times New Roman" veya serif kullan, Arial/sans-serif sade opsiyon
- Profesyonel kalitede, detaylı ama karmaşa yok
- Her 3 monogram FARKLI bir yaklaşım olsun (örn: salt harf, çerçeveli, ornamentli)
- Arka plan fill="transparent" veya olmasın (şeffaf)
- Kafe/restoran için uygun, zarif, profesyonel

Önemli:
- En az 1 tanesi harf + stilize ornament olsun (nokta, çizgi, kenar süsleme)
- En az 1 tanesi çerçeveli (daire/kare içinde) olsun
- Renk paletini uyumlu tut: warm (kahverengi/krem) veya monokrom (siyah-beyaz)

SADECE JSON döndür, hiçbir açıklama yapma. Her SVG tam olarak <svg...>...</svg> formatında string olarak:
{
  "variants": [
    {
      "name": "Kısa isim 1",
      "description": "1 cümle açıklama",
      "svg": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 200 200\\">...</svg>"
    },
    {
      "name": "Kısa isim 2",
      "description": "1 cümle açıklama",
      "svg": "..."
    },
    {
      "name": "Kısa isim 3",
      "description": "1 cümle açıklama",
      "svg": "..."
    }
  ]
}`;

    const userMessage = `İŞLETME ADI: ${businessName}
İNISIYAL: ${initials}
TARZ: ${styleDesc}

3 farklı monogram SVG üret. Her biri farklı yaklaşım olsun (salt harf, çerçeveli, ornamentli).`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
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

    const text = textBlock.text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('Monogram - no JSON found:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'AI formatı hatalı' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(match[0]);
    const variants = parsed.variants || [];

    // Her SVG'yi validate et — sadece svg ile başlayanlar
    const valid = variants.filter(
      (v: { svg?: string }) => v.svg && v.svg.trim().startsWith('<svg')
    );

    if (valid.length === 0) {
      return NextResponse.json(
        { error: 'AI geçerli SVG üretmedi' },
        { status: 500 }
      );
    }

    // Başarılı - kullanımı kaydet
    await recordUsage(auth.businessId, auth.userId, 'monogram', response.usage?.output_tokens || 0);

    return NextResponse.json({
      variants: valid,
      rateLimit: {
        used: limit.used + 1,
        limit: limit.limit,
      },
    });
  } catch (err) {
    console.error('Monogram API error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'AI hatası',
      },
      { status: 500 }
    );
  }
}
