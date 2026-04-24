import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Aleg — İşletme yönetim sistemi',
    template: '%s · Aleg',
  },
  description: 'Kafe, restoran, bar ve her tür yiyecek-içecek işletmesi için uçtan uca dijital yönetim platformu. QR menü, kasa, mutfak ekranı, sadakat ve daha fazlası.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://alegstudio.com'),
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F4EEE2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-theme="warm">
      <body>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
