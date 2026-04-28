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

type ToastKind = 'success' | 'error' | 'info' | 'warn';

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  duration?: number;
};

type ToastCtx = {
  show: (kind: ToastKind, message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

// Global referans — helper'lardan kullanmak için
let globalShow: ToastCtx['show'] | null = null;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback<ToastCtx['show']>(
    (kind, message, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, kind, message, duration }]);

      const timer = window.setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    globalShow = show;
    return () => {
      globalShow = null;
    };
  }, [show]);

  // Cleanup
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast ToastProvider içinde kullanılmalı');
  return ctx;
}

// Helper API — hook kullanamayan yerlerden (server actions sonrası vb.)
export const toast = {
  success: (message: string, duration?: number) =>
    globalShow?.('success', message, duration),
  error: (message: string, duration?: number) =>
    globalShow?.('error', message, duration),
  info: (message: string, duration?: number) =>
    globalShow?.('info', message, duration),
  warn: (message: string, duration?: number) =>
    globalShow?.('warn', message, duration),
};

// ============================================================
// Container + Tek Toast UI
// ============================================================

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[200] flex flex-col gap-2 pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        right: 16,
        left: 16,
        maxWidth: 440,
        marginLeft: 'auto',
      }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = getToastConfig(toast.kind);

  return (
    <div
      role="alert"
      className="pointer-events-auto rounded-[12px] overflow-hidden flex items-start gap-3 p-3.5"
      style={{
        background: 'var(--card)',
        border: `1.5px solid ${config.borderColor}`,
        boxShadow:
          '0 10px 30px -8px rgba(42, 31, 24, 0.18), 0 4px 10px -4px rgba(42, 31, 24, 0.1)',
        animation: 'aleg-toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Renk şeridi */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: config.accentColor,
        }}
      />

      <span
        className="inline-flex items-center justify-center flex-shrink-0 rounded-full"
        style={{
          width: 28,
          height: 28,
          background: `color-mix(in srgb, ${config.accentColor} 14%, transparent)`,
          color: config.accentColor,
          fontFamily: 'var(--f-serif)',
          fontSize: 16,
          fontWeight: 600,
          marginLeft: 4,
        }}
        aria-hidden
      >
        {config.icon}
      </span>

      <div className="flex-1 min-w-0 pt-0.5">
        <div
          className="uppercase mb-0.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: config.accentColor,
          }}
        >
          {config.label}
        </div>
        <div
          className="text-sm leading-snug"
          style={{
            color: 'var(--ink)',
            wordBreak: 'break-word',
          }}
        >
          {toast.message}
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="flex-shrink-0 w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-[var(--paper-2)] transition-colors"
        style={{ color: 'var(--ink-3)' }}
        aria-label="Kapat"
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes aleg-toast-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function getToastConfig(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return {
        icon: '✓',
        label: 'BAŞARILI',
        accentColor: 'var(--ok)',
        borderColor: 'color-mix(in srgb, var(--ok) 30%, var(--line))',
      };
    case 'error':
      return {
        icon: '!',
        label: 'HATA',
        accentColor: 'var(--danger)',
        borderColor: 'color-mix(in srgb, var(--danger) 32%, var(--line))',
      };
    case 'warn':
      return {
        icon: '⚠',
        label: 'UYARI',
        accentColor: 'var(--warn)',
        borderColor: 'color-mix(in srgb, var(--warn) 30%, var(--line))',
      };
    case 'info':
    default:
      return {
        icon: 'i',
        label: 'BİLGİ',
        accentColor: 'var(--super)',
        borderColor: 'color-mix(in srgb, var(--super) 28%, var(--line))',
      };
  }
}
