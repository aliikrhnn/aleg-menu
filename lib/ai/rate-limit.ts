import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// AI Rate Limit - günlük kullanım takibi
// ============================================================

export type AiFeature = 'slogan' | 'monogram' | 'chat' | 'variation' | 'insights';

// Trial plan limitleri (pilot için)
export const AI_LIMITS: Record<AiFeature, number> = {
  monogram: 1, // günde 1 logo üretimi
  slogan: 5, // günde 5 slogan oluşturma
  chat: 15, // günde 15 chat mesajı
  variation: 5, // günde 5 varyasyon üretimi
  insights: 3, // günde 3 rapor içgörüsü
};

// Son 24 saat içinde kullanım sayısı
export async function getTodayUsage(
  businessId: string,
  feature: AiFeature
): Promise<number> {
  const admin = createAdminClient();
  const since = new Date();
  since.setHours(since.getHours() - 24); // son 24 saat

  const { count } = await admin
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('feature', feature)
    .gte('created_at', since.toISOString());

  return count ?? 0;
}

// Limit kontrolü
export async function checkLimit(
  businessId: string,
  feature: AiFeature
): Promise<{ allowed: boolean; used: number; limit: number; resetsIn: number }> {
  const used = await getTodayUsage(businessId, feature);
  const limit = AI_LIMITS[feature];

  // Limitin sıfırlanmasına kalan süre (en eski kullanımdan 24 saat sonra)
  let resetsIn = 24; // default 24 saat
  if (used >= limit) {
    const admin = createAdminClient();
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const { data: oldest } = await admin
      .from('ai_usage')
      .select('created_at')
      .eq('business_id', businessId)
      .eq('feature', feature)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (oldest) {
      const oldestTime = new Date(oldest.created_at).getTime();
      const unlockTime = oldestTime + 24 * 60 * 60 * 1000;
      resetsIn = Math.max(0, Math.ceil((unlockTime - Date.now()) / (60 * 60 * 1000)));
    }
  }

  return {
    allowed: used < limit,
    used,
    limit,
    resetsIn,
  };
}

// Kullanımı kaydet
export async function recordUsage(
  businessId: string,
  userId: string | undefined,
  feature: AiFeature,
  tokensUsed: number = 0
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('ai_usage').insert({
    business_id: businessId,
    user_id: userId || null,
    feature,
    tokens_used: tokensUsed,
  });
}
