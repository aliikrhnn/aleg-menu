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
const SW_VERSION = 'v1.0.2';

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
  console.log('[Aleg SW] push event geldi', event);

  // Default değerler — payload yoksa veya parse edilemezse bunları kullan
  // (iOS Safari ve bazı durumlarda push payload boş gelebilir)
  let payload = {
    title: 'Aleg',
    body: 'Yeni bildirim',
    url: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (jsonErr) {
      console.warn('[Aleg SW] JSON parse hatası, text olarak deniyorum', jsonErr);
      try {
        payload.body = event.data.text();
      } catch {
        // text da fail ederse default kullan
      }
    }
  } else {
    console.warn('[Aleg SW] Push event geldi ama data yok, default göster');
  }

  const title = payload.title || 'Aleg';

  // showNotification options — sadece destekli alanları geç
  // (iOS Safari requireInteraction desteklemez, vb.)
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/garson-icon.svg',
    badge: payload.badge || '/icons/garson-icon.svg',
    data: {
      url: payload.url || '/',
    },
  };

  // Opsiyonel alanlar — destekleyen tarayıcılarda eklenir, desteklemeyen sessizce yok sayar
  if (payload.tag) options.tag = payload.tag;
  if (payload.silent === true) options.silent = true;
  if (payload.vibrate) options.vibrate = payload.vibrate;
  if (payload.requireInteraction === true) options.requireInteraction = true;
  if (Array.isArray(payload.actions)) options.actions = payload.actions;

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log('[Aleg SW] Bildirim gösterildi:', title);
      })
      .catch((err) => {
        console.error('[Aleg SW] showNotification hatası:', err);
        // En basit form ile tekrar dene (tüm options'ları çıkar)
        return self.registration.showNotification(title, {
          body: payload.body || '',
        });
      })
  );
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
