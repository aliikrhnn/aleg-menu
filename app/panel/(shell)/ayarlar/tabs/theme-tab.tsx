'use client';

import { useState } from 'react';
import {
  THEME_LIST,
  type ThemeDefinition,
  type ThemePreset,
  resolveTheme,
} from '@/lib/menu-themes';
import { ThemePreview } from './theme-preview';

type Props = {
  theme: {
    preset: ThemePreset;
    accent_override: string | null;
  };
  onChange: (next: {
    preset: ThemePreset;
    accent_override: string | null;
  }) => void;
  businessName: string;
};

// Önerilen renk paleti
const SUGGESTED_COLORS = [
  '#C4553A', // brutalist accent
  '#C9A961', // gold
  '#4ABDAC', // mint
  '#8B2635', // deep red
  '#B7C4A0', // sage
  '#1F4E5F', // ocean blue
  '#7A5C9F', // dusty purple
  '#D97757', // terracotta
  '#0F766E', // emerald
  '#92400E', // amber brown
];

export function ThemeTab({ theme, onChange, businessName }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(
    theme.accent_override || '#C4553A'
  );
  const resolved = resolveTheme(theme);

  const handleSelectPreset = (preset: ThemePreset) => {
    onChange({ preset, accent_override: theme.accent_override });
  };

  const handleAccentChange = (color: string | null) => {
    onChange({ preset: theme.preset, accent_override: color });
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
          description="Müşteri menüsünün karakteri ve atmosferi. İstediğin zaman değiştirebilirsin."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          description="İstersen temanın varsayılan rengini değiştir. Butonlarda, başlıklarda ve detaylarda kullanılır."
        />

        <div className="rounded-[var(--r)] p-5" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <div className="flex items-start gap-4 flex-wrap">
            {/* Default - tema rengini kullan */}
            <button
              type="button"
              onClick={() => handleAccentChange(null)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: 56,
                  height: 56,
                  background: resolveTheme({ preset: theme.preset, accent_override: null }).colors.accent,
                  border:
                    theme.accent_override === null
                      ? '3px solid var(--ink)'
                      : '3px solid transparent',
                  boxShadow: theme.accent_override === null
                    ? '0 0 0 2px var(--paper)'
                    : 'none',
                  transform: theme.accent_override === null ? 'scale(1.05)' : 'scale(1)',
                }}
              />
              <span
                className="text-[10px] uppercase font-bold"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.14em',
                  color: theme.accent_override === null ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                Varsayılan
              </span>
            </button>

            {/* Önerilen renkler */}
            {SUGGESTED_COLORS.map((color) => {
              const selected = theme.accent_override === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleAccentChange(color)}
                  className="flex flex-col items-center gap-2 group"
                  title={color}
                >
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: 56,
                      height: 56,
                      background: color,
                      border: selected
                        ? '3px solid var(--ink)'
                        : '3px solid transparent',
                      boxShadow: selected
                        ? '0 0 0 2px var(--paper)'
                        : 'none',
                      transform: selected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />
                  <span
                    className="text-[9px] uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.06em',
                      color: 'var(--ink-3)',
                      textTransform: 'lowercase',
                    }}
                  >
                    {color}
                  </span>
                </button>
              );
            })}

            {/* Özel renk */}
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="rounded-full grid place-items-center transition-all"
                style={{
                  width: 56,
                  height: 56,
                  background:
                    'conic-gradient(from 0deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #ef4444)',
                  border: '3px solid var(--line)',
                }}
              >
                <span
                  className="grid place-items-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: 14,
                  }}
                >
                  +
                </span>
              </div>
              <span
                className="text-[10px] uppercase font-bold"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                Özel
              </span>
            </button>
          </div>

          {/* Özel renk picker */}
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

      {/* ========== ÖNİZLEME ========== */}
      <section>
        <SectionHeader
          eyebrow="Adım 3"
          title="Önizleme"
          description="Müşteri menüsü bu şekilde görünecek. Kaydet'e basana kadar değişiklikler canlı olmaz."
        />

        <ThemePreview theme={resolved} businessName={businessName} />
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
        style={{ color: 'var(--ink-3)', maxWidth: 560 }}
      >
        {description}
      </p>
    </div>
  );
}

// ============================================================
// THEME CARD - büyük tema seçim kartı
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
      className="text-left rounded-[14px] overflow-hidden transition-all relative group/card"
      style={{
        border: selected
          ? '2px solid var(--ink)'
          : '2px solid var(--line)',
        background: 'var(--card)',
        boxShadow: selected
          ? '0 8px 24px rgba(42,31,24,0.12)'
          : '0 2px 8px rgba(42,31,24,0.04)',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Tema mini preview - gerçek temanın renkleriyle */}
      <div
        className="relative px-4 pt-5 pb-4"
        style={{
          background: theme.colors.paper,
          color: theme.colors.ink,
          fontFamily: theme.fonts.serif,
          height: 140,
        }}
      >
        {/* Mini eyebrow */}
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: theme.colors.ink3,
            textTransform: theme.uppercaseEyebrows ? 'uppercase' : 'none',
            marginBottom: 4,
          }}
        >
          MENÜ
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

        {/* Mini ürün satırı */}
        <div
          className="flex items-baseline justify-between"
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 11,
            color: theme.colors.ink2,
            paddingTop: 6,
            borderTop: `1px solid ${theme.colors.line}`,
          }}
        >
          <span>Latte</span>
          <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.ink }}>
            ₺85
          </span>
        </div>
        <div
          className="flex items-baseline justify-between mt-1"
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 11,
            color: theme.colors.ink2,
          }}
        >
          <span>Cheesecake</span>
          <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.ink }}>
            ₺120
          </span>
        </div>

        {/* Accent badge */}
        <div
          className="absolute"
          style={{
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: theme.radius.base === '2px' ? 2 : 999,
            background: theme.colors.accent,
            border: `2px solid ${theme.colors.paper}`,
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
          style={{
            color: 'var(--ink-3)',
            lineHeight: 1.4,
          }}
        >
          {theme.description}
        </p>
      </div>
    </button>
  );
}
