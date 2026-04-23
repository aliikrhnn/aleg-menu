'use client';

const COLUMNS: Array<{
  h: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    h: 'Ürün',
    links: [
      { label: 'Özellikler', href: '/#features' },
      { label: 'Fiyatlar', href: '/#pricing' },
      { label: 'Modüller', href: '/#modules' },
      { label: 'Yenilikler', href: '/yenilikler' },
      { label: 'Yol Haritası', href: '/yol-haritasi' },
    ],
  },
  {
    h: 'Şirket',
    links: [
      { label: 'Hakkımızda', href: '/hakkimizda' },
      { label: 'Blog', href: '/blog' },
      { label: 'Kariyer', href: '/kariyer' },
      { label: 'Basın Kiti', href: '/basin' },
    ],
  },
  {
    h: 'Destek',
    links: [
      { label: 'Yardım Merkezi', href: '/yardim' },
      { label: 'Dokümantasyon', href: '/dokumantasyon' },
      { label: 'İletişim', href: '/iletisim' },
      { label: 'Durum Sayfası', href: '/sistem-durumu' },
    ],
  },
  {
    h: 'Yasal',
    links: [
      { label: 'Kullanım Şartları', href: '/sartlar' },
      { label: 'Gizlilik', href: '/gizlilik' },
      { label: 'Çerezler', href: '/cerezler' },
      { label: 'KVKK', href: '/kvkk' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-[1] py-20 pb-10" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-10 mb-15" style={{ marginBottom: 60 }}>
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <h4
              className="mb-3"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--paper)',
                letterSpacing: '-0.01em',
              }}
            >
              Aleg Studio
            </h4>
            <p
              className="text-sm leading-relaxed max-w-[280px]"
              style={{
                color: 'color-mix(in srgb, var(--paper) 65%, transparent)',
              }}
            >
              İşletmen için tasarlanmış, seninle beraber büyüyen yönetim sistemi. Isparta&apos;dan
              dünyaya.
            </p>
          </div>

          {/* Columns */}
          {COLUMNS.map((col) => (
            <div key={col.h}>
              <h5
                className="uppercase mb-4 font-normal"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'color-mix(in srgb, var(--paper) 50%, transparent)',
                }}
              >
                {col.h}
              </h5>
              <ul className="flex flex-col gap-2.5 list-none">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:text-paper transition-colors"
                      style={{
                        color: 'color-mix(in srgb, var(--paper) 78%, transparent)',
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div
          className="flex justify-between items-center flex-wrap gap-5 pt-7"
          style={{
            borderTop: '1px solid color-mix(in srgb, var(--paper) 15%, transparent)',
          }}
        >
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'color-mix(in srgb, var(--paper) 55%, transparent)',
            }}
          >
            © 2026 Aleg Studio · Tüm hakları saklıdır
          </span>

          <div className="flex items-center gap-4">
            {/* Lang toggle */}
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'color-mix(in srgb, var(--paper) 70%, transparent)',
              }}
            >
              TR / EN
            </span>

            {/* Instagram handle metin */}
            <a
              href="https://instagram.com/alegstudio"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 transition-all hover:opacity-80"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'color-mix(in srgb, var(--paper) 70%, transparent)',
                textDecoration: 'none',
              }}
              aria-label="Instagram: @alegstudio"
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  background: 'var(--accent)',
                }}
              />
              @ALEGSTUDIO
            </a>

            {/* Social */}
            <div className="flex gap-2.5">
              {[
                {
                  name: 'Instagram',
                  handle: '@alegstudio',
                  url: 'https://instagram.com/alegstudio',
                  active: true,
                  d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
                },
                {
                  name: 'Twitter',
                  handle: 'Yakında',
                  url: '#',
                  active: false,
                  d: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
                },
                {
                  name: 'LinkedIn',
                  handle: 'Yakında',
                  url: '#',
                  active: false,
                  d: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z',
                },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target={s.active ? '_blank' : undefined}
                  rel={s.active ? 'noreferrer' : undefined}
                  onClick={(e) => {
                    if (!s.active) e.preventDefault();
                  }}
                  aria-label={`${s.name} — ${s.handle}`}
                  title={`${s.name} · ${s.handle}`}
                  className={`w-8 h-8 rounded-full grid place-items-center transition-all ${
                    s.active
                      ? 'hover:bg-paper hover:text-ink hover:scale-110'
                      : 'cursor-not-allowed opacity-40'
                  }`}
                  style={{
                    border: '1px solid color-mix(in srgb, var(--paper) 20%, transparent)',
                    color: 'color-mix(in srgb, var(--paper) 75%, transparent)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={s.name === 'Instagram' || s.name === 'LinkedIn' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                    <path d={s.d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
