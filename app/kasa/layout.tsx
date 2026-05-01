import type { Metadata, Viewport } from 'next';
import { CashierSessionProvider } from '@/lib/cashier-session';

export const metadata: Metadata = {
  title: 'Aleg Kasa',
  description: 'Aleg kasa uygulaması',
  manifest: '/api/manifest/kasa',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aleg Kasa',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2A1F18',
};

export default function KasaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="warm"
      className="min-h-screen"
      style={{ background: 'var(--paper)' }}
    >
      <CashierSessionProvider appKey="kasa">{children}</CashierSessionProvider>
    </div>
  );
}
