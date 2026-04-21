import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkLimit, recordUsage } from '@/lib/ai/rate-limit';

export const runtime = 'nodejs';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

async function checkAuthAndGetBusiness() {
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

  const admin = createAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select(
      'name, city, tagline_tr, address, phone, working_hours, order_config'
    )
    .eq('id', membership.business_id)
    .maybeSingle();

  return { user, business, businessId: membership.business_id };
}

export async function POST(request: Request) {
  const authData = await checkAuthAndGetBusiness();
  if (!authData) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit kontrolü
  const limit = await checkLimit(authData.businessId, 'chat');
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: `Günlük chat limitine ulaştın (${limit.limit}/gün). ${limit.resetsIn} saat sonra yenilenir.`,
        rateLimit: { used: limit.used, limit: limit.limit, resetsIn: limit.resetsIn },
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Mesaj gerekli' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI servisi yapılandırılmamış' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // İşletme context'i
    const business = authData.business;
    const bizName = business?.name || 'İşletme';
    const contextText = business
      ? `Sen "${bizName}" işletmesinin AI asistanısın. Kendine "${bizName} Asistanı" veya "Aleg Asistanı" diyorsun. 
      
İşletme bilgileri:
- Ad: ${business.name}
${business.city ? `- Şehir: ${business.city}` : ''}
${business.tagline_tr ? `- Slogan: ${business.tagline_tr}` : ''}
${business.address ? `- Adres: ${business.address}` : ''}`
      : 'Sen Aleg platformunun AI asistanısın.';

    const systemPrompt = `${contextText}

Sen Aleg'in yapay zeka asistanısın — Aleg, kafe ve restoran işletmeleri için tasarlanmış bir SaaS platformudur (QR menü, POS, masa yönetimi, KDS, sipariş yönetimi).

KİMLİK:
- Adın: Aleg Asistanı (veya işletmenin asistanı)
- Kendini Claude, OpenAI, ChatGPT ya da başka bir AI olarak TANIMLAMAZSIN
- "Ben Aleg asistanıyım" de, modelin adını söyleme
- Kendini tanıtırken: "Ben ${bizName} asistanıyım" veya "Aleg asistanı olarak buradayım" gibi başla

GÖREVİN:
- İşletme sahibine platform hakkında yardım etmek
- Menü, fiyatlandırma, saatler, tasarım hakkında pratik tavsiyeler vermek
- Pazarlama ve marka fikirleri önermek
- Kısa, net, samimi Türkçe konuşmak

ÜSLUP:
- Gereksiz uzun yanıt verme, konuya odaklan (2-4 cümle ideal)
- Listeler yerine akıcı Türkçe kullan (gerekmedikçe)
- Kibar ve sıcak bir ton kullan
- "Harika", "Mükemmel" gibi abartılı övgüleri kullanma
- Kullanıcının işini bilsen bile ukala olma
- Emoji çok nadir kullan

Aleg özellikleri:
- QR menü (müşteri QR tarayıp sipariş verir)
- POS canlı sipariş kanbanı
- KDS mutfak ekranı
- Masa yönetimi + bölgeler + durum
- 4 farklı QR tasarımı (Minimal, Warm, Dark, Kraft)
- Çalışma saatleri, sosyal medya linkleri
- Türkçe/İngilizce menü`;

    // Sadece son 10 mesajı gönder (context limit için)
    const recentMessages = messages.slice(-10).map((m: ChatMessage) => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: recentMessages,
    });

    // SSE stream oluştur
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ text: chunk.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();

          // Başarılı stream sonrası kullanımı kaydet
          recordUsage(authData.businessId, authData.user.id, 'chat', 0).catch(
            (e) => console.error('Chat usage record error:', e)
          );
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'AI hatası',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
