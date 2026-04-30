/**
 * Basılı Menü Şablon Sistemi - v2
 *
 * 5 şablon × 4 boyut × header/footer varyasyonları
 *
 * Şablonlar: classic, elite, modern, vintage, minimal
 * Boyutlar: a4 dikey, a4 yatay, a5, plate
 */

export type TemplateId =
  | 'classic'
  | 'elite'
  | 'modern'
  | 'vintage'
  | 'minimal'
  | 'photohero'
  | 'boldbadge'
  | 'editorial';
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
  // Layout karakter — bazı şablonlar farklı düzeni tercih ediyor
  layout?: 'standard' | 'photo-hero' | 'bold-badge' | 'editorial';
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

// ============================================================
// 6. PHOTO HERO — üstte mekan fotoğrafı, altında menü
// (Beyaz Kahve tarzı)
// ============================================================
const photohero: TemplateSpec = {
  id: 'photohero',
  name: 'Foto Hero',
  description:
    'Üstte mekan fotoğrafı, altta menü. Ambiyans + içerik bir arada.',
  colors: {
    paper: '#1F1B17',
    ink: '#F4ECDC',
    ink_soft: '#C9C0AB',
    ink_muted: '#8E8674',
    accent: '#D4A453', // sıcak amber
    line: '#3A332B',
    surface: '#26221C',
    chef: '#D4A453',
  },
  fonts: {
    serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
    italicHeadings: false,
  },
  style: {
    radius: 0,
    productGap: 3,
    categoryGap: 10,
    pagePadding: 14,
    showDotLeaders: true,
    showProductBorders: false,
    showWatermark: false,
    qrFrame: 'bordered',
  },
  layout: 'photo-hero',
  preview: { paper: '#1F1B17', ink: '#F4ECDC', accent: '#D4A453' },
  chefMark: '✦',
  ornamentChar: '✦',
};

// ============================================================
// 7. BOLD BADGE — büyük "MENÜ", logo rozet, iki sütun
// (Moda Kafe tarzı)
// ============================================================
const boldbadge: TemplateSpec = {
  id: 'boldbadge',
  name: 'Bold Badge',
  description:
    'Büyük tipografi "MENÜ", logo rozet. Modern, iddialı, fast-casual.',
  colors: {
    paper: '#F5F2EB',
    ink: '#0F0F0F',
    ink_soft: '#3D3D3D',
    ink_muted: '#7A7A7A',
    accent: '#E8753A', // turuncu
    line: '#1F1F1F',
    surface: '#FFFFFF',
    chef: '#E8753A',
  },
  fonts: {
    serif: '"Inter", system-ui, sans-serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicHeadings: false,
  },
  style: {
    radius: 0,
    productGap: 0, // ürünler arasında çizgi var
    categoryGap: 8,
    pagePadding: 12,
    showDotLeaders: false,
    showProductBorders: false,
    showWatermark: false,
    qrFrame: 'plain',
  },
  layout: 'bold-badge',
  preview: { paper: '#F5F2EB', ink: '#0F0F0F', accent: '#E8753A' },
  chefMark: '◆',
  ornamentChar: '◆',
};

// ============================================================
// 8. EDITORIAL — sol foto + sağ içerik dergi tarzı
// ============================================================
const editorial: TemplateSpec = {
  id: 'editorial',
  name: 'Editorial',
  description:
    'Dergi tarzı, sol foto + sağ menü. Sayı/tarih damgalı, butik.',
  colors: {
    paper: '#FBF8F3',
    ink: '#1C1C1C',
    ink_soft: '#3A3A3A',
    ink_muted: '#8A8A8A',
    accent: '#9B2D2D', // bordo
    line: '#D6D0C2',
    surface: '#FFFFFF',
    chef: '#9B2D2D',
  },
  fonts: {
    serif: '"DM Serif Display", "Playfair Display", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    italicHeadings: true,
  },
  style: {
    radius: 0,
    productGap: 4,
    categoryGap: 12,
    pagePadding: 14,
    showDotLeaders: true,
    showProductBorders: false,
    showWatermark: false,
    qrFrame: 'corner',
  },
  layout: 'editorial',
  preview: { paper: '#FBF8F3', ink: '#1C1C1C', accent: '#9B2D2D' },
  chefMark: '※',
  ornamentChar: '✦',
};

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  classic,
  elite,
  modern,
  vintage,
  minimal,
  photohero,
  boldbadge,
  editorial,
};

export const TEMPLATE_LIST: TemplateSpec[] = [
  classic,
  elite,
  modern,
  vintage,
  minimal,
  photohero,
  boldbadge,
  editorial,
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
