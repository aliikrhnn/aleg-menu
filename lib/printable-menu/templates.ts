/**
 * Basılı Menü Şablon Sistemi
 * 
 * 5 şablon × 3 boyut = 15 kombinasyon
 * 
 * Şablonlar:
 *  1. classic   — Klasik liste (dot leaders, kategoriler ayraç)
 *  2. elite     — Elit çizgisel (fine dining, watermark, gold)
 *  3. modern    — Modern grid (kart sistem, color block)
 *  4. vintage   — Vintage bistro (eski Paris, ornaments)
 *  5. minimal   — Minimal Skandinav (sade, sadece tipografi)
 * 
 * Boyutlar:
 *  - a4   : A4 dikey  (210 × 297 mm)
 *  - a5   : A5 dikey  (148 × 210 mm)
 *  - plate: Pláka     (240 × 360 mm) — masa menüsü
 */

export type TemplateId = 'classic' | 'elite' | 'modern' | 'vintage' | 'minimal';
export type PaperSize = 'a4' | 'a5' | 'plate';

export type SizeSpec = {
  id: PaperSize;
  name: string;
  width_mm: number;
  height_mm: number;
  description: string;
};

export const SIZES: Record<PaperSize, SizeSpec> = {
  a4: {
    id: 'a4',
    name: 'A4 Dikey',
    width_mm: 210,
    height_mm: 297,
    description: 'En yaygın boyut. Pano, çerçeve, masa için.',
  },
  a5: {
    id: 'a5',
    name: 'A5 Dikey',
    width_mm: 148,
    height_mm: 210,
    description: 'Kompakt. Masa üstü, broşür.',
  },
  plate: {
    id: 'plate',
    name: 'Pláka 24×36',
    width_mm: 240,
    height_mm: 360,
    description: 'Büyük masa menüsü. Restoranlar için.',
  },
};

export type TemplateSpec = {
  id: TemplateId;
  name: string;
  description: string;
  // Renk paleti
  colors: {
    paper: string;
    ink: string;
    ink_soft: string;
    ink_muted: string;
    accent: string;
    line: string;
    surface: string; // ürün satırı arka planı
  };
  // Tipografi
  fonts: {
    serif: string;
    sans: string;
    mono: string;
    italicHeadings: boolean;
  };
  // Stil parametreleri
  style: {
    radius: number; // mm
    productGap: number; // mm
    categoryGap: number; // mm
    pagePadding: number; // mm
    showDotLeaders: boolean; // ürün - fiyat arası noktalar
    showProductBorders: boolean;
    showWatermark: boolean;
    headerStyle: 'centered' | 'left' | 'badge';
    qrFrame: 'plain' | 'bordered' | 'badge' | 'corner';
  };
  // Önizleme için mini renkler (kart üstünde gösterilir)
  preview: {
    paper: string;
    ink: string;
    accent: string;
  };
};

// ============================================================
// 1. CLASSIC (klasik liste)
// ============================================================
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
    headerStyle: 'centered',
    qrFrame: 'plain',
  },
  preview: { paper: '#FAF5EA', ink: '#2A1F18', accent: '#C4553A' },
};

// ============================================================
// 2. ELITE (fine dining)
// ============================================================
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
    headerStyle: 'centered',
    qrFrame: 'bordered',
  },
  preview: { paper: '#1A1814', ink: '#F2EAD8', accent: '#C9A961' },
};

// ============================================================
// 3. MODERN (grid sistem)
// ============================================================
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
    headerStyle: 'badge',
    qrFrame: 'badge',
  },
  preview: { paper: '#FFFFFF', ink: '#0A0A0A', accent: '#4ABDAC' },
};

// ============================================================
// 4. VINTAGE (Paris bistro)
// ============================================================
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
    headerStyle: 'centered',
    qrFrame: 'corner',
  },
  preview: { paper: '#F8F0E3', ink: '#3D2817', accent: '#8B2635' },
};

// ============================================================
// 5. MINIMAL (Skandinav)
// ============================================================
const minimal: TemplateSpec = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Çıplak, sadece tipografi. Modern Skandinav stüdyo.',
  colors: {
    paper: '#FAFAFA',
    ink: '#1A1A1A',
    ink_soft: '#5C5C5C',
    ink_muted: '#9C9C9C',
    accent: '#1A1A1A', // accent yok, sadece ink
    line: '#E0E0DD',
    surface: 'transparent',
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
    headerStyle: 'left',
    qrFrame: 'plain',
  },
  preview: { paper: '#FAFAFA', ink: '#1A1A1A', accent: '#1A1A1A' },
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

export const SIZE_LIST: SizeSpec[] = [SIZES.a4, SIZES.a5, SIZES.plate];
