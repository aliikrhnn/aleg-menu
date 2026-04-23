'use client';

import { useEffect, useState } from 'react';

export function BrandSide() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = (tr: string, en: string) => (lang === 'tr' ? tr : en);

  return (
    <div
      className="flex flex-col h-full px-10 py-8 lg:px-14 lg:py-10 relative overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      {/* Arka plan subtle desen */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent-soft) 35%, transparent) 0%, transparent 55%)',
        }}
      />

      {/* Üst: Logo + konum */}
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
            background: 'var(--ink)',
            color: 'var(--paper)',
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
              color: 'var(--ink-3)',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 5, height: 5, background: 'var(--accent)' }}
            />
            KARAKÖY · İSTANBUL
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
            {t('KAFE İŞLETİM SİSTEMİ · B2B', 'CAFE OPERATING SYSTEM · B2B')}
          </span>
        </div>

        {/* Büyük başlık - 3 satır */}
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
          {t('İşletmenin', 'Your café in')}
          <br />
          <span
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--accent)',
            }}
          >
            {t('tek kumanda', 'one command')}
          </span>
          <br />
          {t('paneli.', 'panel.')}
        </h1>

        {/* Alt açıklama */}
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
          {t(
            'Masa, kasa, menü, ekip, stok ve çoklu şube — tek platformda. Güne tek ekrandan başla, ay sonunda verilerle bitir.',
            'Tables, POS, menu, team, stock and multi-branch — one platform. Start the day with one screen, close the month with data.'
          )}
        </p>

        {/* 3'lü stat kartı */}
        <div
          className="mt-10 rounded-[var(--r)] p-5 max-w-lg transition-all duration-700"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '400ms',
          }}
        >
          <div className="grid grid-cols-3 gap-4">
            <StatItem
              label={t('BUGÜN', 'TODAY')}
              value={t('142 kafe', '142 cafés')}
              withDot
            />
            <StatItem
              label={t('SİPARİŞLER', 'ORDERS')}
              value="3,204"
            />
            <StatItem
              label={t('ORTALAMA HAZIRLIK', 'AVG. PREP')}
              value={t('4dk 12sn', '4m 12s')}
            />
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
              {t(
                'MADE WITH PATIENCE AND ESPRESSO',
                'MADE WITH PATIENCE AND ESPRESSO'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Dil switcher pill */}
          <div
            className="flex items-center rounded-full p-0.5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <LangButton
              active={lang === 'tr'}
              onClick={() => setLang('tr')}
              label="TR"
            />
            <LangButton
              active={lang === 'en'}
              onClick={() => setLang('en')}
              label="EN"
            />
          </div>

          <a
            href="/yardim"
            className="text-sm hover:underline"
            style={{
              color: 'var(--ink-2)',
              textDecoration: 'underline',
              textDecorationColor: 'var(--line-2)',
              textUnderlineOffset: 4,
            }}
          >
            {t('Yardım', 'Help')}
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
            {t('Sistem durumu', 'System status')}
          </a>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  withDot,
}: {
  label: string;
  value: string;
  withDot?: boolean;
}) {
  return (
    <div>
      <div
        className="uppercase mb-1.5 flex items-center gap-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {withDot && (
          <span
            className="inline-block rounded-full"
            style={{
              width: 5,
              height: 5,
              background: 'var(--ok)',
              animation: 'aleg-live-dot 2s ease-in-out infinite',
            }}
          />
        )}
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <style jsx>{`
        @keyframes aleg-live-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}

function LangButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 rounded-full text-[11px] font-semibold transition-all"
      style={{
        fontFamily: 'var(--f-mono)',
        letterSpacing: '0.08em',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
      }}
    >
      {label}
    </button>
  );
}
