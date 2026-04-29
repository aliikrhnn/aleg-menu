'use client';

import { forwardRef } from 'react';
import type {
  PrintableMenuData,
  PrintableMenuCategory,
  PrintableMenuProduct,
} from '@/lib/actions/printable-menu';
import {
  TEMPLATES,
  SIZES,
  type TemplateId,
  type PaperSize,
  type TemplateSpec,
} from '@/lib/printable-menu/templates';

type Props = {
  data: PrintableMenuData;
  templateId: TemplateId;
  size: PaperSize;
  qrDataUrl: string | null; // Üst seviyede generate edilir, prop olarak gelir
  scale?: number; // önizleme için ölçek (0-1), 1 = tam boyut
};

/**
 * Basılı menü dokümanı.
 * forwardRef — html-to-image / jsPDF için DOM erişimi gerekiyor.
 */
export const PrintMenuDocument = forwardRef<HTMLDivElement, Props>(
  function PrintMenuDocument(
    { data, templateId, size, qrDataUrl, scale = 1 },
    ref
  ) {
    const t = TEMPLATES[templateId];
    const s = SIZES[size];

    // mm cinsinden boyutlar - print 1mm = 3.7795px @ 96dpi
    const MM = 3.7795;
    const widthPx = s.width_mm * MM;
    const heightPx = s.height_mm * MM;

    return (
      <div
        ref={ref}
        data-print-doc
        style={{
          width: widthPx,
          height: heightPx,
          background: t.colors.paper,
          color: t.colors.ink,
          fontFamily: t.fonts.sans,
          position: 'relative',
          overflow: 'hidden',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
          boxShadow:
            scale !== 1
              ? '0 30px 60px -20px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.08)'
              : 'none',
        }}
      >
        {/* Watermark (sadece elit için) */}
        {t.style.showWatermark && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-22deg)',
              fontSize: widthPx * 0.5,
              fontFamily: t.fonts.serif,
              fontWeight: 400,
              color: t.colors.accent,
              opacity: 0.04,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {data.business.name}
          </div>
        )}

        <div
          style={{
            padding: `${t.style.pagePadding}mm`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* HEADER */}
          <Header template={t} business={data.business} />

          {/* CONTENT - kategoriler ve ürünler */}
          <div
            style={{
              flex: 1,
              marginTop: `${t.style.categoryGap}mm`,
              overflow: 'hidden',
            }}
          >
            {data.categories.map((cat, idx) => (
              <CategoryBlock
                key={cat.id}
                category={cat}
                template={t}
                isFirst={idx === 0}
                templateId={templateId}
              />
            ))}
          </div>

          {/* FOOTER - QR kod + iletişim */}
          <Footer
            template={t}
            business={data.business}
            qrUrl={data.qr_url}
            qrDataUrl={qrDataUrl}
          />
        </div>
      </div>
    );
  }
);

// ============================================================
// HEADER — şablonlara göre değişen üst bölge
// ============================================================
function Header({
  template: t,
  business,
}: {
  template: TemplateSpec;
  business: PrintableMenuData['business'];
}) {
  const align = t.style.headerStyle;
  const isCentered = align === 'centered';
  const isBadge = align === 'badge';

  return (
    <div
      style={{
        textAlign: isCentered ? 'center' : 'left',
        paddingBottom: `${t.style.categoryGap * 0.6}mm`,
        borderBottom:
          align === 'left'
            ? `1px solid ${t.colors.line}`
            : isBadge
              ? 'none'
              : `2px solid ${t.colors.accent}`,
      }}
    >
      {isBadge && (
        <div
          style={{
            display: 'inline-block',
            padding: '4mm 7mm',
            background: t.colors.accent,
            color: t.colors.paper,
            fontFamily: t.fonts.mono,
            fontSize: '8pt',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '4mm',
          }}
        >
          MENÜ
        </div>
      )}

      {!isBadge && (
        <div
          style={{
            fontFamily: t.fonts.mono,
            fontSize: '7pt',
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: t.colors.accent,
            marginBottom: '2mm',
          }}
        >
          {business.city ? `${business.city.toUpperCase()} · MENÜ` : 'MENÜ'}
        </div>
      )}

      <h1
        style={{
          fontFamily: t.fonts.serif,
          fontSize: '36pt',
          fontWeight: 400,
          fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
          color: t.colors.ink,
          marginBottom: business.tagline_tr ? '2mm' : 0,
        }}
      >
        {business.name}
      </h1>

      {business.tagline_tr && (
        <p
          style={{
            fontFamily: t.fonts.sans,
            fontSize: '10pt',
            color: t.colors.ink_soft,
            fontStyle: 'italic',
            maxWidth: isCentered ? '120mm' : 'none',
            margin: isCentered ? '0 auto' : 0,
            lineHeight: 1.4,
          }}
        >
          {business.tagline_tr}
        </p>
      )}
    </div>
  );
}

// ============================================================
// CATEGORY BLOCK
// ============================================================
function CategoryBlock({
  category,
  template: t,
  isFirst,
  templateId,
}: {
  category: PrintableMenuCategory;
  template: TemplateSpec;
  isFirst: boolean;
  templateId: TemplateId;
}) {
  if (templateId === 'modern') {
    // Modern grid: 2 sütun ürün kart
    return (
      <div
        style={{
          marginTop: isFirst ? 0 : `${t.style.categoryGap}mm`,
        }}
      >
        <CategoryHeader category={category} template={t} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: `${t.style.productGap}mm`,
            marginTop: '4mm',
          }}
        >
          {category.products.map((p) => (
            <ProductCardModern key={p.id} product={p} template={t} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: isFirst ? 0 : `${t.style.categoryGap}mm`,
      }}
    >
      <CategoryHeader category={category} template={t} />
      <div style={{ marginTop: '3mm' }}>
        {category.products.map((p, idx) => (
          <ProductRow
            key={p.id}
            product={p}
            template={t}
            isFirst={idx === 0}
            isLast={idx === category.products.length - 1}
            templateId={templateId}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CATEGORY HEADER
// ============================================================
function CategoryHeader({
  category,
  template: t,
}: {
  category: PrintableMenuCategory;
  template: TemplateSpec;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '3mm',
        paddingBottom: '1mm',
        borderBottom: `1px solid ${t.colors.line}`,
      }}
    >
      {category.hero_icon && (
        <span style={{ fontSize: '14pt' }}>{category.hero_icon}</span>
      )}
      <h2
        style={{
          fontFamily: t.fonts.serif,
          fontSize: '18pt',
          fontWeight: 400,
          fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
          letterSpacing: '-0.01em',
          color: t.colors.ink,
          lineHeight: 1.1,
          flex: 1,
        }}
      >
        {category.name}
      </h2>
      {category.description && (
        <span
          style={{
            fontFamily: t.fonts.sans,
            fontSize: '8pt',
            fontStyle: 'italic',
            color: t.colors.ink_muted,
          }}
        >
          {category.description}
        </span>
      )}
    </div>
  );
}

// ============================================================
// PRODUCT ROW (klasik tek satır)
// ============================================================
function ProductRow({
  product,
  template: t,
  isFirst,
  templateId,
}: {
  product: PrintableMenuProduct;
  template: TemplateSpec;
  isFirst: boolean;
  isLast: boolean;
  templateId: TemplateId;
}) {
  return (
    <div
      style={{
        marginTop: isFirst ? '2mm' : `${t.style.productGap}mm`,
        display: 'flex',
        alignItems: 'baseline',
        gap: '3mm',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm' }}>
          {product.is_featured && templateId !== 'minimal' && (
            <span
              style={{
                fontSize: '8pt',
                color: t.colors.accent,
                lineHeight: 1,
              }}
            >
              ★
            </span>
          )}
          <h3
            style={{
              fontFamily: t.fonts.sans,
              fontSize: '11pt',
              fontWeight: 600,
              color: t.colors.ink,
              letterSpacing: '0.005em',
              lineHeight: 1.2,
            }}
          >
            {product.name}
          </h3>

          {/* Dot leaders */}
          {t.style.showDotLeaders && (
            <span
              aria-hidden
              style={{
                flex: 1,
                borderBottom: `1px dotted ${t.colors.ink_muted}`,
                marginBottom: '3px',
                opacity: 0.55,
                minWidth: '8mm',
              }}
            />
          )}
        </div>
        {product.description && (
          <p
            style={{
              fontFamily: t.fonts.sans,
              fontSize: '8.5pt',
              color: t.colors.ink_soft,
              lineHeight: 1.4,
              marginTop: '0.5mm',
              fontStyle: 'italic',
            }}
          >
            {product.description}
          </p>
        )}
      </div>
      <div
        style={{
          fontFamily: t.fonts.mono,
          fontSize: '11pt',
          fontWeight: 700,
          color: t.colors.ink,
          letterSpacing: '0.04em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        ₺{product.price.toLocaleString('tr-TR')}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT CARD (modern grid)
// ============================================================
function ProductCardModern({
  product,
  template: t,
}: {
  product: PrintableMenuProduct;
  template: TemplateSpec;
}) {
  return (
    <div
      style={{
        padding: '4mm 4mm 3mm 4mm',
        background: t.colors.surface,
        border: `1px solid ${t.colors.line}`,
        borderRadius: `${t.style.radius}mm`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '2mm',
          marginBottom: '1.5mm',
        }}
      >
        <h3
          style={{
            fontFamily: t.fonts.sans,
            fontSize: '10pt',
            fontWeight: 600,
            color: t.colors.ink,
            lineHeight: 1.2,
            flex: 1,
          }}
        >
          {product.name}
        </h3>
        <div
          style={{
            fontFamily: t.fonts.mono,
            fontSize: '10pt',
            fontWeight: 700,
            color: t.colors.accent,
          }}
        >
          ₺{product.price.toLocaleString('tr-TR')}
        </div>
      </div>
      {product.description && (
        <p
          style={{
            fontFamily: t.fonts.sans,
            fontSize: '7.5pt',
            color: t.colors.ink_muted,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {product.description}
        </p>
      )}
    </div>
  );
}

// ============================================================
// FOOTER — QR kod ve iletişim
// ============================================================
function Footer({
  template: t,
  business,
  qrUrl,
  qrDataUrl,
}: {
  template: TemplateSpec;
  business: PrintableMenuData['business'];
  qrUrl: string;
  qrDataUrl: string | null;
}) {
  const frame = t.style.qrFrame;

  return (
    <div
      style={{
        marginTop: `${t.style.categoryGap}mm`,
        paddingTop: `${t.style.categoryGap * 0.7}mm`,
        borderTop: `1px solid ${t.colors.line}`,
        display: 'flex',
        alignItems: 'center',
        gap: '6mm',
      }}
    >
      {/* QR */}
      <div style={{ flexShrink: 0 }}>
        <QRBlock qrDataUrl={qrDataUrl} frame={frame} template={t} />
      </div>

      {/* Sağda CTA + iletişim */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: t.fonts.mono,
            fontSize: '7pt',
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: t.colors.accent,
            marginBottom: '1mm',
          }}
        >
          DİJİTAL MENÜ
        </div>
        <h3
          style={{
            fontFamily: t.fonts.serif,
            fontSize: '15pt',
            fontWeight: 400,
            fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
            letterSpacing: '-0.01em',
            color: t.colors.ink,
            lineHeight: 1.1,
            marginBottom: '1.5mm',
          }}
        >
          QR&apos;ı tara, masandan sipariş ver
        </h3>
        <div
          style={{
            fontFamily: t.fonts.mono,
            fontSize: '8pt',
            color: t.colors.ink_soft,
            letterSpacing: '0.04em',
          }}
        >
          {qrUrl.replace(/^https?:\/\//, '')}
        </div>

        {/* Alt iletişim */}
        {(business.phone || business.instagram) && (
          <div
            style={{
              marginTop: '3mm',
              fontFamily: t.fonts.sans,
              fontSize: '8pt',
              color: t.colors.ink_muted,
              display: 'flex',
              gap: '4mm',
              flexWrap: 'wrap',
            }}
          >
            {business.phone && <span>☎ {business.phone}</span>}
            {business.instagram && <span>@ {business.instagram}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// QR BLOCK (varyantlar)
// ============================================================
function QRBlock({
  qrDataUrl,
  frame,
  template: t,
}: {
  qrDataUrl: string | null;
  frame: TemplateSpec['style']['qrFrame'];
  template: TemplateSpec;
}) {
  const SIZE_MM = 28;
  const sizePx = SIZE_MM * 3.7795;

  if (!qrDataUrl) {
    // QR henüz oluşmadıysa boş yer tut
    return (
      <div
        style={{
          width: `${SIZE_MM}mm`,
          height: `${SIZE_MM}mm`,
          background: t.colors.line,
        }}
      />
    );
  }

  if (frame === 'bordered') {
    return (
      <div
        style={{
          padding: '2.5mm',
          border: `1px solid ${t.colors.accent}`,
          background: '#fff',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR"
          width={sizePx}
          height={sizePx}
          style={{ display: 'block' }}
        />
      </div>
    );
  }

  if (frame === 'badge') {
    return (
      <div
        style={{
          padding: '3mm',
          background: t.colors.surface || '#fff',
          border: `1px solid ${t.colors.line}`,
          borderRadius: `${t.style.radius}mm`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR"
          width={sizePx}
          height={sizePx}
          style={{ display: 'block' }}
        />
      </div>
    );
  }

  if (frame === 'corner') {
    // Vintage: köşe süsleme
    return (
      <div style={{ position: 'relative', padding: '3mm' }}>
        {[
          { top: 0, left: 0, transform: 'rotate(0deg)' },
          { top: 0, right: 0, transform: 'rotate(90deg)' },
          { bottom: 0, right: 0, transform: 'rotate(180deg)' },
          { bottom: 0, left: 0, transform: 'rotate(270deg)' },
        ].map((corner, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              width: '6mm',
              height: '6mm',
              borderTop: `1px solid ${t.colors.accent}`,
              borderLeft: `1px solid ${t.colors.accent}`,
              ...corner,
            }}
          />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR"
          width={sizePx}
          height={sizePx}
          style={{ display: 'block', background: '#fff' }}
        />
      </div>
    );
  }

  // plain
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrDataUrl}
      alt="QR"
      width={sizePx}
      height={sizePx}
      style={{ display: 'block' }}
    />
  );
}
