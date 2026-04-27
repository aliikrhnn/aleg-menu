'use client';

import { useEffect, useState } from 'react';

/**
 * useViewportHeight — gerçek viewport yüksekliği (px)
 *
 * Mobile cihazlarda klavye açıldığında veya adres çubuğu görünürlüğü
 * değiştiğinde otomatik güncellenir.
 *
 * `100vh` CSS'te bazı mobile tarayıcılarda **adres çubuğu dahil** hesaplanır,
 * `100dvh` (dynamic viewport height) modern tarayıcılarda doğru değer verir
 * ama IE/eski tarayıcı desteği için bu hook fallback olarak kullanılabilir.
 *
 * Kullanım:
 * ```tsx
 * const vh = useViewportHeight();
 * <div style={{ height: vh }}>Tam ekran</div>
 * ```
 *
 * Veya CSS değişkeni olarak:
 * ```tsx
 * useViewportHeightCssVar(); // body'ye --vh ekler
 * <div style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>Full</div>
 * ```
 */
export function useViewportHeight(): number {
  const [vh, setVh] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.visualViewport?.height || window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      setVh(window.visualViewport?.height || window.innerHeight);
    };

    update();

    // visualViewport varsa onu dinle (klavye için doğru)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
      return () => {
        window.visualViewport?.removeEventListener('resize', update);
        window.visualViewport?.removeEventListener('scroll', update);
      };
    }

    // Fallback: window resize
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return vh;
}

/**
 * useViewportHeightCssVar — `--vh` CSS değişkeni ekler
 *
 * Layout veya en üst düzey componentte 1 kez çağırılır.
 * Tüm child'lar `var(--vh)` ile pixel değerini kullanabilir.
 */
export function useViewportHeightCssVar(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const h = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
      document.documentElement.style.setProperty('--vh-px', `${h}px`);
    };

    update();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      return () => {
        window.visualViewport?.removeEventListener('resize', update);
      };
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
}
