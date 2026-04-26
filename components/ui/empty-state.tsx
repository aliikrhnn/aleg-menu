'use client';

/**
 * EmptyState — standart boş hal componenti
 *
 * Liste/tablo boş olduğunda kullanılır. Sadece "veri yok" yazmak yerine
 * **kullanıcıya ne yapması gerektiğini söyler** (CTA butonu varsa).
 *
 * Kullanım:
 * ```tsx
 * {customers.length === 0 ? (
 *   <EmptyState
 *     icon="📒"
 *     title="Henüz cari kullanıcı yok"
 *     description="İlk cari kullanıcını ekleyerek başla"
 *     actionLabel="+ Yeni Kullanıcı"
 *     onAction={() => setModalOpen(true)}
 *   />
 * ) : (
 *   <CustomerList items={customers} />
 * )}
 * ```
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** Emoji veya ikon (string emoji veya ReactNode) */
  icon?: ReactNode;
  /** Başlık - kısa ve açıklayıcı */
  title: string;
  /** Alt açıklama - opsiyonel */
  description?: string;
  /** CTA buton etiketi */
  actionLabel?: string;
  /** CTA buton onclick */
  onAction?: () => void;
  /** Variant - dashed border veya solid */
  variant?: 'dashed' | 'solid';
  /** Boy - small/medium/large */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'dashed',
  size = 'md',
  className,
}: Props) {
  const padding = size === 'sm' ? 'py-6 px-4' : size === 'lg' ? 'py-16 px-6' : 'py-10 px-5';
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 56 : 44;
  const titleSize =
    size === 'sm' ? 14 : size === 'lg' ? 20 : 17;

  return (
    <div
      className={cn(
        'rounded-[14px] text-center flex flex-col items-center justify-center',
        padding,
        className
      )}
      style={{
        background:
          variant === 'dashed' ? 'var(--paper-2)' : 'var(--card)',
        border:
          variant === 'dashed'
            ? '1px dashed var(--line)'
            : '1px solid var(--line)',
      }}
    >
      {icon && (
        <div
          className="mb-3 leading-none"
          style={{ fontSize: iconSize, opacity: 0.85 }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: titleSize,
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: description ? 6 : actionLabel ? 12 : 0,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          className="max-w-xs"
          style={{
            fontSize: 12.5,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
            marginBottom: actionLabel ? 14 : 0,
          }}
        >
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="h-9 px-4 rounded-[8px] text-xs font-semibold transition-all active:scale-[0.97]"
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
