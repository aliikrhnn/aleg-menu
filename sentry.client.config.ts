// Bu dosya browser'da çalışır - kullanıcı tarafı hatalar
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Production'da %10 örnekle, dev'de hepsini gönder
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    // Replay (kullanıcının ne yaptığını gör) — sadece hata olanlarda
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,    // GDPR güvenlik
        maskAllInputs: true,  // şifre/PIN sızdırmasın
        blockAllMedia: true,  // foto/video gönderme
      }),
    ],
    // Hangi hata tipleri Sentry'e gitmesin
    ignoreErrors: [
      'Network request failed',           // offline normal
      'NetworkError',
      'ResizeObserver loop limit exceeded', // browser quirk
      'Non-Error promise rejection captured',
    ],
    environment: process.env.NODE_ENV,
    // Release tracking için Vercel commit SHA
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}
