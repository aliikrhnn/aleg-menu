'use client';

interface EarlyProps {
  onDemo: () => void;
}

export function Early({ onDemo }: EarlyProps) {
  return (
    <section
      className="relative z-10"
      style={{
        padding: '110px 0',
        background: 'var(--accent-soft)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        <div className="text-center max-w-[780px] mx-auto">
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
              Erken Ortak · Founders&apos; Circle
            </span>
            <span className="w-6 h-px bg-ink-3" />
          </div>

          <h2
            className="text-ink mb-6"
            style={{
              fontSize: 'clamp(56px, 7vw, 100px)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            İlk{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              50
            </span>{' '}
            işletmemizi kuruyoruz.
          </h2>

          <p
            className="text-ink mb-8 leading-relaxed"
            style={{ fontSize: 18 }}
          >
            Erken dönem ortağımız ol — <strong>3 ay %50 indirim</strong>, kurulum desteği bizden,
            özelliklerde öncelikli söz hakkı senden.
          </p>

          {/* Counter */}
          <div
            className="inline-flex items-center gap-4 px-5 py-3.5 rounded-full mb-8"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <div
              className="flex items-baseline"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 24,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              <span>34</span>
              <span className="text-ink-3 mx-1">/</span>
              <span>50</span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ width: 120, height: 4, background: 'var(--paper-3)' }}
            >
              <div
                className="h-full"
                style={{
                  background: 'var(--accent)',
                  width: '68%',
                }}
              />
            </div>
            <div
              className="text-ink-3 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.1em',
              }}
            >
              Yer Kaldı
            </div>
          </div>

          <div>
            <button
              onClick={onDemo}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-accent text-[#FDF8EC] font-medium hover:-translate-y-px transition-all"
              style={{
                fontSize: 16,
                boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
              }}
            >
              Erken ortak ol
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
