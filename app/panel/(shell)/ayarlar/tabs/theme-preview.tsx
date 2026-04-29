'use client';

import type { ThemeDefinition } from '@/lib/menu-themes';

type Props = {
  theme: ThemeDefinition;
  businessName: string;
};

const SAMPLE_PRODUCTS = [
  { name: 'Türk Kahvesi', price: 65, description: 'Geleneksel, lokum ile' },
  { name: 'Flat White', price: 95, description: 'Çift shot espresso, mikro köpük' },
  { name: 'Cappuccino', price: 85, description: 'Dengelenmiş klasik' },
];

const SAMPLE_DESSERTS = [
  { name: 'Cheesecake', price: 120, description: 'Frambuazlı, ev yapımı' },
  { name: 'Brownie', price: 95, description: 'Sıcak, vanilyalı dondurma ile' },
];

export function ThemePreview({ theme, businessName }: Props) {
  const c = theme.colors;
  const f = theme.fonts;
  const r = theme.radius;

  return (
    <div className="rounded-[var(--r)] overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      {/* Toolbar */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="block w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
            <span className="block w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
            <span className="block w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <span
            className="ml-3 text-[11px]"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
            }}
          >
            {businessName.toLowerCase().replace(/\s+/g, '')}.alegstudio.com
          </span>
        </div>
        <span
          className="text-[10px] uppercase font-bold"
          style={{
            fontFamily: 'var(--f-mono)',
            color: 'var(--ink-3)',
            letterSpacing: '0.14em',
          }}
        >
          {theme.name}
        </span>
      </div>

      {/* Mock menu - gerçek tema rengiyle */}
      <div
        className="p-6"
        style={{
          background: c.paper,
          color: c.ink,
          fontFamily: f.sans,
          minHeight: 600,
        }}
      >
        {/* Hero */}
        <div className="mb-6">
          <div
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: c.accent,
              textTransform: theme.uppercaseEyebrows ? 'uppercase' : 'none',
              marginBottom: 8,
            }}
          >
            Hoş geldiniz · MENÜ
          </div>
          <h1
            style={{
              fontFamily: f.serif,
              fontSize: 48,
              fontWeight: 400,
              fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
              letterSpacing: theme.letterSpacingHeadings,
              lineHeight: 1.05,
              color: c.ink,
              marginBottom: 12,
            }}
          >
            {businessName}
          </h1>
          <p
            style={{
              fontFamily: f.sans,
              fontSize: 14,
              color: c.ink2,
              lineHeight: 1.5,
              maxWidth: 480,
            }}
          >
            Akşam serinliğinde sıcak bir Türk kahvesi, eve dönerken bir cheesecake.
          </p>
        </div>

        {/* CTA - sipariş ver butonu */}
        <button
          type="button"
          disabled
          className="mb-8 inline-flex items-center gap-2 px-5 py-2.5 transition-opacity"
          style={{
            background: c.accent,
            color: c.accentInk,
            fontFamily: f.mono,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderRadius: r.base,
            cursor: 'default',
          }}
        >
          Masadan sipariş ver
          <span style={{ fontSize: 14 }}>→</span>
        </button>

        {/* Kategori 1 */}
        <SectionDivider theme={theme} title="Kahveler" subtitle="3 ürün" />
        <div className="space-y-3 mt-3 mb-6">
          {SAMPLE_PRODUCTS.map((p) => (
            <ProductRow key={p.name} product={p} theme={theme} />
          ))}
        </div>

        {/* Kategori 2 */}
        <SectionDivider theme={theme} title="Tatlılar" subtitle="2 ürün" />
        <div className="space-y-3 mt-3">
          {SAMPLE_DESSERTS.map((p) => (
            <ProductRow key={p.name} product={p} theme={theme} />
          ))}
        </div>

        {/* Footer minik */}
        <div
          className="mt-8 pt-4 text-center"
          style={{
            borderTop: `1px solid ${c.line}`,
            fontFamily: f.mono,
            fontSize: 10,
            color: c.ink3,
            letterSpacing: '0.12em',
            textTransform: theme.uppercaseEyebrows ? 'uppercase' : 'none',
          }}
        >
          Aleg ile güçlendirildi
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION DIVIDER (kategori başlığı)
// ============================================================
function SectionDivider({
  theme,
  title,
  subtitle,
}: {
  theme: ThemeDefinition;
  title: string;
  subtitle: string;
}) {
  const c = theme.colors;
  const f = theme.fonts;
  return (
    <div
      className="flex items-baseline gap-3 pb-2"
      style={{ borderBottom: `1px solid ${c.line}` }}
    >
      <h2
        style={{
          fontFamily: f.serif,
          fontSize: 28,
          fontWeight: 400,
          fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
          letterSpacing: theme.letterSpacingHeadings,
          color: c.ink,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      <span
        style={{
          fontFamily: f.mono,
          fontSize: 10,
          fontWeight: 700,
          color: c.ink3,
          letterSpacing: '0.16em',
          textTransform: theme.uppercaseEyebrows ? 'uppercase' : 'none',
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}

// ============================================================
// PRODUCT ROW
// ============================================================
function ProductRow({
  product,
  theme,
}: {
  product: { name: string; price: number; description: string };
  theme: ThemeDefinition;
}) {
  const c = theme.colors;
  const f = theme.fonts;
  return (
    <div className="flex items-baseline gap-3">
      <div className="flex-1 min-w-0">
        <div
          style={{
            fontFamily: f.sans,
            fontSize: 15,
            fontWeight: 600,
            color: c.ink,
            marginBottom: 2,
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            fontFamily: f.sans,
            fontSize: 12,
            color: c.ink3,
            lineHeight: 1.4,
          }}
        >
          {product.description}
        </div>
      </div>
      <div
        style={{
          fontFamily: f.mono,
          fontSize: 13,
          fontWeight: 700,
          color: c.ink,
          letterSpacing: '0.04em',
        }}
      >
        ₺{product.price}
      </div>
    </div>
  );
}
