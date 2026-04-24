'use client';

/**
 * Gün Sonu için Tarih Aralığı Seçici
 *
 * Preset'ler: Bugün, Dün, Son 7 Gün, Son 30 Gün
 * + Özel Aralık (tarih + saat picker)
 */

import { useState, useRef, useEffect } from 'react';
import type { DaySummaryRange } from '@/lib/actions/payments';

type Props = {
  value: DaySummaryRange;
  onChange: (r: DaySummaryRange) => void;
};

const PRESETS: Array<{ id: DaySummaryRange['preset']; label: string }> = [
  { id: 'today', label: 'Bugün' },
  { id: 'yesterday', label: 'Dün' },
  { id: 'week', label: 'Son 7 Gün' },
  { id: 'month', label: 'Son 30 Gün' },
  { id: 'custom', label: 'Özel Aralık…' },
];

function presetLabel(r: DaySummaryRange): string {
  if (r.preset === 'today') return 'Bugün';
  if (r.preset === 'yesterday') return 'Dün';
  if (r.preset === 'week') return 'Son 7 Gün';
  if (r.preset === 'month') return 'Son 30 Gün';
  // custom
  const from = new Date(r.from);
  const to = new Date(r.to);
  const fs = from.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const ts = to.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fs} → ${ts}`;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string {
  // YYYY-MM-DDTHH:MM → ISO
  return new Date(s).toISOString();
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(value.preset === 'custom');
  const ref = useRef<HTMLDivElement>(null);

  // Özel için lokal state (dropdown açık kalsın diye)
  const defaultFrom = new Date();
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date();
  const [customFrom, setCustomFrom] = useState<string>(
    value.preset === 'custom'
      ? toLocalInput(value.from)
      : toLocalInput(defaultFrom.toISOString())
  );
  const [customTo, setCustomTo] = useState<string>(
    value.preset === 'custom'
      ? toLocalInput(value.to)
      : toLocalInput(defaultTo.toISOString())
  );

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickPreset(id: DaySummaryRange['preset']) {
    if (id === 'custom') {
      setCustomOpen(true);
      return;
    }
    onChange({ preset: id } as DaySummaryRange);
    setOpen(false);
    setCustomOpen(false);
  }

  function applyCustom() {
    onChange({
      preset: 'custom',
      from: fromLocalInput(customFrom),
      to: fromLocalInput(customTo),
    });
    setOpen(false);
  }

  const isCustom = value.preset === 'custom';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 h-10 px-4 rounded-[10px] transition-all hover:bg-paper-2"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>📅</span>
        <span
          className="text-sm font-semibold"
          style={{
            color: 'var(--ink)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.02em',
          }}
        >
          {presetLabel(value)}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute top-12 left-0 z-[80] rounded-[12px] overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: '0 16px 40px -8px rgba(42,31,24,0.25)',
            minWidth: 280,
            animation: 'aleg-dropdown-in 0.15s ease-out',
          }}
        >
          {/* Preset list */}
          <div className="p-1.5">
            {PRESETS.map((p) => {
              const isActive =
                p.id === value.preset || (p.id === 'custom' && isCustom);
              return (
                <button
                  key={p.id}
                  onClick={() => pickPreset(p.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-sm transition-colors hover:bg-paper-2"
                  style={{
                    background: isActive ? 'var(--paper-2)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--ink)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span>{p.label}</span>
                  {isActive && <span style={{ fontSize: 11 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Custom picker */}
          {customOpen && (
            <div
              className="px-3 py-3 space-y-2.5"
              style={{
                borderTop: '1px solid var(--line)',
                background: 'var(--paper-2)',
              }}
            >
              <div>
                <label
                  className="block mb-1 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  BAŞLANGIÇ
                </label>
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[8px] text-sm focus:outline-none focus:border-accent"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    fontFamily: 'var(--f-mono)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-1 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  BİTİŞ
                </label>
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[8px] text-sm focus:outline-none focus:border-accent"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    fontFamily: 'var(--f-mono)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo || customFrom >= customTo}
                className="w-full h-9 rounded-[8px] text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                }}
              >
                UYGULA
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes aleg-dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
