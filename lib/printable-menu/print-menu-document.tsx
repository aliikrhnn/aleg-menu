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
  DIETARY_TAG_INFO,
  type TemplateId,
  type PaperSize,
  type TemplateSpec,
  type HeaderVariant,
  type FooterVariant,
} from '@/lib/printable-menu/templates';

type Props = {
  data: PrintableMenuData;
  templateId: TemplateId;
  size: PaperSize;
  qrDataUrl: string | null;
  logoDataUrl: string | null; // Server-side fetch edildi
  headerVariant: HeaderVariant;
  footerVariant: FooterVariant;
  showDietaryTags: boolean;
  showSinceBadge: boolean;
  customSignature: string;
  scale?: number;
  // Çoklu sayfa için
  pageCategories?: PrintableMenuCategory[]; // Sadece bu sayfada gösterilecek kategoriler
  pageNumber?: number;
  totalPages?: number;
};

const MM = 3.7795;

export const PrintMenuDocument = forwardRef<HTMLDivElement, Props>(
  function PrintMenuDocument(
    {
      data,
      templateId,
      size,
      qrDataUrl,
      logoDataUrl,
      headerVariant,
      footerVariant,
      showDietaryTags,
      showSinceBadge,
      customSignature,
      scale = 1,
      pageCategories,
      pageNumber,
      totalPages,
    },
    ref
  ) {
    const t = TEMPLATES[templateId];
    const s = SIZES[size];
    const widthPx = s.width_mm * MM;
    const heightPx = s.height_mm * MM;

    const cats = pageCategories || data.categories;
    const isMultiPage = (totalPages || 1) > 1;
    const isFirstPage = !pageNumber || pageNumber === 1;
    const isLastPage = !pageNumber || pageNumber === (totalPages || 1);

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
        {/* Watermark (elite) */}
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

        {/* Köşe süslemeleri (vintage) */}
        {templateId === 'vintage' && (
          <>
            <CornerOrnament position="tl" t={t} />
            <CornerOrnament position="tr" t={t} />
            <CornerOrnament position="bl" t={t} />
            <CornerOrnament position="br" t={t} />
          </>
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
          {/* HEADER - sadece ilk sayfada */}
          {isFirstPage && (
            <Header
              t={t}
              business={data.business}
              variant={headerVariant}
              logoDataUrl={logoDataUrl}
              showSinceBadge={showSinceBadge}
            />
          )}

          {/* MULTI-PAGE indicator */}
          {isMultiPage && !isFirstPage && (
            <div
              style={{
                fontFamily: t.fonts.mono,
                fontSize: '8pt',
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: t.colors.accent,
                textTransform: 'uppercase',
                textAlign: 'center',
                paddingBottom: '4mm',
                borderBottom: `1px solid ${t.colors.line}`,
                marginBottom: '4mm',
              }}
            >
              {data.business.name} — Sayfa {pageNumber} / {totalPages}
            </div>
          )}

          {/* CONTENT */}
          <div
            style={{
              flex: 1,
              marginTop: isFirstPage ? `${t.style.categoryGap}mm` : 0,
              overflow: 'hidden',
            }}
          >
            {cats.map((cat, idx) => (
              <CategoryBlock
                key={cat.id}
                category={cat}
                template={t}
                isFirst={idx === 0}
                templateId={templateId}
                size={s}
                showDietaryTags={showDietaryTags}
              />
            ))}
          </div>

          {/* FOOTER - sadece son sayfada */}
          {isLastPage && (
            <Footer
              t={t}
              business={data.business}
              qrUrl={data.qr_url}
              qrDataUrl={qrDataUrl}
              variant={footerVariant}
              customSignature={customSignature}
            />
          )}

          {/* MULTI-PAGE alt bilgi */}
          {isMultiPage && !isLastPage && (
            <div
              style={{
                fontFamily: t.fonts.mono,
                fontSize: '7pt',
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: t.colors.ink_muted,
                textTransform: 'uppercase',
                textAlign: 'center',
                paddingTop: '3mm',
                borderTop: `1px solid ${t.colors.line}`,
                marginTop: '3mm',
              }}
            >
              Devamı sonraki sayfada →
            </div>
          )}
        </div>
      </div>
    );
  }
);

// ============================================================
// HEADER - 3 varyant
// ============================================================
function Header({
  t,
  business,
  variant,
  logoDataUrl,
  showSinceBadge,
}: {
  t: TemplateSpec;
  business: PrintableMenuData['business'];
  variant: HeaderVariant;
  logoDataUrl: string | null;
  showSinceBadge: boolean;
}) {
  const hasLogo = !!logoDataUrl;

  if (variant === 'monogram') {
    // Büyük baş harf monogram + ad altta
    return (
      <div
        style={{
          textAlign: 'center',
          paddingBottom: `${t.style.categoryGap * 0.7}mm`,
          borderBottom: `2px solid ${t.colors.accent}`,
        }}
      >
        <div
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: '24mm',
            height: '24mm',
            border: `2px solid ${t.colors.accent}`,
            borderRadius: '50%',
            margin: '0 auto 6mm',
            fontFamily: t.fonts.serif,
            fontSize: '40pt',
            fontWeight: 400,
            fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
            color: t.colors.ink,
            lineHeight: 1,
          }}
        >
          {business.name.charAt(0).toUpperCase()}
        </div>
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
        <h1
          style={{
            fontFamily: t.fonts.serif,
            fontSize: '32pt',
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
              maxWidth: '120mm',
              margin: '0 auto',
              lineHeight: 1.4,
            }}
          >
            {business.tagline_tr}
          </p>
        )}
        {showSinceBadge && (
          <div style={{ marginTop: '4mm' }}>
            <SinceBadge t={t} year={business.created_year} />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'split') {
    // Sol logo, sağ ad+slogan
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8mm',
          paddingBottom: `${t.style.categoryGap * 0.7}mm`,
          borderBottom: `1px solid ${t.colors.line}`,
        }}
      >
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoDataUrl!}
            alt={business.name}
            style={{
              width: '24mm',
              height: '24mm',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '24mm',
              height: '24mm',
              border: `2px solid ${t.colors.accent}`,
              borderRadius: '50%',
              fontFamily: t.fonts.serif,
              fontSize: '24pt',
              fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
              color: t.colors.ink,
              flexShrink: 0,
            }}
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: t.fonts.mono,
              fontSize: '7pt',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: t.colors.accent,
              marginBottom: '1.5mm',
            }}
          >
            {business.city ? business.city.toUpperCase() : 'MENÜ'}
          </div>
          <h1
            style={{
              fontFamily: t.fonts.serif,
              fontSize: '30pt',
              fontWeight: 400,
              fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: t.colors.ink,
              marginBottom: business.tagline_tr ? '1.5mm' : 0,
            }}
          >
            {business.name}
          </h1>
          {business.tagline_tr && (
            <p
              style={{
                fontFamily: t.fonts.sans,
                fontSize: '9.5pt',
                color: t.colors.ink_soft,
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              {business.tagline_tr}
            </p>
          )}
        </div>
        {showSinceBadge && <SinceBadge t={t} year={business.created_year} />}
      </div>
    );
  }

  // 'centered' (default)
  return (
    <div
      style={{
        textAlign: 'center',
        paddingBottom: `${t.style.categoryGap * 0.7}mm`,
        borderBottom: `2px solid ${t.colors.accent}`,
      }}
    >
      {hasLogo && (
        <div style={{ marginBottom: '4mm' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl!}
            alt={business.name}
            style={{
              maxWidth: '32mm',
              maxHeight: '20mm',
              objectFit: 'contain',
              margin: '0 auto',
              display: 'block',
            }}
          />
        </div>
      )}
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
            maxWidth: '120mm',
            margin: '0 auto',
            lineHeight: 1.4,
          }}
        >
          {business.tagline_tr}
        </p>
      )}
      {showSinceBadge && (
        <div style={{ marginTop: '4mm' }}>
          <SinceBadge t={t} year={business.created_year} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SINCE BADGE
// ============================================================
function SinceBadge({ t, year }: { t: TemplateSpec; year: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2mm',
        padding: '1.5mm 4mm',
        border: `1px solid ${t.colors.accent}`,
        fontFamily: t.fonts.mono,
        fontSize: '7pt',
        fontWeight: 700,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color: t.colors.accent,
      }}
    >
      <span style={{ opacity: 0.7 }}>SINCE</span>
      <span>{year}</span>
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
  size,
  showDietaryTags,
}: {
  category: PrintableMenuCategory;
  template: TemplateSpec;
  isFirst: boolean;
  templateId: TemplateId;
  size: { width_mm: number; height_mm: number; isLandscape: boolean };
  showDietaryTags: boolean;
}) {
  // Yatay layout veya modern grid → 2 sütun
  const useGrid =
    templateId === 'modern' ||
    (size.isLandscape && templateId !== 'minimal');

  if (useGrid) {
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
            <ProductCard
              key={p.id}
              product={p}
              template={t}
              showDietaryTags={showDietaryTags}
            />
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
            templateId={templateId}
            showDietaryTags={showDietaryTags}
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
// PRODUCT ROW (klasik liste)
// ============================================================
function ProductRow({
  product,
  template: t,
  isFirst,
  templateId,
  showDietaryTags,
}: {
  product: PrintableMenuProduct;
  template: TemplateSpec;
  isFirst: boolean;
  templateId: TemplateId;
  showDietaryTags: boolean;
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
          {/* Şefin önerisi rozeti */}
          {product.is_chef_recommend && templateId !== 'minimal' && (
            <ChefBadge t={t} />
          )}
          {/* Featured (yıldız) */}
          {product.is_featured &&
            !product.is_chef_recommend &&
            templateId !== 'minimal' && (
              <span
                style={{
                  fontSize: '8pt',
                  color: t.colors.accent,
                  lineHeight: 1,
                }}
              >
                {t.ornamentChar}
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

          {/* Acılık derecesi */}
          {product.spicy_level > 0 && <SpicyMark level={product.spicy_level} />}

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

        {/* Dietary tags */}
        {showDietaryTags && product.dietary_tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '2mm',
              marginTop: '1mm',
              flexWrap: 'wrap',
            }}
          >
            {product.dietary_tags.map((tag) => (
              <DietaryBadge key={tag} tag={tag} t={t} />
            ))}
          </div>
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
// PRODUCT CARD (modern grid + landscape)
// ============================================================
function ProductCard({
  product,
  template: t,
  showDietaryTags,
}: {
  product: PrintableMenuProduct;
  template: TemplateSpec;
  showDietaryTags: boolean;
}) {
  return (
    <div
      style={{
        padding: '4mm 4mm 3mm 4mm',
        background: t.colors.surface || 'transparent',
        border: t.style.showProductBorders
          ? `1px solid ${t.colors.line}`
          : 'none',
        borderRadius: `${t.style.radius}mm`,
        position: 'relative',
      }}
    >
      {product.is_chef_recommend && (
        <div style={{ position: 'absolute', top: 4, right: 4 }}>
          <ChefBadge t={t} small />
        </div>
      )}
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
            display: 'flex',
            alignItems: 'baseline',
            gap: '2mm',
          }}
        >
          {product.name}
          {product.spicy_level > 0 && (
            <SpicyMark level={product.spicy_level} />
          )}
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
            fontStyle: 'italic',
          }}
        >
          {product.description}
        </p>
      )}
      {showDietaryTags && product.dietary_tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '1.5mm',
            marginTop: '1.5mm',
            flexWrap: 'wrap',
          }}
        >
          {product.dietary_tags.map((tag) => (
            <DietaryBadge key={tag} tag={tag} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CHEF BADGE - şefin önerisi
// ============================================================
function ChefBadge({ t, small }: { t: TemplateSpec; small?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.7mm',
        padding: small ? '0.5mm 1.5mm' : '0.7mm 2mm',
        background: t.colors.chef,
        color: t.colors.paper,
        fontFamily: t.fonts.mono,
        fontSize: small ? '5.5pt' : '6.5pt',
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        borderRadius: t.style.radius > 0 ? `${t.style.radius}mm` : 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: small ? '6pt' : '7pt' }}>{t.chefMark}</span>
      ŞEFİN
    </span>
  );
}

// ============================================================
// DIETARY BADGE
// ============================================================
function DietaryBadge({
  tag,
  t,
}: {
  tag: string;
  t: TemplateSpec;
}) {
  const info = DIETARY_TAG_INFO[tag];
  if (!info) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.7mm',
        padding: '0.5mm 1.5mm',
        background: `color-mix(in srgb, ${info.color} 14%, transparent)`,
        color: info.color,
        fontFamily: t.fonts.mono,
        fontSize: '6pt',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: t.style.radius > 0 ? `${t.style.radius}mm` : 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '6.5pt' }}>{info.icon}</span>
      {info.label}
    </span>
  );
}

// ============================================================
// SPICY MARK - 🌶 sayıları
// ============================================================
function SpicyMark({ level }: { level: number }) {
  return (
    <span
      style={{
        fontSize: '7pt',
        whiteSpace: 'nowrap',
        letterSpacing: '0.05em',
      }}
    >
      {'🌶'.repeat(Math.max(0, Math.min(3, level)))}
    </span>
  );
}

// ============================================================
// FOOTER - 3 varyant
// ============================================================
function Footer({
  t,
  business,
  qrUrl,
  qrDataUrl,
  variant,
  customSignature,
}: {
  t: TemplateSpec;
  business: PrintableMenuData['business'];
  qrUrl: string;
  qrDataUrl: string | null;
  variant: FooterVariant;
  customSignature: string;
}) {
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
      <QRBlock qrDataUrl={qrDataUrl} t={t} />

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

        {/* Footer varyant detayları */}
        {variant === 'social' && (
          <div
            style={{
              marginTop: '2.5mm',
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

        {variant === 'full' && (
          <div style={{ marginTop: '2.5mm' }}>
            <div
              style={{
                fontFamily: t.fonts.sans,
                fontSize: '7.5pt',
                color: t.colors.ink_muted,
                display: 'flex',
                gap: '4mm',
                flexWrap: 'wrap',
                marginBottom: '2mm',
              }}
            >
              {business.phone && <span>☎ {business.phone}</span>}
              {business.instagram && <span>@ {business.instagram}</span>}
              {business.website && (
                <span>↗ {business.website.replace(/^https?:\/\//, '')}</span>
              )}
            </div>
            {business.address && (
              <div
                style={{
                  fontFamily: t.fonts.sans,
                  fontSize: '7pt',
                  color: t.colors.ink_muted,
                  fontStyle: 'italic',
                  marginBottom: '2mm',
                }}
              >
                {business.address}
              </div>
            )}
            {customSignature && (
              <div
                style={{
                  fontFamily: t.fonts.serif,
                  fontStyle: 'italic',
                  fontSize: '8pt',
                  color: t.colors.accent,
                  paddingTop: '1.5mm',
                  borderTop: `1px solid ${t.colors.line}`,
                }}
              >
                — {customSignature}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// QR BLOCK
// ============================================================
function QRBlock({
  qrDataUrl,
  t,
}: {
  qrDataUrl: string | null;
  t: TemplateSpec;
}) {
  const SIZE_MM = 28;
  const sizePx = SIZE_MM * MM;
  const frame = t.style.qrFrame;

  if (!qrDataUrl) {
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

// ============================================================
// CORNER ORNAMENT (vintage temada sayfa köşeleri)
// ============================================================
function CornerOrnament({
  position,
  t,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
  t: TemplateSpec;
}) {
  const transform = {
    tl: 'rotate(0deg)',
    tr: 'rotate(90deg)',
    br: 'rotate(180deg)',
    bl: 'rotate(270deg)',
  }[position];
  const positionStyle = {
    tl: { top: '8mm', left: '8mm' },
    tr: { top: '8mm', right: '8mm' },
    bl: { bottom: '8mm', left: '8mm' },
    br: { bottom: '8mm', right: '8mm' },
  }[position];

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        ...positionStyle,
        width: '14mm',
        height: '14mm',
        transform,
        opacity: 0.5,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 56 56" fill="none">
        <path d="M 0 0 L 28 0 L 0 28 Z" fill={t.colors.accent} opacity="0.12" />
        <path
          d="M 0 0 L 32 0 M 0 0 L 0 32"
          stroke={t.colors.accent}
          strokeWidth="1"
        />
        <circle cx="6" cy="6" r="2.5" fill={t.colors.accent} />
      </svg>
    </div>
  );
}
