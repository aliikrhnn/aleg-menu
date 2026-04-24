'use client';

/**
 * Kasa Sekmesi PIN Kilidi
 *
 * "Kasa" sekmesine her girişte admin PIN'i ister (ayarlardan belirlenen).
 * PIN yoksa yöneticiye yönlendirir.
 * Her sekme değişiminde unmount olacak, tekrar kilitli başlayacak.
 *
 * Kullanımı (register-panel içinde):
 *   <KasaPinLock businessId={businessId} onUnlock={() => setUnlocked(true)}>
 *     {unlocked && <Panel />}
 *   </KasaPinLock>
 */

import { useEffect, useRef, useState } from 'react';
import { verifyAdminKasaPin, getAdminKasaPinStatus } from '@/lib/actions/settings';
import { toast } from '@/components/ui/toast';

type Props = {
  businessId: string;
  onUnlock: () => void;
};

export function KasaPinLock({ businessId, onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinExists, setPinExists] = useState<boolean | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [cooldownEnds, setCooldownEnds] = useState<number | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // PIN tanımlı mı kontrol (sessionStorage cache - aynı oturumda tekrar sorgu yok)
  useEffect(() => {
    // Hemen cache'ten kontrol et
    try {
      const cached = sessionStorage.getItem(`aleg-pin-exists-${businessId}`);
      if (cached === 'true') {
        setPinExists(true);
        return;
      }
      if (cached === 'false') {
        setPinExists(false);
        onUnlock();
        return;
      }
    } catch {
      // sessionStorage yoksa/erişilemiyorsa normal fetch
    }

    // Cache yoksa server'dan al
    (async () => {
      const r = await getAdminKasaPinStatus();
      if (r.success) {
        const exists = !!r.hasPin;
        setPinExists(exists);
        try {
          sessionStorage.setItem(
            `aleg-pin-exists-${businessId}`,
            exists ? 'true' : 'false'
          );
        } catch {
          // yoksay
        }
        if (!exists) {
          onUnlock();
        }
      }
    })();
  }, [onUnlock, businessId]);

  // Input focus
  useEffect(() => {
    if (pinExists) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [pinExists]);

  // Cooldown timer
  useEffect(() => {
    if (!cooldownEnds) return;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((cooldownEnds - Date.now()) / 1000));
      setCooldownSecs(diff);
      if (diff === 0) {
        setCooldownEnds(null);
        setAttemptsLeft(5);
        setError(null);
      }
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => window.clearInterval(iv);
  }, [cooldownEnds]);

  async function handleSubmit() {
    if (cooldownEnds) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN 4-6 haneli rakam olmalı');
      return;
    }
    setChecking(true);
    setError(null);
    const r = await verifyAdminKasaPin(businessId, pin);
    setChecking(false);
    if (!r.success) {
      setError(r.error || 'Doğrulanamadı');
      return;
    }
    if (r.valid) {
      toast.success('Kasa sekmesine giriş yapıldı');
      onUnlock();
      return;
    }
    // Yanlış PIN
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setPin('');
    if (remaining <= 0) {
      // 60 saniye bekletme
      setCooldownEnds(Date.now() + 60_000);
      setError('5 yanlış deneme · 60 saniye bekle');
      return;
    }
    setError(`Yanlış PIN · ${remaining} deneme kaldı`);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // PIN tanımsız durum
  if (pinExists === false) {
    return null; // unlock edildi, parent zaten render edecek
  }

  // Yükleniyor
  if (pinExists === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            color: 'var(--ink-3)',
          }}
        >
          Yükleniyor…
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div
        className="w-full max-w-[380px] rounded-[var(--r)] p-7"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          boxShadow: '0 4px 20px -4px rgba(42,31,24,0.08)',
        }}
      >
        {/* Kilit ikonu */}
        <div className="flex justify-center mb-5">
          <div
            className="inline-flex items-center justify-center rounded-full"
            style={{
              width: 56,
              height: 56,
              background: 'color-mix(in srgb, var(--accent) 10%, var(--paper-2))',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
              fontSize: 22,
            }}
          >
            🔒
          </div>
        </div>

        <div
          className="uppercase text-center mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--accent)',
          }}
        >
          KASA · ADMIN ERİŞİMİ
        </div>
        <h2
          className="text-center mb-6"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 24,
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          PIN gerekli
        </h2>

        {/* PIN input */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={!!cooldownEnds || checking}
            placeholder="••••"
            className="w-full h-14 px-4 rounded-[10px] text-center focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              border: `1px solid ${error ? 'var(--danger)' : 'var(--line)'}`,
              fontFamily: 'var(--f-mono)',
              fontSize: 28,
              letterSpacing: '0.5em',
              color: 'var(--ink)',
            }}
          />
          {error && (
            <div
              className="mt-2 text-center text-xs"
              style={{
                color: 'var(--danger)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
              }}
            >
              {cooldownEnds
                ? `${cooldownSecs} saniye bekle`
                : error}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            !!cooldownEnds ||
            checking ||
            pin.length < 4 ||
            pin.length > 6
          }
          className="w-full h-12 rounded-[10px] font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          style={{
            background: 'var(--accent)',
            color: '#FAF5EA',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.08em',
          }}
        >
          {checking ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              DOĞRULANIYOR
            </>
          ) : (
            'GİRİŞ'
          )}
        </button>

        {/* Yardım */}
        <div
          className="mt-5 text-center text-xs leading-relaxed"
          style={{ color: 'var(--ink-3)' }}
        >
          PIN&apos;i bilmiyorsan yöneticine sor.<br />
          Yönetici PIN&apos;i <em>Ayarlar → Kasa PIN</em>&apos;dan belirler.
        </div>
      </div>
    </div>
  );
}
