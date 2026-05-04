// Bu dosya browser'da Next.js 14 + Sentry v8 için otomatik yüklenir.
// (sentry.client.config.ts artık otomatik yüklenmiyor; bu dosya yerine geçiyor)
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    ignoreErrors: [
      'Network request failed',
      'NetworkError',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}

// Next 14 navigation tracking için (opsiyonel, ama önerilen)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
