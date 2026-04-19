'use client';

import { useState } from 'react';

const PLANS = [
  {
    name: 'Başlangıç',
    monthly: 1499,
    desc: 'Tek şubeli küçük işletmeler için',
    features: [
      'QR Menü & Sipariş',
      'POS & Adisyon',
      'Mutfak Ekranı',
      '5 masaya kadar ücretsiz',
      'Türkçe destek',
      'Sınırsız ürün',
    ],
  },
  {
    name: 'Pro',
    monthly: 2999,
    desc: 'Büyüyen işletmeler için',
    badge: 'En Popüler',
    featured: true,
    features: [
      "Başlangıç'taki her şey",
      'Sadakat Programı',
      'Paket Servis',
      'Stok Takibi',
      'Sınırsız masa',
      'WhatsApp destek',
      'Detaylı raporlar',
    ],
  },
  {
    name: 'Kurumsal',
    monthly: 5999,
    desc: 'Zincir işletmeler için sınırsız',
    features: [
      "Pro'daki her şey",
      'Çoklu Şube yönetimi',
      'Vardiya Planı',
      'Özel Domain',
      'API erişimi',
      'Özel hesap yöneticisi',
      'SLA garantisi',
    ],
  },
];

interface PricingProps {
  onDemo: () => void;
}

export function Pricing({ onDemo }: PricingProps) {
  const [yearly, setYearly] = useState(false);

  const calcPrice = (monthly: number) => {
    const v = yearly ? Math.round((monthly * 12 * 0.8) / 12) : monthly;
    return v.toLocaleString('tr-TR');
  };

  return (
    <section
      id="pricing"
      className="relative z-10"
      style={{ padding: '100px 0', background: 'var(--paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        {/* Head - center */}
        <div className="text-center mb-10">
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
              Fiyatlandırma
            </span>
            <span className="w-6 h-px bg-ink-3" />
          </div>

          <h2
            className="text-ink mb-4"
            style={{
              fontSize: 'clamp(48px, 6vw, 84px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            Fiyat mı?{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              Açık ve şeffaf.
            </span>
          </h2>

          {/* Toggle */}
          <div
            className="inline-flex bg-card border border-line rounded-full p-1 mt-3.5"
          >
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-full transition-all ${
                !yearly ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
              }`}
              style={{ fontSize: 14 }}
            >
              Aylık
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-full transition-all inline-flex items-center gap-1.5 ${
                yearly ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
              }`}
              style={{ fontSize: 14 }}
            >
              Yıllık
              <span
                className="text-olive"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                }}
              >
                −%20
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-10 max-w-[1100px] mx-auto">
          {PLANS.map((p, i) => (
            <div
              key={i}
              className={`bg-card rounded-[22px] p-9 px-7 relative flex flex-col transition-all hover:-translate-y-1 ${
                p.featured ? 'border-2 border-accent' : 'border border-line'
              }`}
              style={{
                boxShadow: p.featured
                  ? '0 30px 60px -30px color-mix(in srgb, var(--accent) 40%, transparent)'
                  : '0 1px 2px rgba(42,31,24,0.06)',
              }}
            >
              {p.badge && (
                <div
                  className="absolute -top-3 right-6 px-3 py-1 rounded-full uppercase"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--paper)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    fontWeight: 500,
                  }}
                >
                  {p.badge}
                </div>
              )}

              <div
                className="mb-2"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 30,
                  color: 'var(--ink)',
                  fontWeight: 400,
                }}
              >
                {p.name}
              </div>

              <div className="text-ink-2 mb-6 min-h-[40px]" style={{ fontSize: 14 }}>
                {p.desc}
              </div>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span
                  className="text-ink"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 44,
                    letterSpacing: '-0.02em',
                    fontWeight: 400,
                  }}
                >
                  ₺{calcPrice(p.monthly)}
                </span>
                <span
                  className="text-ink-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 12,
                  }}
                >
                  /ay
                </span>
              </div>

              <ul className="list-none mb-7 flex-1">
                {p.features.map((f, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5 py-2.5 text-ink-2"
                    style={{
                      fontSize: 14,
                      borderBottom: j < p.features.length - 1 ? '1px dashed var(--line)' : 'none',
                    }}
                  >
                    <span
                      className="text-olive font-bold mt-0.5"
                      style={{ fontSize: 12 }}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={onDemo}
                className={`w-full py-3.5 rounded-full font-medium transition-all hover:-translate-y-px ${
                  p.featured
                    ? 'bg-accent text-[#FDF8EC]'
                    : 'border border-line text-ink hover:bg-paper-2 hover:border-ink-3'
                }`}
                style={{
                  fontSize: 15,
                  ...(p.featured && {
                    boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
                  }),
                }}
              >
                14 gün ücretsiz dene
              </button>
            </div>
          ))}
        </div>

        <p
          className="text-center text-ink-3 mt-7 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
          }}
        >
          Tüm planlar ücretsiz kurulum · Türkçe destek · Güncellemeler dahil
        </p>
      </div>
    </section>
  );
}
