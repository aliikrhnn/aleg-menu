'use client';

import { useState, useEffect } from 'react';

interface HeroProps {
  onDemo: () => void;
}

export function Hero({ onDemo }: HeroProps) {
  return (
    <section className="pt-[160px] pb-[80px] relative">
      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-15 items-center" style={{ gap: 60 }}>
          {/* SOL: Metin */}
          <div className="reveal">
            {/* Section label */}
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
                İşletme Yönetim Sistemi · B2B SaaS
              </span>
            </div>

            {/* Hero başlık */}
            <h1
              className="text-ink mb-7"
              style={{
                fontSize: 'clamp(56px, 8vw, 108px)',
                lineHeight: 0.96,
                letterSpacing: '-0.035em',
                fontWeight: 500,
                fontFamily: 'var(--f-sans)',
              }}
            >
              İşletmenin
              <span
                className="block text-accent"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                tek kumanda paneli.
              </span>
            </h1>

            {/* Alt metin */}
            <p
              className="text-ink-2 mb-9 max-w-[520px]"
              style={{
                fontSize: 19,
                lineHeight: 1.55,
              }}
            >
              QR sipariş, POS, mutfak ekranı, stok, vardiya, sadakat ve çoklu şube — 12 ayrı
              aboneliğin yerine tek platform. Kurulum 15 dakika, geri dönüş ilk haftadan.
            </p>

            {/* CTA */}
            <div className="flex gap-3 mb-7 flex-wrap">
              <button
                onClick={onDemo}
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-accent text-[#FDF8EC] font-medium hover:-translate-y-px transition-all"
                style={{
                  fontSize: 16,
                  boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)';
                }}
              >
                Demo Talep Et
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full border border-line text-ink hover:bg-paper-2 hover:border-ink-3 transition-all"
                style={{ fontSize: 16 }}
              >
                Platformu Gezin
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Trust */}
            <p
              className="text-ink-3 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10.5,
                letterSpacing: '0.08em',
              }}
            >
              14 gün ücretsiz · Kurulum desteği dahil · Kredi kartı gerekmez
            </p>
          </div>

          {/* SAĞ: Mockup + Floating Cards */}
          <div className="reveal relative" style={{ perspective: '1800px' }}>
            <DashboardMockup />
            <FloatingCards />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Dashboard Mockup (browser frame içinde)
// ============================================================
function DashboardMockup() {
  return (
    <div
      className="bg-card rounded-[14px] border border-line overflow-hidden relative"
      style={{
        boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
        transform: 'rotateY(-6deg) rotateX(4deg) rotate(0.6deg)',
        transformOrigin: 'center',
      }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3.5 py-3 bg-paper-2 border-b border-line">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
        </div>
        <div
          className="flex-1 text-center bg-paper px-3 py-1 rounded-full border border-line max-w-[220px] mx-auto text-ink-3"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}
        >
          panel.alegstudio.com
        </div>
      </div>

      {/* Dashboard içerik */}
      <div className="grid grid-cols-[160px_1fr] min-h-[420px]">
        {/* Sidebar */}
        <aside className="bg-paper-2 px-3 py-4 border-r border-line">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-[18px] h-[18px] rounded-md bg-ink" />
            <span className="text-[13px] font-medium">Aleg</span>
          </div>
          {[
            { label: 'Dashboard', active: true },
            { label: 'Siparişler' },
            { label: 'Menü' },
            { label: 'Masalar' },
            { label: 'Sadakat' },
            { label: 'Raporlar' },
            { label: 'Ayarlar' },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-[7px] rounded-lg text-[11.5px] mb-[3px] ${
                item.active
                  ? 'bg-card text-ink font-medium shadow-sm'
                  : 'text-ink-2'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded ${
                  item.active ? 'bg-accent' : 'bg-ink-3 opacity-50'
                }`}
              />
              {item.label}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="p-4">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-[18px] mb-1 font-medium tracking-[-0.02em]">Bugün</h3>
              <span
                className="text-ink-3"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                }}
              >
                19 NİSAN · PAZAR
              </span>
            </div>
            <span
              className="text-olive"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
              }}
            >
              ● CANLI
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { lab: 'CIRO', val: '₺14.284', delta: '↑ %18', color: 'olive' },
              { lab: 'SİPARİŞ', val: '142', delta: '↑ 22', color: 'olive' },
              { lab: 'ORT. SEPET', val: '₺100', delta: '─', color: 'ink-3' },
            ].map((s) => (
              <div
                key={s.lab}
                className="p-3 bg-paper border border-line rounded-lg"
              >
                <div
                  className="text-ink-3 uppercase mb-1.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                  }}
                >
                  {s.lab}
                </div>
                <div
                  className="font-medium"
                  style={{
                    fontSize: 22,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.val}
                </div>
                <div
                  className={`mt-1 ${s.color === 'olive' ? 'text-olive' : 'text-ink-3'}`}
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 10 }}
                >
                  {s.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div
            className="h-[120px] rounded-lg border border-line p-2.5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 80%)',
            }}
          >
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M 0 80 L 40 70 L 80 60 L 120 65 L 160 40 L 200 45 L 240 30 L 280 35 L 320 20 L 360 15 L 400 10 L 400 100 L 0 100 Z"
                fill="var(--accent)"
                opacity="0.12"
              />
              <path
                d="M 0 80 L 40 70 L 80 60 L 120 65 L 160 40 L 200 45 L 240 30 L 280 35 L 320 20 L 360 15 L 400 10"
                stroke="var(--accent)"
                strokeWidth="2"
                fill="none"
              />
              {[
                [40, 70],
                [80, 60],
                [120, 65],
                [160, 40],
                [200, 45],
                [240, 30],
                [280, 35],
                [320, 20],
                [360, 15],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill="var(--accent)" />
              ))}
            </svg>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Floating Notification Cards
// ============================================================
const NOTIFICATIONS = [
  { dot: 'accent', label: 'YENİ SİPARİŞ', text: 'Masa 14 · 3 ürün' },
  { dot: 'olive', label: 'ÖDEME ALINDI', text: '+₺342 · Masa 7' },
  { dot: 'accent', label: 'YENİ MÜŞTERİ', text: 'Elif K. · 280 puan' },
  { dot: 'olive', label: 'MUTFAK HAZIR', text: 'Sipariş #1284' },
  { dot: 'accent', label: 'PAKET SERVİS', text: 'Yeni çağrı · 0532...' },
];

function FloatingCards() {
  const [idx1, setIdx1] = useState(0);
  const [idx2, setIdx2] = useState(1);
  const [idx3, setIdx3] = useState(2);

  useEffect(() => {
    const t1 = setInterval(() => setIdx1((i) => (i + 3) % NOTIFICATIONS.length), 3000);
    const t2 = setInterval(() => setIdx2((i) => (i + 3) % NOTIFICATIONS.length), 3400);
    const t3 = setInterval(() => setIdx3((i) => (i + 3) % NOTIFICATIONS.length), 3800);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, []);

  return (
    <>
      <FCard pos="top-[20%] -left-10" idx={idx1} key={`top-${idx1}`} />
      <FCard pos="bottom-[24%] -right-7" idx={idx2} key={`bot-${idx2}`} />
      <FCard pos="top-[60%] -left-5" idx={idx3} key={`mid-${idx3}`} />
    </>
  );
}

function FCard({ pos, idx }: { pos: string; idx: number }) {
  const n = NOTIFICATIONS[idx];
  return (
    <div
      className={`absolute ${pos} bg-card border border-line rounded-lg px-3.5 py-3 hidden md:flex items-center gap-2.5 min-w-[220px] z-10`}
      style={{
        boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
        animation: 'floatIn 0.6s ease forwards',
        opacity: 0,
      }}
    >
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${n.dot === 'olive' ? 'bg-olive' : 'bg-accent'}`}
      />
      <div className="flex flex-col gap-0.5">
        <small
          className="text-ink-3 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.08em',
          }}
        >
          {n.label}
        </small>
        <b className="text-ink text-[13px] font-medium">{n.text}</b>
      </div>

      <style jsx>{`
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
