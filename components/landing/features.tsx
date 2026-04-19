'use client';

const FEATURES = [
  { num: '01', kind: 'qr', t: 'QR Menü & Sipariş', d: 'Müşteriler masadan QR ile sipariş verir. Ödeme dahil.' },
  { num: '02', kind: 'pos', t: 'POS & Adisyon', d: 'Masalar, hesaplar, indirimler — karışıklık yok.' },
  { num: '03', kind: 'kds', t: 'Mutfak Ekranı (KDS)', d: 'Siparişler anında bara ve mutfağa düşer.' },
  { num: '04', kind: 'loy', t: 'Sadakat Programı', d: 'Puan kazan, puan harca. Otomatik kampanyalar.' },
  { num: '05', kind: 'del', t: 'Paket Servis', d: 'Çağrı geldiğinde müşteri kim olduğunu görür.' },
  { num: '06', kind: 'mul', t: 'Çoklu Şube', d: 'Bir panelden tüm şubelerini yönet.' },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative z-10"
      style={{ padding: '100px 0', background: 'var(--paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        {/* Head */}
        <div className="mb-15 max-w-[720px]" style={{ marginBottom: 60 }}>
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
              Platform · 6 Çekirdek Modül
            </span>
          </div>

          <h2
            className="text-ink mb-4"
            style={{
              fontSize: 'clamp(42px, 5vw, 68px)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            Tek çatı altında,{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              her şey.
            </span>
          </h2>

          <p style={{ fontSize: 17, maxWidth: 520 }} className="text-ink-2 leading-relaxed">
            Ayrı ayrı abonelikler, eşleşmeyen sistemler, çakışan veriler yok. Aleg çekirdekten tek
            bir ürün.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-card border border-line rounded-[14px] p-6 cursor-pointer hover:-translate-y-1 transition-all duration-300 group"
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
              <FeaturePreview kind={f.kind} />

              <span
                className="text-ink-3 block mb-2.5 mt-5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                }}
              >
                {f.num}
              </span>

              <h3
                className="text-ink mb-2"
                style={{
                  fontSize: 20,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  fontWeight: 500,
                }}
              >
                {f.t}
              </h3>

              <p className="text-ink-2 mb-3.5" style={{ fontSize: 14.5 }}>
                {f.d}
              </p>

              <a
                href="#"
                className="text-accent uppercase inline-flex items-center gap-1 group-hover:gap-1.5 transition-all"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                }}
              >
                Detaylar →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Her özelliğin mini önizlemesi
// ============================================================
function FeaturePreview({ kind }: { kind: string }) {
  const baseClass = 'rounded-lg mb-5 relative overflow-hidden';

  if (kind === 'qr') {
    return (
      <div
        className={baseClass}
        style={{
          height: 140,
          background: 'var(--paper)',
          padding: 16,
        }}
      >
        <div className="flex justify-between items-center mb-2.5">
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 16,
            }}
          >
            Menü
          </div>
          <div
            className="text-ink-3"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.1em' }}
          >
            MASA 14
          </div>
        </div>
        {[
          { name: 'Flat White', price: '₺85' },
          { name: 'Croissant', price: '₺65' },
          { name: 'Cold Brew', price: '₺95' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-1.5"
            style={{
              borderTop: '1px solid var(--line)',
              fontSize: 12,
            }}
          >
            <span>{item.name}</span>
            <span className="text-ink-3">{item.price}</span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'pos') {
    return (
      <div
        className={baseClass}
        style={{
          height: 140,
          background: 'var(--paper-2)',
          padding: 14,
        }}
      >
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded text-center border"
              style={{
                background: i === 3 ? 'var(--accent)' : 'var(--card)',
                color: i === 3 ? 'var(--paper)' : 'var(--ink)',
                borderColor: 'var(--line)',
                fontSize: 9,
                padding: '12px 4px',
              }}
            >
              M{i + 1}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'kds') {
    return (
      <div
        className={baseClass}
        style={{
          height: 140,
          background: 'var(--ink)',
          padding: 14,
          color: 'var(--paper)',
        }}
      >
        {[
          { text: '#1284 · 2 dk', accent: false },
          { text: '#1285 · HAZIRLANIYOR', accent: false },
          { text: '#1286 · YENİ', accent: true },
        ].map((item, i) => (
          <div
            key={i}
            className="py-2 px-2.5"
            style={{
              borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: item.accent ? 'var(--accent)' : 'var(--paper)',
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'loy') {
    return (
      <div
        className={baseClass}
        style={{
          height: 140,
          background: 'var(--paper)',
          padding: 14,
        }}
      >
        <div className="text-center pt-2">
          <div
            className="text-ink-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
            }}
          >
            PUAN
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 42,
              color: 'var(--accent)',
              margin: '4px 0',
              lineHeight: 1,
            }}
          >
            1,240
          </div>
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{
                  background: i < 3 ? 'var(--accent)' : 'var(--line)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'del') {
    return (
      <div
        className={baseClass}
        style={{
          height: 140,
          background: 'var(--paper-3)',
          padding: 14,
        }}
      >
        <div
          className="flex items-center gap-2.5 p-2.5 rounded mb-1.5"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <div
            className="w-7 h-7 rounded-full grid place-items-center text-paper font-medium"
            style={{
              background: 'var(--accent)',
              fontSize: 10,
            }}
          >
            EY
          </div>
          <div>
            <div className="font-medium" style={{ fontSize: 12 }}>
              Elif Yılmaz
            </div>
            <div
              className="text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.06em',
              }}
            >
              0532 ●●● ●● 42
            </div>
          </div>
        </div>
        <div
          className="text-center text-ink-3 mt-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.1em',
          }}
        >
          12. ZİYARET · BEŞİKTAŞ
        </div>
      </div>
    );
  }

  if (kind === 'mul') {
    return (
      <div
        className={baseClass}
        style={{
          height: 140,
          background: 'var(--paper-2)',
          padding: 14,
        }}
      >
        {['Kadıköy Şube', 'Beşiktaş Şube', 'Bodrum Yaz'].map((branch, i) => (
          <div
            key={i}
            className="flex justify-between items-center px-3 py-2.5 rounded mb-1"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              fontSize: 12,
            }}
          >
            <span>{branch}</span>
            <span
              className="text-olive"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
              }}
            >
              ● AKTİF
            </span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
