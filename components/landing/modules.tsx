'use client';

const MODULES = [
  { name: 'QR Menü', desc: 'Her planda dahil', on: true },
  { name: 'POS & Adisyon', desc: 'Her planda dahil', on: true },
  { name: 'Mutfak Ekranı', desc: 'Her planda dahil', on: true },
  { name: 'Sadakat Programı', desc: 'Eklenti · Pro+', on: false },
  { name: 'Paket Servis', desc: 'Eklenti · Pro+', on: false },
  { name: 'Stok Takibi', desc: 'Eklenti · Pro+', on: false },
  { name: 'Vardiya Planı', desc: 'Eklenti · Kurumsal', on: false },
  { name: 'Çoklu Şube', desc: 'Eklenti · Kurumsal', on: false },
  { name: 'Özel Domain', desc: 'Eklenti · Kurumsal', on: false },
];

export function Modules() {
  return (
    <section
      id="modules"
      className="relative z-10"
      style={{ padding: '120px 0' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
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
            Modüller
          </span>
        </div>

        <h2
          className="text-ink mb-3"
          style={{
            fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          İhtiyacın kadar,{' '}
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            ihtiyaç olunca.
          </span>
        </h2>

        <p
          className="text-ink-2 max-w-[620px] mb-12"
          style={{ fontSize: 17, lineHeight: 1.55 }}
        >
          Modüler yapı — her işletmenin ihtiyacı farklı. Başlangıçta QR menü yeter, büyüdükçe aç.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {MODULES.map((m, i) => (
            <div
              key={i}
              className="bg-card border border-line rounded-[14px] px-5 py-5 flex items-center gap-3.5 hover:-translate-y-0.5 transition-all"
              style={{
                boxShadow: '0 1px 2px rgba(42,31,24,0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(42,31,24,0.06)';
              }}
            >
              <div
                className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0"
                style={{
                  background: m.on ? 'var(--accent)' : 'var(--paper-2)',
                  color: m.on ? 'var(--paper)' : 'var(--ink-3)',
                  border: m.on ? '1px solid var(--accent)' : '1px solid var(--line)',
                }}
              >
                {m.on ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-[15px] font-medium">{m.name}</div>
                <div
                  className="text-ink-3 mt-0.5"
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.06em' }}
                >
                  {m.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
