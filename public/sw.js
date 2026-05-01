/**
 * ════════════════════════════════════════════════════════════════════
 * ALEG SERVICE WORKER
 *
 * Görevleri:
 *   1. Push notification al, göster (telefon kilitli olsa bile)
 *   2. Bildirime tıklayınca uygulamayı aç (veya odakla)
 *   3. PWA için minimum şart (offline shell yok, sadece push)
 *
 * Bu dosya public/ altında olduğu için herhangi bir build adımı yok,
 * doğrudan /sw.js olarak servis edilir.
 *
 * Service worker'ın HTTPS gerektirir (localhost istisna).
 * ════════════════════════════════════════════════════════════════════
 */

// Versiyon — sw.js güncellenince burayı değiştir, eski cache temizlenir
const SW_VERSION = 'v1.0.0';

// ────────────────────────────────────────────────────────────────────
// LIFECYCLE
// ────────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[Aleg SW]', SW_VERSION, 'install');
  // Yeni SW yüklenince hemen aktive ol (eskisini bekleme)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Aleg SW]', SW_VERSION, 'activate');
  // Tüm tab'lar için hemen control al
  event.waitUntil(self.clients.claim());
});

// ────────────────────────────────────────────────────────────────────
// PUSH EVENT — bildirim geldiğinde
// ────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[Aleg SW] Push geldi ama data yok');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Payload JSON değilse text olarak göster
    payload = {
      title: 'Aleg',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'Aleg';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/garson-icon.svg',
    badge: payload.badge || '/icons/garson-icon.svg',
    tag: payload.tag, // aynı tag'li bildirimleri birleştir
    data: {
      url: payload.url || '/',
    },
    silent: payload.silent === true,
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: payload.requireInteraction === true,
    // iOS Safari için actions desteklenmez ama Android Chrome destekler
    actions: payload.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ────────────────────────────────────────────────────────────────────
// NOTIFICATIONCLICK — bildirime tıklayınca
// ────────────────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      // Açık olan tab'lardan biri zaten bu URL'de ise oraya odakla
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Tam eşleşme veya prefix eşleşmesi olan bir tab var mı?
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          const targetPath = targetUrl.startsWith('/')
            ? targetUrl
            : new URL(targetUrl).pathname;

          if (clientUrl.pathname === targetPath || clientUrl.pathname.startsWith(targetPath)) {
            await client.focus();
            return;
          }
        } catch {
          // URL parse edilemezse atla
        }
      }

      // Eşleşen tab yoksa yeni tab aç
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// ────────────────────────────────────────────────────────────────────
// SUBSCRIPTION CHANGE — tarayıcı subscription'ı yenilerse
// ────────────────────────────────────────────────────────────────────

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Aleg SW] subscription değişti, yeniden subscribe gerekiyor');
  // Yeni subscription oluşturma client tarafında ele alınmalı
  // (kullanıcı uygulamayı açtığında otomatik resubscribe)
});

console.log('[Aleg SW]', SW_VERSION, 'yüklendi');
