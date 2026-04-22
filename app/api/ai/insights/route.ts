import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkLimit, recordUsage } from '@/lib/ai/rate-limit';

async function checkAuth(): Promise<{ businessId: string; userId: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  if (!auth) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const limit = await checkLimit(auth.businessId, 'insights');
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
  if (!auth) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const limit = await checkLimit(auth.businessId, 'insights');
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Günlük içgörü limitine ulaştın (${limit.limit}/gün). ${limit.resetsIn} saat sonra yenilenir.`,
        rateLimit: { used: limit.used, limit: limit.limit, resetsIn: limit.resetsIn },
      },
      { status: 429 }
    );
  }

  try {
    const { reportsData, businessName } = await request.json();

    if (!reportsData) {
      return NextResponse.json({ error: 'Rapor verisi gerekli' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI servisi yapılandırılmamış' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Sadece önemli kısımları AI'a ver - token tasarrufu için
    const compactData = {
      isletme: businessName || 'İşletme',
      bugun: reportsData.summary?.today,
      dun: reportsData.summary?.yesterday,
      bu_hafta: reportsData.summary?.week,
      bu_ay: reportsData.summary?.month,
      ciro_degisimi_yuzde: Math.round(reportsData.summary?.revenue_change_pct || 0),
      siparis_degisimi_yuzde: Math.round(reportsData.summary?.order_change_pct || 0),
      en_cok_satan: (reportsData.topProducts || []).slice(0, 5).map((p: { product_name: string; quantity: number; revenue: number }) => ({
        ad: p.product_name,
        adet: p.quantity,
        ciro: Math.round(p.revenue),
      })),
      siparis_tipleri: reportsData.orderTypes,
      en_iyi_gun: reportsData.bestDay,
    };

    const systemPrompt = `Sen bir kafe/restoran işletme danışmanısın. Türkiye'deki kafe pratiğini biliyorsun.
İşletme sahibine verilen rapor verisi üzerinden DOĞAL DİL, KISA ve SAMIMI yorumlar yaparsın.

Kurallar:
- Türkçe yaz, sıcak bir arkadaş tonu kullan (işletme sahibine "sen" diye hitap et)
- Sadece VERİ'de olanı yorumla, uydurma
- 3-4 içgörü üret: her biri 1-2 cümle
- Her içgörü bir PATERN (trend, anomali, fırsat, tavsiye)
- Sayısal veriye dayan: "Latte bu hafta 150 adet, toplam cironun %25'i"
- Eğer veri zayıfsa (az sipariş vs) dürüst ol: "Henüz çok veri yok ama..."
- Aksiyon öner: "Latte satışların çok iyi, Cappuccino'yla kombo promosyon dene"

SADECE JSON döndür:
{
  "ozet": "Tek cümle genel durum (örn: Bu hafta güçlü bir performans)",
  "icgorular": [
    {
      "baslik": "5 kelime max başlık",
      "icerik": "1-2 cümle yorum"
    }
  ]
}

icgorular array 3-4 öğe olsun.`;

    const userMessage = `İşletme rapor verisi:

${JSON.stringify(compactData, null, 2)}

Bu verileri incele ve bana içgörüler ver.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'AI yanıt vermedi' }, { status: 500 });
    }

    const text = textBlock.text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: 'AI formatı hatalı' }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);

    // Başarılı - kullanımı kaydet
    await recordUsage(
      auth.businessId,
      auth.userId,
      'insights',
      response.usage?.output_tokens || 0
    );

    return NextResponse.json({
      ozet: parsed.ozet || '',
      icgorular: parsed.icgorular || [],
      rateLimit: {
        used: limit.used + 1,
        limit: limit.limit,
      },
    });
  } catch (err) {
    console.error('Insights API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI hatası' },
      { status: 500 }
    );
  }
}
