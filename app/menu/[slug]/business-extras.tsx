'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';

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

export function BusinessExtras({ wifi, socialLinks }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const items: Array<{
    kind: 'wifi' | 'social';
    id: string;
    label: string;
    icon: React.ReactNode;
  }> = [];

  if (wifi.ssid) {
    items.push({
      kind: 'wifi',
      id: 'wifi',
      label: 'WiFi',
      icon: <WifiIcon />,
    });
  }
  for (const s of socialLinks) {
    items.push({
      kind: 'social',
      id: s.id,
      label: s.label,
      icon: <span style={{ fontSize: 14, lineHeight: 1 }}>{s.icon}</span>,
    });
  }

  // Modal açıkken body scroll lock + ESC ile kapat
  useEffect(() => {
    if (!activeId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [activeId]);

  if (items.length === 0) return null;

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

  const activeItem = items.find((i) => i.id === activeId);
  const activeSocial =
    activeItem?.kind === 'social'
      ? socialLinks.find((s) => s.id === activeId)
      : null;

  return (
    <>
      {/* ============ FLOATING IKONLAR (sağ üst, MenuView'a dokunmadan) ============ */}
      <div
        aria-label="Hızlı bağlantılar"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 25,
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          maxWidth: 'calc(100vw - 24px)',
          justifyContent: 'flex-end',
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveId(item.id)}
            aria-label={item.label}
            title={item.label}
            className="extras-fab"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background:
                'color-mix(in oklab, var(--card) 88%, transparent)',
              backdropFilter: 'saturate(140%) blur(10px)',
              WebkitBackdropFilter: 'saturate(140%) blur(10px)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              cursor: 'pointer',
              boxShadow:
                '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              padding: 0,
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* ============ MODAL ============ */}
      {activeId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(10,10,12,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: 16,
            animation: 'extras-fade 200ms ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              borderRadius: 18,
              padding: '28px 24px 24px',
              maxWidth: 380,
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              border: '1px solid var(--line)',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.18)',
              position: 'relative',
              animation: 'extras-pop 220ms cubic-bezier(.2,.9,.3,1.2)',
            }}
          >
            {/* Kapat */}
            <button
              onClick={() => setActiveId(null)}
              aria-label="Kapat"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-3)',
                fontSize: 22,
                lineHeight: 1,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ×
            </button>

            {/* WiFi içeriği */}
            {activeId === 'wifi' && (
              <div>
                <ModalHeader
                  icon={<WifiIcon />}
                  title="Wi-Fi"
                  subtitle="Misafir ağı"
                />

                <Eyebrow>AĞ ADI</Eyebrow>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginTop: 4,
                    marginBottom: 16,
                  }}
                >
                  {wifi.ssid}
                </div>

                {wifi.password && wifi.security !== 'nopass' ? (
                  <>
                    <Eyebrow>ŞİFRE</Eyebrow>
                    <button
                      onClick={copyPassword}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'var(--paper-2)',
                        border: '1px solid var(--line)',
                        cursor: 'pointer',
                        marginTop: 4,
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontFamily: 'var(--f-mono, monospace)',
                        transition: 'background 180ms',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--ink)',
                          letterSpacing: '0.04em',
                          wordBreak: 'break-all',
                        }}
                      >
                        {wifi.password}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: copied ? 'var(--ok)' : 'var(--ink-3)',
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                          fontFamily: 'var(--f-mono, monospace)',
                        }}
                      >
                        {copied ? '✓ KOPYALANDI' : 'DOKUN'}
                      </span>
                    </button>
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--ink-2)',
                      marginBottom: 16,
                    }}
                  >
                    Açık ağ — şifre gerektirmez.
                  </div>
                )}

                {wifi.qrDataUrl && (
                  <>
                    <Eyebrow>OTOMATİK BAĞLAN</Eyebrow>
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        borderRadius: 12,
                        background: '#FFFFFF',
                        display: 'grid',
                        placeItems: 'center',
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
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--ink-3)',
                        marginTop: 8,
                      }}
                    >
                      Telefon kameranı QR&apos;a tut
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sosyal medya içeriği */}
            {activeSocial && (
              <div>
                <ModalHeader
                  icon={
                    <span style={{ fontSize: 18, lineHeight: 1 }}>
                      {activeSocial.icon}
                    </span>
                  }
                  title={activeSocial.label}
                  subtitle="Bizi takip et"
                />

                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <img
                    src={activeSocial.qrDataUrl}
                    alt={`${activeSocial.label} QR`}
                    width={180}
                    height={180}
                    style={{ display: 'block' }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    marginTop: 12,
                    textAlign: 'center',
                    wordBreak: 'break-all',
                  }}
                >
                  {activeSocial.url.replace(/^https?:\/\//, '')}
                </div>

                <a
                  href={activeSocial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    marginTop: 16,
                    padding: '12px 20px',
                    borderRadius: 10,
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    fontFamily: 'var(--f-mono, monospace)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    transition: 'opacity 180ms',
                  }}
                >
                  Aç →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes extras-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes extras-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .extras-fab:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 8px 18px rgba(0,0,0,0.10);
        }
        .extras-fab:active {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}

// ============ Yardımcılar ============

function ModalHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--f-mono, monospace)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--ink)',
            marginTop: 2,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--f-mono, monospace)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function WifiIcon() {
  return (
    <svg
      width="16"
      height="16"
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
