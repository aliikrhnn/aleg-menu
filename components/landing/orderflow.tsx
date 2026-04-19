'use client';

import { useState, useEffect } from 'react';

const STEP_LABELS = ['QR Tarama', 'Menüyü Gez', 'Sepete Ekle', 'Onayla', 'Öde', 'Mutfakta'];
const STEP_TIMINGS = [2800, 2400, 2400, 2600, 2400, 3400];

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

        {/* Stage: Phone + Timeline + Cafe Dashboard */}
        <div className="reveal grid grid-cols-1 lg:grid-cols-[280px_180px_1fr] gap-8 items-start">
          {/* SOL: Phone */}
          <div className="flex flex-col items-center gap-3 mx-auto lg:mx-0">
            <div
              className="relative bg-ink rounded-[40px] p-2"
              style={{
                width: 240,
                height: 460,
                boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
              }}
            >
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-ink rounded-full z-10" />
              <div
                className="bg-paper rounded-[32px] w-full h-full overflow-hidden relative"
                style={{ background: 'var(--paper)' }}
              >
                <PhoneStep step={step} />
              </div>
              {/* Home indicator */}
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full"
                style={{ background: 'var(--ink-3)' }}
              />
            </div>
            <div
              className="text-ink-3 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
              }}
            >
              MÜŞTERİ · MASA 14
            </div>
          </div>

          {/* ORTA: Timeline */}
          <div className="hidden lg:flex flex-col gap-3 pt-4">
            {STEP_LABELS.map((lbl, i) => {
              const isActive = step === i;
              const isDone = step > i;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full grid place-items-center transition-all flex-shrink-0 ${
                      isDone || isActive
                        ? 'bg-accent text-paper'
                        : 'bg-paper-2 text-ink-3 border border-line'
                    }`}
                  >
                    {isDone ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-[13px] ${isActive ? 'text-ink font-medium' : 'text-ink-2'}`}
                    >
                      {lbl}
                    </div>
                    {isActive && (
                      <div
                        className="h-0.5 bg-paper-2 rounded-full mt-1 overflow-hidden"
                      >
                        <div
                          className="h-full bg-accent"
                          style={{
                            animation: `progressBar ${STEP_TIMINGS[step]}ms linear`,
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
            className="bg-card rounded-[14px] border border-line overflow-hidden"
            style={{
              boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
            }}
          >
            <CafeDashboard step={step} />
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
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
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
    padding: 16,
    animation: 'phsFade 0.4s ease',
  };

  // STEP 0: QR Scan
  if (step === 0) {
    return (
      <div
        key="0"
        style={{ ...baseStyle, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          </svg>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.14em' }}>KAMERA</span>
        </div>
        <div
          className="flex-1 relative grid place-items-center rounded-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div className="bg-paper p-2 rounded">
            <QrPattern />
          </div>
          {/* Scan line */}
          <div
            className="absolute left-2 right-2 h-0.5 bg-accent"
            style={{ animation: 'scanLine 1.6s ease-in-out infinite' }}
          />
          {/* Corners */}
          {[
            { top: 0, left: 0, br: '0 0 0 12px' },
            { top: 0, right: 0, br: '0 0 12px 0' },
            { bottom: 0, left: 0, br: '0 12px 0 0' },
            { bottom: 0, right: 0, br: '12px 0 0 0' },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute w-5 h-5 border-2 border-accent"
              style={{ ...c, borderRadius: c.br }}
            />
          ))}
        </div>
        <div
          className="text-center mt-3"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 9, opacity: 0.7, letterSpacing: '0.1em' }}
        >
          MASA ÜSTÜNDEKİ KODU TARAT
        </div>
        <style jsx>{`
          @keyframes scanLine {
            0% {
              top: 20%;
            }
            50% {
              top: 80%;
            }
            100% {
              top: 20%;
            }
          }
        `}</style>
      </div>
    );
  }

  // STEP 1: Menu Browse
  if (step === 1) {
    return (
      <div key="1" style={{ ...baseStyle, padding: 14 }}>
        <div className="text-center mb-3 pb-3 border-b border-line">
          <div className="text-ink-3" style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.14em' }}>
            EST. 2026 · KARAKÖY
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              color: 'var(--accent)',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            Aleg
          </div>
          <div className="text-ink-3 text-[10px] mt-1">Masa 14 · Dine-in</div>
        </div>
        <div className="flex gap-1.5 mb-3 overflow-hidden">
          {['Espresso Bazlı', 'Filtre', 'Kahvaltı'].map((c, i) => (
            <span
              key={i}
              className={`px-2 py-1 rounded-full whitespace-nowrap ${
                i === 0 ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-2'
              }`}
              style={{ fontSize: 9, fontWeight: 500 }}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { n: 'Flat White', d: 'Ethiopia · ipeksi', p: '₺95', hl: true },
            { n: 'Cortado', d: 'Espresso · eşit süt', p: '₺85' },
            { n: 'V60 · Geyşa', d: 'Panama tek çekirdek', p: '₺130' },
          ].map((m, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-1.5 rounded ${m.hl ? 'bg-accent-soft' : ''}`}
            >
              <div
                className="w-9 h-9 rounded-md flex-shrink-0 grid place-items-center"
                style={{ background: 'var(--paper-2)', fontSize: 7, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}
              >
                {m.n.split(' ')[0].slice(0, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium truncate">{m.n}</div>
                <div className="text-ink-3 text-[9px] truncate">{m.d}</div>
              </div>
              <div className="text-[11px] font-semibold flex-shrink-0">{m.p}</div>
              {m.hl && (
                <div
                  className="w-5 h-5 rounded-full bg-accent text-paper grid place-items-center text-xs flex-shrink-0"
                  style={{ animation: 'pulse 1s ease infinite' }}
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
          className="h-32 rounded-lg mb-3 grid place-items-center text-paper"
          style={{
            background: 'linear-gradient(135deg, #6B4F33, #3E2A1B)',
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
          }}
        >
          Flat White
        </div>
        <div
          className="text-ink-3 mb-1"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.12em' }}
        >
          ESPRESSO BAZLI
        </div>
        <div
          className="mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
          }}
        >
          Flat White
        </div>
        <p className="text-ink-2 text-[11px] mb-3 leading-relaxed">
          Ethiopia Yirgacheffe çekirdeği ile çift shot espresso üzerine buharla ısıtılmış süt.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <button className="w-7 h-7 rounded-full border border-line text-base">−</button>
          <span className="px-3 font-semibold">2</span>
          <button className="w-7 h-7 rounded-full border border-line text-base">+</button>
        </div>
        <button
          className="w-full py-3 rounded-lg bg-accent text-paper font-semibold text-[12px] relative overflow-hidden"
          style={{ animation: 'pulseBtn 1.4s ease infinite' }}
        >
          Sepete Ekle · ₺190
        </button>
        <style jsx>{`
          @keyframes pulseBtn {
            0%,
            100% {
              box-shadow: 0 0 0 0 rgba(196, 85, 58, 0.5);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(196, 85, 58, 0);
            }
          }
        `}</style>
      </div>
    );
  }

  // STEP 3: Cart
  if (step === 3) {
    return (
      <div key="3" style={{ ...baseStyle, display: 'flex', flexDirection: 'column' }}>
        <div className="text-center mb-3 pb-3 border-b border-line">
          <div className="text-ink-3" style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.12em' }}>
            SİPARİŞİN
          </div>
          <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 24, marginTop: 4 }}>
            Sepet
          </div>
        </div>
        <div className="flex-1 space-y-2.5 mb-3">
          {[
            { n: '2× Flat White', p: '₺190' },
            { n: '1× Avokadolu Ekşi Maya', p: '₺165' },
          ].map((c, i) => (
            <div key={i} className="flex justify-between text-[12px]">
              <span>{c.n}</span>
              <span style={{ fontFamily: 'var(--f-mono)' }}>{c.p}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-line pt-3 mb-3">
          <div className="flex justify-between text-[11px] text-ink-2 mb-1">
            <span>Ara toplam</span>
            <span style={{ fontFamily: 'var(--f-mono)' }}>₺355</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Toplam</span>
            <span style={{ fontFamily: 'var(--f-mono)' }}>₺355</span>
          </div>
        </div>
        <button className="w-full py-3 rounded-lg bg-accent text-paper font-semibold text-[12px]">
          Siparişi Gönder →
        </button>
      </div>
    );
  }

  // STEP 4: Payment Success
  if (step === 4) {
    return (
      <div key="4" style={{ ...baseStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <svg viewBox="0 0 80 80" width="72" height="72" className="mb-4">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="var(--olive)"
            strokeWidth="3"
            fill="none"
            strokeDasharray="226"
            strokeDashoffset="226"
            style={{ animation: 'ringDraw 0.8s ease forwards' }}
          />
          <path
            d="M 25 42 L 35 52 L 56 28"
            stroke="var(--olive)"
            strokeWidth="4"
            fill="none"
            strokeDasharray="60"
            strokeDashoffset="60"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'checkDraw 0.5s 0.5s ease forwards' }}
          />
        </svg>
        <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 20 }}>
          Sipariş gönderildi
        </div>
        <div className="text-ink-3 text-[11px] mt-1">Masanıza getirilecek. Tahmini 8 dk.</div>
        <div
          className="mt-4 px-3 py-1.5 bg-paper-2 rounded-full"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em' }}
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
      <div className="text-center mb-3 pb-3 border-b border-line">
        <div className="text-ink-3" style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.12em' }}>
          SİPARİŞ #A-2041
        </div>
        <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 22, marginTop: 4 }}>
          Hazırlanıyor
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {[
          { l: 'Alındı', done: true, active: false },
          { l: 'Mutfakta', done: true, active: true },
          { l: 'Hazır', done: false, active: false },
          { l: 'Teslim', done: false, active: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                s.active ? 'bg-accent' : s.done ? 'bg-olive' : 'bg-paper-2 border border-line'
              }`}
              style={s.active ? { animation: 'pulse 1.5s ease infinite' } : {}}
            />
            <span className={`text-[12px] ${s.active ? 'text-ink font-semibold' : 'text-ink-2'}`}>
              {s.l}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-paper-2 rounded-lg p-3 text-center">
        <div className="text-ink-3" style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.12em' }}>
          KALAN SÜRE
        </div>
        <div
          className="text-accent mt-1"
          style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 32 }}
        >
          7 <span style={{ fontSize: 14 }}>dk</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QR Pattern (basit dekoratif)
// ============================================================
function QrPattern() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {Array.from({ length: 12 }).map((_, i) =>
        Array.from({ length: 12 }).map((_, j) => {
          const v = (i * 7 + j * 3 + i * j) % 4;
          return (
            v === 0 && (
              <rect
                key={`${i}-${j}`}
                x={i * 10}
                y={j * 10}
                width="8"
                height="8"
                fill="var(--ink)"
              />
            )
          );
        })
      )}
    </svg>
  );
}

// ============================================================
// Cafe Dashboard (sağ taraf)
// ============================================================
function CafeDashboard({ step }: { step: number }) {
  return (
    <div className="grid grid-cols-[140px_1fr] min-h-[460px]">
      {/* Sidebar */}
      <aside
        className="px-3 py-4 border-r"
        style={{ background: 'var(--paper-2)', borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-md grid place-items-center"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 16,
            }}
          >
            A
          </div>
          <div>
            <div className="text-[12px] font-semibold leading-none">Aleg</div>
            <div
              className="text-ink-3 mt-0.5"
              style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.14em' }}
            >
              KARAKÖY
            </div>
          </div>
        </div>
        <div
          className="text-ink-3 mb-1.5 mt-3"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.12em' }}
        >
          GENEL
        </div>
        <div className="text-[10.5px] text-ink-2 px-1.5 py-1.5">Gösterge Paneli</div>
        <div
          className="text-ink-3 mt-3 mb-1.5"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.12em' }}
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
            className={`text-[10.5px] px-1.5 py-1.5 rounded ${
              it.active ? 'bg-card text-ink font-semibold' : 'text-ink-2'
            }`}
            style={it.active ? { boxShadow: '0 1px 2px rgba(42,31,24,0.06)' } : {}}
          >
            {it.l}
          </div>
        ))}
      </aside>

      {/* Body */}
      <div className="p-4">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-line bg-paper text-ink-3 text-[10px] flex-1 mr-2"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-5-5" />
            </svg>
            <span>Ara…</span>
          </div>
          <div
            className="w-7 h-7 rounded-full grid place-items-center text-paper text-[9px] font-semibold"
            style={{ background: 'var(--accent)' }}
          >
            MK
          </div>
        </div>

        {/* Head */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <div
              className="text-ink-3 mb-1"
              style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.12em' }}
            >
              SİPARİŞLER
            </div>
            <div
              className="text-ink"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              Canlı akış
            </div>
          </div>
          <div
            className="text-olive flex items-center gap-1"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse" />
            CANLI
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sipariş Alındı */}
          <div className="bg-paper-2 rounded-lg p-2.5 min-h-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10.5px] font-semibold">Sipariş Alındı</span>
              <span
                className="text-ink-3"
                style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}
              >
                {step >= 4 ? '1' : '0'}
              </span>
            </div>
            {step >= 4 && (
              <div
                className="bg-card border border-line rounded-lg p-2.5"
                style={{
                  animation: step === 4 ? 'ticketIn 0.5s ease' : 'none',
                  borderColor: step === 4 ? 'var(--accent)' : 'var(--line)',
                }}
              >
                <div className="flex justify-between mb-1.5">
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}>#A-2041</span>
                  <span
                    className="text-olive"
                    style={{ fontFamily: 'var(--f-mono)', fontSize: 9 }}
                  >
                    ● 0 dk
                  </span>
                </div>
                <div className="text-[10px] text-ink-2 mb-2">Masa 14 · QR</div>
                <div className="text-[10px] mb-1">2× Flat White</div>
                <div className="text-[10px] mb-2">1× Avokadolu Ekşi Maya</div>
                <div className="flex justify-between pt-2 border-t border-line">
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--ink-3)' }}>TOPLAM</span>
                  <span className="font-semibold text-[11px]">₺355</span>
                </div>
              </div>
            )}
          </div>

          {/* Hazırlanıyor */}
          <div className="bg-paper-2 rounded-lg p-2.5 min-h-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10.5px] font-semibold">Hazırlanıyor</span>
              <span
                className="text-ink-3"
                style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}
              >
                {step >= 5 ? '1' : '0'}
              </span>
            </div>
            {step >= 5 && (
              <div
                className="bg-card border border-line rounded-lg p-2.5"
                style={{
                  animation: 'ticketIn 0.5s ease',
                  borderColor: 'var(--accent)',
                }}
              >
                <div className="flex justify-between mb-1.5">
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}>#A-2041</span>
                  <span
                    style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--accent)' }}
                  >
                    ● 1 dk
                  </span>
                </div>
                <div className="text-[10px] text-ink-2 mb-3">Masa 14 · QR</div>
                <div className="h-1 bg-paper-2 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: '40%', animation: 'progressBar 3s ease forwards' }}
                  />
                </div>
                <div
                  className="text-accent"
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.1em' }}
                >
                  MUTFAK ALDI
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification */}
        {step >= 4 && (
          <div
            className="mt-3 flex items-start gap-2.5 p-2.5 bg-card border border-accent rounded-lg"
            style={{ animation: 'ticketIn 0.5s ease' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 animate-pulse flex-shrink-0" />
            <div>
              <div
                className="text-accent"
                style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.1em' }}
              >
                YENİ SİPARİŞ · QR · 0s ÖNCE
              </div>
              <div className="text-[11px] mt-0.5">Masa 14 · 3 ürün · ₺355</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
