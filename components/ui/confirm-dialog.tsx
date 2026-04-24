'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger' | 'warn';
};

type ConfirmCtx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmCtx | null>(null);

let globalConfirm: ConfirmCtx['confirm'] | null = null;

type OpenDialog = {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<OpenDialog | null>(null);

  const confirm = useCallback<ConfirmCtx['confirm']>((opts) => {
    return new Promise<boolean>((resolve) => {
      setCurrent({ opts, resolve });
    });
  }, []);

  useEffect(() => {
    globalConfirm = confirm;
    return () => {
      globalConfirm = null;
    };
  }, [confirm]);

  const handleResolve = useCallback(
    (value: boolean) => {
      if (!current) return;
      current.resolve(value);
      setCurrent(null);
    },
    [current]
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {current && (
        <ConfirmDialog
          opts={current.opts}
          onCancel={() => handleResolve(false)}
          onConfirm={() => handleResolve(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm ConfirmProvider içinde kullanılmalı');
  return ctx;
}

// Helper API — hook kullanamayan yerlerden
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!globalConfirm) {
    console.warn('[aleg] ConfirmProvider yüklenmemiş, window.confirm fallback');
    return Promise.resolve(window.confirm(opts.title + (opts.body ? '\n\n' + opts.body : '')));
  }
  return globalConfirm(opts);
}

// ============================================================
// Dialog UI
// ============================================================

function ConfirmDialog({
  opts,
  onCancel,
  onConfirm,
}: {
  opts: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    // Confirm butonuna odak
    setTimeout(() => confirmRef.current?.focus(), 50);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  const tone = opts.tone || 'default';
  const toneConfig = getToneConfig(tone);

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      style={{
        background: 'rgba(42, 31, 24, 0.55)',
        animation: 'aleg-overlay-in 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          boxShadow: '0 24px 64px -12px rgba(42, 31, 24, 0.4)',
          animation: 'aleg-dialog-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Tone bar */}
        <div style={{ height: 4, background: toneConfig.accentColor }} />

        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-3">
            <span
              className="inline-flex items-center justify-center flex-shrink-0 rounded-full"
              style={{
                width: 40,
                height: 40,
                background: `color-mix(in srgb, ${toneConfig.accentColor} 14%, transparent)`,
                color: toneConfig.accentColor,
                fontFamily: 'var(--f-serif)',
                fontSize: 22,
                fontWeight: 600,
              }}
              aria-hidden
            >
              {toneConfig.icon}
            </span>
            <div className="flex-1 pt-1">
              <div
                className="uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: toneConfig.accentColor,
                }}
              >
                {toneConfig.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1.3,
                }}
              >
                {opts.title}
              </div>
            </div>
          </div>
          {opts.body && (
            <p
              className="text-sm leading-relaxed"
              style={{
                color: 'var(--ink-2)',
                marginLeft: 52, // icon + gap hizalama
              }}
            >
              {opts.body}
            </p>
          )}
        </div>

        <div
          className="flex gap-2 px-6 py-4"
          style={{
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--line)',
          }}
        >
          <button
            onClick={onCancel}
            className="h-11 px-5 rounded-[10px] text-sm font-semibold hover:opacity-70 transition-all"
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            {opts.cancelLabel || 'Vazgeç'}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="group flex-1 h-11 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
            style={{
              background: toneConfig.accentColor,
              color: '#FAF5EA',
            }}
          >
            <span>{opts.confirmLabel || 'Devam'}</span>
            <span
              className="transition-transform group-hover:translate-x-1"
              style={{ fontSize: 16 }}
            >
              →
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes aleg-overlay-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes aleg-dialog-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function getToneConfig(tone: 'default' | 'danger' | 'warn') {
  switch (tone) {
    case 'danger':
      return {
        icon: '!',
        label: 'DİKKAT',
        accentColor: 'var(--danger)',
      };
    case 'warn':
      return {
        icon: '⚠',
        label: 'UYARI',
        accentColor: 'var(--warn)',
      };
    case 'default':
    default:
      return {
        icon: '?',
        label: 'ONAY',
        accentColor: 'var(--accent)',
      };
  }
}
