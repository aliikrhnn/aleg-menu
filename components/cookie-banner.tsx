'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'aleg-cookie-consent';

type Consent = {
  necessary: boolean; // her zaman true
  analytics: boolean;
  marketing: boolean;
  version: number;
  acceptedAt: string;
};

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Küçük gecikme: sayfa yüklenince hemen patlamasın
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: Partial<Consent>) => {
    const full: Consent = {
      necessary: true,
      analytics: consent.analytics ?? false,
      marketing: consent.marketing ?? false,
      version: 1,
      acceptedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
      /* private mode - sessizce geç */
    }
    setVisible(false);
  };

  const acceptAll = () =>
    save({ analytics: true, marketing: true });
  const rejectAll = () =>
    save({ analytics: false, marketing: false });
  const acceptSelected = () =>
    save({ analytics, marketing });

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] px-4 py-4 md:px-6 md:py-5"
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        boxShadow: '0 -10px 40px -10px rgba(0,0,0,0.3)',
        animation: 'aleg-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      role="dialog"
      aria-label="Çerez tercihleri"
    >
      <style>{`
        @keyframes aleg-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto">
        {!details ? (
          // Compact view
          <div className="flex items-center gap-4 md:gap-6 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-[280px]">
              <span
                className="flex-shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                  color: 'var(--accent)',
                  fontSize: 14,
                }}
                aria-hidden="true"
              >
                ◆
              </span>
              <div>
                <div
                  className="mb-1"
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    fontWeight: 400,
                  }}
                >
                  Kahve kadar temiz çerezler.
                </div>
                <div
                  className="text-sm"
                  style={{
                    color: 'color-mix(in srgb, var(--paper) 72%, transparent)',
                    lineHeight: 1.5,
                  }}
                >
                  Siteyi daha iyi hale getirmek için çerezler kullanıyoruz. Reddedersen zorunlu olanlar dışında hiçbir şey yüklenmez.{' '}
                  <Link
                    href="/cerezler"
                    style={{
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                  >
                    Detaylar
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={rejectAll}
                className="h-10 px-4 rounded-[8px] text-sm font-semibold transition-all hover:opacity-70"
                style={{
                  background: 'transparent',
                  color: 'color-mix(in srgb, var(--paper) 70%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--paper) 20%, transparent)',
                }}
              >
                Reddet
              </button>
              <button
                onClick={() => setDetails(true)}
                className="h-10 px-4 rounded-[8px] text-sm font-semibold transition-all hover:opacity-70"
                style={{
                  background: 'transparent',
                  color: 'color-mix(in srgb, var(--paper) 85%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--paper) 25%, transparent)',
                }}
              >
                Tercihleri ayarla
              </button>
              <button
                onClick={acceptAll}
                className="h-10 px-5 rounded-[8px] font-semibold text-sm transition-all hover:opacity-95 active:scale-[0.98]"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                }}
              >
                Tümünü kabul et
              </button>
            </div>
          </div>
        ) : (
          // Detaylı view
          <div>
            <div
              className="mb-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 20,
                    fontWeight: 400,
                  }}
                >
                  Çerez tercihleri
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    color: 'color-mix(in srgb, var(--paper) 60%, transparent)',
                  }}
                >
                  KVKK UYUMLU · İSTEDİĞİN ZAMAN DEĞİŞTİREBİLİRSİN
                </div>
              </div>
              <button
                onClick={() => setDetails(false)}
                className="text-sm opacity-70 hover:opacity-100"
                style={{ color: 'var(--paper)' }}
              >
                ← Geri
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <CookieRow
                label="Zorunlu çerezler"
                description="Giriş oturumu ve güvenlik. Kapatılamaz."
                checked={true}
                disabled
              />
              <CookieRow
                label="Analitik"
                description="Siteyi nasıl kullandığını anlayıp daha iyi hale getiriyoruz. Anonim."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CookieRow
                label="Pazarlama"
                description="Aleg ile ilgili haberler ve güncel tekliflerden haberdar ol."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={rejectAll}
                className="h-10 px-4 rounded-[8px] text-sm font-semibold transition-all hover:opacity-70"
                style={{
                  background: 'transparent',
                  color: 'color-mix(in srgb, var(--paper) 70%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--paper) 20%, transparent)',
                }}
              >
                Tümünü reddet
              </button>
              <button
                onClick={acceptSelected}
                className="h-10 px-5 rounded-[8px] font-semibold text-sm transition-all hover:opacity-95"
                style={{ background: 'var(--accent)', color: '#FAF5EA' }}
              >
                Seçileni kaydet
              </button>
              <div className="flex-1" />
              <Link
                href="/cerezler"
                className="text-xs opacity-70 hover:opacity-100"
                style={{
                  color: 'var(--paper)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Tam çerez politikası ↗
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CookieRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-[8px] ${
        disabled ? '' : 'cursor-pointer hover:bg-white/5'
      } transition-colors`}
      style={{
        background: 'color-mix(in srgb, var(--paper) 4%, transparent)',
        border: '1px solid color-mix(in srgb, var(--paper) 10%, transparent)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 w-4 h-4 rounded accent-accent disabled:opacity-50"
      />
      <div className="flex-1">
        <div
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: 'var(--paper)' }}
        >
          {label}
          {disabled && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.1em',
                background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                color: 'var(--accent)',
              }}
            >
              Zorunlu
            </span>
          )}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{
            color: 'color-mix(in srgb, var(--paper) 65%, transparent)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </label>
  );
}
