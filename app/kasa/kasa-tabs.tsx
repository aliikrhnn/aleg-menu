'use client';

import { cn } from '@/lib/utils';

export type KasaTab = 'tables' | 'orders' | 'quick' | 'register';

type Tab = {
  id: KasaTab;
  icon: string;
  label: string;
  hint?: string;
  color?: string;
};

const TABS: Tab[] = [
  { id: 'tables', icon: '◍', label: 'Masalar', hint: 'Masa plan görünümü' },
  { id: 'orders', icon: '◉', label: 'Siparişler', hint: 'Canlı sipariş akışı' },
  { id: 'quick', icon: '⚡', label: 'Hızlı Satış', hint: 'Masasız satış', color: 'var(--accent)' },
  { id: 'register', icon: '₺', label: 'Kasa', hint: 'Kasa oturumu ve günlük rapor' },
];

type Props = {
  active: KasaTab;
  onChange: (t: KasaTab) => void;
  badges?: Partial<Record<KasaTab, number>>;
  /** Yeni sipariş geldiğinde flashing tab'ları (5 dk boyunca yansır söner) */
  flashing?: Partial<Record<KasaTab, boolean>>;
};

export function KasaTabs({ active, onChange, badges, flashing }: Props) {
  return (
    <>
      <style>{`
        @keyframes aleg-tab-flash {
          0%, 100% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
            background-color: var(--card);
          }
          50% {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);
            background-color: color-mix(in srgb, var(--accent) 8%, var(--card));
          }
        }
        .aleg-tab-flashing {
          animation: aleg-tab-flash 1.4s ease-in-out infinite;
        }
        @keyframes aleg-dot-flash {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .aleg-dot-flashing {
          animation: aleg-dot-flash 0.9s ease-in-out infinite;
        }
      `}</style>
      <div
        className="flex items-center gap-1 p-1 rounded-[var(--r)]"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const badge = badges?.[tab.id];
          const isFlashing = !!flashing?.[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-2 h-11 rounded-[10px] transition-all',
                'font-semibold text-sm',
                isActive ? 'scale-[1.01]' : 'hover:opacity-80',
                isFlashing && !isActive && 'aleg-tab-flashing'
              )}
              style={{
                background: isActive ? 'var(--card)' : 'transparent',
                color: isActive ? (tab.color || 'var(--ink)') : 'var(--ink-3)',
                boxShadow: isActive
                  ? '0 1px 2px rgba(42,31,24,0.08), 0 0 0 1px var(--line)'
                  : 'none',
              }}
              title={tab.hint}
            >
              <span
                className={cn('text-[16px]', isActive && 'font-bold')}
                style={{
                  fontFamily: 'var(--f-mono)',
                  color: isActive ? (tab.color || 'var(--accent)') : undefined,
                }}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {/* Sayı badge */}
              {badge && badge > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1.5 text-[10px] font-bold"
                  style={{
                    background: 'var(--accent)',
                    color: '#FAF5EA',
                    fontFamily: 'var(--f-mono)',
                  }}
                >
                  {badge}
                </span>
              )}
              {/* Flash dot - sayı yoksa ama flash varsa */}
              {isFlashing && !badge && (
                <span
                  className="aleg-dot-flashing inline-block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
