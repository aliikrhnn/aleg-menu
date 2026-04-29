/**
 * QR Menü Tema Sistemi
 * 
 * Her tema bir preset olarak tanımlanır. İşletme bir preset seçer ve
 * isterse accent rengini override eder.
 * 
 * Tema değişkenleri müşteri menüsünde --paper, --ink, --accent vb.
 * CSS variable'larına yazılır.
 */

export type ThemePreset =
  | 'brutalist'
  | 'elite'
  | 'modern'
  | 'vintage'
  | 'minimal';

export type MenuThemeConfig = {
  preset: ThemePreset;
  accent_override: string | null;
};

export type ThemeColors = {
  paper: string;
  paper2: string;
  card: string;
  card2: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  accentInk: string;
  ok: string;
  gold: string;
};

export type ThemeFonts = {
  serif: string;
  sans: string;
  mono: string;
  // Italic serif kullanılır mı (Brutalist Spice tarzı)?
  italicSerifHeadings: boolean;
};

export type ThemeRadius = {
  base: string; // '14px' gibi
  card: string; // ürün kartları
};

export type ThemeDefinition = {
  id: ThemePreset;
  name: string;
  nameEn: string;
  description: string;
  preview: { paper: string; ink: string; accent: string }; // mini önizleme için
  colors: ThemeColors;
  fonts: ThemeFonts;
  radius: ThemeRadius;
  // Opsiyonel: bazı temalar farklı tipografi davranışı ister
  uppercaseEyebrows: boolean; // mono tag'ler büyük harf mi
  letterSpacingHeadings: string;
};

// ============================================================
// TEMA 1: BRUTALIST SPICE (default - mevcut)
// ============================================================
const brutalist: ThemeDefinition = {
  id: 'brutalist',
  name: 'Brutalist Spice',
  nameEn: 'Brutalist Spice',
  description: 'Sıcak, karakter dolu. Kafe ve günlük mekanlar için.',
  preview: { paper: '#FAF5EA', ink: '#2A1F18', accent: '#C4553A' },
  colors: {
    paper: '#FAF5EA',
    paper2: '#F2EBDB',
    card: '#FFFFFF',
    card2: '#F8F2E2',
    ink: '#2A1F18',
    ink2: '#5C4D43',
    ink3: '#8B7E73',
    line: '#E8DFCB',
    accent: '#C4553A',
    accentInk: '#FAF5EA',
    ok: '#5C8C3A',
    gold: '#B8903E',
  },
  fonts: {
    serif: '"Instrument Serif", Georgia, serif',
    sans: '"Bricolage Grotesque", system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    italicSerifHeadings: true,
  },
  radius: {
    base: '14px',
    card: '16px',
  },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '-0.02em',
};

// ============================================================
// TEMA 2: ELITE RESTAURANT
// ============================================================
const elite: ThemeDefinition = {
  id: 'elite',
  name: 'Elit Restoran',
  nameEn: 'Elite Restaurant',
  description: 'Lüks, fine dining. Şarap menüsü, suşi, à la carte.',
  preview: { paper: '#1A1814', ink: '#F2EAD8', accent: '#C9A961' },
  colors: {
    paper: '#1A1814',
    paper2: '#22201A',
    card: '#252220',
    card2: '#2C2925',
    ink: '#F2EAD8',
    ink2: '#C7BFAF',
    ink3: '#8B8377',
    line: '#3A352D',
    accent: '#C9A961', // gold
    accentInk: '#1A1814',
    ok: '#9DAA77',
    gold: '#D4B86A',
  },
  fonts: {
    serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    italicSerifHeadings: false,
  },
  radius: {
    base: '4px', // çok az köşe — sert, ciddi
    card: '6px',
  },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '0.01em',
};

// ============================================================
// TEMA 3: MODERN CAFE
// ============================================================
const modern: ThemeDefinition = {
  id: 'modern',
  name: 'Modern Cafe',
  nameEn: 'Modern Cafe',
  description: 'Temiz, çağdaş, minimal. Specialty kafe, brunch.',
  preview: { paper: '#FFFFFF', ink: '#0A0A0A', accent: '#4ABDAC' },
  colors: {
    paper: '#FFFFFF',
    paper2: '#F5F5F5',
    card: '#FFFFFF',
    card2: '#FAFAFA',
    ink: '#0A0A0A',
    ink2: '#404040',
    ink3: '#737373',
    line: '#E5E5E5',
    accent: '#4ABDAC', // mint
    accentInk: '#FFFFFF',
    ok: '#22C55E',
    gold: '#EAB308',
  },
  fonts: {
    serif: '"Crimson Pro", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicSerifHeadings: false,
  },
  radius: {
    base: '12px',
    card: '12px',
  },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '-0.03em',
};

// ============================================================
// TEMA 4: VINTAGE BISTRO
// ============================================================
const vintage: ThemeDefinition = {
  id: 'vintage',
  name: 'Vintage Bistro',
  nameEn: 'Vintage Bistro',
  description: 'Eski Paris kafesi, retro. Bistro, şarküteri, pastane.',
  preview: { paper: '#F8F0E3', ink: '#3D2817', accent: '#8B2635' },
  colors: {
    paper: '#F8F0E3',
    paper2: '#F0E5D0',
    card: '#FCF6E9',
    card2: '#F4E9D0',
    ink: '#3D2817',
    ink2: '#6B4F33',
    ink3: '#A08A6F',
    line: '#DCC9A6',
    accent: '#8B2635', // deep red
    accentInk: '#F8F0E3',
    ok: '#7A8B3A',
    gold: '#C9A961',
  },
  fonts: {
    serif: '"DM Serif Display", "Lora", Georgia, serif',
    sans: '"Lora", Georgia, serif', // bilinçli serif sans yerine
    mono: '"Courier Prime", "Courier New", monospace',
    italicSerifHeadings: true,
  },
  radius: {
    base: '2px', // neredeyse köşeli — vintage
    card: '4px',
  },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '0',
};

// ============================================================
// TEMA 5: MINIMAL SCANDINAVIAN
// ============================================================
const minimal: ThemeDefinition = {
  id: 'minimal',
  name: 'Minimal Skandinav',
  nameEn: 'Minimal Scandinavian',
  description: 'Sade, soğuk, çağdaş Nordic. Specialty cafe, vegan.',
  preview: { paper: '#FAFAFA', ink: '#2C2C2C', accent: '#B7C4A0' },
  colors: {
    paper: '#FAFAFA',
    paper2: '#F0F0EE',
    card: '#FFFFFF',
    card2: '#F5F5F3',
    ink: '#2C2C2C',
    ink2: '#5C5C5C',
    ink3: '#9C9C9C',
    line: '#E0E0DD',
    accent: '#B7C4A0', // sage
    accentInk: '#2C2C2C',
    ok: '#7A9B6E',
    gold: '#C8B891',
  },
  fonts: {
    serif: '"Söhne", "Inter", system-ui, sans-serif', // serif değil, sade sans
    sans: '"Söhne", "Inter", system-ui, sans-serif',
    mono: '"Söhne Mono", ui-monospace, monospace',
    italicSerifHeadings: false,
  },
  radius: {
    base: '8px',
    card: '10px',
  },
  uppercaseEyebrows: false, // küçük harf — minimal
  letterSpacingHeadings: '-0.01em',
};

// ============================================================
// EXPORT
// ============================================================
export const THEMES: Record<ThemePreset, ThemeDefinition> = {
  brutalist,
  elite,
  modern,
  vintage,
  minimal,
};

export const THEME_LIST: ThemeDefinition[] = [
  brutalist,
  elite,
  modern,
  vintage,
  minimal,
];

export const DEFAULT_THEME: MenuThemeConfig = {
  preset: 'brutalist',
  accent_override: null,
};

/**
 * MenuThemeConfig'i CSS variable'larına dönüştürür.
 * accent_override varsa preset'in accent'ini değiştirir.
 */
export function resolveTheme(config: MenuThemeConfig | null | undefined): ThemeDefinition {
  const preset: ThemePreset =
    config?.preset && THEMES[config.preset] ? config.preset : 'brutalist';
  const base = THEMES[preset];
  if (config?.accent_override && /^#[0-9A-Fa-f]{6}$/.test(config.accent_override)) {
    return {
      ...base,
      colors: { ...base.colors, accent: config.accent_override },
    };
  }
  return base;
}

/**
 * Tema CSS string oluşturur — <style> tag'i içinde inline kullanılır.
 * data attribute scope'ta uygulanır ki kapsam izole olsun.
 */
export function buildThemeCSS(theme: ThemeDefinition, scope = ':root'): string {
  const c = theme.colors;
  const f = theme.fonts;
  const r = theme.radius;
  return `${scope} {
  --paper: ${c.paper};
  --paper-2: ${c.paper2};
  --card: ${c.card};
  --card-2: ${c.card2};
  --ink: ${c.ink};
  --ink-2: ${c.ink2};
  --ink-3: ${c.ink3};
  --line: ${c.line};
  --line-2: ${c.line};
  --accent: ${c.accent};
  --accent-ink: ${c.accentInk};
  --ok: ${c.ok};
  --olive: ${c.ok};
  --gold: ${c.gold};
  --r: ${r.base};
  --r-card: ${r.card};
  --f-serif: ${f.serif};
  --f-sans: ${f.sans};
  --f-mono: ${f.mono};
}`;
}
