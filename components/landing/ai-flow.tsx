'use client';

import { useState, useEffect } from 'react';

// Warm theme colors
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

// Her biri müşteri+panel'de ne olduğunu anlatıyor
const AI_FLOWS = [
  {
    id: 'recommend',
    label: 'MÜŞTERİ · ÖNERİ',
    duration: 4200,
    customer: {
      scene: 'recommendation',
      title: 'Ne içsem?',
    },
    panel: {
      scene: 'analyze',
      title: 'AI analiz ediyor',
      subtitle: 'Geçmiş siparişler · tercihler · mevsim',
    },
  },
  {
    id: 'describe',
    label: 'PANEL · ÜRÜN AÇIKLAMA',
    duration: 4500,
    customer: {
      scene: 'menu-item',
      title: 'Güncellenen menü',
    },
    panel: {
      scene: 'writing',
      title: 'AI açıklama yazıyor',
      subtitle: 'Tonun senin, kelimeler AI',
    },
  },
  {
    id: 'translate',
    label: 'PANEL · ANINDA ÇEVİRİ',
    duration: 4200,
    customer: {
      scene: 'menu-en',
      title: 'English menu',
    },
    panel: {
      scene: 'translating',
      title: 'AI çevirmen',
      subtitle: 'TR → EN / DE · 3sn',
    },
  },
];

export function AIFlow() {
  const [flow, setFlow] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setFlow((f) => (f + 1) % AI_FLOWS.length), AI_FLOWS[flow].duration);
    return () => clearTimeout(t);
  }, [flow]);

  const current = AI_FLOWS[flow];

  return (
    <section
      id="ai-flow"
      className="relative z-10"
      style={{ padding: '120px 0', background: 'var(--paper-2)' }}
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
              ✦ Yapay Zeka · Her İki Tarafta
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
            Müşteriye{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              yardımcı
            </span>
            , sana{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              asistan
            </span>
            .
          </h2>
          <p
            className="text-ink-2 max-w-[640px]"
            style={{ fontSize: 17, lineHeight: 1.55 }}
          >
            AI menüyü yazar, çevirir, etiketler; müşterine özel öneri verir. Claude AI ile
            çalışır — ürün fotoğrafından içerik çıkarır, allergen önerir, toplu çeviri yapar.
          </p>
        </div>

        {/* Stage — warm theme */}
        <div
          data-theme="warm"
          className="reveal rounded-[22px] p-8 md:p-12 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${WARM.paper} 0%, ${WARM.paper2} 100%)`,
            border: `1px solid ${WARM.line}`,
            boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 30px 80px -30px rgba(42,31,24,0.3)',
          }}
        >
          {/* Paper texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(139, 110, 80, 0.06) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(139, 110, 80, 0.04) 0%, transparent 40%)
              `,
            }}
          />

          {/* Flow label */}
          <div className="relative z-10 flex justify-between items-center mb-6 flex-wrap gap-3">
            <div
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full"
              style={{
                background: WARM.card,
                border: `1px solid ${WARM.line}`,
              }}
            >
              <span
                className="text-accent"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ✦
              </span>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: WARM.accent,
                  fontWeight: 600,
                }}
              >
                {current.label}
              </span>
            </div>

            {/* Step indicators */}
            <div className="flex gap-2">
              {AI_FLOWS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFlow(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === flow ? 24 : 8,
                    height: 8,
                    background: i === flow ? WARM.accent : WARM.paper3,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-10 items-center">
            {/* SOL: Phone (müşteri) */}
            <div className="flex flex-col items-center gap-3 mx-auto">
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
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full z-20"
                  style={{ background: WARM.ink }}
                />
                <div
                  className="rounded-[30px] w-full h-full overflow-hidden relative"
                  style={{ background: WARM.paper }}
                >
                  <CustomerScreen scene={current.customer.scene} flowId={current.id} />
                </div>
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
                {current.customer.title}
              </div>
            </div>

            {/* SAĞ: Panel (işletme) */}
            <div
              className="rounded-[14px] overflow-hidden"
              style={{
                background: WARM.card,
                border: `1px solid ${WARM.line}`,
                boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 20px 40px -15px rgba(42,31,24,0.25)',
              }}
            >
              <PanelScreen scene={current.panel.scene} flowId={current.id} title={current.panel.title} subtitle={current.panel.subtitle} />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes aiFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes aiType {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        @keyframes aiPulseBtn {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(196, 85, 58, 0.5);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(196, 85, 58, 0);
          }
        }
        @keyframes aiBlink {
          50% {
            opacity: 0;
          }
        }
        @keyframes aiSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes aiShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Müşteri Telefon Ekranları
// ============================================================
function CustomerScreen({ scene, flowId }: { scene: string; flowId: string }) {
  if (scene === 'recommendation') {
    return <CustomerRecommendation />;
  }
  if (scene === 'menu-item') {
    return <CustomerMenuItem />;
  }
  if (scene === 'menu-en') {
    return <CustomerMenuEN />;
  }
  return null;
}

function CustomerRecommendation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-3" style={{ animation: 'aiFade 0.4s ease' }}>
      {/* Header */}
      <div
        className="text-center pb-2.5 mb-3"
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
            marginTop: 3,
          }}
        >
          Aleg
        </div>
      </div>

      {/* AI Button / Modal */}
      <div className="mb-3">
        <button
          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-[11px] font-semibold"
          style={{
            background: `linear-gradient(135deg, ${WARM.accent} 0%, #D66A50 100%)`,
            color: WARM.paper,
            boxShadow: '0 4px 12px rgba(196,85,58,0.3)',
            animation: phase === 0 ? 'aiPulseBtn 1.4s ease infinite' : 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          Ne içsem? AI&apos;ya sor
        </button>
      </div>

      {/* Thinking state */}
      {phase === 1 && (
        <div
          className="flex items-center justify-center gap-1.5 py-3 text-[10px]"
          style={{
            color: WARM.accent,
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.12em',
            animation: 'aiFade 0.3s ease',
          }}
        >
          AI DÜŞÜNÜYOR
          <span
            className="inline-flex gap-0.5"
            style={{ animation: 'aiBlink 1s infinite' }}
          >
            <span>•</span>
            <span>•</span>
            <span>•</span>
          </span>
        </div>
      )}

      {/* Recommendation cards */}
      {phase >= 2 && (
        <div className="space-y-2" style={{ animation: 'aiFade 0.5s ease' }}>
          <div
            className="text-[9px] mb-2"
            style={{
              color: WARM.ink3,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
            }}
          >
            SENİN İÇİN ÖZEL · 3 ÖNERİ
          </div>
          {[
            { n: 'Flat White', d: 'Her zamanki', p: '₺95', badge: 'GEÇMİŞ', hl: true },
            { n: 'V60 · Geyşa', d: 'Daha hafif bir şey', p: '₺130', badge: 'YENİ DENE' },
            { n: 'Cortado', d: 'Kısa bir mola', p: '₺85', badge: 'HIZLI' },
          ].map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                background: m.hl ? WARM.accentSoft : WARM.paper2,
                border: `1px solid ${m.hl ? WARM.accent : WARM.line}`,
                animation: `aiSlideIn 0.4s ease ${i * 0.12}s backwards`,
              }}
            >
              <div
                className="w-7 h-7 rounded-md flex-shrink-0 grid place-items-center"
                style={{
                  background: `linear-gradient(135deg, ${['#6B4F33', '#3E2A1B', '#8A6B4F'][i]}, ${['#4A3520', '#2A1A0E', '#5C4632'][i]})`,
                  fontSize: 7,
                  color: WARM.paper,
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                ✦
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{ fontSize: 10, fontWeight: 500, color: WARM.ink }}
                >
                  {m.n}
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: 8, color: WARM.ink2, fontStyle: 'italic' }}
                >
                  &ldquo;{m.d}&rdquo;
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: m.hl ? WARM.accent : WARM.ink3,
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.1em',
                    marginTop: 1,
                    fontWeight: 600,
                  }}
                >
                  {m.badge}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: WARM.ink,
                  fontFamily: 'var(--f-mono)',
                }}
              >
                {m.p}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerMenuItem() {
  const [typed, setTyped] = useState(0);
  const fullText = 'Çift shot espresso, buharla ısıtılmış süt ve kadifemsi mikro-köpük. Sabahlarına dengeli bir başlangıç.';

  useEffect(() => {
    const t = setInterval(() => {
      setTyped((i) => (i < fullText.length ? i + 2 : i));
    }, 40);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-full flex flex-col p-3" style={{ animation: 'aiFade 0.4s ease' }}>
      {/* Image */}
      <div
        className="h-24 rounded-lg mb-2 grid place-items-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6B4F33 0%, #3E2A1B 100%)',
          color: WARM.paper,
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
        }}
      >
        Flat White
      </div>

      {/* AI badge */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="px-1.5 py-0.5 rounded-full text-[7px] font-semibold flex items-center gap-1"
          style={{
            background: WARM.accent,
            color: WARM.paper,
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.1em',
          }}
        >
          ✦ AI
        </span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 7,
            color: WARM.ink3,
            letterSpacing: '0.1em',
          }}
        >
          EDİTORYAL · TR
        </span>
      </div>

      <div
        className="mb-1"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
          color: WARM.ink,
        }}
      >
        Flat White
      </div>

      {/* AI-generated description with typewriter */}
      <p
        style={{
          fontSize: 10,
          color: WARM.ink2,
          lineHeight: 1.55,
          minHeight: 60,
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
        }}
      >
        {fullText.slice(0, typed)}
        {typed < fullText.length && (
          <span
            className="inline-block ml-0.5"
            style={{
              width: 2,
              height: 11,
              background: WARM.accent,
              verticalAlign: 'text-bottom',
              animation: 'aiBlink 0.8s step-start infinite',
            }}
          />
        )}
      </p>

      {/* Tags */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {['Vegan seçeneği', 'Gluten-free', '120 kcal'].map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[7px]"
            style={{
              background: WARM.paper2,
              border: `1px solid ${WARM.line}`,
              color: WARM.ink2,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Price & add */}
      <div className="mt-auto flex justify-between items-center pt-3">
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 14, fontWeight: 600, color: WARM.ink }}>
          ₺85
        </div>
        <button
          className="px-4 py-2 rounded-full font-semibold text-[10px]"
          style={{
            background: WARM.accent,
            color: WARM.paper,
          }}
        >
          Sepete +
        </button>
      </div>
    </div>
  );
}

function CustomerMenuEN() {
  return (
    <div className="h-full flex flex-col p-3" style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="text-center pb-2.5 mb-2.5"
        style={{ borderBottom: `1px solid ${WARM.line}` }}
      >
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            color: WARM.accent,
            lineHeight: 1,
          }}
        >
          Aleg
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            color: WARM.ink3,
            letterSpacing: '0.12em',
          }}
        >
          TABLE 14 · ENGLISH MENU
        </div>
      </div>

      {/* Language switch */}
      <div
        className="flex gap-1 mb-2 p-0.5 rounded-full w-fit"
        style={{
          background: WARM.paper2,
          border: `1px solid ${WARM.line}`,
        }}
      >
        {['TR', 'EN', 'DE'].map((lang) => (
          <span
            key={lang}
            className="px-2 py-0.5 rounded-full"
            style={{
              background: lang === 'EN' ? WARM.ink : 'transparent',
              color: lang === 'EN' ? WARM.paper : WARM.ink3,
              fontFamily: 'var(--f-mono)',
              fontSize: 7,
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            {lang}
          </span>
        ))}
      </div>

      {/* Items in English */}
      <div className="space-y-1.5">
        {[
          {
            n: 'Flat White',
            d: 'Double espresso shot with steamed velvet milk',
            p: '₺95',
          },
          {
            n: 'Sourdough Toast · Avocado',
            d: 'House-baked sourdough with smashed avocado',
            p: '₺165',
          },
          {
            n: 'Cold Brew',
            d: 'Slow-steeped for 12 hours · naturally sweet',
            p: '₺95',
          },
        ].map((m, i) => (
          <div
            key={i}
            className="p-2 rounded"
            style={{
              background: WARM.paper2,
              border: `1px solid ${WARM.line}`,
              animation: `aiSlideIn 0.3s ease ${i * 0.1}s backwards`,
            }}
          >
            <div className="flex justify-between items-start gap-2">
              <div style={{ fontSize: 10, fontWeight: 500, color: WARM.ink }}>{m.n}</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', fontWeight: 600, color: WARM.ink }}>
                {m.p}
              </div>
            </div>
            <div
              className="mt-0.5"
              style={{
                fontSize: 8,
                color: WARM.ink2,
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
              {m.d}
            </div>
          </div>
        ))}
      </div>

      {/* AI badge at bottom */}
      <div
        className="mt-auto pt-3 flex items-center justify-center gap-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 7,
          color: WARM.ink3,
          letterSpacing: '0.12em',
        }}
      >
        <span style={{ color: WARM.accent, fontSize: 9 }}>✦</span>
        AI ILE ANLIK ÇEVİRİ
      </div>
    </div>
  );
}

// ============================================================
// Panel (İşletme) Ekranları
// ============================================================
function PanelScreen({
  scene,
  flowId,
  title,
  subtitle,
}: {
  scene: string;
  flowId: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[440px] flex flex-col">
      {/* Topbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: WARM.paper2, borderColor: WARM.line }}
      >
        <div className="flex items-center gap-2">
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
            <div className="text-[11px] font-semibold" style={{ color: WARM.ink, lineHeight: 1 }}>
              Aleg Panel
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: WARM.ink3,
                letterSpacing: '0.12em',
                marginTop: 2,
              }}
            >
              KARAKÖY · MENÜ EDITÖRÜ
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${WARM.accent} 0%, #D66A50 100%)`,
            color: WARM.paper,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              fontWeight: 600,
            }}
          >
            AI AKTİF
          </span>
        </div>
      </div>

      {/* Title area */}
      <div
        className="px-6 py-4 border-b"
        style={{ background: WARM.card, borderColor: WARM.line }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-accent"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: WARM.ink,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 11, color: WARM.ink3, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
      </div>

      {/* Content based on scene */}
      <div className="flex-1 p-5">
        {scene === 'analyze' && <PanelAnalyze />}
        {scene === 'writing' && <PanelWriting />}
        {scene === 'translating' && <PanelTranslating />}
      </div>
    </div>
  );
}

function PanelAnalyze() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, 4)), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ animation: 'aiFade 0.4s ease' }}>
      {/* Input: Customer profile */}
      <div
        className="rounded-lg p-3 mb-3"
        style={{ background: WARM.paper2, border: `1px solid ${WARM.line}` }}
      >
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: WARM.ink3,
            letterSpacing: '0.12em',
          }}
        >
          MÜŞTERİ PROFİLİ · CEM U.
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
          <div>
            <div className="text-ink-3" style={{ color: WARM.ink3 }}>
              Ziyaret
            </div>
            <div className="font-semibold" style={{ color: WARM.ink }}>
              18 kez
            </div>
          </div>
          <div>
            <div style={{ color: WARM.ink3 }}>Favorisi</div>
            <div className="font-semibold" style={{ color: WARM.ink }}>
              Flat White
            </div>
          </div>
          <div>
            <div style={{ color: WARM.ink3 }}>Son</div>
            <div className="font-semibold" style={{ color: WARM.ink }}>
              3 gün önce
            </div>
          </div>
        </div>
      </div>

      {/* AI thinking steps */}
      <div className="space-y-2">
        {[
          { l: 'Müşteri geçmişi yükleniyor', done: step >= 1 },
          { l: 'Mevsim · hava · saat analizi', done: step >= 2 },
          { l: 'Stok & özel teklif kontrolü', done: step >= 3 },
          { l: '3 kişiselleştirilmiş öneri oluşturuldu', done: step >= 4, hl: true },
        ].map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded"
            style={{
              background: s.hl && s.done ? WARM.accentSoft : 'transparent',
              opacity: s.done ? 1 : 0.4,
              transition: 'all 0.3s',
            }}
          >
            <div
              className="w-4 h-4 rounded-full grid place-items-center flex-shrink-0"
              style={{
                background: s.done ? (s.hl ? WARM.accent : WARM.olive) : WARM.paper2,
                border: s.done ? 'none' : `1px solid ${WARM.line}`,
              }}
            >
              {s.done && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={WARM.paper} strokeWidth="4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                color: s.hl && s.done ? WARM.ink : WARM.ink2,
                fontWeight: s.hl && s.done ? 600 : 400,
              }}
            >
              {s.l}
            </span>
            {s.done && !s.hl && (
              <span
                className="ml-auto"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  color: WARM.olive,
                  letterSpacing: '0.08em',
                }}
              >
                ✓ {Math.floor(Math.random() * 120 + 30)}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelWriting() {
  const [typed, setTyped] = useState(0);
  const fullText = 'Çift shot espresso, buharla ısıtılmış süt ve kadifemsi mikro-köpük. Sabahlarına dengeli bir başlangıç.';

  useEffect(() => {
    const t = setInterval(() => {
      setTyped((i) => (i < fullText.length ? i + 2 : i));
    }, 45);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-3" style={{ animation: 'aiFade 0.4s ease' }}>
      {/* Input */}
      <div
        className="flex items-center gap-2 p-2.5 rounded-lg"
        style={{ background: WARM.paper2, border: `1px solid ${WARM.line}` }}
      >
        <div
          className="px-2 py-1 rounded text-[9px] font-semibold"
          style={{
            background: WARM.paper,
            color: WARM.ink3,
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.1em',
          }}
        >
          GİRDİ
        </div>
        <div style={{ fontSize: 12, color: WARM.ink }}>Flat White · ₺85 · Espresso bazlı</div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'TON', v: 'Editöryal' },
          { l: 'DİL', v: 'Türkçe' },
          { l: 'UZUNLUK', v: '~20 kelime' },
        ].map((s) => (
          <div
            key={s.l}
            className="p-2 rounded"
            style={{ background: WARM.paper, border: `1px solid ${WARM.line}` }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: WARM.ink3,
                letterSpacing: '0.1em',
              }}
            >
              {s.l}
            </div>
            <div style={{ fontSize: 11, color: WARM.ink, fontWeight: 500, marginTop: 2 }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Arrow */}
      <div className="text-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={WARM.accent} strokeWidth="1.8" className="mx-auto">
          <path d="M12 4v16M5 13l7 7 7-7" />
        </svg>
      </div>

      {/* Output */}
      <div
        className="p-3.5 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(196,85,58,0.08) 0%, transparent 100%)',
          border: `1px solid ${WARM.accent}`,
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div
            className="px-2 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1"
            style={{
              background: WARM.accent,
              color: WARM.paper,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
            }}
          >
            ✦ AI ÇIKTISI
          </div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              color: WARM.olive,
              letterSpacing: '0.08em',
            }}
          >
            ✓ 1.2s
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            lineHeight: 1.55,
            color: WARM.ink,
            minHeight: 50,
          }}
        >
          {fullText.slice(0, typed)}
          {typed < fullText.length && (
            <span
              className="inline-block ml-0.5"
              style={{
                width: 2,
                height: 14,
                background: WARM.accent,
                verticalAlign: 'text-bottom',
                animation: 'aiBlink 0.8s step-start infinite',
              }}
            />
          )}
        </p>
      </div>

      {/* Action buttons */}
      {typed >= fullText.length - 5 && (
        <div className="flex gap-2" style={{ animation: 'aiFade 0.3s ease' }}>
          <button
            className="flex-1 py-2 rounded font-semibold text-[11px]"
            style={{ background: WARM.accent, color: WARM.paper }}
          >
            ✓ Onayla & Yayınla
          </button>
          <button
            className="py-2 px-3 rounded text-[11px]"
            style={{
              background: WARM.paper,
              color: WARM.ink2,
              border: `1px solid ${WARM.line}`,
            }}
          >
            Yeniden üret
          </button>
        </div>
      )}
    </div>
  );
}

function PanelTranslating() {
  const [lang, setLang] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLang((l) => (l + 1) % 2), 1800);
    return () => clearInterval(t);
  }, []);

  const langs = [
    { code: 'EN', name: 'English', txt: 'Double espresso shot with steamed velvet milk.' },
    { code: 'DE', name: 'Deutsch', txt: 'Doppelter Espresso mit gedämpfter Samtmilch.' },
  ];
  const current = langs[lang];

  return (
    <div className="space-y-3" style={{ animation: 'aiFade 0.4s ease' }}>
      {/* Source */}
      <div
        className="p-3 rounded-lg"
        style={{ background: WARM.paper2, border: `1px solid ${WARM.line}` }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
            style={{
              background: WARM.ink,
              color: WARM.paper,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
            }}
          >
            TR
          </span>
          <span
            style={{
              fontSize: 9,
              color: WARM.ink3,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            KAYNAK
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: WARM.ink,
          }}
        >
          Çift shot espresso, buharla ısıtılmış süt ve kadifemsi mikro-köpük.
        </p>
      </div>

      {/* Translating animation */}
      <div className="flex items-center justify-center gap-3 py-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WARM.accent} strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
        <div
          className="flex-1 h-0.5 rounded-full overflow-hidden"
          style={{ background: WARM.paper3, maxWidth: 120 }}
        >
          <div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${WARM.accent} 0%, ${WARM.gold} 100%)`,
              width: '100%',
              animation: 'aiType 1s ease infinite',
            }}
          />
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WARM.accent} strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>

      {/* Target */}
      <div
        key={lang}
        className="p-3 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(196,85,58,0.08) 0%, transparent 100%)',
          border: `1px solid ${WARM.accent}`,
          animation: 'aiFade 0.4s ease',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
              style={{
                background: WARM.accent,
                color: WARM.paper,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.1em',
              }}
            >
              {current.code}
            </span>
            <span
              style={{
                fontSize: 9,
                color: WARM.ink3,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              {current.name.toUpperCase()}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              color: WARM.olive,
              letterSpacing: '0.08em',
            }}
          >
            ✓ 0.8s
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: WARM.ink,
          }}
        >
          {current.txt}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'ÜRÜN', v: '84' },
          { l: 'DİL', v: 'TR → 2' },
          { l: 'SÜRE', v: '~3 dk' },
        ].map((s) => (
          <div
            key={s.l}
            className="p-2 rounded text-center"
            style={{ background: WARM.paper, border: `1px solid ${WARM.line}` }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: WARM.ink3,
                letterSpacing: '0.1em',
              }}
            >
              {s.l}
            </div>
            <div style={{ fontSize: 13, color: WARM.ink, fontWeight: 600, marginTop: 2 }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
