'use client';

import { useEffect, useState } from 'react';

export function AdminBrandSide() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="flex flex-col h-full px-10 py-8 lg:px-14 lg:py-10 relative overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      {/* Arka plan subtle desen — super mavi tonda */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at top left, color-mix(in srgb, var(--super-soft) 45%, transparent) 0%, transparent 55%)',
        }}
      />

      {/* Üst: Logo + admin rozeti */}
      <div
        className="flex items-center gap-3 relative transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{
            background: 'var(--super)',
            color: '#FAF5EA',
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.04em',
          }}
        >
          A
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--ink)',
            }}
          >
            aleg
          </div>
          <div
            className="uppercase mt-1 flex items-center gap-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--super)',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 5, height: 5, background: 'var(--super)' }}
            />
            SÜPER ADMİN · PLATFORM
          </div>
        </div>
      </div>

      {/* Orta: Editorial başlık */}
      <div className="flex-1 flex flex-col justify-center relative py-10">
        {/* Etiket */}
        <div
          className="flex items-center gap-3 mb-8 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '100ms',
          }}
        >
          <span
            style={{
              width: 24,
              height: 1,
              background: 'var(--ink-3)',
              display: 'inline-block',
            }}
          />
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--ink-3)',
            }}
          >
            ALEG KONTROL MERKEZİ
          </span>
        </div>

        {/* Başlık */}
        <h1
          className="transition-all duration-700"
          style={{
            fontFamily: 'var(--f-serif)',
            fontSize: 'clamp(44px, 6vw, 72px)',
            fontWeight: 700,
            letterSpacing: '-0.035em',
            lineHeight: 0.95,
            color: 'var(--ink)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '200ms',
          }}
        >
          Tüm işletmeler,
          <br />
          <span
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--super)',
            }}
          >
            tek pencereden.
          </span>
        </h1>

        <p
          className="mt-6 max-w-md transition-all duration-700"
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '300ms',
          }}
        >
          İşletme yönetimi, abonelik takibi, destek talepleri ve platform
          sağlığı. Aleg&apos;in operasyon merkezine giriş.
        </p>

        {/* Uyarı kartı */}
        <div
          className="mt-10 rounded-[var(--r)] p-4 max-w-lg flex items-start gap-3 transition-all duration-700"
          style={{
            background: 'color-mix(in srgb, var(--super) 6%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--super) 20%, var(--line))',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '400ms',
          }}
        >
          <span
            style={{
              color: 'var(--super)',
              fontSize: 16,
              lineHeight: 1,
              marginTop: 2,
            }}
            aria-hidden="true"
          >
            ◆
          </span>
          <div>
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--super)',
              }}
            >
              KISITLI ERİŞİM
            </div>
            <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Bu alan sadece yetkili Aleg ekip üyeleri içindir. Tüm işlemler
              loglanır.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap pt-6 relative transition-all duration-700"
        style={{
          borderTop: '1px solid var(--line)',
          opacity: mounted ? 1 : 0,
          transitionDelay: '500ms',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            A
          </div>
          <div>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-2)',
              }}
            >
              ALEG STUDIO · 2026
            </div>
            <div
              className="uppercase mt-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.14em',
                color: 'var(--ink-3)',
              }}
            >
              ADMIN CONSOLE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <a
            href="/panel/giris"
            className="text-sm hover:underline"
            style={{
              color: 'var(--accent)',
              textDecoration: 'underline',
              textDecorationColor: 'color-mix(in srgb, var(--accent) 40%, transparent)',
              textUnderlineOffset: 4,
            }}
          >
            İşletme girişi
          </a>
          <a
            href="/sistem-durumu"
            className="text-sm hover:underline"
            style={{
              color: 'var(--ink-2)',
              textDecoration: 'underline',
              textDecorationColor: 'var(--line-2)',
              textUnderlineOffset: 4,
            }}
          >
            Sistem durumu
          </a>
        </div>
      </div>
    </div>
  );
}
