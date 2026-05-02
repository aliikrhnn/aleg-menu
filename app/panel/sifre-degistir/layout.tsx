/**
 * /panel/sifre-degistir layout
 *
 * İlk login sonrası geçici şifre değiştirme akışı için minimal layout.
 * Sidebar yok, çıkış butonu var. Kullanıcı şifresini değiştirene kadar
 * panele giremez (panel layout zorla buraya yönlendirir).
 */

import type { ReactNode } from 'react';

export default function SifreDegistirLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--paper)' }}
    >
      {children}
    </div>
  );
}
