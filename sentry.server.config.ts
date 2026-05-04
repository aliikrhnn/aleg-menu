// Bu dosya server'da çalışır - server action ve API hataları
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    // Server-side: kullanıcı/business bilgisi otomatik eklensin
    beforeSend(event) {
      // Hassas veriyi temizle (Stripe key, password, vs.)
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        delete headers.authorization;
        delete headers.cookie;
        delete headers.Authorization;
        delete headers.Cookie;
        event.request.headers = headers;
      }
      return event;
    },
  });
}
