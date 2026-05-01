import type { Metadata, Viewport } from 'next';
import { CashierSessionProvider } from '@/lib/cashier-session';

export const metadata: Metadata = {
  title: 'Aleg Garson',
  description: 'Aleg garson uygulaması',
  manifest: '/api/manifest/garson',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aleg Garson',
  },
  other: {
    // Apple'ın deprecated tag'ı yerine modern karşılığı
    // (Chrome/Edge yeni tag'ı tercih eder, eski olanı uyarı verir)
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2A1F18',
};

export default function GarsonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="warm"
      className="min-h-screen"
      style={{ background: 'var(--paper)' }}
    >
      <CashierSessionProvider appKey="garson">{children}</CashierSessionProvider>
    </div>
  );
}
