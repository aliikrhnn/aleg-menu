'use client';

/**
 * Spinner — küçük yükleniyor göstergesi
 *
 * Custom butonlarda veya inline yükleme için. Tailwind animate-spin kullanır.
 *
 * Kullanım:
 * ```tsx
 * <button disabled={loading}>
 *   {loading ? <Spinner /> : '✓ Kaydet'}
 * </button>
 * ```
 */

import { cn } from '@/lib/utils';

type Props = {
  size?: number;
  color?: string;
  className?: string;
};

export function Spinner({ size = 16, color = 'currentColor', className }: Props) {
  return (
    <span
      className={cn('inline-block rounded-full animate-spin', className)}
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
      }}
      role="status"
      aria-label="Yükleniyor"
    />
  );
}
