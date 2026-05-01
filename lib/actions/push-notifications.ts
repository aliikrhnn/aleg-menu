'use server';

/**
 * Push Notification Subscription — Server Actions
 *
 * Client tarafında garson/kasa giriş yapınca:
 *   1. Tarayıcıdan bildirim izni iste
 *   2. PushManager.subscribe() ile subscription al
 *   3. Bu action'ı çağırıp DB'ye kaydet
 *
 * Çıkış (logout) yapılınca subscription silinir.
 */

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { tryCashierFallback } from '@/lib/security/auth-context';
import { getVapidPublicKey } from '@/lib/security/web-push';

// ════════════════════════════════════════════════════════════════════
// PUBLIC KEY — client subscribe sırasında lazım
// ════════════════════════════════════════════════════════════════════

export async function getPushPublicKey(): Promise<{
  success: boolean;
  publicKey?: string;
  error?: string;
}> {
  const key = getVapidPublicKey();
  if (!key) {
    return {
      success: false,
      error: 'Push notification yapılandırılmamış (VAPID key eksik)',
    };
  }
  return { success: true, publicKey: key };
}

// ════════════════════════════════════════════════════════════════════
// SUBSCRIBE — yeni cihaz kaydı
// ════════════════════════════════════════════════════════════════════

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Cashier session zorunlu (sadece giriş yapmış cashier subscribe edebilir)
    const fallback = await tryCashierFallback();
    if (!fallback) {
      return {
        success: false,
        error: 'Önce giriş yapmanız gerekiyor',
      };
    }

    if (!input.endpoint || !input.p256dh || !input.auth) {
      return { success: false, error: 'Eksik subscription verisi' };
    }

    const userAgent = headers().get('user-agent') || null;
    const admin = createAdminClient();

    // Upsert: aynı endpoint zaten varsa güncelle (token rotation için)
    const { error } = await admin.from('push_subscriptions').upsert(
      {
        business_id: fallback.businessId,
        cashier_id: fallback.cashierId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        role: fallback.cashierRole,
        user_agent: userAgent,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'endpoint',
      }
    );

    if (error) {
      console.error('[push] subscribe hatası:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// UNSUBSCRIBE — cihaz kaldır
// ════════════════════════════════════════════════════════════════════

export async function deletePushSubscription(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!endpoint) {
      return { success: false, error: 'Endpoint gerekli' };
    }

    const admin = createAdminClient();

    // Endpoint UNIQUE olduğu için sadece bir tane silinir
    // Cashier auth kontrolü yapmıyoruz çünkü endpoint unique
    // (kötü niyetli biri başkasının endpoint'ini bilmeden silemez)
    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST — sadece dev için, gerçek bildirim göndermeyi test et
// ════════════════════════════════════════════════════════════════════

/**
 * Test push gönder — kendine bildirim atar.
 * Subscribe akışı çalıştığını doğrulamak için.
 *
 * NOT: Production'da bu action erişilebilir kalsın, kullanıcı kendi
 * cihazını test edebilir. Ama sadece kendi cihazına gönderir.
 */
export async function sendTestPush(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const fallback = await tryCashierFallback();
    if (!fallback) {
      return { success: false, error: 'Giriş yapmamışsınız' };
    }

    const { sendPushToCashier } = await import('@/lib/security/web-push');
    const result = await sendPushToCashier(fallback.cashierId, {
      title: '🎉 Test bildirimi',
      body: 'Aleg push notification çalışıyor!',
      url: fallback.cashierRole === 'cashier' ? '/kasa' : '/garson',
      tag: 'test-notification',
    });

    if (result.sent === 0) {
      return {
        success: false,
        error: 'Hiç cihaz subscribe değil. Önce bildirim izni verin.',
      };
    }

    return {
      success: true,
      message: `${result.sent} cihaza bildirim gönderildi${result.expired > 0 ? ` (${result.expired} eski cihaz temizlendi)` : ''}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
