'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AIComplianceSection — AI ile menü besin & alerjen uyumu
 *
 * Bakanlık yönetmeliğinin yarattığı zorluk + Aleg'in çözümü.
 * Sol: önce/sonra ürün kartı animasyonu
 * Sağ: 3 adımlı "nasıl çalışır" + faydalar
 */

const ALLERGENS = [
  { code: 'gluten', label: 'Gluten', emoji: '🌾' },
  { code: 'dairy', label: 'Süt', emoji: '🥛' },
  { code: 'egg', label: 'Yumurta', emoji: '🥚' },
  { code: 'nuts', label: 'Sert Kabuklu', emoji: '🌰' },
  { code: 'soy', label: 'Soya', emoji: '🫘' },
  { code: 'fish', label: 'Balık', emoji: '🐟' },
];

const STEPS = [
  {
    num: '01',
    title: 'Menünü yükle',
    body: 'Mevcut menünü içeri aktar ya da Aleg ile baştan kur. Ad ve açıklama yeterli.',
  },
  {
    num: '02',
    title: 'AI tarar, çıkarır',
    body: 'Her ürün için alerjen, kalori, vegan/vejetaryen tag, içerik dökümü saniyeler içinde.',
  },
  {
    num: '03',
    title: 'Sen onayla',
    body: 'AI önerir, son söz sende. Tek tıkla onayla ya da düzelt — kontrol her zaman senin.',
  },
];

const BENEFITS = [
  {
    title: 'Yönetmeliğe tam uyum',
    body: 'Alerjen ikonları, kalori ve içerik bilgisi her ürün kartında — bakanlık denetimine hazır.',
  },
  {
    title: 'Saniyeler, saatler değil',
    body: 'El ile 200 ürünü işaretlemek yerine AI tarar, sen onaylarsın. Bir öğleden sonrada tüm menü.',
  },
  {
    title: 'Müşteri güveni',
    body: 'Alerjisi olan müşteri ne yiyebileceğini net görür. Hata azalır, güven artar.',
  },
];

export function AIComplianceSection() {
  return (
    <section
      id="ai-compliance"
      className="relative z-10"
      style={{ padding: '120px 0 100px', background: 'var(--paper)' }}
    >
      {/* Arka plan dekorasyonu — diagonal grain hattı */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 35% at 85% 15%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%)',
          zIndex: -1,
        }}
      />

      <div className="max-w-[1280px] mx-auto px-8 reveal">
        {/* HEADER */}
        <div className="mb-16 max-w-[820px]">
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
              Yasal Uyum · AI Destekli
            </span>
          </div>

          <h2
            className="text-ink mb-6"
            style={{
              fontSize: 'clamp(42px, 5vw, 68px)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            Bakanlık yönetmeliği zor.{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              Aleg saniyeler.
            </span>
          </h2>

          <p style={{ fontSize: 17, maxWidth: 620 }} className="text-ink-2 leading-relaxed">
            1 Temmuz 2026 itibarıyla menüdeki her ürünün alerjen, kalori ve
            içerik bilgisi zorunlu. Yüzlerce ürünü el ile işaretlemek günler
            sürer. Aleg AI yapar, sen onaylarsın.
          </p>
        </div>

        {/* ANA GRID: SOL animasyon + SAĞ adımlar */}
        <div
          className="grid gap-8 md:gap-12 mb-16"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          }}
        >
          {/* SOL — Ürün kartı before/after */}
          <ProductTransform />

          {/* SAĞ — 3 Adım */}
          <div className="flex flex-col gap-5">
            <div
              className="text-ink-3 uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                fontWeight: 700,
              }}
            >
              Nasıl Çalışır · 3 Adım
            </div>

            {STEPS.map((s, i) => (
              <StepCard key={s.num} step={s} index={i} />
            ))}
          </div>
        </div>

        {/* FAYDALAR — 3 sütun */}
        <div
          className="grid gap-5 mb-12"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="p-7 rounded-[20px] transition-all hover:-translate-y-1"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="mb-3 flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background:
                    'color-mix(in srgb, var(--accent) 14%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3
                className="text-ink mb-2"
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.25,
                }}
              >
                {b.title}
              </h3>
              <p className="text-ink-2" style={{ fontSize: 14, lineHeight: 1.55 }}>
                {b.body}
              </p>
            </div>
          ))}
        </div>

        {/* ALT NOT */}
        <div
          className="text-center text-ink-3 italic"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 15,
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          AI tarar, sen onaylarsın. Doğruluk için son söz her zaman sende — Aleg yardımcıdır,
          karar değildir.
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PRODUCT TRANSFORM — sol taraftaki "before/after" kart
// ============================================================
function ProductTransform() {
  const [phase, setPhase] = useState<'before' | 'analyzing' | 'after'>('before');
  const ref = useRef<HTMLDivElement | null>(null);

  // Görüş alanına gelince animasyon başlat (loop)
  useEffect(() => {
    if (!ref.current) return;
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    const run = () => {
      setPhase('before');
      timer1 = setTimeout(() => setPhase('analyzing'), 1800);
      timer2 = setTimeout(() => setPhase('after'), 3800);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          interval = setInterval(run, 7000);
        } else {
          clearInterval(interval);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-[24px] p-6 md:p-8"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: '0 8px 28px -16px rgba(42,31,24,0.18)',
        minHeight: 460,
      }}
    >
      {/* Üst tag */}
      <div className="flex items-center justify-between mb-5">
        <div
          className="inline-flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 600,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: phase === 'after' ? 'var(--ok)' : phase === 'analyzing' ? 'var(--accent)' : 'var(--ink-3)',
              transition: 'background 300ms',
            }}
          />
          <span>
            {phase === 'before' && 'Ham veri'}
            {phase === 'analyzing' && 'AI analiz ediyor...'}
            {phase === 'after' && 'Bakanlık uyumlu'}
          </span>
        </div>

        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--ink-3)',
          }}
        >
          1.4s
        </div>
      </div>

      {/* Ürün başlığı */}
      <div className="mb-6">
        <h4
          className="text-ink mb-2"
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          Akdeniz Salatası
        </h4>
        <p
          className="text-ink-2"
          style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 320 }}
        >
          Domates, salatalık, beyaz peynir, zeytin, dereotu ve evimizin
          yapımı limon-yoğurt sosuyla.
        </p>
      </div>

      {/* DURUM PANELLERİ */}
      <div style={{ minHeight: 220 }} className="relative">
        {/* BEFORE — boş alan */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: phase === 'before' ? 1 : 0,
            pointerEvents: phase === 'before' ? 'auto' : 'none',
          }}
        >
          <div
            className="rounded-[14px] p-5 flex flex-col items-center justify-center text-center"
            style={{
              background: 'var(--paper-2)',
              border: '1px dashed color-mix(in srgb, var(--ink-3) 40%, transparent)',
              minHeight: 200,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--ink-3)',
                fontWeight: 600,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Eksik Bilgi
            </div>
            <p
              className="text-ink-3"
              style={{ fontSize: 13, maxWidth: 240, lineHeight: 1.5 }}
            >
              Alerjen, kalori, içerik tagleri bekleniyor — bakanlık uyumlu değil.
            </p>
          </div>
        </div>

        {/* ANALYZING — tarama animasyonu */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: phase === 'analyzing' ? 1 : 0,
            pointerEvents: phase === 'analyzing' ? 'auto' : 'none',
          }}
        >
          <div
            className="rounded-[14px] p-5 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--paper-2)), var(--paper-2))',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--line))',
              minHeight: 200,
            }}
          >
            {/* Tarama çizgisi */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: 2,
                background:
                  'linear-gradient(90deg, transparent, var(--accent), transparent)',
                animation: 'aleg-scan 2s ease-in-out infinite',
              }}
            />

            <div className="flex items-center gap-2 mb-4">
              <div
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: 'var(--accent)',
                  animation: 'aleg-pulse 1s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  color: 'var(--accent)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                İçerik Çıkarımı
              </span>
            </div>

            <div className="space-y-2.5">
              {['Domates · sebze', 'Beyaz peynir · süt ürünü', 'Zeytin · vegan-uyumlu', 'Yoğurt sos · süt'].map(
                (line, i) => (
                  <div
                    key={line}
                    className="text-ink-2"
                    style={{
                      fontSize: 13,
                      fontFamily: 'var(--f-mono)',
                      opacity: 0,
                      animation: `aleg-fade-in 400ms ease-out ${i * 220}ms forwards`,
                    }}
                  >
                    <span style={{ color: 'var(--accent)' }}>→</span> {line}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* AFTER — alerjen badge'leri ve kalori */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: phase === 'after' ? 1 : 0,
            pointerEvents: phase === 'after' ? 'auto' : 'none',
          }}
        >
          <div
            className="rounded-[14px] p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--ok) 6%, var(--paper-2)), var(--paper-2))',
              border: '1px solid color-mix(in srgb, var(--ok) 25%, var(--line))',
              minHeight: 200,
            }}
          >
            {/* Kalori + tag satırı */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="text-ink"
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  287
                </span>
                <span
                  className="text-ink-3"
                  style={{ fontSize: 11, fontFamily: 'var(--f-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  kcal
                </span>
              </div>

              <div className="flex gap-1.5">
                <DietBadge label="Vejetaryen" emoji="🌱" />
                <DietBadge label="Glütensiz seçenek" emoji="✓" />
              </div>
            </div>

            {/* Alerjen bölümü başlığı */}
            <div
              className="mb-2.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                fontWeight: 700,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              Alerjen Bilgisi
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ALLERGENS.map((a, i) => {
                const detected = ['dairy'].includes(a.code);
                return (
                  <div
                    key={a.code}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: detected
                        ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                        : 'color-mix(in srgb, var(--ink-3) 8%, transparent)',
                      color: detected ? 'var(--accent)' : 'var(--ink-3)',
                      border: `1px solid ${
                        detected
                          ? 'color-mix(in srgb, var(--accent) 30%, transparent)'
                          : 'transparent'
                      }`,
                      opacity: 0,
                      animation: `aleg-fade-up 400ms ease-out ${i * 50}ms forwards`,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{a.emoji}</span>
                    <span>{a.label}</span>
                    {detected && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI not */}
            <div
              className="mt-4 pt-3"
              style={{
                borderTop: '1px solid color-mix(in srgb, var(--ok) 20%, var(--line))',
                fontSize: 12,
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                color: 'var(--ink-3)',
                lineHeight: 1.5,
              }}
            >
              &ldquo;Süt ürünü içerir (peynir, yoğurt). Vejetaryenlere uygundur.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes aleg-scan {
          0%, 100% { transform: translateY(8px); opacity: 0; }
          50% { transform: translateY(180px); opacity: 1; }
        }
        @keyframes aleg-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        @keyframes aleg-fade-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes aleg-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STEP CARD
// ============================================================
function StepCard({
  step,
  index,
}: {
  step: { num: string; title: string; body: string };
  index: number;
}) {
  return (
    <div
      className="flex gap-5 p-5 rounded-[18px] transition-all hover:-translate-x-1"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div
        className="flex-shrink-0 flex items-start justify-center"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '0.02em',
          paddingTop: 2,
          minWidth: 28,
        }}
      >
        {step.num}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="text-ink mb-1.5"
          style={{
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.3,
          }}
        >
          {step.title}
        </h4>
        <p
          className="text-ink-2"
          style={{ fontSize: 14, lineHeight: 1.55 }}
        >
          {step.body}
        </p>
      </div>
    </div>
  );
}

function DietBadge({ label, emoji }: { label: string; emoji: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{
        fontSize: 10,
        fontWeight: 600,
        background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
        color: 'var(--ok)',
        border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)',
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ fontSize: 11 }}>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
