'use client';

import { useState, useEffect, useRef } from 'react';
import type { ThemePreset } from '@/lib/menu-themes';

type Props = {
  preset: ThemePreset;
  accentOverride: string | null;
  slug: string;
  rootDomain: string;
};

export function ThemePreview({
  preset,
  accentOverride,
  slug,
  rootDomain,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Preview URL — query parameter ile tema önizlenir
  const accentParam = accentOverride
    ? accentOverride.replace('#', '')
    : 'default';
  // Path-based URL kullan — iframe'in subdomain CORS'a takılmaması için
  const previewUrl = `/menu/${slug}?preview_theme=${preset}&preview_accent=${accentParam}&_=${reloadKey}`;

  // Tema değişince iframe yeniden yüklensin
  useEffect(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, [preset, accentOverride]);

  return (
    <div>
      {/* Bilgi şeridi */}
      <div
        className="rounded-[var(--r)] px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2"
        style={{
          background:
            'color-mix(in srgb, var(--accent) 6%, var(--paper-2))',
          border:
            '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
        }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span style={{ fontSize: 14 }}>👁</span>
          <div>
            <div
              className="text-[12.5px] font-semibold"
              style={{ color: 'var(--ink)' }}
            >
              Canlı önizleme
            </div>
            <div
              className="text-[11px]"
              style={{ color: 'var(--ink-3)' }}
            >
              Gerçek müşteri menüsü — değişiklikler kaydedilene kadar herkese
              görünmez.
            </div>
          </div>
        </div>
        <a
          href={`${previewUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 h-8 inline-flex items-center gap-1 rounded-[8px] text-[11px] font-semibold transition-opacity hover:opacity-90"
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Yeni sekmede
          <span>↗</span>
        </a>
      </div>

      {/* Telefon mockup'lı iframe */}
      <div
        className="rounded-[20px] p-6 flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, var(--paper-2) 0%, var(--card-2) 100%)',
          border: '1px solid var(--line)',
          minHeight: 720,
        }}
      >
        <PhoneMockup>
          {loading && (
            <div
              className="absolute inset-0 grid place-items-center pointer-events-none z-10"
              style={{ background: 'var(--paper)' }}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{
                    border: '2.5px solid var(--paper-2)',
                    borderTopColor: 'var(--accent)',
                    animation: 'tpvSpin 0.8s linear infinite',
                  }}
                />
                <span
                  className="text-[10px] uppercase font-bold"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.18em',
                    color: 'var(--ink-3)',
                  }}
                >
                  Yükleniyor
                </span>
              </div>
              <style jsx>{`
                @keyframes tpvSpin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={reloadKey}
            src={previewUrl}
            onLoad={() => setLoading(false)}
            title="Menü önizleme"
            className="w-full h-full border-0"
            style={{ background: 'var(--paper)' }}
          />
        </PhoneMockup>

        {/* Sağda info kart - gerçekçi mockup'a refakat */}
        <div className="ml-8 max-w-[260px] hidden lg:block">
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--accent)',
            }}
          >
            Müşteri telefonu
          </div>
          <h4
            className="mb-3"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            Tam olarak böyle görünecek
          </h4>
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: 'var(--ink-2)' }}
          >
            Gerçek menünün canlı bir kopyasıdır. Kategorilere bakabilir, ürünleri
            inceleyebilir, sepet ekranını açabilirsin. Sipariş gönderme bu
            önizlemede aktif değildir.
          </p>
          <div className="mt-4 space-y-1.5">
            <InfoRow label="Tema" value={preset} />
            <InfoRow
              label="Vurgu"
              value={accentOverride || 'tema varsayılanı'}
              mono
            />
            <InfoRow label="URL" value={`${slug}.${rootDomain}`} mono />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PHONE MOCKUP - iPhone benzeri çerçeve
// ============================================================
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: 360,
        height: 720,
        borderRadius: 44,
        padding: 12,
        background:
          'linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 50%, #2A2A2A 100%)',
        boxShadow:
          '0 30px 60px -20px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Inner frame - ekran kenarlığı */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          borderRadius: 32,
          background: '#000',
          boxShadow: 'inset 0 0 0 2px #0A0A0A',
        }}
      >
        {/* Notch (Dynamic Island benzeri) */}
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2"
          style={{
            top: 8,
            width: 96,
            height: 26,
            background: '#000',
            borderRadius: 14,
          }}
        />

        {/* Status bar - statik */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6"
          style={{
            height: 42,
            color: 'rgba(255,255,255,0.85)',
            fontFamily:
              '"SF Pro Display", -apple-system, system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            pointerEvents: 'none',
            mixBlendMode: 'difference',
          }}
        >
          <span>9:41</span>
          <span style={{ opacity: 0 }}>·</span> {/* notch alanı için */}
          <span className="flex items-center gap-1.5">
            <SignalIcon />
            <WifiIcon />
            <BatteryIcon />
          </span>
        </div>

        {/* iframe content */}
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// INFO ROW
// ============================================================
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[10px] uppercase font-bold flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.16em',
          color: 'var(--ink-3)',
          width: 50,
        }}
      >
        {label}
      </span>
      <span
        className="text-[12px] truncate"
        style={{
          color: 'var(--ink)',
          fontFamily: mono ? 'var(--f-mono)' : 'inherit',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// STATUS BAR ICONS (mini)
// ============================================================
function SignalIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
      <rect x="0" y="7" width="2.5" height="4" rx="0.5" />
      <rect x="3.5" y="5" width="2.5" height="6" rx="0.5" />
      <rect x="7" y="3" width="2.5" height="8" rx="0.5" />
      <rect x="10.5" y="0" width="2.5" height="11" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor">
      <path d="M7 11 L9 8.5 Q7 7 5 8.5 Z" />
      <path
        d="M7 7.5 Q4 6 1.5 8.2 L3.2 9.7 Q5 8.3 7 9.5 Q9 8.3 10.8 9.7 L12.5 8.2 Q10 6 7 7.5"
        opacity="0.85"
      />
      <path
        d="M7 4.5 Q2 2.5 -0.5 5.5 L1 7 Q4 4.5 7 5.5 Q10 4.5 13 7 L14.5 5.5 Q12 2.5 7 4.5"
        opacity="0.7"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="18"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeOpacity="0.6"
      />
      <rect x="2" y="2" width="15" height="7" rx="1" fill="currentColor" />
      <rect
        x="19.5"
        y="3.5"
        width="1.5"
        height="4"
        rx="0.5"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}
