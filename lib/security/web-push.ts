/**
 * Web Push Notification — Server Side Helper
 *
 * Bu modül sunucu tarafında push notification göndermek için kullanılır.
 * VAPID key'leri Vercel env variables'tan okur.
 *
 * Kullanım:
 *   import { sendPushToBusiness, sendPushToCashier } from '@/lib/security/web-push';
 *
 *   // Tüm garsonlara çağrı bildirimi
 *   await sendPushToBusiness(businessId, 'waiter', {
 *     title: 'Yeni çağrı',
 *     body: 'Masa 5 — Su istiyorum',
 *     url: '/garson',
 *   });
 *
 *   // Belirli kasiyere bildirim
 *   await sendPushToCashier(cashierId, {
 *     title: 'Yeni sipariş',
 *     body: 'QR sipariş geldi - Masa 3',
 *     url: '/kasa',
 *   });
 */

import * as webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

// ════════════════════════════════════════════════════════════════════
// VAPID YAPILANDIRMA
// ════════════════════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:destek@alegstudio.com';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      '[web-push] VAPID keys yapılandırılmamış. Push gönderme devre dışı.\n' +
        'Vercel env variables: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY'
    );
    return false;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error('[web-push] VAPID konfigürasyon hatası:', err);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // tıklayınca açılacak URL (default: /)
  icon?: string; // bildirim ikonu URL'i
  badge?: string; // status bar ikonu (Android)
  tag?: string; // aynı tag'li bildirimleri birleştir
  silent?: boolean;
  vibrate?: number[]; // [200, 100, 200] — titreşim deseni
  requireInteraction?: boolean; // kullanıcı kapatana kadar dursun
};

type DBSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// ════════════════════════════════════════════════════════════════════
// CORE PUSH SEND
// ════════════════════════════════════════════════════════════════════

/**
 * Tek bir subscription'a push gönderir.
 * 410/404 dönerse (subscription expired) DB'den temizler.
 */
async function sendToSubscription(
  sub: DBSubscription,
  payload: PushPayload
): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  const subscription: PushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  // Service worker bu JSON'u alıp showNotification ile gösterir
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    silent: payload.silent || false,
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: payload.requireInteraction || false,
  });

  try {
    await webpush.sendNotification(subscription, data, {
      TTL: 60, // 60 sn içinde teslim edilemezse iptal
      urgency: 'high', // APNs apns-priority: 10 (iOS kilit ekranı için kritik)
      // topic: aynı topic'li bildirimler birleşir (tag yerine)
      // Tag client tarafında handle edilir (showNotification options)
    });
    return { success: true };
  } catch (err: unknown) {
    const errObj = err as { statusCode?: number; body?: string };
    const statusCode = errObj?.statusCode;

    // 410 Gone, 404 Not Found = subscription expired/invalid
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, expired: true };
    }

    return {
      success: false,
      error: `${statusCode || 'unknown'}: ${errObj?.body || String(err)}`,
    };
  }
}

/**
 * Birden fazla subscription'a paralel push gönderir, sonuçları toplar.
 * Expired subscription'ları DB'den temizler.
 */
async function sendToSubscriptions(
  subs: DBSubscription[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: number }> {
  if (subs.length === 0) {
    return { sent: 0, failed: 0, expired: 0 };
  }

  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: subs.length, expired: 0 };
  }

  const results = await Promise.all(
    subs.map((sub) => sendToSubscription(sub, payload))
  );

  const sent = results.filter((r) => r.success).length;
  const expired = results.filter((r) => r.expired).length;
  const failed = results.length - sent - expired;

  // Expired subscription'ları temizle (background)
  const expiredIds = subs
    .filter((_, i) => results[i].expired)
    .map((s) => s.id);

  if (expiredIds.length > 0) {
    const admin = createAdminClient();
    admin
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds)
      .then(({ error }) => {
        if (error) {
          console.error('[web-push] Expired sub temizleme hatası:', error);
        }
      });
  }

  // Last_used_at güncelle (background, başarılı olanlar için)
  const usedIds = subs
    .filter((_, i) => results[i].success)
    .map((s) => s.id);

  if (usedIds.length > 0) {
    const admin = createAdminClient();
    admin
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', usedIds)
      .then(({ error }) => {
        if (error) {
          console.error('[web-push] last_used_at güncelleme hatası:', error);
        }
      });
  }

  return { sent, failed, expired };
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════

/**
 * Bir işletmenin belirli bir rolündeki tüm cihazlara push gönderir.
 *
 * @param businessId - Hedef işletme
 * @param role - 'cashier' | 'waiter' (her ikisi için 'both' kasiyer için de garson için de gönder)
 * @param payload - Bildirim içeriği
 *
 * Örnek: Müşteri çağrı yapınca tüm garsonlara
 *   sendPushToBusiness(bizId, 'waiter', { title: 'Yeni çağrı', body: 'Masa 5' })
 */
export async function sendPushToBusiness(
  businessId: string,
  role: 'cashier' | 'waiter',
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: number }> {
  const admin = createAdminClient();

  // Role 'both' olan cashier'lar her iki bildirim türünü de alır
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('business_id', businessId)
    .in('role', [role, 'both']);

  if (error) {
    console.error('[web-push] Subscription listesi alınamadı:', error);
    return { sent: 0, failed: 0, expired: 0 };
  }

  return sendToSubscriptions((subs || []) as DBSubscription[], payload);
}

/**
 * Belirli bir kasiyere/garsona (tüm cihazlarına) push gönderir.
 */
export async function sendPushToCashier(
  cashierId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: number }> {
  const admin = createAdminClient();

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('cashier_id', cashierId);

  if (error) {
    console.error('[web-push] Cashier subs alınamadı:', error);
    return { sent: 0, failed: 0, expired: 0 };
  }

  return sendToSubscriptions((subs || []) as DBSubscription[], payload);
}

/**
 * VAPID public key'i client'a vermek için (subscribe sırasında lazım).
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}
