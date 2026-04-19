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

            <div className="flex gap-3 mb-7 flex-wrap">
              <button
                onClick={onDemo}
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-accent text-[#FDF8EC] font-medium hover:-translate-y-px transition-all"
                style={{
                  fontSize: 16,
                  boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
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
            <WarmDashboardMockup />
            <FloatingCards />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Warm Tema Dashboard Mockup
// ============================================================
function WarmDashboardMockup() {
  return (
    <div
      data-theme="warm"
      className="rounded-[14px] overflow-hidden relative md:[transform:rotateY(-6deg)_rotateX(4deg)_rotate(0.6deg)]"
      style={{
        background: '#FAF5EA',
        border: '1px solid #D6C9B2',
        boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
        transformOrigin: 'center',
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-3.5 py-3 border-b"
        style={{ background: '#EDE4D3', borderColor: '#D6C9B2' }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ED6A5E' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5BF4F' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#61C554' }} />
        </div>
        <div
          className="flex-1 text-center mx-auto px-3 py-1 rounded-full border max-w-[220px]"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            background: '#F4EEE2',
            borderColor: '#D6C9B2',
            color: '#8C7A69',
          }}
        >
          panel.alegstudio.com
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] min-h-[420px]">
        {/* Sidebar - mobilde gizli */}
        <aside className="hidden md:block px-3 py-4 border-r" style={{ background: '#EDE4D3', borderColor: '#D6C9B2' }}>
          <div className="flex items-center gap-1.5 mb-4">
            <div
              className="w-6 h-6 rounded-md grid place-items-center"
              style={{
                background: '#2A1F18',
                color: '#F4EEE2',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 14,
              }}
            >
              A
            </div>
            <div>
              <div className="text-[12px] font-medium" style={{ color: '#2A1F18' }}>
                Aleg
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 8,
                  color: '#8C7A69',
                  letterSpacing: '0.14em',
                  marginTop: 1,
                }}
              >
                KARAKÖY
              </div>
            </div>
          </div>

          <div
            className="mb-1.5 mt-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              color: '#8C7A69',
              letterSpacing: '0.14em',
            }}
          >
            GENEL
          </div>

          {[
            { label: 'Gösterge Paneli', active: true, icon: 'grid' },
            { label: 'Masalar', icon: 'table' },
            { label: 'Kasa', icon: 'cash' },
            { label: 'Siparişler', icon: 'tag' },
            { label: 'Garson Çağrı', icon: 'bell' },
            { label: 'Stok Takibi', icon: 'box' },
            { label: 'Sadakat', icon: 'heart' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-2 py-[6px] rounded-md text-[11px] mb-[2px]"
              style={{
                background: item.active ? '#FAF5EA' : 'transparent',
                color: item.active ? '#2A1F18' : '#5A4A3D',
                fontWeight: item.active ? 500 : 400,
                boxShadow: item.active ? '0 1px 2px rgba(42,31,24,0.06)' : 'none',
              }}
            >
              <MiniIcon name={item.icon} color={item.active ? '#C4553A' : '#8C7A69'} />
              {item.label}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="p-3 md:p-4">
          {/* Head */}
          <div className="flex justify-between items-end mb-4">
            <div>
              <div
                className="mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  color: '#C4553A',
                  letterSpacing: '0.14em',
                }}
              >
                İŞLETME · KARAKÖY
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-sans)',
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                  fontWeight: 500,
                  color: '#2A1F18',
                  lineHeight: 1.1,
                }}
              >
                Günaydın, Melis
              </div>
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                color: '#6B7A4B',
                letterSpacing: '0.12em',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#6B7A4B',
                  animation: 'pulseDot 1.6s ease infinite',
                }}
              />
              CANLI
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { lab: 'MENÜ TARAMA', val: '142', d: '+12%', tone: 'pos' },
              { lab: 'SİPARİŞ', val: '38', d: '+8%', tone: 'pos' },
              { lab: 'CİRO', val: '₺4.820', d: '+22%', tone: 'accent' },
              { lab: 'ORT. ADİSYON', val: '₺127', d: '+2%', tone: 'pos' },
            ].map((s) => (
              <div
                key={s.lab}
                className="p-2.5 rounded-lg"
                style={{
                  background: '#F4EEE2',
                  border: '1px solid #D6C9B2',
                }}
              >
                <div
                  className="mb-1.5 flex items-center justify-between"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 8,
                    color: '#8C7A69',
                    letterSpacing: '0.1em',
                  }}
                >
                  {s.lab}
                  <span
                    className="px-1 py-0.5 rounded"
                    style={{
                      background: '#E8F0D4',
                      color: '#6B7A4B',
                      fontSize: 7,
                      fontWeight: 600,
                    }}
                  >
                    {s.d}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: s.tone === 'accent' ? '#C4553A' : '#2A1F18',
                    lineHeight: 1,
                  }}
                >
                  {s.val}
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 8,
                    color: '#8C7A69',
                  }}
                >
                  bugün
                </div>
              </div>
            ))}
          </div>

          {/* Kurulum Kartı + Live Çağrılar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Kurulum */}
            <div
              className="p-3 rounded-lg"
              style={{
                background: '#F4EEE2',
                border: '1px solid #D6C9B2',
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 8,
                    color: '#C4553A',
                    letterSpacing: '0.14em',
                  }}
                >
                  KURULUM
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    color: '#6B7A4B',
                    fontWeight: 600,
                  }}
                >
                  57%
                </div>
              </div>
              <div className="text-[11px] font-medium mb-2" style={{ color: '#2A1F18' }}>
                4/7 · kurulum tamamlandı
              </div>
              <div
                className="h-1 rounded-full overflow-hidden mb-2"
                style={{ background: '#E5D9C1' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    background: '#C4553A',
                    width: '57%',
                  }}
                />
              </div>
              <div className="space-y-1">
                {[
                  { l: 'İşletme bilgileri', done: true },
                  { l: 'İlk şube eklendi', done: true },
                  { l: 'Menü kategorileri', done: true },
                  { l: 'İlk 10 ürün', done: true },
                  { l: 'QR kodlarını bas', done: false, current: true },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 grid place-items-center"
                      style={{
                        background: step.done ? '#C4553A' : step.current ? 'transparent' : 'transparent',
                        border: step.done ? 'none' : '1px solid #D6C9B2',
                      }}
                    >
                      {step.done && (
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="4">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <span
                      style={{
                        color: step.done ? '#8C7A69' : '#2A1F18',
                        textDecoration: step.done ? 'line-through' : 'none',
                        fontWeight: step.current ? 500 : 400,
                      }}
                    >
                      {step.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Çağrılar */}
            <div
              className="p-3 rounded-lg"
              style={{
                background: '#F4EEE2',
                border: '1px solid #D6C9B2',
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 8,
                    color: '#C4553A',
                    letterSpacing: '0.14em',
                  }}
                >
                  LIVE
                </div>
                <div
                  className="flex items-center gap-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 8,
                    color: '#C4553A',
                  }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: '#C4553A', animation: 'pulseDot 1.2s ease infinite' }}
                  />
                  3 aktif
                </div>
              </div>
              <div className="text-[11px] font-medium mb-2" style={{ color: '#2A1F18' }}>
                Garson Çağrıları
              </div>
              <div className="space-y-1.5">
                {[
                  { m: '14', t: 'Garson çağrısı', ago: 'az önce' },
                  { m: '07', t: 'Hesap istiyor', ago: '2 dk önce' },
                  { m: '22', t: 'Ek sipariş', ago: '5 dk önce' },
                ].map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 p-1.5 rounded"
                    style={{
                      background: '#FAF5EA',
                      border: '1px solid #D6C9B2',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full grid place-items-center flex-shrink-0"
                      style={{
                        background: i === 0 ? '#E8BFAF' : '#EDE4D3',
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? '#C4553A' : '#8C7A69'} strokeWidth="2">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium" style={{ color: '#2A1F18' }}>
                        Masa {c.m}
                      </div>
                      <div className="text-[8px]" style={{ color: '#8C7A69' }}>
                        {c.t} · {c.ago}
                      </div>
                    </div>
                    <button
                      className="text-[8px] px-2 py-0.5 rounded"
                      style={{
                        background: '#EDE4D3',
                        color: '#5A4A3D',
                        border: '1px solid #D6C9B2',
                      }}
                    >
                      Çözüldü
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

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
  );
}

// ============================================================
// Mini Icons (Warm tema uyumlu)
// ============================================================
function MiniIcon({ name, color }: { name: string; color: string }) {
  const baseProps = {
    width: 11,
    height: 11,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'grid')
    return (
      <svg {...baseProps}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    );
  if (name === 'table')
    return (
      <svg {...baseProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    );
  if (name === 'cash')
    return (
      <svg {...baseProps}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  if (name === 'tag')
    return (
      <svg {...baseProps}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  if (name === 'bell')
    return (
      <svg {...baseProps}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    );
  if (name === 'box')
    return (
      <svg {...baseProps}>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      </svg>
    );
  if (name === 'heart')
    return (
      <svg {...baseProps}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    );
  return null;
}

// ============================================================
// Floating Notification Cards (Warm tema)
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
      <FCard pos="top-[10%] left-2 md:top-[20%] md:-left-8" idx={idx1} key={`top-${idx1}`} />
      <FCard pos="bottom-[10%] right-2 md:bottom-[24%] md:-right-6" idx={idx2} key={`bot-${idx2}`} />
      <FCard pos="hidden md:flex top-[60%] -left-4" idx={idx3} key={`mid-${idx3}`} />
    </>
  );
}

function FCard({ pos, idx }: { pos: string; idx: number }) {
  const n = NOTIFICATIONS[idx];
  return (
    <div
      className={`absolute ${pos} flex items-center gap-2.5 px-3 py-2 z-10 rounded-lg`}
      style={{
        background: '#FAF5EA',
        border: '1px solid #D6C9B2',
        boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
        minWidth: 170,
        animation: 'floatIn 0.6s ease forwards',
        opacity: 0,
      }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: n.dot === 'olive' ? '#6B7A4B' : '#C4553A' }}
      />
      <div className="flex flex-col gap-0.5">
        <small
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            color: '#8C7A69',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {n.label}
        </small>
        <b style={{ fontSize: 12, fontWeight: 500, color: '#2A1F18' }}>{n.text}</b>
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
