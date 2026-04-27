'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
  mobile: 640, // < 640px
  tablet: 1024, // 640 - 1024px
} as const;

/**
 * useIsMobile — viewport mobile breakpoint kontrolü
 *
 * Default: < 640px (Tailwind sm)
 *
 * SSR-safe: ilk render'da hidrasyon mismatch olmaması için `undefined` döner,
 * ilk effect çalışınca gerçek değer set edilir.
 *
 * Kullanım:
 * ```tsx
 * const isMobile = useIsMobile();
 * if (isMobile === undefined) return null; // hydration safe
 * return isMobile ? <MobileView /> : <DesktopView />;
 * ```
 *
 * Custom breakpoint:
 * ```tsx
 * const isSmall = useIsMobile(768);
 * ```
 */
export function useIsMobile(breakpoint: number = BREAKPOINTS.mobile): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);

    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}

/**
 * useBreakpoint — daha detaylı breakpoint
 *
 * 'mobile' (< 640), 'tablet' (640-1024), 'desktop' (> 1024)
 */
export function useBreakpoint(): Breakpoint | undefined {
  const [bp, setBp] = useState<Breakpoint | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const w = window.innerWidth;
      if (w < BREAKPOINTS.mobile) setBp('mobile');
      else if (w < BREAKPOINTS.tablet) setBp('tablet');
      else setBp('desktop');
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}
