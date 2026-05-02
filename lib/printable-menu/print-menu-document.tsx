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
  resolveFonts,
  type TemplateId,
  type PaperSize,
  type TemplateSpec,
  type HeaderVariant,
  type FooterVariant,
  type FontPresetId,
} from '@/lib/printable-menu/templates';

export type SocialQr = {
  id: string;
  label: string;
  url: string;
  qrDataUrl: string;
  icon: string;
};

type Props = {
  data: PrintableMenuData;
  templateId: TemplateId;
  size: PaperSize;
  qrDataUrl: string | null;
  qrUrlOverride?: string; // Footer'da gösterilecek URL (genel ya da masa)
  tableLabel?: string; // "Masa 1" gibi - basılırsa footer'a yazılır
  logoDataUrl: string | null; // Server-side fetch edildi
  logoMode?: 'original' | 'white-frame' | 'monogram';
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
  // Yeni — font + sosyal QR override (yarın ekleneceğini bilmiyorduk, şimdi eklendi)
  fontPreset?: FontPresetId;
  socialQrs?: SocialQr[];
};

const MM = 3.7795;

export const PrintMenuDocument = forwardRef<HTMLDivElement, Props>(
  function PrintMenuDocument(
    {
      data,
      templateId,
      size,
      qrDataUrl,
      qrUrlOverride,
      tableLabel,
      logoDataUrl,
      logoMode = 'original',
      headerVariant,
      footerVariant,
      showDietaryTags,
      showSinceBadge,
      customSignature,
      scale = 1,
      pageCategories,
      pageNumber,
      totalPages,
      fontPreset = 'template',
      socialQrs,
    },
    ref
  ) {
    const tBase = TEMPLATES[templateId];
    // Font preset uygula — t.fonts.* her yerde otomatik değişir
    const resolvedFonts = resolveFonts(tBase.fonts, fontPreset);
    const t: TemplateSpec = { ...tBase, fonts: resolvedFonts };
    const s = SIZES[size];
    const widthPx = s.width_mm * MM;
    const heightPx = s.height_mm * MM;

    const cats = pageCategories || data.categories;
    const isMultiPage = (totalPages || 1) > 1;
    const isFirstPage = !pageNumber || pageNumber === 1;
    const isLastPage = !pageNumber || pageNumber === (totalPages || 1);

    // Yeni layout'lar — kendi gövdelerini render eder
    if (t.layout === 'photo-hero') {
      return (
        <PhotoHeroLayout
          ref={ref}
          data={data}
          template={t}
          size={s}
          cats={cats}
          isMultiPage={isMultiPage}
          isFirstPage={isFirstPage}
          isLastPage={isLastPage}
          pageNumber={pageNumber}
          totalPages={totalPages}
          qrDataUrl={qrDataUrl}
          qrUrlOverride={qrUrlOverride}
          tableLabel={tableLabel}
          logoDataUrl={logoDataUrl}
          logoMode={logoMode}
          showDietaryTags={showDietaryTags}
          showSinceBadge={showSinceBadge}
          footerVariant={footerVariant}
          customSignature={customSignature}
          scale={scale}
          widthPx={widthPx}
          heightPx={heightPx}
          socialQrs={socialQrs}
        />
      );
    }
    if (t.layout === 'bold-badge') {
      return (
        <BoldBadgeLayout
          ref={ref}
          data={data}
          template={t}
          size={s}
          cats={cats}
          isMultiPage={isMultiPage}
          isFirstPage={isFirstPage}
          isLastPage={isLastPage}
          pageNumber={pageNumber}
          totalPages={totalPages}
          qrDataUrl={qrDataUrl}
          qrUrlOverride={qrUrlOverride}
          tableLabel={tableLabel}
          logoDataUrl={logoDataUrl}
          logoMode={logoMode}
          showDietaryTags={showDietaryTags}
          showSinceBadge={showSinceBadge}
          footerVariant={footerVariant}
          customSignature={customSignature}
          scale={scale}
          widthPx={widthPx}
          heightPx={heightPx}
          socialQrs={socialQrs}
        />
      );
    }
    if (t.layout === 'editorial') {
      return (
        <EditorialLayout
          ref={ref}
          data={data}
          template={t}
          size={s}
          cats={cats}
          isMultiPage={isMultiPage}
          isFirstPage={isFirstPage}
          isLastPage={isLastPage}
          pageNumber={pageNumber}
          totalPages={totalPages}
          qrDataUrl={qrDataUrl}
          qrUrlOverride={qrUrlOverride}
          tableLabel={tableLabel}
          logoDataUrl={logoDataUrl}
          logoMode={logoMode}
          showDietaryTags={showDietaryTags}
          showSinceBadge={showSinceBadge}
          footerVariant={footerVariant}
          customSignature={customSignature}
          scale={scale}
          widthPx={widthPx}
          heightPx={heightPx}
          socialQrs={socialQrs}
        />
      );
    }

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
              logoMode={logoMode}
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
              qrUrl={qrUrlOverride || data.qr_url}
              qrDataUrl={qrDataUrl}
              variant={footerVariant}
              customSignature={customSignature}
              tableLabel={tableLabel}
              socialQrs={socialQrs}
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
  logoMode = 'original',
  showSinceBadge,
}: {
  t: TemplateSpec;
  business: PrintableMenuData['business'];
  variant: HeaderVariant;
  logoDataUrl: string | null;
  logoMode?: 'original' | 'white-frame' | 'monogram';
  showSinceBadge: boolean;
}) {
  // Logo monogram modu seçildiyse logo varsayılmaz - hep monogram göster
  const hasLogo = logoMode !== 'monogram' && !!logoDataUrl;
  const useWhiteFrame = logoMode === 'white-frame' && !!logoDataUrl;

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
          useWhiteFrame ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '50%',
                padding: '2mm',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoDataUrl!}
                alt={business.name}
                style={{
                  width: '20mm',
                  height: '20mm',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          ) : (
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
          )
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
          {useWhiteFrame ? (
            <div
              style={{
                display: 'inline-block',
                background: '#FFFFFF',
                borderRadius: '50%',
                padding: '3mm',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoDataUrl!}
                alt={business.name}
                style={{
                  width: '24mm',
                  height: '24mm',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
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
          )}
        </div>
      )}
      {/* Logo yoksa veya monogram modu seçiliyse: monogram göster (centered için) */}
      {!hasLogo && logoMode === 'monogram' && (
        <div style={{ marginBottom: '4mm' }}>
          <div
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              width: '22mm',
              height: '22mm',
              border: `2px solid ${t.colors.accent}`,
              borderRadius: '50%',
              fontFamily: t.fonts.serif,
              fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
              fontSize: '28pt',
              fontWeight: 400,
              color: t.colors.ink,
              lineHeight: 1,
            }}
          >
            {business.name.charAt(0).toUpperCase()}
          </div>
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
  qrUrl: _qrUrl,
  qrDataUrl,
  variant,
  customSignature,
  tableLabel,
  socialQrs,
}: {
  t: TemplateSpec;
  business: PrintableMenuData['business'];
  qrUrl: string;
  qrDataUrl: string | null;
  variant: FooterVariant;
  customSignature: string;
  tableLabel?: string;
  socialQrs?: SocialQr[];
}) {
  const hasSocialQrs = !!socialQrs && socialQrs.length > 0;
  return (
    <>
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
          {tableLabel
            ? `DİJİTAL MENÜ · ${tableLabel.toUpperCase()}`
            : 'DİJİTAL MENÜ'}
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
          {tableLabel
            ? `${tableLabel}'a özel QR — tara ve sipariş ver`
            : 'QR\u2019ı tara, masandan sipariş ver'}
        </h3>
        <div
          style={{
            fontFamily: t.fonts.mono,
            fontSize: '7.5pt',
            color: t.colors.ink_muted,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {tableLabel ? 'KAMERANI AÇ · TARA' : 'KAMERANI AÇ · MENÜYÜ GÖR'}
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

    {/* ============ SOSYAL MEDYA QR SATIRI (opsiyonel) ============ */}
    {hasSocialQrs && (
      <div
        style={{
          marginTop: `${t.style.categoryGap * 0.7}mm`,
          paddingTop: `${t.style.categoryGap * 0.7}mm`,
          borderTop: `1px dashed ${t.colors.line}`,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.mono,
            fontSize: '7pt',
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: t.colors.accent,
            marginBottom: '2mm',
          }}
        >
          BİZİ TAKİP ET
        </div>
        <div
          style={{
            display: 'flex',
            gap: '4mm',
            flexWrap: 'wrap',
          }}
        >
          {socialQrs!.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1mm',
                width: '18mm',
              }}
            >
              <div
                style={{
                  width: '16mm',
                  height: '16mm',
                  background: '#FFFFFF',
                  padding: '1mm',
                  border: `1px solid ${t.colors.line}`,
                  borderRadius: '1.5mm',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.qrDataUrl}
                  alt={s.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: t.fonts.mono,
                  fontSize: '6pt',
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: t.colors.ink_muted,
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
    </>
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

// ============================================================
// LAYOUT VARIANT TYPES
// ============================================================
type LayoutVariantProps = {
  data: PrintableMenuData;
  template: TemplateSpec;
  size: { width_mm: number; height_mm: number; isLandscape: boolean };
  cats: PrintableMenuCategory[];
  isMultiPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  pageNumber?: number;
  totalPages?: number;
  qrDataUrl: string | null;
  qrUrlOverride?: string;
  tableLabel?: string;
  logoDataUrl: string | null;
  logoMode?: 'original' | 'white-frame' | 'monogram';
  showDietaryTags: boolean;
  showSinceBadge: boolean;
  footerVariant: FooterVariant;
  customSignature: string;
  scale?: number;
  widthPx: number;
  heightPx: number;
  socialQrs?: SocialQr[];
};

// ============================================================
// PHOTO HERO LAYOUT
// Üstte mekan fotoğrafı (logo + isim overlay), altında menü
// ============================================================
const PhotoHeroLayout = forwardRef<HTMLDivElement, LayoutVariantProps>(
  function PhotoHeroLayout(
    {
      data,
      template: t,
      cats,
      isFirstPage,
      isLastPage,
      isMultiPage,
      pageNumber,
      totalPages,
      qrDataUrl,
      qrUrlOverride,
      tableLabel,
      logoDataUrl,
      logoMode = 'original',
      showDietaryTags: _showDietaryTags,
      showSinceBadge,
      footerVariant,
      customSignature,
      scale = 1,
      widthPx,
      heightPx,
      socialQrs,
    },
    ref
  ) {
    const HERO_HEIGHT_PCT = isFirstPage ? 26 : 0; // ilk sayfada hero %26
    const showLogoImage = logoMode !== 'monogram' && !!logoDataUrl;
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
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* HERO - sadece 1. sayfada */}
        {isFirstPage && (
          <div
            style={{
              height: `${HERO_HEIGHT_PCT}%`,
              background: `linear-gradient(135deg, #2A2218 0%, #1F1B17 50%, #2A2218 100%)`,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Pattern - mekan fotoğrafı yokken simülasyon */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.18,
                backgroundImage: `radial-gradient(${t.colors.accent} 0.5px, transparent 0.5px), radial-gradient(${t.colors.accent} 0.5px, transparent 0.5px)`,
                backgroundSize: '14px 14px',
                backgroundPosition: '0 0, 7px 7px',
              }}
            />
            {/* Vinyet kenar */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
              }}
            />
            {/* Logo veya monogram dairesi */}
            <div
              style={{
                width: '32mm',
                height: '32mm',
                borderRadius: '50%',
                border: `2px solid ${t.colors.accent}`,
                background:
                  logoMode === 'white-frame' && showLogoImage
                    ? '#FFFFFF'
                    : 'rgba(245,236,220,0.07)',
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {showLogoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDataUrl!}
                  alt={data.business.name}
                  style={{
                    width: '24mm',
                    height: '24mm',
                    objectFit: 'contain',
                    filter:
                      logoMode === 'white-frame' ? 'none' : 'brightness(1.1)',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: t.fonts.serif,
                    fontSize: '36pt',
                    fontWeight: 400,
                    color: t.colors.accent,
                  }}
                >
                  {data.business.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* PAPER PANEL — menü ana gövdesi */}
        <div
          style={{
            flex: 1,
            background: t.colors.paper,
            padding: `${t.style.pagePadding}mm`,
            paddingTop: isFirstPage ? '8mm' : `${t.style.pagePadding}mm`,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* İsim + slogan blok */}
          {isFirstPage && (
            <div
              style={{
                textAlign: 'center',
                marginBottom: '8mm',
                paddingBottom: '4mm',
                borderBottom: `1px solid ${t.colors.line}`,
              }}
            >
              <h1
                style={{
                  fontFamily: t.fonts.serif,
                  fontSize: '36pt',
                  fontWeight: 400,
                  color: t.colors.ink,
                  letterSpacing: '-0.01em',
                  marginBottom: '2mm',
                  lineHeight: 1.0,
                }}
              >
                {data.business.name}
              </h1>
              {showSinceBadge && (
                <div
                  style={{
                    fontFamily: t.fonts.mono,
                    fontSize: '7.5pt',
                    fontWeight: 700,
                    letterSpacing: '0.4em',
                    color: t.colors.accent,
                    textTransform: 'uppercase',
                  }}
                >
                  KURULUŞ {data.business.created_year}
                </div>
              )}
              {data.business.tagline_tr && (
                <p
                  style={{
                    fontFamily: t.fonts.sans,
                    fontStyle: 'italic',
                    fontSize: '9.5pt',
                    color: t.colors.ink_soft,
                    marginTop: '2mm',
                  }}
                >
                  {data.business.tagline_tr}
                </p>
              )}
            </div>
          )}

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

          {/* CONTENT - 2 SÜTUN ürünler */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8mm',
              overflow: 'hidden',
            }}
          >
            <div>
              {cats
                .filter((_, i) => i % 2 === 0)
                .map((cat, idx) => (
                  <PhotoHeroCategoryBlock
                    key={cat.id}
                    category={cat}
                    template={t}
                    isFirst={idx === 0}
                  />
                ))}
            </div>
            <div>
              {cats
                .filter((_, i) => i % 2 === 1)
                .map((cat, idx) => (
                  <PhotoHeroCategoryBlock
                    key={cat.id}
                    category={cat}
                    template={t}
                    isFirst={idx === 0}
                  />
                ))}
            </div>
          </div>

          {/* FOOTER - sadece son sayfada */}
          {isLastPage && (
            <Footer
              t={t}
              business={data.business}
              qrUrl={qrUrlOverride || data.qr_url}
              qrDataUrl={qrDataUrl}
              variant={footerVariant}
              customSignature={customSignature}
              tableLabel={tableLabel}
              socialQrs={socialQrs}
            />
          )}

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

function PhotoHeroCategoryBlock({
  category,
  template: t,
  isFirst,
}: {
  category: PrintableMenuCategory;
  template: TemplateSpec;
  isFirst: boolean;
}) {
  return (
    <div style={{ marginTop: isFirst ? 0 : '8mm' }}>
      <h2
        style={{
          fontFamily: t.fonts.serif,
          fontSize: '14pt',
          fontWeight: 400,
          color: t.colors.accent,
          letterSpacing: '0.02em',
          marginBottom: '3mm',
          lineHeight: 1.1,
        }}
      >
        {category.name}
      </h2>
      <div>
        {category.products.map((p, idx) => (
          <div
            key={p.id}
            style={{
              marginTop: idx === 0 ? 0 : '2mm',
              display: 'flex',
              alignItems: 'baseline',
              gap: '2mm',
            }}
          >
            <span
              style={{
                fontFamily: t.fonts.sans,
                fontSize: '9pt',
                fontWeight: 600,
                color: t.colors.ink,
                lineHeight: 1.2,
              }}
            >
              {p.is_chef_recommend && (
                <span style={{ color: t.colors.accent, marginRight: '1mm' }}>
                  {t.chefMark}
                </span>
              )}
              {p.name}
              {p.spicy_level > 0 && (
                <span
                  style={{
                    fontSize: '6.5pt',
                    marginLeft: '1.5mm',
                  }}
                >
                  {'🌶'.repeat(p.spicy_level)}
                </span>
              )}
            </span>
            <span
              aria-hidden
              style={{
                flex: 1,
                borderBottom: `1px dotted ${t.colors.ink_muted}`,
                marginBottom: '3px',
                opacity: 0.4,
                minWidth: '4mm',
              }}
            />
            <span
              style={{
                fontFamily: t.fonts.mono,
                fontSize: '9pt',
                fontWeight: 700,
                color: t.colors.accent,
                whiteSpace: 'nowrap',
              }}
            >
              ₺{p.price.toLocaleString('tr-TR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// BOLD BADGE LAYOUT
// Logo rozet + büyük "MENÜ" yazısı + 2 sütun + alt CTA bandı
// ============================================================
const BoldBadgeLayout = forwardRef<HTMLDivElement, LayoutVariantProps>(
  function BoldBadgeLayout(
    {
      data,
      template: t,
      cats,
      isFirstPage,
      isLastPage,
      isMultiPage,
      pageNumber,
      totalPages,
      qrDataUrl,
      qrUrlOverride: _qrUrlOverride,
      tableLabel,
      logoDataUrl,
      logoMode = 'original',
      showDietaryTags: _showDietaryTags,
      showSinceBadge: _showSinceBadge,
      footerVariant,
      customSignature: _customSignature,
      scale = 1,
      widthPx,
      heightPx,
      socialQrs,
    },
    ref
  ) {
    const showLogoImage = logoMode !== 'monogram' && !!logoDataUrl;
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
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: `${t.style.pagePadding}mm`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* HEADER - Badge rozet + MENÜ */}
          {isFirstPage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5mm',
                marginBottom: '6mm',
              }}
            >
              {/* Logo rozet */}
              <div
                style={{
                  width: '22mm',
                  height: '22mm',
                  borderRadius: '50%',
                  background:
                    logoMode === 'white-frame' && showLogoImage
                      ? '#FFFFFF'
                      : t.colors.line,
                  display: 'grid',
                  placeItems: 'center',
                  position: 'relative',
                  flexShrink: 0,
                  border:
                    logoMode === 'white-frame' && showLogoImage
                      ? `1px solid ${t.colors.line}`
                      : 'none',
                }}
              >
                {showLogoImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoDataUrl!}
                    alt={data.business.name}
                    style={{
                      width: '17mm',
                      height: '17mm',
                      objectFit: 'contain',
                      borderRadius: '50%',
                    }}
                  />
                ) : logoMode === 'monogram' ? (
                  <span
                    style={{
                      fontFamily: t.fonts.serif,
                      fontStyle: t.fonts.italicHeadings ? 'italic' : 'normal',
                      fontSize: '24pt',
                      fontWeight: 400,
                      color: t.colors.paper,
                    }}
                  >
                    {data.business.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: t.fonts.sans,
                      fontSize: '14pt',
                      fontWeight: 800,
                      color: t.colors.paper,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {data.business.name.toUpperCase().slice(0, 7)}
                  </span>
                )}
              </div>
              {/* MENÜ büyük yazı */}
              <h1
                style={{
                  fontFamily: t.fonts.sans,
                  fontSize: '64pt',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: t.colors.line,
                  lineHeight: 0.85,
                  flex: 1,
                }}
              >
                MENÜ
              </h1>
            </div>
          )}

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
                borderBottom: `2px solid ${t.colors.line}`,
                marginBottom: '4mm',
              }}
            >
              {data.business.name} — Sayfa {pageNumber} / {totalPages}
            </div>
          )}

          {/* 2 SÜTUN ürünler */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6mm',
              borderTop: `2px solid ${t.colors.line}`,
              paddingTop: '4mm',
              overflow: 'hidden',
            }}
          >
            <div>
              {cats
                .filter((_, i) => i % 2 === 0)
                .map((cat, idx) => (
                  <BoldBadgeCategoryBlock
                    key={cat.id}
                    category={cat}
                    template={t}
                    isFirst={idx === 0}
                  />
                ))}
            </div>
            <div>
              {cats
                .filter((_, i) => i % 2 === 1)
                .map((cat, idx) => (
                  <BoldBadgeCategoryBlock
                    key={cat.id}
                    category={cat}
                    template={t}
                    isFirst={idx === 0}
                  />
                ))}
            </div>
          </div>

          {/* CTA bandı altta — accent renk turuncu blok */}
          {isLastPage && (
            <div
              style={{
                marginTop: '6mm',
                background: t.colors.accent,
                padding: '4mm 5mm',
                display: 'flex',
                alignItems: 'center',
                gap: '5mm',
              }}
            >
              {/* QR */}
              {qrDataUrl && (
                <div
                  style={{
                    background: '#fff',
                    padding: '2mm',
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{
                      width: '20mm',
                      height: '20mm',
                      display: 'block',
                    }}
                  />
                </div>
              )}
              <div style={{ flex: 1, color: '#fff' }}>
                <div
                  style={{
                    fontFamily: t.fonts.mono,
                    fontSize: '7.5pt',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    marginBottom: '1.5mm',
                    opacity: 0.85,
                  }}
                >
                  {tableLabel
                    ? `DİJİTAL MENÜ · ${tableLabel.toUpperCase()}`
                    : 'DİJİTAL MENÜ · SİPARİŞ'}
                </div>
                <div
                  style={{
                    fontFamily: t.fonts.sans,
                    fontSize: '14pt',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.1,
                  }}
                >
                  {tableLabel
                    ? `${data.business.name} · ${tableLabel}`
                    : data.business.name}
                </div>
                {(footerVariant === 'social' || footerVariant === 'full') && (
                  <div
                    style={{
                      fontFamily: t.fonts.sans,
                      fontSize: '8pt',
                      marginTop: '1.5mm',
                      opacity: 0.85,
                    }}
                  >
                    {data.business.phone && `☎ ${data.business.phone}  `}
                    {data.business.instagram && `@${data.business.instagram}`}
                  </div>
                )}
              </div>
            </div>
          )}

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

function BoldBadgeCategoryBlock({
  category,
  template: t,
  isFirst,
}: {
  category: PrintableMenuCategory;
  template: TemplateSpec;
  isFirst: boolean;
}) {
  return (
    <div style={{ marginTop: isFirst ? 0 : '6mm' }}>
      <h2
        style={{
          fontFamily: t.fonts.sans,
          fontSize: '10pt',
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: t.colors.ink,
          textAlign: 'center',
          marginBottom: '3mm',
          paddingBottom: '2mm',
          borderBottom: `1px solid ${t.colors.line}`,
        }}
      >
        {category.name}
      </h2>
      <div>
        {category.products.map((p, idx) => (
          <div
            key={p.id}
            style={{
              padding: '2mm 0',
              borderBottom:
                idx === category.products.length - 1
                  ? 'none'
                  : `1px dashed ${t.colors.line}`,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '2mm',
            }}
          >
            <span
              style={{
                fontFamily: t.fonts.sans,
                fontSize: '9pt',
                fontWeight: 600,
                color: t.colors.ink,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {p.is_chef_recommend && (
                <span style={{ color: t.colors.accent, marginRight: '1mm' }}>
                  {t.chefMark}
                </span>
              )}
              {p.name}
              {p.spicy_level > 0 && (
                <span
                  style={{
                    fontSize: '7pt',
                    marginLeft: '1mm',
                  }}
                >
                  {'🌶'.repeat(p.spicy_level)}
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: t.fonts.mono,
                fontSize: '9pt',
                fontWeight: 800,
                color: t.colors.accent,
                whiteSpace: 'nowrap',
              }}
            >
              {p.price.toLocaleString('tr-TR')}TL
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EDITORIAL LAYOUT
// Sol foto (logo bg) + sağ menü, dergi tarzı
// ============================================================
const EditorialLayout = forwardRef<HTMLDivElement, LayoutVariantProps>(
  function EditorialLayout(
    {
      data,
      template: t,
      cats,
      isFirstPage,
      isLastPage,
      isMultiPage,
      pageNumber,
      totalPages,
      qrDataUrl,
      qrUrlOverride,
      tableLabel,
      logoDataUrl,
      logoMode = 'original',
      showDietaryTags,
      showSinceBadge,
      footerVariant,
      customSignature,
      scale = 1,
      widthPx,
      heightPx,
      socialQrs,
    },
    ref
  ) {
    const showLogoImage = logoMode !== 'monogram' && !!logoDataUrl;
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
          display: 'flex',
        }}
      >
        {/* SOL — foto/monogram */}
        {isFirstPage && (
          <div
            style={{
              width: '32%',
              background: `linear-gradient(160deg, ${t.colors.ink} 0%, #2A1614 100%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '12mm 8mm',
              position: 'relative',
            }}
          >
            {/* Üst: tarih damgası */}
            <div>
              <div
                style={{
                  fontFamily: t.fonts.mono,
                  fontSize: '7pt',
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  color: t.colors.accent,
                  textTransform: 'uppercase',
                  marginBottom: '2mm',
                }}
              >
                NO. {String(data.business.created_year).slice(-2)} ·{' '}
                {data.business.city || 'TR'}
              </div>
              <div
                style={{
                  width: '12mm',
                  height: '1px',
                  background: t.colors.accent,
                }}
              />
            </div>

            {/* Orta: logo veya monogram */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
              }}
            >
              {showLogoImage ? (
                <div
                  style={{
                    width: '40mm',
                    height: '40mm',
                    background: t.colors.paper,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    padding: '4mm',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoDataUrl!}
                    alt={data.business.name}
                    style={{
                      width: '32mm',
                      height: '32mm',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: t.fonts.serif,
                    fontStyle: 'italic',
                    fontSize: '90pt',
                    fontWeight: 400,
                    color: t.colors.paper,
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {data.business.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Alt: işletme adı dikey */}
            <div>
              <div
                style={{
                  width: '12mm',
                  height: '1px',
                  background: t.colors.accent,
                  marginBottom: '2mm',
                }}
              />
              <div
                style={{
                  fontFamily: t.fonts.serif,
                  fontStyle: 'italic',
                  fontSize: '20pt',
                  fontWeight: 400,
                  color: t.colors.paper,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.05,
                }}
              >
                {data.business.name}
              </div>
              {showSinceBadge && (
                <div
                  style={{
                    fontFamily: t.fonts.mono,
                    fontSize: '7pt',
                    letterSpacing: '0.3em',
                    color: t.colors.ink_muted,
                    textTransform: 'uppercase',
                    marginTop: '1mm',
                  }}
                >
                  EST. {data.business.created_year}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SAĞ — menü içerik */}
        <div
          style={{
            flex: 1,
            padding: `${t.style.pagePadding}mm`,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Üst editorial başlık */}
          {isFirstPage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingBottom: '3mm',
                borderBottom: `2px solid ${t.colors.ink}`,
                marginBottom: '5mm',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: t.fonts.mono,
                    fontSize: '7pt',
                    letterSpacing: '0.3em',
                    color: t.colors.accent,
                    textTransform: 'uppercase',
                    marginBottom: '1mm',
                  }}
                >
                  THE MENU · ÇIKAR · OKU · SİPARİŞ VER
                </div>
                <h1
                  style={{
                    fontFamily: t.fonts.serif,
                    fontStyle: 'italic',
                    fontSize: '32pt',
                    fontWeight: 400,
                    color: t.colors.ink,
                    letterSpacing: '-0.02em',
                    lineHeight: 0.95,
                  }}
                >
                  Le Menu
                </h1>
              </div>
              <div
                style={{
                  fontFamily: t.fonts.mono,
                  fontSize: '7pt',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: t.colors.ink_muted,
                  textTransform: 'uppercase',
                }}
              >
                VOL.
                <br />
                {data.business.created_year}
              </div>
            </div>
          )}

          {isMultiPage && !isFirstPage && (
            <div
              style={{
                fontFamily: t.fonts.mono,
                fontSize: '8pt',
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: t.colors.accent,
                textTransform: 'uppercase',
                paddingBottom: '4mm',
                borderBottom: `1px solid ${t.colors.line}`,
                marginBottom: '4mm',
              }}
            >
              {data.business.name} — Sayfa {pageNumber} / {totalPages}
            </div>
          )}

          {/* CONTENT - tek sütun ama editorial style */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {cats.map((cat, idx) => (
              <CategoryBlock
                key={cat.id}
                category={cat}
                template={t}
                isFirst={idx === 0}
                templateId="editorial"
                size={{ width_mm: 0, height_mm: 0, isLandscape: false }}
                showDietaryTags={showDietaryTags}
              />
            ))}
          </div>

          {isLastPage && (
            <Footer
              t={t}
              business={data.business}
              qrUrl={qrUrlOverride || data.qr_url}
              qrDataUrl={qrDataUrl}
              variant={footerVariant}
              customSignature={customSignature}
              tableLabel={tableLabel}
              socialQrs={socialQrs}
            />
          )}

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
