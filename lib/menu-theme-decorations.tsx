'use client';

/**
 * Tema dekoratif öğeleri.
 * 
 * Müşteri menüsünde tema seçimine göre farklı ornament'ler görünür:
 *  - Kategori ayraçları (CategoryDivider)
 *  - Welcome animasyonu (WelcomeRitual)
 *  - Background pattern (BackgroundPattern)
 *  - Hero stilleri (HeroBlock)
 */

import type {
  ThemeDefinition,
  DividerStyle,
  HeroStyle,
  BackgroundPattern,
} from './menu-themes';

// ============================================================
// CATEGORY DIVIDER - kategoriler arası ayraç
// ============================================================
export function CategoryDivider({
  theme,
  monogramText,
}: {
  theme: ThemeDefinition;
  monogramText?: string;
}) {
  const style: DividerStyle = theme.divider;
  const color = theme.colors.decor;

  if (style === 'line') {
    return (
      <div
        style={{
          height: 1,
          background: theme.colors.line,
          margin: '8px 0 16px',
          width: '100%',
        }}
      />
    );
  }

  if (style === 'dotted') {
    return (
      <div
        style={{
          height: 0,
          borderTop: `1px dotted ${theme.colors.line}`,
          margin: '8px 0 16px',
          width: '100%',
        }}
      />
    );
  }

  if (style === 'doubleline') {
    return (
      <div style={{ margin: '12px 0 18px', width: '100%' }}>
        <div style={{ height: 1, background: theme.colors.decor, opacity: 0.6 }} />
        <div style={{ height: 1, background: theme.colors.decor, marginTop: 3, opacity: 0.4 }} />
      </div>
    );
  }

  // Ortada bir öğe + iki yanda çizgi (ornament, star, diamond, wave, monogram)
  let centerEl: React.ReactNode = null;
  if (style === 'star') {
    centerEl = (
      <span
        style={{
          color,
          fontSize: 14,
          lineHeight: 1,
          animation: 'mtdStarTwinkle 3s ease-in-out infinite',
          display: 'inline-block',
        }}
      >
        ★
      </span>
    );
  } else if (style === 'diamond') {
    centerEl = (
      <span style={{ color, fontSize: 12, lineHeight: 1 }}>◆</span>
    );
  } else if (style === 'wave') {
    centerEl = (
      <svg width="40" height="10" viewBox="0 0 40 10" fill="none">
        <path
          d="M 2 5 Q 7 1, 12 5 T 22 5 T 32 5 T 38 5"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  } else if (style === 'ornament') {
    centerEl = (
      <svg width="44" height="14" viewBox="0 0 44 14" fill={color}>
        <circle cx="22" cy="7" r="2" />
        <path
          d="M 14 7 Q 18 4, 22 7 Q 26 10, 30 7"
          stroke={color}
          strokeWidth="1"
          fill="none"
        />
        <circle cx="14" cy="7" r="1" opacity="0.6" />
        <circle cx="30" cy="7" r="1" opacity="0.6" />
      </svg>
    );
  } else if (style === 'monogram') {
    centerEl = (
      <span
        style={{
          color,
          fontFamily: theme.fonts.serif,
          fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
          fontSize: 18,
          fontWeight: 400,
          lineHeight: 1,
          padding: '0 8px',
        }}
      >
        {monogramText?.charAt(0).toUpperCase() || '·'}
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '14px 0 18px',
        width: '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: theme.colors.line,
          opacity: 0.7,
        }}
      />
      {centerEl}
      <div
        style={{
          flex: 1,
          height: 1,
          background: theme.colors.line,
          opacity: 0.7,
        }}
      />
      <style jsx>{`
        @keyframes mtdStarTwinkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.15) rotate(72deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// FEATURED BADGE - öne çıkan ürünlerde
// ============================================================
export function FeaturedBadge({ theme }: { theme: ThemeDefinition }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        background: `color-mix(in srgb, ${theme.colors.accent} 14%, transparent)`,
        color: theme.colors.accent,
        fontFamily: theme.fonts.mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: theme.uppercaseEyebrows ? 'uppercase' : 'none',
        borderRadius: theme.radius.base === '0px' ? 0 : 4,
        animation: 'mtdFeaturedPulse 2.4s ease-in-out infinite',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          animation: 'mtdFeaturedSpin 4s linear infinite',
        }}
      >
        {theme.featuredMark}
      </span>
      ŞEFİN
      <style jsx>{`
        @keyframes mtdFeaturedPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        @keyframes mtdFeaturedSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}

// ============================================================
// SINCE BADGE - "Since 2024" tipi rozet
// ============================================================
export function SinceBadge({
  theme,
  year,
}: {
  theme: ThemeDefinition;
  year: number;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: `1px solid ${theme.colors.decor}`,
        borderRadius: theme.radius.base,
        fontFamily: theme.fonts.mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: theme.colors.decor,
        background: 'transparent',
      }}
    >
      <span style={{ opacity: 0.7 }}>SINCE</span>
      <span>{year}</span>
    </div>
  );
}

// ============================================================
// BACKGROUND PATTERN
// ============================================================
export function BackgroundPatternLayer({
  theme,
}: {
  theme: ThemeDefinition;
}) {
  const pattern: BackgroundPattern = theme.background;

  if (pattern === 'none') return null;

  if (pattern === 'noise') {
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.04,
          mixBlendMode: 'overlay',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E")`,
        }}
      />
    );
  }

  if (pattern === 'paper') {
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.06,
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.04' numOctaves='5'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`,
        }}
      />
    );
  }

  if (pattern === 'grid') {
    const gridColor = encodeURIComponent(theme.colors.line);
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          zIndex: 0,
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
    );
  }

  if (pattern === 'dots') {
    const dotColor = theme.colors.line;
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          zIndex: 0,
          backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    );
  }

  if (pattern === 'waves') {
    const waveColor = encodeURIComponent(theme.colors.decor);
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.05,
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40' stroke='${waveColor}' fill='none' stroke-width='2'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 80px',
          backgroundRepeat: 'repeat',
        }}
      />
    );
  }

  return null;
}

// ============================================================
// HERO STYLE WRAPPER
// ============================================================
export function HeroDecoration({
  theme,
  type,
}: {
  theme: ThemeDefinition;
  type: 'top' | 'bottom';
}) {
  const hero: HeroStyle = theme.hero;

  if (type === 'top') {
    if (hero === 'editorial') {
      // Tarihli editorial - sol ve sağda mini çubuk
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            opacity: 0.7,
          }}
        >
          <span
            style={{
              width: 24,
              height: 1,
              background: theme.colors.decor,
            }}
          />
          <span
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: theme.colors.decor,
              textTransform: 'uppercase',
            }}
          >
            EST · MENÜ
          </span>
          <span
            style={{
              flex: 1,
              height: 1,
              background: theme.colors.line,
            }}
          />
        </div>
      );
    }
    return null;
  }

  // bottom
  if (hero === 'editorial') {
    return (
      <div
        style={{
          marginTop: 14,
          paddingBottom: 4,
          borderBottom: `2px solid ${theme.colors.decor}`,
        }}
      />
    );
  }

  if (hero === 'centered' || hero === 'circular') {
    // Hero altında ornament
    return (
      <div
        style={{
          margin: '20px auto 0',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <svg width="56" height="14" viewBox="0 0 56 14" fill={theme.colors.decor}>
          <circle cx="28" cy="7" r="2.5" />
          <path
            d="M 6 7 Q 17 0, 28 7 Q 39 14, 50 7"
            stroke={theme.colors.decor}
            strokeWidth="1.2"
            fill="none"
            opacity="0.6"
          />
          <circle cx="6" cy="7" r="1.5" opacity="0.5" />
          <circle cx="50" cy="7" r="1.5" opacity="0.5" />
        </svg>
      </div>
    );
  }

  return null;
}

// ============================================================
// CORNER ORNAMENTS - sayfa köşelerinde dekoratif elemanlar
// ============================================================
export function CornerOrnament({
  theme,
  position,
}: {
  theme: ThemeDefinition;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  // Sadece bazı temalar için göster
  if (theme.id !== 'vintage' && theme.id !== 'mediterranean') return null;

  const transform = {
    'top-left': 'rotate(0deg)',
    'top-right': 'rotate(90deg)',
    'bottom-right': 'rotate(180deg)',
    'bottom-left': 'rotate(270deg)',
  }[position];

  const positionStyle = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
  }[position];

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        ...positionStyle,
        width: 28,
        height: 28,
        transform,
        pointerEvents: 'none',
        opacity: 0.4,
        zIndex: 1,
      }}
    >
      <svg viewBox="0 0 28 28" fill="none">
        <path
          d="M 0 0 L 14 0 L 0 14 Z"
          fill={theme.colors.decor}
          opacity="0.15"
        />
        <path
          d="M 0 0 L 16 0 M 0 0 L 0 16"
          stroke={theme.colors.decor}
          strokeWidth="1"
        />
        <circle cx="3" cy="3" r="1.5" fill={theme.colors.decor} />
      </svg>
    </div>
  );
}

// ============================================================
// WELCOME RITUAL - menü açılırken kısa animasyon
// ============================================================
export function WelcomeRitual({
  theme,
  businessName,
  onDone,
}: {
  theme: ThemeDefinition;
  businessName: string;
  onDone: () => void;
}) {
  const anim = theme.welcomeAnim;

  // 1.6 saniye sonra otomatik kapan
  if (typeof window !== 'undefined') {
    setTimeout(onDone, 1600);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: theme.colors.paper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation:
          anim === 'curtain'
            ? 'mtdRitualCurtainOut 0.7s ease 0.9s forwards'
            : 'mtdRitualFadeOut 0.5s ease 1.1s forwards',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Monogram halka */}
        <div
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 88,
            height: 88,
            borderRadius: '50%',
            border: `1.5px solid ${theme.colors.decor}`,
            margin: '0 auto 18px',
            position: 'relative',
            animation: 'mtdRitualScaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          <span
            style={{
              fontFamily: theme.fonts.serif,
              fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
              fontSize: 40,
              color: theme.colors.ink,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            {businessName.charAt(0).toUpperCase()}
          </span>
          {/* Pulse halka */}
          <span
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: `1px solid ${theme.colors.glow}`,
              opacity: 0,
              animation: 'mtdRitualHalo 1.4s ease-out 0.3s',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: theme.fonts.serif,
            fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
            fontSize: 24,
            color: theme.colors.ink,
            letterSpacing: '-0.02em',
            animation: 'mtdRitualTextIn 0.5s ease 0.3s both',
          }}
        >
          {businessName}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.32em',
            color: theme.colors.ink3,
            textTransform: 'uppercase',
            marginTop: 6,
            animation: 'mtdRitualTextIn 0.5s ease 0.5s both',
          }}
        >
          MENÜ
        </div>
      </div>
      <style jsx>{`
        @keyframes mtdRitualScaleIn {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes mtdRitualHalo {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.6); }
        }
        @keyframes mtdRitualTextIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes mtdRitualFadeOut {
          from { opacity: 1; }
          to { opacity: 0; pointer-events: none; }
        }
        @keyframes mtdRitualCurtainOut {
          from {
            clip-path: inset(0 0 0 0);
            opacity: 1;
          }
          to {
            clip-path: inset(0 0 100% 0);
            opacity: 1;
            pointer-events: none;
          }
        }
      `}</style>
    </div>
  );
}
