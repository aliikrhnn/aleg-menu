'use client';

/**
 * ════════════════════════════════════════════════════════════════════
 * PUSH NOTIFICATION — CLIENT (Browser) HELPER
 * ════════════════════════════════════════════════════════════════════
 *
 * Bu modül browser tarafında push notification akışını yönetir:
 *   1. Service worker'ı register et (yoksa)
 *   2. Browser'dan bildirim izni iste
 *   3. PushManager.subscribe() ile subscription al
 *   4. Subscription'ı server action ile DB'ye kaydet
 *   5. Çıkışta unsubscribe
 *
 * Kullanım:
 *   import { enableNotifications, disableNotifications, getNotificationStatus } from '@/lib/push-client';
 *
 *   const status = await getNotificationStatus();
 *   if (status.canEnable) {
 *     await enableNotifications();
 *   }
 */

import {
  getPushPublicKey,
  savePushSubscription,
  deletePushSubscription,
} from '@/lib/actions/push-notifications';

// ════════════════════════════════════════════════════════════════════
// FEATURE DETECTION
// ════════════════════════════════════════════════════════════════════

/**
 * Browser push notification destekliyor mu?
 * - HTTPS gerekiyor (localhost istisna)
 * - Service Worker API var mı
 * - PushManager API var mı
 * - Notification API var mı
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ════════════════════════════════════════════════════════════════════
// SERVICE WORKER REGISTER
// ════════════════════════════════════════════════════════════════════

/**
 * Service worker'ı register eder (yoksa).
 * Aleg'in tek service worker'ı /sw.js, scope: '/' (tüm site).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    // Önce mevcut registration var mı bak
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    // Yoksa register et
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Active olmasını bekle
    if (reg.installing || reg.waiting) {
      await new Promise<void>((resolve) => {
        const sw = reg.installing || reg.waiting;
        if (!sw) {
          resolve();
          return;
        }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
        });
      });
    }

    return reg;
  } catch (err) {
    console.error('[push-client] Service worker register hatası:', err);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// STATUS / DURUM
// ════════════════════════════════════════════════════════════════════

export type NotificationStatus = {
  /** Browser push destekliyor mu (HTTPS, SW, PushManager) */
  supported: boolean;
  /** Permission durumu: 'default' | 'granted' | 'denied' */
  permission: NotificationPermission | 'unsupported';
  /** Subscribe olmuş mu (DB'de kayıtlı + browser'da var) */
  subscribed: boolean;
  /** Etkinleştirilebilir mi (supported + permission != denied) */
  canEnable: boolean;
};

/**
 * Bildirim durumunu sorgular — UI butonu state'i için.
 */
export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      canEnable: false,
    };
  }

  const permission = Notification.permission;

  // Subscribed kontrolü — service worker register olmuşsa subscription var mı
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    }
  } catch {
    // ignore
  }

  return {
    supported: true,
    permission,
    subscribed,
    canEnable: permission !== 'denied',
  };
}

// ════════════════════════════════════════════════════════════════════
// ENABLE — kullanıcı "bildirim aç" derse
// ════════════════════════════════════════════════════════════════════

/**
 * Bildirim izni iste + subscribe + DB'ye kaydet.
 *
 * @returns success: true ise her şey OK, false ise hata mesajı içerir
 */
export async function enableNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Bu tarayıcı push bildirimi desteklemiyor',
    };
  }

  try {
    // 1. Service worker register
    const reg = await registerServiceWorker();
    if (!reg) {
      return {
        success: false,
        error: 'Service worker başlatılamadı',
      };
    }

    // 2. Permission iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Bildirim izni reddedildi. Tarayıcı ayarlarından izin verebilirsiniz.'
            : 'Bildirim izni alınamadı',
      };
    }

    // 3. VAPID public key'i al
    const keyResult = await getPushPublicKey();
    if (!keyResult.success || !keyResult.publicKey) {
      return {
        success: false,
        error: keyResult.error || 'VAPID key alınamadı',
      };
    }

    // 4. Mevcut subscription varsa kullan, yoksa yeni oluştur
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(keyResult.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 5. DB'ye kaydet
    const subJSON = subscription.toJSON();
    if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
      return {
        success: false,
        error: 'Subscription verisi eksik',
      };
    }

    const saveResult = await savePushSubscription({
      endpoint: subJSON.endpoint,
      p256dh: subJSON.keys.p256dh,
      auth: subJSON.keys.auth,
    });

    if (!saveResult.success) {
      // DB'ye kayıt başarısız olduysa browser subscription'ı da temizle
      await subscription.unsubscribe().catch(() => {});
      return {
        success: false,
        error: saveResult.error || 'Sunucu kaydı başarısız',
      };
    }

    return { success: true };
  } catch (err) {
    console.error('[push-client] enable hatası:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// DISABLE — kullanıcı "bildirim kapat" derse veya çıkış yapınca
// ════════════════════════════════════════════════════════════════════

export async function disableNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: true }; // zaten bir şey yok
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return { success: true };

    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return { success: true };

    const endpoint = subscription.endpoint;

    // Browser'dan unsubscribe
    await subscription.unsubscribe();

    // DB'den temizle (background, hata olsa da devam)
    deletePushSubscription(endpoint).catch((err) => {
      console.error('[push-client] DB silme hatası:', err);
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// HELPER — VAPID base64 → Uint8Array
// ════════════════════════════════════════════════════════════════════

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
