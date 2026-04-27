'use client';

import { useViewportHeightCssVar } from '@/lib/hooks/use-viewport-height';

/**
 * ViewportHeightTracker — `--vh` CSS değişkenini günceller
 *
 * Layout'ta 1 kez kullanılır. Tüm child componentler:
 * ```css
 * height: calc(var(--vh, 1vh) * 100);
 * ```
 * şeklinde gerçek viewport yüksekliğini alabilir (klavye dahil).
 */
export function ViewportHeightTracker() {
  useViewportHeightCssVar();
  return null;
}
