'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  {
    no: '01',
    t: 'İşletmeni aç',
    d: "Demo talebini alır almaz hesabını kuruyoruz. Giriş bilgilerin mail'ine düşer.",
  },
  {
    no: '02',
    t: 'Menünü yükle',
    d: 'Kategoriler, ürünler, fotoğraflar. Sürükle-bırak. Yapay zeka açıklamalarını yazsın istersen.',
  },
  {
    no: '03',
    t: "QR'ı yazdır, aç gitsin",
    d: 'Her masaya bir QR. Müşterin tarar, menüyü görür, sipariş verir.',
  },
];

export function Steps() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="steps"
      className="relative z-10"
      style={{ padding: '120px 0' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        {/* Head */}
        <div className="mb-15 max-w-[720px]" style={{ marginBottom: 60 }}>
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
              Başlangıç
            </span>
          </div>
          <h2
            className="text-ink"
            style={{
              fontSize: 'clamp(42px, 5vw, 68px)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            15 dakikada kurulum,{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              bir ömür kolaylık.
            </span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid lg:grid-cols-2 gap-15 items-center" style={{ gap: 60 }}>
          {/* SOL: Step list */}
          <div className="flex flex-col gap-1">
            {STEPS.map((s, i) => (
              <div
                key={i}
                onClick={() => setActive(i)}
                className={`grid grid-cols-[60px_1fr] gap-5 px-5 py-6 rounded-[14px] cursor-pointer transition-all ${
                  active === i ? 'bg-card' : ''
                }`}
                style={{
                  borderTop: '1px solid var(--line)',
                  borderBottom: i === STEPS.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <div
                  className={`pt-1 ${active === i ? 'text-accent' : 'text-ink-3'}`}
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 13,
                    letterSpacing: '0.06em',
                  }}
                >
                  {s.no}
                </div>
                <div>
                  <h3
                    className="text-ink mb-1.5"
                    style={{
                      fontSize: 22,
                      letterSpacing: '-0.02em',
                      fontWeight: 500,
                    }}
                  >
                    {s.t}
                  </h3>
                  <p
                    className="text-ink-2 leading-relaxed transition-all overflow-hidden"
                    style={{
                      fontSize: 14.5,
                      maxHeight: active === i ? 100 : 0,
                      marginTop: active === i ? 6 : 0,
                    }}
                  >
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* SAĞ: Visual */}
          <div
            className="rounded-[14px] border border-line relative overflow-hidden bg-card"
            style={{
              aspectRatio: '4/3',
              boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
            }}
          >
            <div
              key={active}
              className="absolute inset-0"
              style={{
                animation: 'stepFade 0.5s ease',
              }}
            >
              {active === 0 && <Visual1 />}
              {active === 1 && <Visual2 />}
              {active === 2 && <Visual3 />}
            </div>

            <style jsx>{`
              @keyframes stepFade {
                from {
                  opacity: 0;
                  transform: translateY(8px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Step Visual 1: Demo formu
// ============================================================
function Visual1() {
  return (
    <div className="p-6 h-full flex flex-col gap-2.5">
      <div
        className="text-ink-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
        }}
      >
        DEMO TALEBİ
      </div>
      {[
        { label: 'Ad Soyad', value: 'Mehmet Yılmaz', filled: true },
        { label: 'İşletme Adı', value: 'Ceylan Café', filled: false },
        { label: 'Telefon', value: '+90 532 ••• ••', filled: false },
        { label: 'E-posta', value: 'mehmet@ceylan.com', filled: false },
      ].map((field, i) => (
        <div
          key={i}
          className={`px-3.5 py-3 rounded-lg border ${field.filled ? 'text-ink' : 'text-ink-3'}`}
          style={{
            background: 'var(--paper)',
            borderColor: 'var(--line)',
            fontSize: 12,
          }}
        >
          {field.filled ? field.value : field.label}
        </div>
      ))}
      <button
        className="self-start mt-2 px-5 py-2.5 rounded-full bg-accent text-[#FDF8EC] font-medium"
        style={{ fontSize: 13 }}
      >
        Gönder →
      </button>
    </div>
  );
}

// ============================================================
// Step Visual 2: Menü editörü
// ============================================================
function Visual2() {
  return (
    <div className="p-5 h-full">
      <div className="flex justify-between items-center mb-4">
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
          }}
        >
          Menü Editörü
        </div>
        <div
          className="text-olive"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
          }}
        >
          ● KAYDEDİLDİ
        </div>
      </div>
      {[
        { name: 'Flat White', price: '₺85', cat: 'Kahve', selected: true },
        { name: 'Cortado', price: '₺75', cat: 'Kahve' },
        { name: 'Sourdough Toast', price: '₺95', cat: 'Kahvaltı' },
        { name: 'Berry Smoothie', price: '₺65', cat: 'İçecek' },
      ].map((item, i) => (
        <div
          key={i}
          className="flex justify-between items-center px-3.5 py-3 rounded mb-1"
          style={{
            background: item.selected ? 'var(--paper-2)' : 'transparent',
            border: '1px solid var(--line)',
          }}
        >
          <div>
            <div className="font-medium" style={{ fontSize: 13 }}>
              {item.name}
            </div>
            <div
              className="text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.08em',
              }}
            >
              {item.cat}
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 13,
            }}
          >
            {item.price}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Step Visual 3: QR kod
// ============================================================
function Visual3() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center gap-4">
      <div
        className="p-5 rounded-xl"
        style={{ background: 'var(--ink)' }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120">
          {Array.from({ length: 11 }).map((_, i) =>
            Array.from({ length: 11 }).map((_, j) => {
              const v = (i * 7 + j * 3 + i * j) % 3;
              return (
                v === 0 && (
                  <rect
                    key={`${i}-${j}`}
                    x={i * 10 + 4}
                    y={j * 10 + 4}
                    width="8"
                    height="8"
                    fill="var(--paper)"
                  />
                )
              );
            })
          )}
        </svg>
      </div>
      <div className="text-center">
        <div
          className="text-ink-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
          }}
        >
          MASA 14 · CEYLAN CAFÉ
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink)',
          }}
        >
          Hoş geldin.
        </div>
      </div>
    </div>
  );
}
