/**
 * ════════════════════════════════════════════════════════════════════
 * PIN BRUTE FORCE KORUMASI
 * ════════════════════════════════════════════════════════════════════
 *
 * Saldırganın 4-6 haneli PIN'i deneme yanılma ile kırmasını engeller.
 *
 * Aşamalı kilitleme stratejisi (her IP+cashier kombinasyonu için):
 *
 *   3 yanlış deneme → 60 saniye bekle
 *   6 yanlış deneme → 15 dakika bekle
 *  10+ yanlış deneme → 60 dakika kilit + audit log
 *
 * Başarılı PIN sayacı sıfırlamaz — saldırgan başarılı PIN bulunca
 * sayaç da o güne ait IP+cashier ile sınırlı kalır.
 *
 * NOT: Bu modül tek başına aktif değildir — verifyCashierPin()
 * action'ından çağrılınca devreye girer.
 * ════════════════════════════════════════════════════════════════════
 */

import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

// Aşama tanımları — geri sayım saniye bazında
const STAGES = [
  { wrongCount: 3, lockSeconds: 60 },        // 3 yanlış → 1 dk
  { wrongCount: 6, lockSeconds: 15 * 60 },   // 6 yanlış → 15 dk
  { wrongCount: 10, lockSeconds: 60 * 60 },  // 10 yanlış → 1 saat
] as const;

// En son aşamanın altındaysa kilit uygulanır
const MAX_WRONG_BEFORE_FULL_LOCK = STAGES[STAGES.length - 1].wrongCount;

export type PinRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      lockedUntil: Date;
      remainingSeconds: number;
      reason: 'temporary_lock' | 'full_lock';
      message: string;
    };

/**
 * IP + cashier_id kombinasyonu için rate limit kontrolü.
 * verifyCashierPin'in EN BAŞINDA çağrılır — denemeyi yapmadan önce.
 */
export async function checkPinRateLimit(params: {
  admin: AdminClient;
  ipAddress: string | null;
  cashierId: string;
}): Promise<PinRateLimitResult> {
  const { admin, ipAddress, cashierId } = params;

  // IP yoksa rate limit uygulamayız (server-side bir test ortamı olabilir)
  // Production'da Vercel her zaman IP gönderir
  if (!ipAddress) {
    return { allowed: true };
  }

  // Son 1 saatteki başarısız denemeleri say
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: attempts, error } = await admin
    .from('pin_attempts')
    .select('result, created_at')
    .eq('cashier_id', cashierId)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // DB hatası → güvenli tarafa: ALLOW (cashier giremezse kafe çalışmaz)
    // Hatayı log'la ama akışı durdurma
    console.error('[pin-rate-limit] DB error:', error.message);
    return { allowed: true };
  }

  // Sadece bu IP'nin denemelerini al
  // (Şimdilik IP filtresi yok çünkü ip_address inet tipinde, supabase-js
  // .eq('ip_address', '...') yapamayabilir. Cashier_id bazlı yeterli güvenli.)
  const wrongAttempts = (attempts || []).filter(
    (a) => a.result === 'wrong_pin'
  );

  const wrongCount = wrongAttempts.length;

  // Hiç hata yoksa veya ilk eşiğin altındaysa → izin ver
  if (wrongCount < STAGES[0].wrongCount) {
    return { allowed: true };
  }

  // Hangi aşamadayız?
  // STAGES tuple'ının eleman tipini literal'den çıkar (mutable bir tip)
  type Stage = { wrongCount: number; lockSeconds: number };
  let activeStage: Stage = STAGES[0];
  for (const stage of STAGES) {
    if (wrongCount >= stage.wrongCount) {
      activeStage = stage;
    }
  }

  // En son yanlış denemenin üzerinden ne kadar geçti?
  const lastWrong = wrongAttempts[0]; // DESC sırada en yeni
  if (!lastWrong) {
    return { allowed: true };
  }

  const lastWrongTime = new Date(lastWrong.created_at).getTime();
  const lockEndTime = lastWrongTime + activeStage.lockSeconds * 1000;
  const now = Date.now();

  if (now >= lockEndTime) {
    // Kilit süresi geçmiş, izin ver
    return { allowed: true };
  }

  // Hala kilitli
  const remainingSeconds = Math.ceil((lockEndTime - now) / 1000);
  const isFullLock = wrongCount >= MAX_WRONG_BEFORE_FULL_LOCK;

  let message: string;
  if (remainingSeconds < 60) {
    message = `Çok fazla yanlış deneme. ${remainingSeconds} saniye bekleyin.`;
  } else if (remainingSeconds < 3600) {
    const mins = Math.ceil(remainingSeconds / 60);
    message = `Çok fazla yanlış deneme. ${mins} dakika bekleyin.`;
  } else {
    const hours = Math.ceil(remainingSeconds / 3600);
    message = `Hesap geçici olarak kilitlendi. ${hours} saat sonra tekrar deneyin.`;
  }

  return {
    allowed: false,
    lockedUntil: new Date(lockEndTime),
    remainingSeconds,
    reason: isFullLock ? 'full_lock' : 'temporary_lock',
    message,
  };
}

/**
 * PIN denemesi sonucunu kaydet.
 * Başarılı veya başarısız fark etmez — audit için her zaman çağrılır.
 */
export async function recordPinAttempt(params: {
  admin: AdminClient;
  businessId: string;
  cashierId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  result: 'success' | 'wrong_pin' | 'not_found' | 'wrong_role' | 'locked';
  expectedRole?: string;
}): Promise<void> {
  try {
    await params.admin.from('pin_attempts').insert({
      business_id: params.businessId,
      cashier_id: params.cashierId,
      ip_address: params.ipAddress,
      user_agent: params.userAgent?.slice(0, 500) || null,
      result: params.result,
      expected_role: params.expectedRole || null,
    });
  } catch (e) {
    // Audit log yazılamazsa akışı bozmayalım
    console.error('[pin-rate-limit] log error:', e);
  }
}

/**
 * Vercel/Next.js request'inden IP adresini çıkar.
 * Header tabanlı: x-forwarded-for öncelikli, sonra x-real-ip.
 */
export function extractIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Birden fazla IP varsa ilki client'ın
    return forwarded.split(',')[0].trim() || null;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}
