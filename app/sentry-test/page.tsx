'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function SentryTestPage() {
  const [status, setStatus] = useState<string>('hazır');

  const triggerError = () => {
    setStatus('hata fırlatıldı...');
    setTimeout(() => {
      throw new Error('SENTRY-PAGE-TEST-' + Date.now());
    }, 100);
  };

  const captureManually = async () => {
    setStatus('manuel gönderiliyor...');
    const eventId = Sentry.captureException(
      new Error('SENTRY-MANUAL-TEST-' + Date.now())
    );
    // Flush et — gerçekten gitmiş olduğundan emin ol
    const flushResult = await Sentry.flush(5000);
    setStatus(`gönderildi: eventId=${eventId}, flush=${flushResult}`);
  };

  const checkClient = () => {
    const client = Sentry.getClient();
    const options = client?.getOptions();
    setStatus(JSON.stringify({
      hasClient: !!client,
      dsn: options?.dsn ? options.dsn.substring(0, 30) + '...' : 'YOK',
      enabled: options?.enabled,
      environment: options?.environment,
    }, null, 2));
  };

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 600 }}>
      <h1>Sentry Test Sayfası</h1>
      <p style={{ color: '#666' }}>
        Sentry kurulumunu test etmek için butonlar.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        <button
          onClick={checkClient}
          style={{ padding: 12, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          1. Sentry Client&apos;ını Kontrol Et
        </button>

        <button
          onClick={captureManually}
          style={{ padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          2. Manuel Hata Gönder (captureException + flush)
        </button>

        <button
          onClick={triggerError}
          style={{ padding: 12, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          3. Gerçek Hata Fırlat (window.onerror tetikleyici)
        </button>
      </div>

      <pre style={{
        marginTop: 24,
        padding: 16,
        background: '#f3f4f6',
        borderRadius: 8,
        fontSize: 13,
        whiteSpace: 'pre-wrap',
      }}>
        {status}
      </pre>

      <p style={{ marginTop: 24, fontSize: 13, color: '#666' }}>
        Buton tıkla, sonra Sentry → Issues sayfasını kontrol et.
        <br />
        Network tab&apos;ı açık tutarsan ingest.sentry.io POST&apos;unu görürsün.
      </p>
    </div>
  );
}
