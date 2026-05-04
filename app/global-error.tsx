'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hatayı Sentry'e gönder
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            color: '#1a1a1a',
            background: '#FAFAF8',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
              }}
            >
              ⚠
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Bir aksaklık oldu
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#666',
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Sistem hatası oluştu ve teknik ekibe bildirildi. Birkaç saniye sonra tekrar dene.
              {error.digest && (
                <>
                  <br />
                  <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
                    Kod: {error.digest}
                  </span>
                </>
              )}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                background: '#1a1a1a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Tekrar dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
