'use client';

import { useEffect } from 'react';

/**
 * Modal'a ESC tuşu desteği ekler.
 * Birden fazla modal açıksa sadece **en üstteki** kapanır
 * (en son register edilen ilk yanıt verir).
 *
 * Kullanım:
 * ```tsx
 * function MyModal({ onClose }) {
 *   useEscapeKey(onClose);
 *   return <div>...</div>;
 * }
 * ```
 *
 * `enabled=false` ile geçici olarak devre dışı bırakılabilir
 * (örn. iç bir confirm açıkken üst modal ESC'ye yanıt vermesin).
 */
export function useEscapeKey(
  onEscape: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, enabled]);
}
