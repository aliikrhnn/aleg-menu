/**
 * QR Menü Tema Sistemi - v2
 * 
 * 7 tema (5 mevcut + 2 yeni) + ornament & dekoratif sistem.
 * Her tema kendi karakter dilini taşıyor:
 *  - Renkler
 *  - Tipografi  
 *  - Hero stili (logo + slogan üst bölge)
 *  - Kategori ayracı (SVG ornament)
 *  - Ürün satırı varyantı
 *  - Background pattern (opsiyonel)
 *  - Welcome animasyon karakteri
 */

export type ThemePreset =
  | 'brutalist'
  | 'elite'
  | 'modern'
  | 'vintage'
  | 'minimal'
  | 'mediterranean'
  | 'darkluxe';

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
  // YENİ: dekoratif öğeler için
  decor: string; // ornament/divider rengi
  glow: string;  // halka/parlama rengi
};

export type ThemeFonts = {
  serif: string;
  sans: string;
  mono: string;
  italicSerifHeadings: boolean;
};

export type ThemeRadius = {
  base: string;
  card: string;
};

// YENİ: Dekoratif öğe seçimi
export type DividerStyle =
  | 'line'        // Düz çizgi (default)
  | 'dotted'      // Noktalı çizgi
  | 'doubleline'  // Çift ince çizgi
  | 'ornament'    // SVG ornament ortada (vintage)
  | 'star'        // ★ ortada
  | 'wave'        // Dalga (mediterranean)
  | 'diamond'     // ◇ ortada
  | 'monogram';   // İşletmenin baş harfi

export type HeroStyle =
  | 'centered'     // Logo+ad merkez (klasik)
  | 'left'         // Sol hizalı (modern)
  | 'badge'        // Modern grid badge
  | 'editorial'    // Tarihli editorial (dergi)
  | 'monogram'     // Büyük monogram + ad altta
  | 'circular';    // Daire içinde (mediterranean)

export type ProductRowStyle =
  | 'classic'    // Ad sol, fiyat sağ
  | 'card'       // Kart içinde (modern)
  | 'numbered'   // Numaralı liste (vintage menü kart)
  | 'spotlight'; // Featured ürün öne çıkar

export type BackgroundPattern =
  | 'none'
  | 'noise'      // İnce gren
  | 'paper'      // Kağıt dokusu
  | 'grid'       // Çok ince grid
  | 'dots'       // Noktalar
  | 'waves';     // Dalgalar (mediterranean)

export type ThemeDefinition = {
  id: ThemePreset;
  name: string;
  nameEn: string;
  description: string;
  preview: { paper: string; ink: string; accent: string };
  colors: ThemeColors;
  fonts: ThemeFonts;
  radius: ThemeRadius;
  uppercaseEyebrows: boolean;
  letterSpacingHeadings: string;
  // YENİ alanlar
  hero: HeroStyle;
  divider: DividerStyle;
  productRow: ProductRowStyle;
  background: BackgroundPattern;
  // Welcome animasyon karakteri
  welcomeAnim: 'fade' | 'slide' | 'reveal' | 'spotlight' | 'curtain';
  // Featured/öne çıkan ürün ikon karakteri
  featuredMark: '★' | '✦' | '✧' | '◆' | '☼' | '※';
};

// ============================================================
// TEMA 1: BRUTALIST SPICE
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
    decor: '#C4553A',
    glow: '#C4553A',
  },
  fonts: {
    serif: '"Instrument Serif", Georgia, serif',
    sans: '"Bricolage Grotesque", system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    italicSerifHeadings: true,
  },
  radius: { base: '14px', card: '16px' },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '-0.02em',
  hero: 'editorial',
  divider: 'star',
  productRow: 'spotlight',
  background: 'paper',
  welcomeAnim: 'reveal',
  featuredMark: '★',
};

// ============================================================
// TEMA 2: ELITE
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
    accent: '#C9A961',
    accentInk: '#1A1814',
    ok: '#9DAA77',
    gold: '#D4B86A',
    decor: '#C9A961',
    glow: '#C9A961',
  },
  fonts: {
    serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    italicSerifHeadings: false,
  },
  radius: { base: '4px', card: '6px' },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '0.01em',
  hero: 'centered',
  divider: 'doubleline',
  productRow: 'classic',
  background: 'noise',
  welcomeAnim: 'curtain',
  featuredMark: '✦',
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
    accent: '#4ABDAC',
    accentInk: '#FFFFFF',
    ok: '#22C55E',
    gold: '#EAB308',
    decor: '#4ABDAC',
    glow: '#4ABDAC',
  },
  fonts: {
    serif: '"Crimson Pro", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicSerifHeadings: false,
  },
  radius: { base: '12px', card: '12px' },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '-0.03em',
  hero: 'badge',
  divider: 'line',
  productRow: 'card',
  background: 'grid',
  welcomeAnim: 'slide',
  featuredMark: '◆',
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
    accent: '#8B2635',
    accentInk: '#F8F0E3',
    ok: '#7A8B3A',
    gold: '#C9A961',
    decor: '#8B2635',
    glow: '#C9A961',
  },
  fonts: {
    serif: '"DM Serif Display", "Lora", Georgia, serif',
    sans: '"Lora", Georgia, serif',
    mono: '"Courier Prime", "Courier New", monospace',
    italicSerifHeadings: true,
  },
  radius: { base: '2px', card: '4px' },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '0',
  hero: 'monogram',
  divider: 'ornament',
  productRow: 'numbered',
  background: 'paper',
  welcomeAnim: 'curtain',
  featuredMark: '※',
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
    accent: '#B7C4A0',
    accentInk: '#2C2C2C',
    ok: '#7A9B6E',
    gold: '#C8B891',
    decor: '#B7C4A0',
    glow: '#B7C4A0',
  },
  fonts: {
    serif: '"Söhne", "Inter", system-ui, sans-serif',
    sans: '"Söhne", "Inter", system-ui, sans-serif',
    mono: '"Söhne Mono", ui-monospace, monospace',
    italicSerifHeadings: false,
  },
  radius: { base: '8px', card: '10px' },
  uppercaseEyebrows: false,
  letterSpacingHeadings: '-0.01em',
  hero: 'left',
  divider: 'line',
  productRow: 'classic',
  background: 'none',
  welcomeAnim: 'fade',
  featuredMark: '◆',
};

// ============================================================
// TEMA 6: MEDITERRANEAN (YENİ)
// ============================================================
const mediterranean: ThemeDefinition = {
  id: 'mediterranean',
  name: 'Mediterranean',
  nameEn: 'Mediterranean',
  description: 'Beyaz, gök mavisi, güneşli sarı. Sahil, balık, meze.',
  preview: { paper: '#FAFBFE', ink: '#0E3A5F', accent: '#E8B547' },
  colors: {
    paper: '#FAFBFE',
    paper2: '#F0F4FA',
    card: '#FFFFFF',
    card2: '#F5F8FC',
    ink: '#0E3A5F',
    ink2: '#345B7C',
    ink3: '#7A92A8',
    line: '#D5DEEA',
    accent: '#E8B547', // güneşli sarı
    accentInk: '#0E3A5F',
    ok: '#3D8B7A',
    gold: '#E8B547',
    decor: '#1F70B7', // gök mavisi
    glow: '#E8B547',
  },
  fonts: {
    serif: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
    italicSerifHeadings: true,
  },
  radius: { base: '20px', card: '20px' }, // yumuşak
  uppercaseEyebrows: true,
  letterSpacingHeadings: '-0.015em',
  hero: 'circular',
  divider: 'wave',
  productRow: 'classic',
  background: 'waves',
  welcomeAnim: 'spotlight',
  featuredMark: '☼',
};

// ============================================================
// TEMA 7: DARK LUXE (YENİ)
// ============================================================
const darkluxe: ThemeDefinition = {
  id: 'darkluxe',
  name: 'Dark Luxe',
  nameEn: 'Dark Luxe',
  description: 'Modern karanlık. Hayat tarzı kafe, bar, lounge.',
  preview: { paper: '#0E0E10', ink: '#FAFAFA', accent: '#E04F5F' },
  colors: {
    paper: '#0E0E10',
    paper2: '#16161A',
    card: '#1A1A1F',
    card2: '#202028',
    ink: '#FAFAFA',
    ink2: '#B8B8BC',
    ink3: '#7A7A82',
    line: '#28282F',
    accent: '#E04F5F',
    accentInk: '#FAFAFA',
    ok: '#5DD39E',
    gold: '#E0B45F',
    decor: '#E04F5F',
    glow: '#E04F5F',
  },
  fonts: {
    serif: '"Inter", system-ui, sans-serif', // serif yok, sade
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicSerifHeadings: false,
  },
  radius: { base: '16px', card: '18px' },
  uppercaseEyebrows: true,
  letterSpacingHeadings: '-0.025em',
  hero: 'left',
  divider: 'diamond',
  productRow: 'card',
  background: 'dots',
  welcomeAnim: 'slide',
  featuredMark: '✧',
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
  mediterranean,
  darkluxe,
};

export const THEME_LIST: ThemeDefinition[] = [
  brutalist,
  elite,
  modern,
  vintage,
  minimal,
  mediterranean,
  darkluxe,
];

export const DEFAULT_THEME: MenuThemeConfig = {
  preset: 'brutalist',
  accent_override: null,
};

export function resolveTheme(
  config: MenuThemeConfig | null | undefined
): ThemeDefinition {
  const preset: ThemePreset =
    config?.preset && THEMES[config.preset] ? config.preset : 'brutalist';
  const base = THEMES[preset];
  if (
    config?.accent_override &&
    /^#[0-9A-Fa-f]{6}$/.test(config.accent_override)
  ) {
    return {
      ...base,
      colors: {
        ...base.colors,
        accent: config.accent_override,
        decor: config.accent_override,
        glow: config.accent_override,
      },
    };
  }
  return base;
}

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
  --decor: ${c.decor};
  --glow: ${c.glow};
  --r: ${r.base};
  --r-card: ${r.card};
  --f-serif: ${f.serif};
  --f-sans: ${f.sans};
  --f-mono: ${f.mono};
}`;
}
