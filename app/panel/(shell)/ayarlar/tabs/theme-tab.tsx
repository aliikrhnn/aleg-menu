'use client';

import { useState } from 'react';
import {
  THEME_LIST,
  type ThemeDefinition,
  type ThemePreset,
  resolveTheme,
} from '@/lib/menu-themes';
import { ThemePreview } from './theme-preview';
import type { FontPreset } from '@/lib/actions/settings';

type Props = {
  theme: {
    preset: ThemePreset;
    accent_override: string | null;
    font_preset: FontPreset;
  };
  onChange: (next: {
    preset: ThemePreset;
    accent_override: string | null;
    font_preset: FontPreset;
  }) => void;
  slug: string;
  rootDomain: string;
};

// Önerilen renk paleti - genişletildi
const SUGGESTED_COLORS = [
  '#C4553A', // brutalist
  '#C9A961', // gold
  '#4ABDAC', // mint
  '#8B2635', // deep red
  '#B7C4A0', // sage
  '#1F4E5F', // ocean blue
  '#7A5C9F', // dusty purple
  '#D97757', // terracotta
  '#0F766E', // emerald
  '#E04F5F', // dark luxe red
  '#E8B547', // mediterranean yellow
  '#1F70B7', // mediterranean blue
];

export function ThemeTab({ theme, onChange, slug, rootDomain }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(
    theme.accent_override || '#C4553A'
  );

  const handleSelectPreset = (preset: ThemePreset) => {
    onChange({
      preset,
      accent_override: theme.accent_override,
      font_preset: theme.font_preset,
    });
  };

  const handleAccentChange = (color: string | null) => {
    onChange({
      preset: theme.preset,
      accent_override: color,
      font_preset: theme.font_preset,
    });
  };

  const handleFontChange = (font_preset: FontPreset) => {
    onChange({
      preset: theme.preset,
      accent_override: theme.accent_override,
      font_preset,
    });
  };

  const handleCustomColorApply = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
      handleAccentChange(customColor);
      setShowColorPicker(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ========== TEMA SEÇİMİ ========== */}
      <section>
        <SectionHeader
          eyebrow="Adım 1"
          title="Tema seç"
          description="Müşteri menüsünün karakteri ve atmosferi. Her tema kendi renklerini, fontlarını, dekoratif öğelerini ve animasyonlarını taşır."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {THEME_LIST.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={theme.preset === t.id}
              onClick={() => handleSelectPreset(t.id)}
            />
          ))}
        </div>
      </section>

      {/* ========== VURGU RENGİ ========== */}
      <section>
        <SectionHeader
          eyebrow="Adım 2"
          title="Vurgu rengi"
          description="İstersen temanın varsayılan rengini değiştir. Butonlarda, vurgularda ve dekoratif öğelerde kullanılır."
        />

        <div
          className="rounded-[var(--r)] p-5"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="flex items-start gap-3 flex-wrap">
            {/* Default */}
            <button
              type="button"
              onClick={() => handleAccentChange(null)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="rounded-full transition-all relative"
                style={{
                  width: 48,
                  height: 48,
                  background: resolveTheme({
                    preset: theme.preset,
                    accent_override: null,
                  }).colors.accent,
                  border:
                    theme.accent_override === null
                      ? '3px solid var(--ink)'
                      : '3px solid transparent',
                  boxShadow:
                    theme.accent_override === null
                      ? '0 0 0 2px var(--paper), 0 4px 12px rgba(42,31,24,0.12)'
                      : 'none',
                  transform:
                    theme.accent_override === null ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {theme.accent_override === null && (
                  <span
                    className="absolute"
                    style={{
                      top: -4,
                      right: -4,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span
                className="text-[9px] uppercase font-bold"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.16em',
                  color:
                    theme.accent_override === null
                      ? 'var(--ink)'
                      : 'var(--ink-3)',
                }}
              >
                Tema
              </span>
            </button>

            {SUGGESTED_COLORS.map((color) => {
              const selected = theme.accent_override === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleAccentChange(color)}
                  className="flex flex-col items-center gap-2"
                  title={color}
                >
                  <div
                    className="rounded-full transition-all relative"
                    style={{
                      width: 48,
                      height: 48,
                      background: color,
                      border: selected
                        ? '3px solid var(--ink)'
                        : '3px solid transparent',
                      boxShadow: selected
                        ? '0 0 0 2px var(--paper), 0 4px 12px rgba(42,31,24,0.12)'
                        : 'none',
                      transform: selected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {selected && (
                      <span
                        className="absolute"
                        style={{
                          top: -4,
                          right: -4,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'var(--ink)',
                          color: 'var(--paper)',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Özel */}
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="rounded-full grid place-items-center transition-all"
                style={{
                  width: 48,
                  height: 48,
                  background:
                    'conic-gradient(from 0deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #ef4444)',
                  border: '3px solid transparent',
                }}
              >
                <span
                  className="grid place-items-center rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: 16,
                  }}
                >
                  +
                </span>
              </div>
              <span
                className="text-[9px] uppercase font-bold"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.16em',
                  color: 'var(--ink-3)',
                }}
              >
                Özel
              </span>
            </button>
          </div>

          {showColorPicker && (
            <div
              className="mt-4 p-4 rounded-[10px] flex items-center gap-3 flex-wrap"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
            >
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="rounded cursor-pointer"
                style={{
                  width: 56,
                  height: 40,
                  padding: 0,
                  border: '1px solid var(--line)',
                  background: 'transparent',
                }}
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#C4553A"
                className="rounded-[8px] px-3 h-10 text-[13px]"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--f-mono)',
                  width: 120,
                  letterSpacing: '0.04em',
                }}
              />
              <button
                type="button"
                onClick={handleCustomColorApply}
                className="px-4 h-10 rounded-[8px] text-[12px] font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Uygula
              </button>
              <button
                type="button"
                onClick={() => setShowColorPicker(false)}
                className="text-[12px]"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                }}
              >
                İptal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ========== YAZI TİPİ ========== */}
      <section>
        <SectionHeader
          eyebrow="Adım 3"
          title="Yazı tipi"
          description="Menü başlıklarının karakteri. Hikâyeli serif, modern sans, dikkat çeken display, ya da teknik mono."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                id: 'serif',
                label: 'Serif',
                sample: 'Karaköy',
                family:
                  '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
                italic: true,
                description: 'Klasik, edebi',
              },
              {
                id: 'sans',
                label: 'Sans',
                sample: 'Karaköy',
                family:
                  '"Inter", "Helvetica Neue", system-ui, sans-serif',
                italic: false,
                description: 'Modern, temiz',
              },
              {
                id: 'display',
                label: 'Display',
                sample: 'Karaköy',
                family: '"Bricolage Grotesque", "Inter", sans-serif',
                italic: false,
                description: 'İddialı, dikkat çekici',
                weight: 700,
              },
              {
                id: 'mono',
                label: 'Mono',
                sample: 'Karaköy',
                family: '"JetBrains Mono", "Courier New", monospace',
                italic: false,
                description: 'Teknik, brutalist',
              },
            ] as const
          ).map((f) => {
            const selected = theme.font_preset === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFontChange(f.id)}
                className="text-left p-4 rounded-[var(--r-sm)] transition-all"
                style={{
                  background: selected
                    ? 'color-mix(in oklab, var(--ink) 4%, var(--card))'
                    : 'var(--card)',
                  border: selected
                    ? '2px solid var(--ink)'
                    : '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    fontFamily: f.family,
                    fontStyle: f.italic ? 'italic' : 'normal',
                    fontSize: 28,
                    fontWeight: 'weight' in f ? (f as { weight: number }).weight : 500,
                    color: 'var(--ink)',
                    lineHeight: 1,
                  }}
                >
                  {f.sample}
                </div>
                <div
                  className="mt-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: selected ? 'var(--ink)' : 'var(--ink-3)',
                  }}
                >
                  {f.label}
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-3)',
                  }}
                >
                  {f.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ========== ÖNİZLEME ========== */}
      <section>
        <SectionHeader
          eyebrow="Adım 4"
          title="Canlı önizleme"
          description="Müşterinin gerçek telefonunda gördüğü menü. Welcome animasyonu, dekoratif öğeler, tüm tema dokunuşları."
        />

        <ThemePreview
          preset={theme.preset}
          accentOverride={theme.accent_override}
          slug={slug}
          rootDomain={rootDomain}
        />
      </section>
    </div>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================
function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--accent)',
        }}
      >
        {eyebrow}
      </div>
      <h3
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 26,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] mt-1"
        style={{ color: 'var(--ink-3)', maxWidth: 580 }}
      >
        {description}
      </p>
    </div>
  );
}

// ============================================================
// THEME CARD - mini canlı önizleme kartı
// ============================================================
function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: ThemeDefinition;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-[14px] overflow-hidden transition-all relative group"
      style={{
        border: selected
          ? '2px solid var(--ink)'
          : '2px solid var(--line)',
        background: 'var(--card)',
        boxShadow: selected
          ? '0 12px 32px -8px rgba(42,31,24,0.18), 0 0 0 1px var(--ink)'
          : '0 2px 8px rgba(42,31,24,0.04)',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Tema mini önizleme - gerçek tema renkleriyle */}
      <div
        className="relative px-4 pt-5 pb-4"
        style={{
          background: theme.colors.paper,
          color: theme.colors.ink,
          fontFamily: theme.fonts.serif,
          height: 156,
        }}
      >
        {/* Pattern hint - bazı temalarda */}
        {theme.background === 'waves' && (
          <svg
            aria-hidden
            width="100%"
            height="100%"
            viewBox="0 0 200 80"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.07,
              pointerEvents: 'none',
            }}
          >
            <path
              d="M 0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40"
              stroke={theme.colors.decor}
              fill="none"
              strokeWidth="2"
            />
          </svg>
        )}
        {theme.background === 'dots' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `radial-gradient(${theme.colors.line} 1px, transparent 1px)`,
              backgroundSize: '14px 14px',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Mini eyebrow */}
          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: theme.colors.decor,
              textTransform: theme.uppercaseEyebrows ? 'uppercase' : 'none',
              marginBottom: 4,
            }}
          >
            {theme.id === 'mediterranean' ? '☼ MENÜ' : 'MENÜ'}
          </div>

          {/* Mini title */}
          <div
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 22,
              fontWeight: 400,
              fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
              letterSpacing: theme.letterSpacingHeadings,
              lineHeight: 1.05,
              color: theme.colors.ink,
              marginBottom: 8,
            }}
          >
            Aleg Cafe
          </div>

          {/* Mini divider preview */}
          <MiniDivider theme={theme} />

          {/* Mini ürün satırı */}
          <div
            className="flex items-baseline justify-between"
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 11,
              color: theme.colors.ink2,
              marginTop: 8,
            }}
          >
            <span>Latte</span>
            <span
              style={{
                fontFamily: theme.fonts.mono,
                color: theme.colors.ink,
                fontWeight: 700,
              }}
            >
              ₺85
            </span>
          </div>
        </div>

        {/* Accent badge köşede */}
        <div
          className="absolute"
          style={{
            top: 12,
            right: 12,
            width: 24,
            height: 24,
            borderRadius:
              theme.radius.base === '2px' || theme.radius.base === '4px'
                ? 4
                : 999,
            background: theme.colors.accent,
            border: `2px solid ${theme.colors.paper}`,
            boxShadow: `0 0 0 1px ${theme.colors.line}`,
          }}
        />
      </div>

      {/* Bottom info */}
      <div
        className="px-4 py-3"
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h4
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {theme.name}
          </h4>
          {selected && (
            <span
              className="grid place-items-center rounded-full"
              style={{
                width: 22,
                height: 22,
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ✓
            </span>
          )}
        </div>
        <p
          className="text-[11px]"
          style={{ color: 'var(--ink-3)', lineHeight: 1.4 }}
        >
          {theme.description}
        </p>
      </div>
    </button>
  );
}

// ============================================================
// MINI DIVIDER - tema kartı içinde mini ayraç önizleme
// ============================================================
function MiniDivider({ theme }: { theme: ThemeDefinition }) {
  const color = theme.colors.decor;

  if (theme.divider === 'line') {
    return (
      <div
        style={{ height: 1, background: theme.colors.line, opacity: 0.7 }}
      />
    );
  }
  if (theme.divider === 'dotted') {
    return (
      <div
        style={{
          borderTop: `1px dotted ${theme.colors.line}`,
        }}
      />
    );
  }
  if (theme.divider === 'doubleline') {
    return (
      <div>
        <div style={{ height: 1, background: color, opacity: 0.6 }} />
        <div
          style={{ height: 1, background: color, marginTop: 2, opacity: 0.4 }}
        />
      </div>
    );
  }

  let centerEl: React.ReactNode = null;
  if (theme.divider === 'star') {
    centerEl = (
      <span style={{ color, fontSize: 10, lineHeight: 1 }}>★</span>
    );
  } else if (theme.divider === 'diamond') {
    centerEl = (
      <span style={{ color, fontSize: 8, lineHeight: 1 }}>◆</span>
    );
  } else if (theme.divider === 'wave') {
    centerEl = (
      <svg width="24" height="6" viewBox="0 0 24 6" fill="none">
        <path
          d="M 1 3 Q 4 1, 7 3 T 13 3 T 19 3 T 23 3"
          stroke={color}
          strokeWidth="1"
          fill="none"
        />
      </svg>
    );
  } else if (theme.divider === 'ornament') {
    centerEl = (
      <svg width="26" height="8" viewBox="0 0 26 8" fill={color}>
        <circle cx="13" cy="4" r="1.5" />
        <path
          d="M 7 4 Q 10 1, 13 4 Q 16 7, 19 4"
          stroke={color}
          strokeWidth="0.7"
          fill="none"
        />
      </svg>
    );
  } else if (theme.divider === 'monogram') {
    centerEl = (
      <span
        style={{
          color,
          fontFamily: theme.fonts.serif,
          fontStyle: theme.fonts.italicSerifHeadings ? 'italic' : 'normal',
          fontSize: 11,
          padding: '0 4px',
        }}
      >
        A
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 1, background: theme.colors.line, opacity: 0.7 }} />
      {centerEl}
      <div style={{ flex: 1, height: 1, background: theme.colors.line, opacity: 0.7 }} />
    </div>
  );
}
