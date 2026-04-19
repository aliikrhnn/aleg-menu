'use client';

interface FinalCTAProps {
  onDemo: () => void;
}

export function FinalCTA({ onDemo }: FinalCTAProps) {
  return (
    <section
      id="contact"
      className="text-center relative z-10"
      style={{ padding: '140px 0' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        <h2
          style={{
            fontSize: 'clamp(96px, 14vw, 220px)',
            lineHeight: 0.9,
            letterSpacing: '-0.04em',
            fontWeight: 500,
            color: 'var(--ink)',
            fontFamily: 'var(--f-sans)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              color: 'var(--accent)',
              fontWeight: 400,
            }}
          >
            Başlayalım.
          </span>
        </h2>

        <p
          className="text-ink-2 max-w-[520px] mx-auto leading-relaxed"
          style={{
            fontSize: 19,
            margin: '28px auto 38px',
          }}
        >
          14 günlük ücretsiz denemeyle başla. Hiçbir şey ödemeden tüm özellikleri dene.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={onDemo}
            className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-accent text-[#FDF8EC] font-medium hover:-translate-y-px transition-all"
            style={{
              fontSize: 16,
              boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
            }}
          >
            Demo Talep Et
          </button>
          <a
            href="https://panel.alegstudio.com"
            className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full border border-line text-ink hover:bg-paper-2 hover:border-ink-3 transition-all"
            style={{ fontSize: 16 }}
          >
            Hemen Giriş Yap
          </a>
        </div>

        <p
          className="text-ink-3 mt-7"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
          }}
        >
          Sorularını 7/24{' '}
          <a
            href="https://wa.me/905000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="text-olive hover:underline"
          >
            WhatsApp
          </a>
          &apos;tan da sorabilirsin
        </p>
      </div>
    </section>
  );
}
