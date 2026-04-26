'use client';

/**
 * Skeleton — boş ekran iskelet placeholder
 *
 * Pulse animasyonu ile yükleniyor görsel efekti verir.
 * Her seferinde "Yükleniyor..." spinner göstermek yerine
 * sayfa yapısının iskeletini gösterir → algılanan hız artar.
 *
 * Kullanım:
 * ```tsx
 * {loading ? (
 *   <Skeleton.List rows={3} />
 * ) : (
 *   <RealList items={data} />
 * )}
 * ```
 */

import { cn } from '@/lib/utils';

type BoxProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
};

function Box({ className, width, height = 16, rounded = 'sm' }: BoxProps) {
  const radiusMap = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 14,
    full: 9999,
  } as const;
  return (
    <div
      className={cn('aleg-skeleton-pulse', className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radiusMap[rounded],
        background:
          'linear-gradient(90deg, var(--paper-2) 0%, color-mix(in srgb, var(--ink) 6%, var(--paper-2)) 50%, var(--paper-2) 100%)',
        backgroundSize: '200% 100%',
      }}
    >
      <style>{`
        @keyframes aleg-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .aleg-skeleton-pulse {
          animation: aleg-skeleton-shimmer 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .aleg-skeleton-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}

function Text({
  width = '100%',
  className,
}: {
  width?: string | number;
  className?: string;
}) {
  return <Box width={width} height={14} className={cn('mb-1.5', className)} />;
}

function Card({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={cn('rounded-[14px] p-4', className)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Text
          key={i}
          width={`${60 + ((i * 13) % 35)}%`}
          className={i === rows - 1 ? '!mb-0' : ''}
        />
      ))}
    </div>
  );
}

function List({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-[10px] p-3 flex items-center gap-3"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <Box width={40} height={40} rounded="full" />
          <div className="flex-1">
            <Text width="50%" className="mb-1" />
            <Text width="35%" className="!mb-0" />
          </div>
          <Box width={60} height={14} />
        </div>
      ))}
    </div>
  );
}

function Tile() {
  return (
    <div
      className="rounded-[12px] p-3"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <Box width="60%" height={11} className="mb-2" />
      <Box width="80%" height={20} />
    </div>
  );
}

function Stats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Tile key={i} />
      ))}
    </div>
  );
}

export const Skeleton = {
  Box,
  Text,
  Card,
  List,
  Tile,
  Stats,
};
