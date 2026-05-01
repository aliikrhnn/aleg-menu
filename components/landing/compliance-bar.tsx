'use client';

/**
 * ComplianceBar — Tarım ve Orman Bakanlığı yönetmeliği uyumu vurgusu
 *
 * Hero'nun hemen altına ince bir trust şeridi olarak yerleşir.
 * Yeni gelen yönetmelik (1 Temmuz 2026) işletmeler için zorunlu —
 * Aleg'in büyük satış argümanı: "AI ile saniyeler içinde uyum".
 */
export function ComplianceBar() {
  return (
    <section
      className="relative z-10 reveal"
      style={{
        padding: '28px 0',
        background:
          'linear-gradient(90deg, color-mix(in srgb, var(--accent) 6%, var(--paper)), var(--paper) 50%, color-mix(in srgb, var(--accent) 6%, var(--paper)))',
        borderTop: '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
        borderBottom: '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap text-center">
          {/* Bayrak/rozet */}
          <div
            className="inline-flex items-center gap-2 flex-shrink-0"
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 13 }}>🇹🇷</span>
            <span>YASAL UYUM</span>
          </div>

          {/* Mesaj */}
          <p
            className="text-ink"
            style={{
              fontSize: 'clamp(14px, 1.6vw, 17px)',
              lineHeight: 1.45,
              fontWeight: 400,
              letterSpacing: '-0.005em',
              maxWidth: 720,
            }}
          >
            <strong style={{ fontWeight: 600 }}>
              1 Temmuz 2026 Tarım ve Orman Bakanlığı yönetmeliğine
            </strong>{' '}
            tam uyum —{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              alerjen, kalori ve içerik bilgileri AI ile saniyeler içinde.
            </span>
          </p>

          {/* Detay linki */}
          <a
            href="#ai-compliance"
            className="inline-flex items-center gap-1.5 flex-shrink-0 transition-opacity hover:opacity-70"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontWeight: 600,
              color: 'var(--accent)',
              textTransform: 'uppercase',
            }}
          >
            <span>Nasıl Çalışır</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
