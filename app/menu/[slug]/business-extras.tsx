'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

type Props = {
  wifi: {
    ssid: string | null;
    password: string | null;
    security: 'WPA' | 'WPA3' | 'WEP' | 'nopass';
    hidden: boolean;
    qrDataUrl: string | null; // Server'da generate edildi
  };
  socialLinks: Array<{
    id: string;
    label: string;
    url: string;
    qrDataUrl: string;
    icon: string; // emoji veya SVG path
  }>;
};

export function BusinessExtras({ wifi, socialLinks }: Props) {
  const [wifiOpen, setWifiOpen] = useState(false);
  const [socialOpenId, setSocialOpenId] = useState<string | null>(null);
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

  return (
    <section
      className="px-4 py-8 mt-4"
      style={{ borderTop: '1px solid var(--line)' }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* ============ WIFI KARTI ============ */}
        {hasWifi && (
          <div
            className="rounded-[14px] overflow-hidden transition-all"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <button
              onClick={() => setWifiOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors"
              style={{ background: 'transparent' }}
            >
              <div
                className="flex-shrink-0 w-11 h-11 rounded-full grid place-items-center"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="uppercase"
                  style={{
                    fontFamily: 'var(--f-mono, monospace)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  WIFI
                </div>
                <div
                  className="truncate mt-0.5"
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {wifi.ssid}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-mono, monospace)',
                  letterSpacing: '0.06em',
                }}
              >
                {wifiOpen ? 'KAPAT' : 'GÖSTER'}
              </div>
            </button>

            {wifiOpen && (
              <div
                className="px-4 pb-4 space-y-3"
                style={{
                  borderTop: '1px solid var(--line)',
                }}
              >
                {/* Şifre */}
                {wifi.password && wifi.security !== 'nopass' ? (
                  <div className="pt-3">
                    <div
                      className="uppercase mb-1.5"
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
                      className="w-full text-left p-3 rounded-[10px] transition-all hover:opacity-80"
                      style={{
                        background:
                          'var(--paper-2)',
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
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--ink-3)',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {copied ? '✓ KOPYALANDI' : 'KOPYALAMAK İÇİN DOKUN'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="pt-3 text-sm"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    Açık ağ — şifre gerektirmiyor.
                  </div>
                )}

                {/* QR */}
                {wifi.qrDataUrl && (
                  <div className="pt-1">
                    <div
                      className="uppercase mb-1.5"
                      style={{
                        fontFamily: 'var(--f-mono, monospace)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: 'var(--ink-3)',
                      }}
                    >
                      VEYA TARA — OTOMATİK BAĞLAN
                    </div>
                    <div
                      className="rounded-[10px] p-4 flex items-center justify-center"
                      style={{
                        background: '#FFFFFF',
                      }}
                    >
                      <img
                        src={wifi.qrDataUrl}
                        alt="WiFi QR"
                        width={180}
                        height={180}
                        style={{ display: 'block' }}
                      />
                    </div>
                    <div
                      className="text-center mt-2"
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-3)',
                      }}
                    >
                      iPhone/Android kamerasıyla tara
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============ SOSYAL MEDYA ============ */}
        {hasSocial && (
          <div>
            <div
              className="uppercase mb-3"
              style={{
                fontFamily: 'var(--f-mono, monospace)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-3)',
              }}
            >
              BİZİ TAKİP ET
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {socialLinks.map((s) => {
                const open = socialOpenId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSocialOpenId(open ? null : s.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-[12px] transition-all"
                    style={{
                      background: open
                        ? 'var(--accent)'
                        : 'var(--card)',
                      color: open
                        ? 'var(--accent-ink)'
                        : 'var(--ink)',
                      border: open
                        ? '1px solid var(--accent)'
                        : '1px solid var(--line)',
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>
                      {s.icon}
                    </span>
                    <span
                      className="mt-1.5 uppercase"
                      style={{
                        fontFamily: 'var(--f-mono, monospace)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.10em',
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* QR detayı */}
            {socialOpenId && (
              <div
                className="mt-3 p-4 rounded-[14px]"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {(() => {
                  const s = socialLinks.find((x) => x.id === socialOpenId);
                  if (!s) return null;
                  return (
                    <div className="flex items-center gap-4">
                      <div
                        className="flex-shrink-0 rounded-[10px] p-2"
                        style={{ background: '#FFFFFF' }}
                      >
                        <img
                          src={s.qrDataUrl}
                          alt={`${s.label} QR`}
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
                            color:
                              'var(--ink-3)',
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          className="text-sm break-all"
                          style={{
                            color: 'var(--ink-2)',
                          }}
                        >
                          {s.url.replace(/^https?:\/\//, '')}
                        </div>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold uppercase"
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
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
