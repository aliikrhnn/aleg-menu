'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

type Props = {
  wifi: {
    ssid: string | null;
    password: string | null;
    security: 'WPA' | 'WPA3' | 'WEP' | 'nopass';
    hidden: boolean;
    qrDataUrl: string | null;
  };
  socialLinks: Array<{
    id: string;
    label: string;
    url: string;
    qrDataUrl: string;
    icon: string;
  }>;
};

type ActiveItem =
  | { type: 'wifi' }
  | { type: 'social'; id: string }
  | null;

export function BusinessExtras({ wifi, socialLinks }: Props) {
  const [active, setActive] = useState<ActiveItem>(null);
  const [copied, setCopied] = useState(false);

  const hasWifi = !!wifi.ssid;
  const hasSocial = socialLinks.length > 0;

  if (!hasWifi && !hasSocial) return null;

  async function copyPassword() {
    if (!wifi.password) return;
    try {
      await navigator.clipboard.writeText(wifi.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Yoksay
    }
  }

  function toggleWifi() {
    setActive((prev) => (prev?.type === 'wifi' ? null : { type: 'wifi' }));
  }
  function toggleSocial(id: string) {
    setActive((prev) =>
      prev?.type === 'social' && prev.id === id
        ? null
        : { type: 'social', id }
    );
  }

  const activeSocial =
    active?.type === 'social'
      ? socialLinks.find((s) => s.id === active.id) || null
      : null;

  return (
    <>
      <div
        className="sticky top-0 z-30"
        style={{
          background: 'color-mix(in oklab, var(--paper) 92%, transparent)',
          backdropFilter: 'saturate(140%) blur(8px)',
          WebkitBackdropFilter: 'saturate(140%) blur(8px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {hasWifi && (
              <PillButton
                active={active?.type === 'wifi'}
                onClick={toggleWifi}
                label="WiFi"
                icon={<WifiIcon />}
              />
            )}
            {socialLinks.map((s) => (
              <PillButton
                key={s.id}
                active={
                  active?.type === 'social' && active.id === s.id
                }
                onClick={() => toggleSocial(s.id)}
                label={s.label}
                icon={<span style={{ fontSize: 14 }}>{s.icon}</span>}
              />
            ))}
          </div>
        </div>

        {active && (
          <div
            style={{
              borderTop: '1px solid var(--line)',
              background: 'var(--card)',
            }}
          >
            <div className="max-w-2xl mx-auto px-4 py-4">
              {active.type === 'wifi' && (
                <div className="space-y-3">
                  <div
                    className="uppercase"
                    style={{
                      fontFamily: 'var(--f-mono, monospace)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: 'var(--ink-3)',
                    }}
                  >
                    AĞ ADI
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {wifi.ssid}
                  </div>

                  {wifi.password && wifi.security !== 'nopass' ? (
                    <>
                      <div
                        className="uppercase mt-3"
                        style={{
                          fontFamily: 'var(--f-mono, monospace)',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          color: 'var(--ink-3)',
                        }}
                      >
                        ŞİFRE
                      </div>
                      <button
                        onClick={copyPassword}
                        className="w-full text-left p-3 rounded-[10px] transition-all hover:opacity-85"
                        style={{
                          background: 'var(--paper-2)',
                          fontFamily: 'var(--f-mono, monospace)',
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--ink)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {wifi.password}
                        <span
                          style={{
                            float: 'right',
                            fontSize: 10,
                            fontWeight: 500,
                            color: 'var(--ink-3)',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {copied ? '✓ KOPYALANDI' : 'DOKUN'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
                      Açık ağ — şifre yok.
                    </div>
                  )}

                  {wifi.qrDataUrl && (
                    <div className="flex items-start gap-3 mt-2">
                      <div
                        className="flex-shrink-0 rounded-[10px] p-2"
                        style={{ background: '#FFFFFF' }}
                      >
                        <img
                          src={wifi.qrDataUrl}
                          alt="WiFi QR"
                          width={120}
                          height={120}
                          style={{ display: 'block' }}
                        />
                      </div>
                      <div className="flex-1 pt-1">
                        <div
                          className="uppercase"
                          style={{
                            fontFamily: 'var(--f-mono, monospace)',
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            color: 'var(--ink-3)',
                          }}
                        >
                          OTOMATİK BAĞLAN
                        </div>
                        <div
                          className="mt-1 text-sm"
                          style={{ color: 'var(--ink-2)' }}
                        >
                          Telefon kameranı QR&apos;a tut.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSocial && (
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 rounded-[10px] p-2"
                    style={{ background: '#FFFFFF' }}
                  >
                    <img
                      src={activeSocial.qrDataUrl}
                      alt={`${activeSocial.label} QR`}
                      width={120}
                      height={120}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="uppercase mb-1"
                      style={{
                        fontFamily: 'var(--f-mono, monospace)',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: 'var(--ink-3)',
                      }}
                    >
                      {activeSocial.label}
                    </div>
                    <div
                      className="text-sm break-all"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      {activeSocial.url.replace(/^https?:\/\//, '')}
                    </div>
                    <a
                      href={activeSocial.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold uppercase transition-opacity hover:opacity-90"
                      style={{
                        fontFamily: 'var(--f-mono, monospace)',
                        letterSpacing: '0.06em',
                        background: 'var(--accent)',
                        color: 'var(--accent-ink)',
                      }}
                    >
                      Aç →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </>
  );
}

function PillButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-full transition-all"
      style={{
        background: active ? 'var(--accent)' : 'var(--card)',
        color: active ? 'var(--accent-ink)' : 'var(--ink)',
        border: active
          ? '1px solid var(--accent)'
          : '1px solid var(--line)',
        fontFamily: 'var(--f-mono, monospace)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function WifiIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}
