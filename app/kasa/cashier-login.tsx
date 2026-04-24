'use client';

import { useState, useEffect, useRef } from 'react';
import { verifyCashierPin } from '@/lib/actions/cashiers';
import { useCashierSession } from '@/lib/cashier-session';
import { playSuccess } from '@/lib/sounds';

type AvailableCashier = {
  id: string;
  display_name: string;
  color: string;
  emoji: string;
};

type Props = {
  availableCashiers: AvailableCashier[];
  businessName: string;
  mode: 'login' | 'unlock';
  lockedCashierId?: string;
};

const LOCKOUT_KEY = 'aleg-kasa-lockout';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 1000; // 30 saniye

export function CashierLogin({
  availableCashiers,
  businessName,
  mode,
  lockedCashierId,
}: Props) {
  const { signIn, unlock, signOut } = useCashierSession();
  const [selectedId, setSelectedId] = useState<string | null>(
    mode === 'unlock' && lockedCashierId ? lockedCashierId : null
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [clock, setClock] = useState('');

  // PIN input'a otomatik focus
  const pinInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectedId) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [selectedId]);

  // Lockout storage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCKOUT_KEY);
      if (raw) {
        const until = Number(raw);
        if (until > Date.now()) {
          setLockoutUntil(until);
        } else {
          window.localStorage.removeItem(LOCKOUT_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Canlı saat
  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    update();
    const t = window.setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  // Lockout countdown
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemaining(0);
      return;
    }
    const tick = () => {
      const remain = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remain);
      if (remain === 0) {
        setLockoutUntil(null);
        try {
          window.localStorage.removeItem(LOCKOUT_KEY);
        } catch {
          /* ignore */
        }
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockoutUntil]);

  const selectedCashier = selectedId
    ? availableCashiers.find((c) => c.id === selectedId)
    : null;

  const handlePinSubmit = async () => {
    if (!selectedCashier || busy) return;
    if (pin.length < 4) {
      setError('PIN en az 4 hane olmalı');
      setShake(true);
      return;
    }
    if (lockoutRemaining > 0) return;

    setBusy(true);
    setError(null);

    const r = await verifyCashierPin(selectedCashier.id, pin);

    if (!r.success || !r.cashier) {
      // Yanlış PIN - attempt sayacı
      const nextAttempts = countFailedAttempts() + 1;
      recordFailedAttempt();

      if (nextAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        try {
          window.localStorage.setItem(LOCKOUT_KEY, String(until));
          window.localStorage.removeItem('aleg-kasa-fail-count');
        } catch {
          /* ignore */
        }
        setLockoutUntil(until);
        setError(`Çok fazla yanlış deneme. ${Math.ceil(LOCKOUT_MS / 1000)} saniye bekle.`);
      } else {
        setError(r.error || `Yanlış PIN. ${MAX_ATTEMPTS - nextAttempts} deneme hakkın kaldı.`);
      }

      setShake(true);
      setPin('');
      setBusy(false);
      return;
    }

    // Başarı
    clearFailedAttempts();
    playSuccess();

    if (mode === 'unlock') {
      unlock({
        id: r.cashier.id,
        display_name: r.cashier.display_name,
        color: r.cashier.color,
        emoji: r.cashier.emoji,
        can_close_day: r.cashier.can_close_day,
        can_refund: r.cashier.can_refund,
        signed_in_at: Date.now(),
      });
    } else {
      signIn({
        id: r.cashier.id,
        display_name: r.cashier.display_name,
        color: r.cashier.color,
        emoji: r.cashier.emoji,
        can_close_day: r.cashier.can_close_day,
        can_refund: r.cashier.can_refund,
      });
    }
  };

  // Shake animasyonu reset
  useEffect(() => {
    if (shake) {
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [shake]);

  const canSubmit = selectedCashier && pin.length >= 4 && !busy && lockoutRemaining === 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(ellipse at top, color-mix(in srgb, var(--accent-soft) 20%, var(--paper)) 0%, var(--paper) 60%)',
      }}
    >
      <style>{`
        @keyframes aleg-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>

      {/* Üst bar - brand + saat */}
      <div className="flex items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[7px] flex items-center justify-center"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: '-0.04em',
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                lineHeight: 1,
                color: 'var(--ink)',
              }}
            >
              aleg kasa
            </div>
            <div
              className="uppercase mt-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
              }}
            >
              {businessName}
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--ink-2)',
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              background: 'var(--ok)',
              animation: 'aleg-pulse 2s ease-in-out infinite',
            }}
          />
          <span suppressHydrationWarning>{clock}</span>
        </div>
        <style jsx>{`
          @keyframes aleg-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
        `}</style>
      </div>

      {/* İçerik */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[720px]">
          {mode === 'unlock' && (
            <div className="text-center mb-6">
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--warn)',
                }}
              >
                🔒 KASA KİLİTLENDİ
              </div>
              <h1
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontSize: 'clamp(32px, 5vw, 44px)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: 'var(--ink)',
                }}
              >
                PIN&apos;ini{' '}
                <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>
                  tekrar gir.
                </span>
              </h1>
            </div>
          )}

          {mode === 'login' && !selectedCashier && (
            <div className="text-center mb-8">
              <div
                className="uppercase mb-2 flex items-center justify-center gap-3"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--accent)',
                }}
              >
                <span
                  style={{ width: 24, height: 1, background: 'var(--accent)', display: 'inline-block' }}
                />
                KASA · GİRİŞ
                <span
                  style={{ width: 24, height: 1, background: 'var(--accent)', display: 'inline-block' }}
                />
              </div>
              <h1
                className="mb-3"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontSize: 'clamp(36px, 5vw, 52px)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: 'var(--ink)',
                }}
              >
                Kim{' '}
                <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>
                  çalışıyor?
                </span>
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Kartını seç, PIN&apos;ini gir.
              </p>
            </div>
          )}

          {/* Kasiyer yoksa */}
          {availableCashiers.length === 0 ? (
            <div
              className="rounded-[var(--r)] p-10 text-center"
              style={{
                background: 'var(--card)',
                border: '1px dashed var(--line-2)',
              }}
            >
              <div className="mb-4 text-4xl">👤</div>
              <h2
                className="mb-2"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 24,
                  color: 'var(--ink)',
                }}
              >
                Henüz kasiyer tanımlı değil
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--ink-2)' }}>
                Panel yöneticisi önce kasiyer hesabı oluşturmalı.
              </p>
              <a
                href="/panel/kasiyerler"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:opacity-95"
                style={{ background: 'var(--accent)', color: '#FAF5EA' }}
              >
                Panele git →
              </a>
            </div>
          ) : !selectedCashier ? (
            // KASİYER SEÇİM GRID
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableCashiers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setPin('');
                    setError(null);
                  }}
                  className="group rounded-[var(--r)] p-4 flex flex-col items-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderTop: `3px solid ${c.color}`,
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                      background: `color-mix(in srgb, ${c.color} 16%, var(--card))`,
                      border: `1px solid color-mix(in srgb, ${c.color} 30%, transparent)`,
                      fontSize: 32,
                    }}
                  >
                    {c.emoji}
                  </div>
                  <div
                    className="text-center font-semibold"
                    style={{ color: 'var(--ink)', fontSize: 14 }}
                  >
                    {c.display_name}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // PIN GİRİŞ EKRANI
            <div className="max-w-[400px] mx-auto">
              {/* Seçili kasiyer kartı */}
              <div
                className="rounded-[var(--r)] p-5 flex items-center gap-4 mb-6"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderTop: `3px solid ${selectedCashier.color}`,
                  animation: shake ? 'aleg-shake 0.5s' : 'none',
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${selectedCashier.color} 16%, var(--card))`,
                    border: `1px solid color-mix(in srgb, ${selectedCashier.color} 30%, transparent)`,
                    fontSize: 32,
                  }}
                >
                  {selectedCashier.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: 'var(--ink-3)',
                    }}
                  >
                    SEÇİLİ KASİYER
                  </div>
                  <div
                    className="font-semibold"
                    style={{ color: 'var(--ink)', fontSize: 18 }}
                  >
                    {selectedCashier.display_name}
                  </div>
                </div>
                {mode === 'login' && (
                  <button
                    onClick={() => {
                      setSelectedId(null);
                      setPin('');
                      setError(null);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-paper-2"
                    style={{
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.08em',
                      border: '1px solid var(--line)',
                    }}
                  >
                    DEĞİŞTİR
                  </button>
                )}
              </div>

              {/* PIN display */}
              <div
                className="flex items-center justify-center gap-3 mb-5"
                style={{ animation: shake ? 'aleg-shake 0.5s' : 'none' }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-11 h-14 rounded-[10px] flex items-center justify-center transition-all"
                    style={{
                      background: 'var(--card)',
                      border: `1.5px solid ${
                        i < pin.length ? selectedCashier.color : 'var(--line)'
                      }`,
                      boxShadow:
                        i < pin.length ? `0 0 0 3px color-mix(in srgb, ${selectedCashier.color} 14%, transparent)` : 'none',
                    }}
                  >
                    {i < pin.length && (
                      <span
                        className="inline-block rounded-full"
                        style={{
                          width: 12,
                          height: 12,
                          background: selectedCashier.color,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Hidden input */}
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) handlePinSubmit();
                }}
                className="sr-only"
                autoComplete="off"
              />

              {/* Numeric pad */}
              <NumericPad
                onDigit={(d) => {
                  if (pin.length < 6) {
                    setPin((p) => p + d);
                    setError(null);
                  }
                }}
                onBack={() => setPin((p) => p.slice(0, -1))}
                onSubmit={handlePinSubmit}
                canSubmit={!!canSubmit}
                color={selectedCashier.color}
                disabled={busy || lockoutRemaining > 0}
              />

              {/* Lockout */}
              {lockoutRemaining > 0 && (
                <div
                  className="mt-4 p-3 rounded-[10px] text-sm text-center"
                  style={{
                    background: 'color-mix(in srgb, var(--warn) 10%, var(--card))',
                    border: '1px solid color-mix(in srgb, var(--warn) 25%, var(--line))',
                    color: 'var(--warn)',
                  }}
                >
                  🔒 Çok fazla yanlış deneme. {lockoutRemaining} saniye bekle.
                </div>
              )}

              {/* Error */}
              {error && lockoutRemaining === 0 && (
                <div
                  className="mt-4 p-3 rounded-[10px] text-sm text-center"
                  style={{
                    background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
                    border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
                    color: 'var(--danger)',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Kilit modunda ekstra seçenekler */}
              {mode === 'unlock' && (
                <div className="mt-5 text-center">
                  <button
                    onClick={() => signOut()}
                    className="text-xs"
                    style={{
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.08em',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                  >
                    BAŞKA KASİYERLE GİRİŞ YAP
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alt bar */}
      <div
        className="px-6 py-3 flex items-center justify-between text-xs"
        style={{
          color: 'var(--ink-3)',
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.08em',
        }}
      >
        <span>ALEG STUDIO · 2026</span>
        <a
          href="/panel"
          className="hover:opacity-70"
          style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          PANELE DÖN
        </a>
      </div>
    </div>
  );
}

// ============================================================
// NUMERIC PAD
// ============================================================

function NumericPad({
  onDigit,
  onBack,
  onSubmit,
  canSubmit,
  color,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  color: string;
  disabled: boolean;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {keys.map((k) => (
        <PadButton key={k} label={k} onClick={() => onDigit(k)} disabled={disabled} />
      ))}
      <PadButton
        label="⌫"
        onClick={onBack}
        disabled={disabled}
        subtle
        ariaLabel="Sil"
      />
      <PadButton label="0" onClick={() => onDigit('0')} disabled={disabled} />
      <button
        onClick={onSubmit}
        disabled={!canSubmit || disabled}
        className="h-16 rounded-[14px] text-xl font-bold transition-all active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02]"
        style={{
          background: color,
          color: '#FAF5EA',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
        }}
      >
        ✓
      </button>
    </div>
  );
}

function PadButton({
  label,
  onClick,
  disabled,
  subtle,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  subtle?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      className="h-16 rounded-[14px] text-2xl transition-all active:scale-[0.96] hover:scale-[1.02] disabled:opacity-40"
      style={{
        background: subtle ? 'transparent' : 'var(--card)',
        border: `1px solid ${subtle ? 'var(--line-2)' : 'var(--line)'}`,
        color: subtle ? 'var(--ink-3)' : 'var(--ink)',
        fontFamily: 'var(--f-serif)',
        fontWeight: 400,
      }}
    >
      {label}
    </button>
  );
}

// ============================================================
// Failed attempts (localStorage)
// ============================================================

function countFailedAttempts(): number {
  try {
    return Number(window.localStorage.getItem('aleg-kasa-fail-count') || '0');
  } catch {
    return 0;
  }
}

function recordFailedAttempt() {
  try {
    const n = countFailedAttempts() + 1;
    window.localStorage.setItem('aleg-kasa-fail-count', String(n));
  } catch {
    /* ignore */
  }
}

function clearFailedAttempts() {
  try {
    window.localStorage.removeItem('aleg-kasa-fail-count');
  } catch {
    /* ignore */
  }
}
