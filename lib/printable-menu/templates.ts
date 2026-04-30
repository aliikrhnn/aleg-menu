/**
 * Basılı Menü Şablon Sistemi - v2
 *
 * 5 şablon × 4 boyut × header/footer varyasyonları
 *
 * Şablonlar: classic, elite, modern, vintage, minimal
 * Boyutlar: a4 dikey, a4 yatay, a5, plate
 */

export type TemplateId = 'classic' | 'elite' | 'modern' | 'vintage' | 'minimal';
export type PaperSize = 'a4' | 'a4_landscape' | 'a5' | 'plate';
export type HeaderVariant = 'centered' | 'split' | 'monogram';
export type FooterVariant = 'minimal' | 'social' | 'full';

export type SizeSpec = {
  id: PaperSize;
  name: string;
  width_mm: number;
  height_mm: number;
  description: string;
  isLandscape: boolean;
};

export const SIZES: Record<PaperSize, SizeSpec> = {
  a4: {
    id: 'a4',
    name: 'A4 Dikey',
    width_mm: 210,
    height_mm: 297,
    description: 'En yaygın boyut. Pano, çerçeve, masa.',
    isLandscape: false,
  },
  a4_landscape: {
    id: 'a4_landscape',
    name: 'A4 Yatay',
    width_mm: 297,
    height_mm: 210,
    description: 'Geniş layout. 2 sütun ürün, masa altlığı.',
    isLandscape: true,
  },
  a5: {
    id: 'a5',
    name: 'A5 Dikey',
    width_mm: 148,
    height_mm: 210,
    description: 'Kompakt. Masa üstü, broşür.',
    isLandscape: false,
  },
  plate: {
    id: 'plate',
    name: 'Pláka 24×36',
    width_mm: 240,
    height_mm: 360,
    description: 'Büyük masa menüsü. Restoranlar.',
    isLandscape: false,
  },
};

export type TemplateSpec = {
  id: TemplateId;
  name: string;
  description: string;
  colors: {
    paper: string;
    ink: string;
    ink_soft: string;
    ink_muted: string;
    accent: string;
    line: string;
    surface: string;
    chef: string; // şefin önerisi rozeti rengi
  };
  fonts: {
    serif: string;
    sans: string;
    mono: string;
    italicHeadings: boolean;
  };
  style: {
    radius: number;
    productGap: number;
    categoryGap: number;
    pagePadding: number;
    showDotLeaders: boolean;
    showProductBorders: boolean;
    showWatermark: boolean;
    qrFrame: 'plain' | 'bordered' | 'badge' | 'corner';
  };
  preview: {
    paper: string;
    ink: string;
    accent: string;
  };
  // Şefin önerisi rozeti karakteri
  chefMark: string; // ★ ✦ ◆ ※ ◇
  // Yıldız/öne çıkanı SVG mi yoksa karakter mi?
  ornamentChar: string;
};

const classic: TemplateSpec = {
  id: 'classic',
  name: 'Klasik Liste',
  description: 'Dot leaders ile geleneksel menü. Restoranlar için zamansız.',
  colors: {
    paper: '#FAF5EA',
    ink: '#2A1F18',
    ink_soft: '#5C4D43',
    ink_muted: '#8B7E73',
    accent: '#C4553A',
    line: '#D8CDB7',
    surface: 'transparent',
    chef: '#B8903E',
  },
  fonts: {
    serif: '"Instrument Serif", Georgia, serif',
    sans: '"Bricolage Grotesque", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
    italicHeadings: true,
  },
  style: {
    radius: 0,
    productGap: 4,
    categoryGap: 12,
    pagePadding: 18,
    showDotLeaders: true,
    showProductBorders: false,
    showWatermark: false,
    qrFrame: 'plain',
  },
  preview: { paper: '#FAF5EA', ink: '#2A1F18', accent: '#C4553A' },
  chefMark: '★',
  ornamentChar: '✦',
};

const elite: TemplateSpec = {
  id: 'elite',
  name: 'Elit',
  description: 'Fine dining, gold tonlar, geniş whitespace. Premium his.',
  colors: {
    paper: '#1A1814',
    ink: '#F2EAD8',
    ink_soft: '#C7BFAF',
    ink_muted: '#8B8377',
    accent: '#C9A961',
    line: '#3A352D',
    surface: 'transparent',
    chef: '#D4B86A',
  },
  fonts: {
    serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: 'ui-monospace, Menlo, monospace',
    italicHeadings: false,
  },
  style: {
    radius: 0,
    productGap: 8,
    categoryGap: 18,
    pagePadding: 22,
    showDotLeaders: false,
    showProductBorders: false,
    showWatermark: true,
    qrFrame: 'bordered',
  },
  preview: { paper: '#1A1814', ink: '#F2EAD8', accent: '#C9A961' },
  chefMark: '✦',
  ornamentChar: '✦',
};

const modern: TemplateSpec = {
  id: 'modern',
  name: 'Modern Grid',
  description: 'Kart sistem, contemporary. Specialty kafe ve brunch için.',
  colors: {
    paper: '#FFFFFF',
    ink: '#0A0A0A',
    ink_soft: '#404040',
    ink_muted: '#737373',
    accent: '#4ABDAC',
    line: '#E5E5E5',
    surface: '#FAFAFA',
    chef: '#4ABDAC',
  },
  fonts: {
    serif: '"Crimson Pro", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicHeadings: false,
  },
  style: {
    radius: 4,
    productGap: 5,
    categoryGap: 12,
    pagePadding: 16,
    showDotLeaders: false,
    showProductBorders: true,
    showWatermark: false,
    qrFrame: 'badge',
  },
  preview: { paper: '#FFFFFF', ink: '#0A0A0A', accent: '#4ABDAC' },
  chefMark: '◆',
  ornamentChar: '◆',
};

const vintage: TemplateSpec = {
  id: 'vintage',
  name: 'Vintage Bistro',
  description: 'Eski Paris kafesi. Süslü ayraçlar, kahverengi tonlar.',
  colors: {
    paper: '#F8F0E3',
    ink: '#3D2817',
    ink_soft: '#6B4F33',
    ink_muted: '#A08A6F',
    accent: '#8B2635',
    line: '#C5AA82',
    surface: 'transparent',
    chef: '#C9A961',
  },
  fonts: {
    serif: '"DM Serif Display", "Lora", Georgia, serif',
    sans: '"Lora", Georgia, serif',
    mono: '"Courier Prime", monospace',
    italicHeadings: true,
  },
  style: {
    radius: 0,
    productGap: 5,
    categoryGap: 14,
    pagePadding: 20,
    showDotLeaders: true,
    showProductBorders: false,
    showWatermark: false,
    qrFrame: 'corner',
  },
  preview: { paper: '#F8F0E3', ink: '#3D2817', accent: '#8B2635' },
  chefMark: '※',
  ornamentChar: '✦',
};

const minimal: TemplateSpec = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Çıplak, sadece tipografi. Modern Skandinav stüdyo.',
  colors: {
    paper: '#FAFAFA',
    ink: '#1A1A1A',
    ink_soft: '#5C5C5C',
    ink_muted: '#9C9C9C',
    accent: '#1A1A1A',
    line: '#E0E0DD',
    surface: 'transparent',
    chef: '#1A1A1A',
  },
  fonts: {
    serif: '"Inter", system-ui, sans-serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicHeadings: false,
  },
  style: {
    radius: 0,
    productGap: 6,
    categoryGap: 16,
    pagePadding: 24,
    showDotLeaders: false,
    showProductBorders: false,
    showWatermark: false,
    qrFrame: 'plain',
  },
  preview: { paper: '#FAFAFA', ink: '#1A1A1A', accent: '#1A1A1A' },
  chefMark: '◇',
  ornamentChar: '◆',
};

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  classic,
  elite,
  modern,
  vintage,
  minimal,
};

export const TEMPLATE_LIST: TemplateSpec[] = [
  classic,
  elite,
  modern,
  vintage,
  minimal,
];

export const SIZE_LIST: SizeSpec[] = [
  SIZES.a4,
  SIZES.a4_landscape,
  SIZES.a5,
  SIZES.plate,
];

// ============================================================
// HEADER VARIANT META
// ============================================================
export const HEADER_VARIANTS: Array<{
  id: HeaderVariant;
  name: string;
  description: string;
}> = [
  {
    id: 'centered',
    name: 'Merkezde',
    description: 'Logo ortada, ad altında, slogan en altta. Klasik.',
  },
  {
    id: 'split',
    name: 'Yan yana',
    description: 'Sol logo, sağ ad+slogan. Modern editorial.',
  },
  {
    id: 'monogram',
    name: 'Monogram',
    description: 'Büyük baş harf, ad altta. Lüks his.',
  },
];

export const FOOTER_VARIANTS: Array<{
  id: FooterVariant;
  name: string;
  description: string;
}> = [
  {
    id: 'minimal',
    name: 'Sadece QR',
    description: 'QR kod ve kısa CTA. Temiz.',
  },
  {
    id: 'social',
    name: 'QR + sosyal',
    description: 'QR + telefon + Instagram + adres. Standart.',
  },
  {
    id: 'full',
    name: 'Tam bilgi',
    description: 'QR + tüm iletişim + watermark imza.',
  },
];

// ============================================================
// DIETARY TAG ETIKETLERI
// ============================================================
export const DIETARY_TAG_INFO: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  vegan: { icon: '🌱', label: 'Vegan', color: '#4A8C2A' },
  vegetarian: { icon: '🥬', label: 'Vejetaryen', color: '#5C8C3A' },
  gluten_free: { icon: 'GF', label: 'Glütensiz', color: '#B8903E' },
  lactose_free: { icon: 'LF', label: 'Laktozsuz', color: '#1F70B7' },
  halal: { icon: '☪', label: 'Helal', color: '#1F70B7' },
  organic: { icon: '✿', label: 'Organik', color: '#5C8C3A' },
  homemade: { icon: '⌂', label: 'Ev yapımı', color: '#B8903E' },
};
