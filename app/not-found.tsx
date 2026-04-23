import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      data-theme="warm"
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--paper)' }}
    >
      {/* Nav */}
      <nav
        className="px-6 md:px-10 py-4 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--line)',
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Ana sayfa"
        >
          <div
            className="w-8 h-8 rounded-[7px] flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.04em',
            }}
          >
            A
          </div>
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            aleg
          </span>
        </Link>
      </nav>

      {/* İçerik */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-[560px] relative">
          {/* Dev 404 */}
          <div
            className="mb-6 relative"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(120px, 20vw, 200px)',
              fontWeight: 400,
              letterSpacing: '-0.04em',
              lineHeight: 0.85,
              color: 'var(--accent)',
              opacity: 0.9,
            }}
          >
            404
            {/* Arka efekt */}
            <span
              className="absolute inset-0 -z-10 blur-3xl opacity-40"
              aria-hidden="true"
              style={{ color: 'var(--accent)' }}
            >
              404
            </span>
          </div>

          <h1
            className="mb-4"
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 'clamp(32px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--ink)',
            }}
          >
            Burada{' '}
            <span
              style={{
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              bir şey yok.
            </span>
          </h1>

          <p
            className="mb-8 max-w-[440px] mx-auto"
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-2)',
            }}
          >
            Aradığın sayfa taşınmış, silinmiş ya da hiç olmamış olabilir.
            Başkasının kahvesini içmişsin gibi hissetme — normal bir şey.
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/"
              className="group h-11 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                boxShadow:
                  '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
              }}
            >
              <span>Ana sayfaya dön</span>
              <span
                className="transition-transform group-hover:translate-x-1"
                style={{ fontSize: 16 }}
              >
                →
              </span>
            </Link>
            <Link
              href="/yardim"
              className="h-11 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all"
              style={{
                background: 'transparent',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
              }}
            >
              Yardım merkezi
            </Link>
          </div>

          {/* Alt ipucu */}
          <div
            className="mt-12 text-xs"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              color: 'var(--ink-3)',
            }}
          >
            URL&apos;Yİ KONTROL ET · YA DA{' '}
            <a
              href="mailto:destek@alegstudio.com"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              BİZE YAZ
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
