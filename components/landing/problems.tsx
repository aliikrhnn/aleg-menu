'use client';

const PROBLEMS = [
  {
    t: 'Menü güncellemek için 4 ayrı sistem',
    d: 'QR menü, adisyon, instagram, google... Her yerde fiyat farklı. Bir ürünü değiştirmek yarım gününü alıyor.',
    icon: 'grid',
  },
  {
    t: 'Kağıt adisyon kaybolursa sipariş kaybolur',
    d: 'Masadan gelen kağıt fişler, mutfakta karışan siparişler, unutulan istekler. Müşteri hayal kırıklığı.',
    icon: 'note',
  },
  {
    t: 'Sadakat programı? O ayrı bir abonelik',
    d: 'Damga karttan uygulamaya geçmek istiyorsun ama kimse seninle konuşmadı. Her ay başka bir fatura.',
    icon: 'heart',
  },
];

export function Problems() {
  return (
    <section
      id="problems"
      className="relative z-10 reveal"
      style={{ padding: '100px 0' }}
    >
      <div className="max-w-[1280px] mx-auto px-8">
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
            Problem
          </span>
        </div>

        <h2
          className="text-ink mb-15 max-w-[860px]"
          style={{
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            fontWeight: 500,
            marginBottom: 60,
          }}
        >
          İşletmeni{' '}
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              color: 'var(--ink)',
              fontWeight: 400,
            }}
          >
            yönetmek
          </span>
          , açmaktan daha zor olmasın.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEMS.map((p, i) => (
            <div
              key={i}
              className="bg-card border border-line rounded-[14px] p-8 hover:-translate-y-1 transition-transform duration-300"
              style={{
                boxShadow: '0 1px 2px rgba(42,31,24,0.06), 0 2px 6px rgba(42,31,24,0.04)',
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-[12px] grid place-items-center mb-5"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--accent)',
                }}
              >
                <ProblemIcon name={p.icon} />
              </div>

              <h3
                className="text-ink mb-2.5"
                style={{
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                  fontWeight: 500,
                  lineHeight: 1.15,
                }}
              >
                {p.t}
              </h3>

              <p className="text-ink-2 leading-relaxed mb-4" style={{ fontSize: 15 }}>
                {p.d}
              </p>

              <a
                href="#features"
                className="text-accent uppercase inline-flex items-center gap-1 hover:gap-1.5 transition-all"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                }}
              >
                → Aleg nasıl çözüyor?
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemIcon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {name === 'grid' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {name === 'note' && (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13l2 2 4-4" />
        </>
      )}
      {name === 'heart' && (
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      )}
    </svg>
  );
}
