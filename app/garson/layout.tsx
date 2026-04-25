import type { Metadata, Viewport } from 'next';
import { CashierSessionProvider } from '@/lib/cashier-session';

export const metadata: Metadata = {
  title: 'Aleg Garson',
  description: 'Aleg garson uygulaması',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aleg Garson',
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
      <CashierSessionProvider>{children}</CashierSessionProvider>
    </div>
  );
}
