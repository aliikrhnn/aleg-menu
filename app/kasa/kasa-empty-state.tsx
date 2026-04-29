'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = {
  businessName: string;
};

export function KasaEmptyState({ businessName }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--paper)', color: 'var(--ink-3)' }}
      >
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
          }}
        >
          yükleniyor…
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme="espresso"
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <div className="w-full max-w-lg">
        {/* Üst eyebrow */}
        <div className="text-center mb-3">
          <span
            className="text-accent uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
            }}
          >
            {businessName} · Kasa
          </span>
        </div>

        {/* Ana kart */}
        <div
          className="rounded-[var(--r)] overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          {/* İllüstrasyon header */}
          <div
            className="px-6 pt-10 pb-8 flex flex-col items-center text-center"
            style={{
              background:
                'color-mix(in srgb, var(--accent) 6%, var(--card))',
              borderBottom:
                '1px solid color-mix(in srgb, var(--accent) 12%, var(--line))',
            }}
          >
            {/* SVG illüstrasyon: Boş kasa */}
            <div className="mb-6">
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Tezgah gölgesi */}
                <ellipse
                  cx="70"
                  cy="124"
                  rx="44"
                  ry="5"
                  fill="var(--accent)"
                  opacity="0.1"
                />
                {/* Kasa makinesi gövde */}
                <rect
                  x="30"
                  y="48"
                  width="80"
                  height="68"
                  rx="6"
                  fill="var(--card)"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                {/* Üst panel (ekran) */}
                <rect
                  x="38"
                  y="56"
                  width="64"
                  height="22"
                  rx="3"
                  fill="var(--accent)"
                  opacity="0.18"
                />
                {/* Tuş takımı */}
                <circle cx="48" cy="92" r="4" fill="var(--accent)" opacity="0.6" />
                <circle cx="62" cy="92" r="4" fill="var(--accent)" opacity="0.6" />
                <circle cx="76" cy="92" r="4" fill="var(--accent)" opacity="0.6" />
                <circle cx="90" cy="92" r="4" fill="var(--accent)" opacity="0.6" />
                <rect
                  x="44"
                  y="102"
                  width="52"
                  height="6"
                  rx="2"
                  fill="var(--accent)"
                  opacity="0.4"
                />
                {/* Üstte uçan profil ikonu (kasiyer eksik) */}
                <circle
                  cx="70"
                  cy="26"
                  r="14"
                  fill="var(--card)"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <circle cx="70" cy="22" r="4" fill="var(--accent)" opacity="0.4" />
                <path
                  d="M62 32 Q70 28 78 32"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.4"
                />
                {/* + işareti (eksik vurgu) */}
                <circle
                  cx="92"
                  cy="20"
                  r="9"
                  fill="var(--accent)"
                />
                <path
                  d="M92 16 V24 M88 20 H96"
                  stroke="#FAF5EA"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h1
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
              className="mb-3"
            >
              Önce bir kasiyer ekle
            </h1>
            <p
              className="text-[15px] leading-relaxed max-w-xs"
              style={{ color: 'var(--ink-2)' }}
            >
              Kasaya giriş yapabilmen için en az bir kasiyer (kullanıcı +
              PIN) lazım. Panele dön, hemen ekleyebilirsin.
            </p>
          </div>

          {/* Adımlar */}
          <div className="px-6 py-5 space-y-2">
            <div
              className="flex items-start gap-3 p-3 rounded-[10px]"
              style={{ background: 'var(--paper-2)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                1
              </div>
              <div className="flex-1 pt-0.5">
                <div className="text-[14px] font-medium">
                  Panel → Personeller
                </div>
                <div className="text-[12px] text-ink-3 mt-0.5">
                  Yeni kasiyer + PIN oluştur
                </div>
              </div>
            </div>

            <div
              className="flex items-start gap-3 p-3 rounded-[10px]"
              style={{ background: 'var(--paper-2)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                2
              </div>
              <div className="flex-1 pt-0.5">
                <div className="text-[14px] font-medium">
                  Bu sayfayı yenile
                </div>
                <div className="text-[12px] text-ink-3 mt-0.5">
                  Kasiyer kartına PIN ile gir, ödeme almaya başla
                </div>
              </div>
            </div>
          </div>

          {/* Aksiyon butonları */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            <Link
              href="/panel/kasiyerler"
              className="h-12 rounded-[var(--r-sm)] flex items-center justify-center font-semibold text-[14px] transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#FAF5EA' }}
            >
              Kasiyer eklemeye git →
            </Link>
            <Link
              href="/panel"
              className="h-11 rounded-[var(--r-sm)] flex items-center justify-center font-medium text-[13px] text-ink-2 hover:bg-[var(--paper-2)] transition-colors"
            >
              Panele dön
            </Link>
          </div>
        </div>

        {/* Alt yardım */}
        <div
          className="text-center mt-6 text-[12px]"
          style={{ color: 'var(--ink-3)' }}
        >
          Kasiyer ekledikten sonra bu sekmeyi yenile.
        </div>
      </div>
    </div>
  );
}
