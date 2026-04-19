'use client';

import { useState, useEffect } from 'react';

const STEP_LABELS = ['QR Tarama', 'Menüyü Gez', 'Ürün Seç', 'Sepete Ekle', 'Sipariş Gönder', 'Mutfakta'];
const STEP_TIMINGS = [2800, 2600, 2400, 2600, 2400, 3400];

// Warm tema renkleri
const WARM = {
  paper: '#F4EEE2',
  paper2: '#EDE4D3',
  paper3: '#E5D9C1',
  card: '#FAF5EA',
  ink: '#2A1F18',
  ink2: '#5A4A3D',
  ink3: '#8C7A69',
  accent: '#C4553A',
  accentSoft: '#E8BFAF',
  olive: '#6B7A4B',
  gold: '#B08A3E',
  line: '#D6C9B2',
};

export function OrderFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % 6), STEP_TIMINGS[step]);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <section
      id="orderflow"
      className="relative z-10"
      style={{ padding: '120px 0' }}
    >
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Head */}
        <div className="reveal mb-15" style={{ marginBottom: 60 }}>
          <div className="inline-flex items-center gap-2.5 mb-5">
            <span className="w-6 h-px bg-ink-3" />
            <span
              className="text-ink-3 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                fontWeight: 500,
              }}
            >
              Müşteri Deneyimi
            </span>
          </div>
          <h2
            className="text-ink mb-4"
            style={{
              fontSize: 'clamp(42px, 5vw, 72px)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            Masadan{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              mutfağa
            </span>
            , 20 saniyede.
          </h2>
          <p
            className="text-ink-2 max-w-[600px]"
            style={{ fontSize: 17, lineHeight: 1.55 }}
          >
            Müşterinin telefonu ile başlayan sipariş, aynı saniyede kasana ve mutfak ekranına düşer.
          </p>
        </div>

        {/* Stage */}
        <div
          data-theme="warm"
          className="reveal rounded-[22px] p-8 md:p-12 relative"
          style={{
            background: `linear-gradient(135deg, ${WARM.paper} 0%, ${WARM.paper2} 100%)`,
            border: `1px solid ${WARM.line}`,
            boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 30px 80px -30px rgba(42,31,24,0.3)',
          }}
        >
          {/* Paper texture overlay */}
          <div
            className="absolute inset-0 rounded-[22px] pointer-events-none opacity-40"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(139, 110, 80, 0.06) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(139, 110, 80, 0.04) 0%, transparent 40%)
              `,
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[240px_160px_1fr] gap-6 lg:gap-8 items-start">
            {/* SOL: Phone */}
            <div className="flex flex-col items-center gap-3 mx-auto lg:mx-0">
              <div
                className="relative rounded-[36px] p-[6px]"
                style={{
                  width: 220,
                  height: 440,
                  background: `linear-gradient(145deg, ${WARM.ink} 0%, #1A1108 100%)`,
                  boxShadow: `
                    0 4px 10px rgba(42,31,24,0.15),
                    0 30px 60px -20px rgba(42,31,24,0.4),
                    inset 0 0 0 1px rgba(255,255,255,0.08)
                  `,
                }}
              >
                {/* Notch */}
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full z-20"
                  style={{ background: WARM.ink }}
                />
                {/* Screen */}
                <div
                  className="rounded-[30px] w-full h-full overflow-hidden relative"
                  style={{ background: WARM.paper }}
                >
                  <PhoneStep step={step} />
                </div>
                {/* Home indicator */}
                <div
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full opacity-30"
                  style={{ background: WARM.paper }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: WARM.ink3,
                  textTransform: 'uppercase',
                }}
              >
                Müşteri · Masa 14
              </div>
            </div>

            {/* ORTA: Timeline */}
            <div className="hidden lg:flex flex-col gap-2.5 pt-4">
              {STEP_LABELS.map((lbl, i) => {
                const isActive = step === i;
                const isDone = step > i;
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full grid place-items-center flex-shrink-0 transition-all"
                      style={{
                        background: isDone
                          ? WARM.olive
                          : isActive
                          ? WARM.accent
                          : WARM.paper,
                        color: isDone || isActive ? WARM.paper : WARM.ink3,
                        border: !isDone && !isActive ? `1px solid ${WARM.line}` : 'none',
                        boxShadow: isActive ? `0 0 0 4px ${WARM.accentSoft}` : 'none',
                      }}
                    >
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className="transition-all"
                        style={{
                          fontSize: 12.5,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? WARM.ink : isDone ? WARM.ink2 : WARM.ink3,
                          letterSpacing: isActive ? '-0.01em' : '0',
                        }}
                      >
                        {lbl}
                      </div>
                      {isActive && (
                        <div
                          className="h-[3px] mt-1 rounded-full overflow-hidden"
                          style={{ background: WARM.paper3 }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background: WARM.accent,
                              animation: `progressBar ${STEP_TIMINGS[step]}ms linear forwards`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SAĞ: Cafe Dashboard */}
            <div
              className="rounded-[14px] overflow-hidden"
              style={{
                background: WARM.card,
                border: `1px solid ${WARM.line}`,
                boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 20px 40px -15px rgba(42,31,24,0.25)',
              }}
            >
              <CafeDashboard step={step} />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes progressBar {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @keyframes phsFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ticketIn {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          60% {
            transform: translateY(2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes notifIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulseRing {
          0% {
            box-shadow: 0 0 0 0 rgba(196, 85, 58, 0.5);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(196, 85, 58, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(196, 85, 58, 0);
          }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Phone Step Renders
// ============================================================
function PhoneStep({ step }: { step: number }) {
  const baseStyle: React.CSSProperties = {
    height: '100%',
    padding: 14,
    animation: 'phsFade 0.5s ease',
  };

  // STEP 0: QR Scan
  if (step === 0) {
    return (
      <div
        key="0"
        style={{
          ...baseStyle,
          background: `linear-gradient(180deg, ${WARM.ink} 0%, #1A1108 100%)`,
          color: WARM.paper,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WARM.paper} strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          </svg>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.16em',
              opacity: 0.7,
            }}
          >
            KAMERA
          </span>
        </div>
        <div
          className="flex-1 relative grid place-items-center rounded-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div style={{ background: WARM.paper, padding: 8, borderRadius: 6 }}>
            <QrPattern />
          </div>
          {/* Scan line */}
          <div
            className="absolute left-6 right-6 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent, ${WARM.accent}, transparent)`,
              boxShadow: `0 0 12px ${WARM.accent}`,
              animation: 'scanLine 2s ease-in-out infinite',
            }}
          />
          {/* Corners */}
          {[
            { top: 12, left: 12, br: 12, t: 'tl' },
            { top: 12, right: 12, br: 12, t: 'tr' },
            { bottom: 12, left: 12, br: 12, t: 'bl' },
            { bottom: 12, right: 12, br: 12, t: 'br' },
          ].map((c) => (
            <div
              key={c.t}
              className="absolute w-4 h-4"
              style={{
                ...c,
                borderColor: WARM.accent,
                borderStyle: 'solid',
                borderWidth: 0,
                borderTopWidth: c.t.includes('t') ? 2 : 0,
                borderBottomWidth: c.t.includes('b') ? 2 : 0,
                borderLeftWidth: c.t.includes('l') ? 2 : 0,
                borderRightWidth: c.t.includes('r') ? 2 : 0,
              }}
            />
          ))}
        </div>
        <div
          className="text-center mt-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            opacity: 0.7,
            letterSpacing: '0.12em',
          }}
        >
          MASA ÜSTÜNDEKİ KODU TARAT
        </div>
        <style jsx>{`
          @keyframes scanLine {
            0%,
            100% {
              top: 22%;
            }
            50% {
              top: 78%;
            }
          }
        `}</style>
      </div>
    );
  }

  // STEP 1: Menu Browse
  if (step === 1) {
    return (
      <div key="1" style={{ ...baseStyle, padding: 12 }}>
        <div
          className="text-center pb-2.5 mb-2.5"
          style={{ borderBottom: `1px solid ${WARM.line}` }}
        >
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              letterSpacing: '0.16em',
              color: WARM.ink3,
            }}
          >
            EST. 2026 · KARAKÖY
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: WARM.accent,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            Aleg
          </div>
          <div
            className="mt-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              color: WARM.ink3,
              letterSpacing: '0.12em',
            }}
          >
            MASA 14 · DINE-IN
          </div>
        </div>

        {/* Chips */}
        <div className="flex gap-1.5 mb-2.5 overflow-hidden">
          {['Espresso', 'Filtre', 'Kahvaltı'].map((c, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                fontWeight: 500,
                padding: '4px 8px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                background: i === 0 ? WARM.ink : WARM.paper2,
                color: i === 0 ? WARM.paper : WARM.ink2,
              }}
            >
              {c}
            </span>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          {[
            { n: 'Flat White', d: 'Ethiopia · ipeksi', p: '₺95', hl: true, img: '#6B4F33' },
            { n: 'Cortado', d: 'Espresso · eşit süt', p: '₺85', img: '#8A6B4F' },
            { n: 'V60 Geyşa', d: 'Panama · tek çekirdek', p: '₺130', img: '#3E2A1B' },
          ].map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-1.5 rounded"
              style={{
                background: m.hl ? WARM.accentSoft : 'transparent',
                border: m.hl ? `1px solid ${WARM.accent}` : '1px solid transparent',
                transform: m.hl ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s',
              }}
            >
              <div
                className="w-8 h-8 rounded-md flex-shrink-0 grid place-items-center"
                style={{
                  background: m.img,
                  fontSize: 7,
                  color: WARM.paper,
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                {m.n.split(' ')[0].slice(0, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{ fontSize: 10.5, fontWeight: 500, color: WARM.ink }}
                >
                  {m.n}
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: 8, color: WARM.ink3 }}
                >
                  {m.d}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: WARM.ink,
                  flexShrink: 0,
                  fontFamily: 'var(--f-mono)',
                }}
              >
                {m.p}
              </div>
              {m.hl && (
                <div
                  className="w-4 h-4 rounded-full grid place-items-center flex-shrink-0"
                  style={{
                    background: WARM.accent,
                    color: WARM.paper,
                    fontSize: 10,
                    fontWeight: 600,
                    animation: 'pulseRing 1.5s ease infinite',
                  }}
                >
                  +
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // STEP 2: Product Detail
  if (step === 2) {
    return (
      <div key="2" style={baseStyle}>
        <div
          className="h-28 rounded-lg mb-2.5 grid place-items-center"
          style={{
            background: 'linear-gradient(135deg, #6B4F33 0%, #3E2A1B 100%)',
            color: WARM.paper,
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent)',
            }}
          />
          Flat White
        </div>
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            letterSpacing: '0.14em',
            color: WARM.ink3,
          }}
        >
          ESPRESSO BAZLI
        </div>
        <div
          className="my-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            color: WARM.ink,
          }}
        >
          Flat White
        </div>
        <p
          style={{
            fontSize: 10,
            color: WARM.ink2,
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          Ethiopia Yirgacheffe çekirdeği ile çift shot espresso üzerine buharla ısıtılmış süt.
        </p>
        <div className="flex items-center gap-2 mb-2.5">
          <button
            className="w-7 h-7 rounded-full"
            style={{
              border: `1px solid ${WARM.line}`,
              color: WARM.ink2,
              fontSize: 14,
            }}
          >
            −
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: WARM.ink, padding: '0 8px' }}>2</span>
          <button
            className="w-7 h-7 rounded-full"
            style={{
              border: `1px solid ${WARM.line}`,
              color: WARM.ink2,
              fontSize: 14,
            }}
          >
            +
          </button>
        </div>
        <button
          className="w-full py-2.5 rounded-lg font-semibold"
          style={{
            background: WARM.accent,
            color: WARM.paper,
            fontSize: 12,
            animation: 'pulseRing 1.8s ease infinite',
          }}
        >
          Sepete Ekle · ₺190
        </button>
      </div>
    );
  }

  // STEP 3: Cart
  if (step === 3) {
    return (
      <div key="3" style={{ ...baseStyle, display: 'flex', flexDirection: 'column' }}>
        <div
          className="text-center pb-2.5 mb-3"
          style={{ borderBottom: `1px solid ${WARM.line}` }}
        >
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: WARM.ink3,
            }}
          >
            SİPARİŞİN
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              color: WARM.ink,
              marginTop: 2,
            }}
          >
            Sepet
          </div>
        </div>
        <div className="flex-1 space-y-2 mb-3">
          {[
            { n: '2× Flat White', p: '₺190' },
            { n: '1× Avokadolu Ekşi Maya', p: '₺165' },
          ].map((c, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-1"
              style={{
                fontSize: 11,
                color: WARM.ink,
                borderBottom: i === 0 ? `1px dashed ${WARM.line}` : 'none',
                paddingBottom: i === 0 ? 8 : 0,
              }}
            >
              <span>{c.n}</span>
              <span style={{ fontFamily: 'var(--f-mono)' }}>{c.p}</span>
            </div>
          ))}
        </div>
        <div
          className="pt-2.5 mb-3"
          style={{ borderTop: `1px solid ${WARM.line}` }}
        >
          <div
            className="flex justify-between mb-1"
            style={{ fontSize: 10, color: WARM.ink3 }}
          >
            <span>Ara toplam</span>
            <span style={{ fontFamily: 'var(--f-mono)' }}>₺355</span>
          </div>
          <div
            className="flex justify-between"
            style={{ fontSize: 14, fontWeight: 600, color: WARM.ink }}
          >
            <span>Toplam</span>
            <span style={{ fontFamily: 'var(--f-mono)' }}>₺355</span>
          </div>
        </div>
        <button
          className="w-full py-2.5 rounded-lg font-semibold"
          style={{
            background: WARM.accent,
            color: WARM.paper,
            fontSize: 12,
          }}
        >
          Siparişi Gönder →
        </button>
      </div>
    );
  }

  // STEP 4: Payment Success
  if (step === 4) {
    return (
      <div
        key="4"
        style={{
          ...baseStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <svg viewBox="0 0 80 80" width="72" height="72" className="mb-4">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke={WARM.olive}
            strokeWidth="3"
            fill="none"
            strokeDasharray="226"
            strokeDashoffset="226"
            style={{ animation: 'ringDraw 0.8s ease forwards' }}
          />
          <path
            d="M 25 42 L 35 52 L 56 28"
            stroke={WARM.olive}
            strokeWidth="4"
            fill="none"
            strokeDasharray="60"
            strokeDashoffset="60"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'checkDraw 0.5s 0.5s ease forwards' }}
          />
        </svg>
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            color: WARM.ink,
          }}
        >
          Sipariş gönderildi
        </div>
        <div
          className="mt-1"
          style={{ fontSize: 10.5, color: WARM.ink3 }}
        >
          Masana getirilecek · tahmini 8 dk
        </div>
        <div
          className="mt-4 px-3 py-1.5 rounded-full"
          style={{
            background: WARM.paper2,
            border: `1px solid ${WARM.line}`,
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: WARM.ink,
          }}
        >
          #A-2041 · ₺355 · KAPIDA
        </div>
        <style jsx>{`
          @keyframes ringDraw {
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes checkDraw {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  // STEP 5: Tracking
  return (
    <div key="5" style={baseStyle}>
      <div
        className="text-center pb-2.5 mb-3"
        style={{ borderBottom: `1px solid ${WARM.line}` }}
      >
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            color: WARM.ink3,
          }}
        >
          SİPARİŞ #A-2041
        </div>
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            color: WARM.ink,
            marginTop: 2,
          }}
        >
          Hazırlanıyor
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {[
          { l: 'Sipariş alındı', done: true, active: false },
          { l: 'Mutfakta', done: true, active: true },
          { l: 'Hazır', done: false, active: false },
          { l: 'Masaya servis', done: false, active: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                background: s.active ? WARM.accent : s.done ? WARM.olive : 'transparent',
                border: s.done || s.active ? 'none' : `1px solid ${WARM.line}`,
                animation: s.active ? 'pulseRing 1.5s ease infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: 11.5,
                color: s.active ? WARM.ink : s.done ? WARM.ink2 : WARM.ink3,
                fontWeight: s.active ? 600 : 400,
              }}
            >
              {s.l}
            </span>
          </div>
        ))}
      </div>
      <div
        className="rounded-lg p-2.5 text-center"
        style={{ background: WARM.paper2, border: `1px solid ${WARM.line}` }}
      >
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            letterSpacing: '0.14em',
            color: WARM.ink3,
          }}
        >
          KALAN SÜRE
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            color: WARM.accent,
            lineHeight: 1,
          }}
        >
          7{' '}
          <span style={{ fontSize: 12 }}>dk</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QR Pattern
// ============================================================
function QrPattern() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      {Array.from({ length: 11 }).map((_, i) =>
        Array.from({ length: 11 }).map((_, j) => {
          const v = (i * 7 + j * 3 + i * j) % 4;
          return (
            v === 0 && (
              <rect
                key={`${i}-${j}`}
                x={i * 10}
                y={j * 10}
                width="8"
                height="8"
                fill={WARM.ink}
              />
            )
          );
        })
      )}
    </svg>
  );
}

// ============================================================
// Cafe Dashboard (Warm tema)
// ============================================================
function CafeDashboard({ step }: { step: number }) {
  return (
    <div className="grid grid-cols-[130px_1fr] min-h-[440px]">
      {/* Sidebar */}
      <aside
        className="px-2.5 py-3.5"
        style={{ background: WARM.paper2, borderRight: `1px solid ${WARM.line}` }}
      >
        <div className="flex items-center gap-1.5 mb-4">
          <div
            className="w-6 h-6 rounded-md grid place-items-center"
            style={{
              background: WARM.ink,
              color: WARM.paper,
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            A
          </div>
          <div>
            <div className="text-[11px] font-medium" style={{ color: WARM.ink, lineHeight: 1 }}>
              Aleg
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: WARM.ink3,
                letterSpacing: '0.14em',
                marginTop: 2,
              }}
            >
              KARAKÖY
            </div>
          </div>
        </div>

        <div
          className="mb-1.5 mt-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            color: WARM.ink3,
            letterSpacing: '0.14em',
          }}
        >
          GENEL
        </div>
        <div className="text-[10.5px] px-1.5 py-1.5" style={{ color: WARM.ink2 }}>
          Gösterge Paneli
        </div>
        <div
          className="mb-1.5 mt-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            color: WARM.ink3,
            letterSpacing: '0.14em',
          }}
        >
          OPERASYON
        </div>
        {[
          { l: 'Masalar', active: false },
          { l: 'Kasa', active: false },
          { l: 'Siparişler', active: true },
          { l: 'Garson Çağrı', active: false },
        ].map((it) => (
          <div
            key={it.l}
            className="text-[10.5px] px-1.5 py-1.5 rounded"
            style={{
              background: it.active ? WARM.card : 'transparent',
              color: it.active ? WARM.ink : WARM.ink2,
              fontWeight: it.active ? 600 : 400,
              boxShadow: it.active ? '0 1px 2px rgba(42,31,24,0.06)' : 'none',
            }}
          >
            {it.l}
          </div>
        ))}
      </aside>

      {/* Body */}
      <div className="p-3.5">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded flex-1 mr-2"
            style={{
              background: WARM.paper,
              border: `1px solid ${WARM.line}`,
              color: WARM.ink3,
              fontSize: 9,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-5-5" />
            </svg>
            <span>Ara…</span>
          </div>
          <div
            className="w-7 h-7 rounded-full grid place-items-center"
            style={{
              background: WARM.accent,
              color: WARM.paper,
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            MK
          </div>
        </div>

        {/* Head */}
        <div className="flex justify-between items-end mb-3">
          <div>
            <div
              className="mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: WARM.accent,
                letterSpacing: '0.16em',
              }}
            >
              SİPARİŞLER
            </div>
            <div
              style={{
                fontFamily: 'var(--f-sans)',
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: WARM.ink,
                lineHeight: 1.1,
              }}
            >
              Canlı akış
            </div>
          </div>
          <div
            className="flex items-center gap-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              color: WARM.olive,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: WARM.olive,
                animation: 'pulseDot 1.6s ease infinite',
              }}
            />
            CANLI
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 gap-2">
          {/* Sipariş Alındı */}
          <div
            className="rounded-lg p-2 min-h-[190px]"
            style={{ background: WARM.paper2 }}
          >
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-[10px]"
                style={{ fontWeight: 600, color: WARM.ink }}
              >
                Sipariş Alındı
              </span>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  color: WARM.ink3,
                  background: WARM.paper,
                  padding: '2px 6px',
                  borderRadius: 999,
                }}
              >
                {step >= 4 ? '01' : '00'}
              </span>
            </div>
            {step >= 4 && (
              <div
                className="rounded-md p-2"
                style={{
                  background: WARM.card,
                  border: step === 4 ? `2px solid ${WARM.accent}` : `1px solid ${WARM.line}`,
                  animation: step === 4 ? 'ticketIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                }}
              >
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: WARM.ink }}>
                    #A-2041
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 8,
                      color: WARM.olive,
                    }}
                  >
                    ● 0 dk
                  </span>
                </div>
                <div
                  className="mb-1.5"
                  style={{ fontSize: 9, fontWeight: 600, color: WARM.ink }}
                >
                  Masa 14 · QR
                </div>
                <div style={{ fontSize: 9, color: WARM.ink2, lineHeight: 1.5 }}>
                  2× Flat White
                  <br />
                  1× Avokadolu Ekşi Maya
                </div>
                <div
                  className="flex justify-between pt-1.5 mt-1.5"
                  style={{ borderTop: `1px solid ${WARM.line}` }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 7,
                      color: WARM.ink3,
                      letterSpacing: '0.1em',
                    }}
                  >
                    TOPLAM
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: WARM.ink,
                    }}
                  >
                    ₺355
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Hazırlanıyor */}
          <div
            className="rounded-lg p-2 min-h-[190px]"
            style={{ background: WARM.paper2 }}
          >
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-[10px]"
                style={{ fontWeight: 600, color: WARM.ink }}
              >
                Hazırlanıyor
              </span>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  color: WARM.ink3,
                  background: WARM.paper,
                  padding: '2px 6px',
                  borderRadius: 999,
                }}
              >
                {step >= 5 ? '01' : '00'}
              </span>
            </div>
            {step >= 5 && (
              <div
                className="rounded-md p-2"
                style={{
                  background: WARM.card,
                  border: `2px solid ${WARM.accent}`,
                  animation: 'ticketIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: WARM.ink }}>
                    #A-2041
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 8,
                      color: WARM.accent,
                    }}
                  >
                    ● 1 dk
                  </span>
                </div>
                <div
                  className="mb-2"
                  style={{ fontSize: 9, fontWeight: 600, color: WARM.ink }}
                >
                  Masa 14 · QR
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden mb-1.5"
                  style={{ background: WARM.paper3 }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${WARM.accent}, ${WARM.gold})`,
                      width: '45%',
                      animation: 'progressBar 2.5s ease forwards',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    color: WARM.accent,
                    fontWeight: 600,
                  }}
                >
                  ✓ MUTFAK ALDI
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification */}
        {step >= 4 && (
          <div
            className="mt-2.5 flex items-start gap-2 p-2 rounded-md"
            style={{
              background: WARM.card,
              border: `1px solid ${WARM.accent}`,
              animation: 'notifIn 0.5s ease',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
              style={{
                background: WARM.accent,
                animation: 'pulseDot 1s ease infinite',
              }}
            />
            <div className="flex-1">
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 8,
                  letterSpacing: '0.12em',
                  color: WARM.accent,
                  fontWeight: 600,
                }}
              >
                YENİ SİPARİŞ · QR · 0s ÖNCE
              </div>
              <div
                className="mt-0.5"
                style={{ fontSize: 10, color: WARM.ink, fontWeight: 500 }}
              >
                Masa 14 · 3 ürün · ₺355
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes pulseDot {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
