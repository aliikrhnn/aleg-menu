'use client';

import QRCode from 'qrcode';

// ============================================================
// QR Design Templates
// ============================================================
// 4 farklı kart tasarımı. Her biri SVG string üretir.
// SVG'yi sonra PNG'ye veya PDF'e çevirebiliriz.
// ============================================================

export type QrDesign =
  | 'minimal'
  | 'warm'
  | 'dark'
  | 'kraft'
  | 'boutique'
  | 'mint'
  | 'mono';

export type QrLang = 'tr' | 'en';

export type QrCardInput = {
  design: QrDesign;
  qrDataUrl: string; // data:image/svg+xml;base64,... QR kodunun SVG'si
  tableName: string; // "Masa 1"
  businessName: string; // "Karaköy"
  lang?: QrLang;
  // Kart boyutu (px). PDF'te 4'lü grid için 280x400 iyi boyut.
  width?: number;
  height?: number;
};

// Dile göre metin tabloları
const TEXTS = {
  tr: {
    topLabel: 'QR · SİPARİŞ',
    topLabelDark: 'DİJİTAL MENÜ',
    topLabelBoutique: 'LA CARTE',
    topLabelMint: 'MENÜ',
    topLabelMono: 'SCAN',
    instruction: 'Kameranı aç · menüyü görüntüle',
    instructionWarm: 'kameranı aç, menüyü görüntüle',
    instructionDark: 'kamerayı yönelt · menüyü gör',
    instructionKraft: '— tara ve sipariş ver —',
    instructionBoutique: 'kameranı yönelt — menü açılsın',
    instructionMint: 'kamerayı QR\u2019a tut',
    instructionMono: 'POINT · SCAN · ORDER',
    welcome: 'hoş geldin',
    welcomeBoutique: 'mutlu masalar',
    welcomeMint: 'taze sipariş',
  },
  en: {
    topLabel: 'QR · ORDER',
    topLabelDark: 'DIGITAL MENU',
    topLabelBoutique: 'A LA CARTE',
    topLabelMint: 'MENU',
    topLabelMono: 'SCAN',
    instruction: 'Open camera · view menu',
    instructionWarm: 'open camera, view menu',
    instructionDark: 'scan with camera · view menu',
    instructionKraft: '— scan & order —',
    instructionBoutique: 'point camera — menu opens',
    instructionMint: 'point camera at QR',
    instructionMono: 'POINT · SCAN · ORDER',
    welcome: 'welcome',
    welcomeBoutique: 'happy tables',
    welcomeMint: 'fresh order',
  },
};

export const DESIGN_META: Record<
  QrDesign,
  { label: string; description: string; preview: { bg: string; accent: string; ink: string } }
> = {
  minimal: {
    label: 'Minimal',
    description: 'Sade beyaz, her ortama uyar',
    preview: { bg: '#FFFFFF', accent: '#1A1410', ink: '#1A1410' },
  },
  warm: {
    label: 'Warm Editorial',
    description: 'Aleg marka renkleri, bej kağıt',
    preview: { bg: '#F4EEE2', accent: '#C4553A', ink: '#2A1F18' },
  },
  dark: {
    label: 'Dark Coffee',
    description: 'Lüks kafe, koyu kahverengi',
    preview: { bg: '#1A1410', accent: '#E08060', ink: '#F2E9DA' },
  },
  kraft: {
    label: 'Kraft Card',
    description: 'Vintage, el yapımı his',
    preview: { bg: '#D6BE9B', accent: '#8B3B24', ink: '#3A2816' },
  },
  boutique: {
    label: 'Boutique Gold',
    description: 'Altın detaylar, ipek krem zemin · butik mekanlar',
    preview: { bg: '#FAF6EE', accent: '#B8903E', ink: '#1F1815' },
  },
  mint: {
    label: 'Fresh Mint',
    description: 'Taze yeşil, modern brunch · fitness/sağlıklı kafe',
    preview: { bg: '#E8F2EC', accent: '#2D5F4C', ink: '#0F2620' },
  },
  mono: {
    label: 'Mono Editorial',
    description: 'Siyah-beyaz iddialı tipografi · sade ama güçlü',
    preview: { bg: '#0A0A0A', accent: '#FFFFFF', ink: '#FFFFFF' },
  },
};

// QR kodunu PNG data URL olarak üret
export async function generateQrDataUrl(url: string, design: QrDesign): Promise<string> {
  // QR her zaman KOYU renkte - çünkü her tasarımda QR'ın arkasında
  // açık renk bir kart var (dark/mono tema'da da krem/beyaz kart)
  let fg: string;
  switch (design) {
    case 'kraft':
      fg = '#3A2816';
      break;
    case 'boutique':
      fg = '#1F1815';
      break;
    case 'mint':
      fg = '#0F2620';
      break;
    case 'mono':
      fg = '#0A0A0A'; // beyaz kart üzerinde siyah QR
      break;
    default:
      fg = '#1A1410';
  }

  return await QRCode.toDataURL(url, {
    margin: 1,
    errorCorrectionLevel: 'M',
    width: 800,
    color: {
      dark: fg,
      light: '#00000000', // transparent
    },
  });
}

// ============================================================
// SVG Kart Üretici
// ============================================================

export function generateCardSvg(input: QrCardInput): string {
  const W = input.width || 560;
  const H = input.height || 760;
  const lang: QrLang = input.lang || 'tr';

  const { design, qrDataUrl, tableName, businessName } = input;

  switch (design) {
    case 'minimal':
      return renderMinimal(W, H, qrDataUrl, tableName, businessName, lang);
    case 'warm':
      return renderWarm(W, H, qrDataUrl, tableName, businessName, lang);
    case 'dark':
      return renderDark(W, H, qrDataUrl, tableName, businessName, lang);
    case 'kraft':
      return renderKraft(W, H, qrDataUrl, tableName, businessName, lang);
    case 'boutique':
      return renderBoutique(W, H, qrDataUrl, tableName, businessName, lang);
    case 'mint':
      return renderMint(W, H, qrDataUrl, tableName, businessName, lang);
    case 'mono':
      return renderMono(W, H, qrDataUrl, tableName, businessName, lang);
  }
}

// ============================================================
// 1. MINIMAL — Beyaz sade
// ============================================================

function renderMinimal(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.65, H * 0.55);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.15;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="#E8E8E4" stroke-width="1" rx="8"/>
  
  <!-- QR -->
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>
  
  <!-- Table name -->
  <text x="${W / 2}" y="${qrY + qrSize + 70}" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="52" font-weight="400"
    fill="#1A1410" letter-spacing="-1">${escapeXml(tableName)}</text>
  
  <!-- Business name -->
  <text x="${W / 2}" y="${qrY + qrSize + 108}" text-anchor="middle"
    font-family="ui-monospace, 'SF Mono', monospace" font-size="13" font-weight="500"
    fill="#808078" letter-spacing="3">${escapeXml(businessName.toUpperCase())}</text>
  
  <!-- Instructions -->
  <text x="${W / 2}" y="${H - 75}" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="24" fill="#1A1410"
    font-weight="600" letter-spacing="0.3">${escapeXml(t.instruction)}</text>
  
  <!-- Aleg mark -->
  ${alegMark(W - 28, H - 20, '#B8B0A0', false)}
</svg>`.trim();
}

// ============================================================
// 2. WARM — Aleg editorial
// ============================================================

function renderWarm(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.6, H * 0.5);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.22;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#F4EEE2"/>
  
  <!-- Subtle noise/texture -->
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="#FAF5EA" stroke="#D6C9B2" stroke-width="1" rx="14"/>
  
  <!-- Top label -->
  <text x="${W / 2}" y="70" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="12" font-weight="700"
    fill="#C4553A" letter-spacing="4">${escapeXml(t.topLabel)}</text>
  
  <!-- Divider line -->
  <line x1="${W / 2 - 30}" y1="90" x2="${W / 2 + 30}" y2="90" stroke="#D6C9B2" stroke-width="1"/>
  
  <!-- QR frame -->
  <rect x="${qrX - 16}" y="${qrY - 16}" width="${qrSize + 32}" height="${qrSize + 32}"
    fill="#FFFDF7" stroke="#D6C9B2" stroke-width="1" rx="10"/>
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>
  
  <!-- Table name -->
  <text x="${W / 2}" y="${qrY + qrSize + 90}" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="58" font-weight="500"
    fill="#2A1F18" letter-spacing="-1.2">${escapeXml(tableName)}</text>
  
  <!-- Business name -->
  <text x="${W / 2}" y="${qrY + qrSize + 126}" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="12" font-weight="700"
    fill="#8C7A69" letter-spacing="3.5">${escapeXml(businessName.toUpperCase())}</text>
  
  <!-- Instructions -->
  <text x="${W / 2}" y="${H - 82}" text-anchor="middle"
    font-family="Georgia, serif" font-style="italic" font-size="28"
    fill="#5A4A3D" font-weight="500">${escapeXml(t.instructionWarm)}</text>
  
  <!-- Aleg mark -->
  ${alegMark(W - 28, H - 20, '#8C7A69', true)}
</svg>`.trim();
}

// ============================================================
// 3. DARK — Espresso coffee
// ============================================================

function renderDark(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.55, H * 0.45);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.23;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="darkBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#221A14"/>
      <stop offset="100%" stop-color="#1A1410"/>
    </linearGradient>
  </defs>
  
  <rect width="${W}" height="${H}" fill="url(#darkBg)"/>
  
  <!-- Top eyebrow -->
  <text x="${W / 2}" y="74" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="12" font-weight="700"
    fill="#E08060" letter-spacing="4">${escapeXml(t.topLabelDark)}</text>
  
  <line x1="${W / 2 - 40}" y1="94" x2="${W / 2 + 40}" y2="94" stroke="#4A3A2C" stroke-width="1"/>
  
  <!-- QR with cream card behind -->
  <rect x="${qrX - 24}" y="${qrY - 24}" width="${qrSize + 48}" height="${qrSize + 48}"
    fill="#F2E9DA" rx="12"/>
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>
  
  <!-- Table name -->
  <text x="${W / 2}" y="${qrY + qrSize + 100}" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="62" font-weight="500"
    fill="#F2E9DA" letter-spacing="-1.2">${escapeXml(tableName)}</text>
  
  <!-- Business name -->
  <text x="${W / 2}" y="${qrY + qrSize + 140}" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="13" font-weight="700"
    fill="#C8B89E" letter-spacing="4">${escapeXml(businessName.toUpperCase())}</text>
  
  <!-- Instructions -->
  <text x="${W / 2}" y="${H - 82}" text-anchor="middle"
    font-family="Georgia, serif" font-style="italic" font-size="26"
    fill="#D8C8A8" font-weight="500">${escapeXml(t.instructionDark)}</text>
  
  <!-- Aleg mark -->
  ${alegMark(W - 28, H - 20, '#8C7A63', true)}
</svg>`.trim();
}

// ============================================================
// 4. KRAFT — Vintage card
// ============================================================

function renderKraft(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.55, H * 0.45);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.25;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Kraft paper texture: küçük noise pattern -->
    <pattern id="kraftTexture" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#D6BE9B"/>
      <circle cx="1" cy="1" r="0.3" fill="#B89D76" opacity="0.4"/>
      <circle cx="3" cy="2.5" r="0.25" fill="#C9AD85" opacity="0.3"/>
    </pattern>
  </defs>
  
  <rect width="${W}" height="${H}" fill="url(#kraftTexture)"/>
  
  <!-- Inner frame with double line -->
  <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#8B6E4A" stroke-width="1.5"/>
  <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="none" stroke="#8B6E4A" stroke-width="0.5"/>
  
  <!-- Top ornament: dekoratif çizgi (artık "est. aleg" yazmıyor) -->
  <g>
    <line x1="${W / 2 - 50}" y1="88" x2="${W / 2 - 15}" y2="88" stroke="#3A2816" stroke-width="1"/>
    <circle cx="${W / 2}" cy="88" r="3" fill="#3A2816"/>
    <line x1="${W / 2 + 15}" y1="88" x2="${W / 2 + 50}" y2="88" stroke="#3A2816" stroke-width="1"/>
  </g>
  
  <!-- QR -->
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>
  
  <!-- Label box -->
  <g>
    <rect x="${W * 0.15}" y="${qrY + qrSize + 50}" width="${W * 0.7}" height="120"
      fill="#C4A980" stroke="#3A2816" stroke-width="1"/>
    
    <!-- Table name -->
    <text x="${W / 2}" y="${qrY + qrSize + 110}" text-anchor="middle"
      font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="54" font-weight="500"
      fill="#3A2816" letter-spacing="-1">${escapeXml(tableName)}</text>
    
    <!-- Business name -->
    <text x="${W / 2}" y="${qrY + qrSize + 148}" text-anchor="middle"
      font-family="ui-monospace, monospace" font-size="11" font-weight="700"
      fill="#5C4327" letter-spacing="4">${escapeXml(businessName.toUpperCase())}</text>
  </g>
  
  <!-- Bottom ornament / instruction -->
  <text x="${W / 2}" y="${H - 70}" text-anchor="middle"
    font-family="Georgia, serif" font-style="italic" font-size="26"
    fill="#3A2816" font-weight="600">${escapeXml(t.instructionKraft)}</text>
  
  <!-- Aleg mark -->
  ${alegMark(W - 28, H - 20, '#5C4327', true)}
</svg>`.trim();
}

// ============================================================
// 5. BOUTIQUE — Altın detaylar, krem zemin, butik lüks
// ============================================================

function renderBoutique(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.55, H * 0.45);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.27;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#A87926"/>
      <stop offset="50%" stop-color="#D4A951"/>
      <stop offset="100%" stop-color="#A87926"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#FAF6EE"/>

  <!-- Top crest ornament -->
  <g transform="translate(${W / 2} 60)">
    <line x1="-90" y1="0" x2="-25" y2="0" stroke="url(#goldGrad)" stroke-width="1"/>
    <circle cx="-15" cy="0" r="2.5" fill="#B8903E"/>
    <path d="M -8 -8 L 0 -16 L 8 -8 L 0 0 Z" fill="#B8903E"/>
    <circle cx="15" cy="0" r="2.5" fill="#B8903E"/>
    <line x1="25" y1="0" x2="90" y2="0" stroke="url(#goldGrad)" stroke-width="1"/>
  </g>

  <!-- Top label -->
  <text x="${W / 2}" y="100" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="11" font-weight="700"
    fill="#B8903E" letter-spacing="6">${escapeXml(t.topLabelBoutique)}</text>

  <!-- Welcome line italic -->
  <text x="${W / 2}" y="140" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="22"
    fill="#5A4A3D" letter-spacing="0.3">${escapeXml(t.welcomeBoutique)}</text>

  <!-- QR with double frame (gold border) -->
  <rect x="${qrX - 26}" y="${qrY - 26}" width="${qrSize + 52}" height="${qrSize + 52}"
    fill="#FFFFFF" stroke="#B8903E" stroke-width="2" rx="6"/>
  <rect x="${qrX - 18}" y="${qrY - 18}" width="${qrSize + 36}" height="${qrSize + 36}"
    fill="none" stroke="#E8D8B0" stroke-width="1" rx="3"/>
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

  <!-- Table name with side ornaments -->
  <g transform="translate(0 ${qrY + qrSize + 110})">
    <line x1="${W / 2 - 130}" y1="0" x2="${W / 2 - 80}" y2="0" stroke="#B8903E" stroke-width="0.8"/>
    <text x="${W / 2}" y="8" text-anchor="middle"
      font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="62" font-weight="500"
      fill="#1F1815" letter-spacing="-1.5">${escapeXml(tableName)}</text>
    <line x1="${W / 2 + 80}" y1="0" x2="${W / 2 + 130}" y2="0" stroke="#B8903E" stroke-width="0.8"/>
  </g>

  <!-- Business name -->
  <text x="${W / 2}" y="${qrY + qrSize + 154}" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="11" font-weight="700"
    fill="#8C7548" letter-spacing="4.5">${escapeXml(businessName.toUpperCase())}</text>

  <!-- Instructions -->
  <text x="${W / 2}" y="${H - 90}" text-anchor="middle"
    font-family="Georgia, serif" font-style="italic" font-size="22"
    fill="#5A4A3D" font-weight="500">${escapeXml(t.instructionBoutique)}</text>

  <!-- Bottom ornament line -->
  <g transform="translate(${W / 2} ${H - 56})">
    <line x1="-50" y1="0" x2="-10" y2="0" stroke="#B8903E" stroke-width="0.8"/>
    <circle cx="0" cy="0" r="2" fill="#B8903E"/>
    <line x1="10" y1="0" x2="50" y2="0" stroke="#B8903E" stroke-width="0.8"/>
  </g>

  <!-- Aleg mark -->
  ${alegMark(W - 28, H - 20, '#8C7548', true)}
</svg>`.trim();
}

// ============================================================
// 6. MINT — Fresh, modern, brunch/sağlıklı
// ============================================================

function renderMint(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.6, H * 0.5);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.24;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="mintBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EDF5EF"/>
      <stop offset="100%" stop-color="#DFEBE2"/>
    </linearGradient>
  </defs>

  <!-- Background gradient -->
  <rect width="${W}" height="${H}" fill="url(#mintBg)"/>

  <!-- Organic blob shapes (decoration) -->
  <ellipse cx="60" cy="${H - 80}" rx="80" ry="40" fill="#C8E0CE" opacity="0.5"/>
  <ellipse cx="${W - 50}" cy="60" rx="60" ry="30" fill="#C8E0CE" opacity="0.4"/>

  <!-- Top ribbon banner -->
  <g transform="translate(${W / 2} 70)">
    <rect x="-110" y="-22" width="220" height="44" fill="#2D5F4C" rx="22"/>
    <text x="0" y="6" text-anchor="middle"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="800"
      fill="#FFFFFF" letter-spacing="3">${escapeXml(t.topLabelMint)}</text>
  </g>

  <!-- Welcome -->
  <text x="${W / 2}" y="150" text-anchor="middle"
    font-family="Georgia, serif" font-style="italic" font-size="20"
    fill="#2D5F4C" font-weight="500">${escapeXml(t.welcomeMint)}</text>

  <!-- QR with rounded white card -->
  <rect x="${qrX - 22}" y="${qrY - 22}" width="${qrSize + 44}" height="${qrSize + 44}"
    fill="#FFFFFF" rx="20" stroke="#2D5F4C" stroke-width="0"/>
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

  <!-- Table name in big circle accent -->
  <text x="${W / 2}" y="${qrY + qrSize + 100}" text-anchor="middle"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="60" font-weight="800"
    fill="#0F2620" letter-spacing="-2">${escapeXml(tableName)}</text>

  <!-- Business name -->
  <text x="${W / 2}" y="${qrY + qrSize + 138}" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="12" font-weight="700"
    fill="#5A8070" letter-spacing="3.5">${escapeXml(businessName.toUpperCase())}</text>

  <!-- Instructions in ribbon -->
  <g transform="translate(${W / 2} ${H - 76})">
    <rect x="-130" y="-16" width="260" height="32" fill="#FFFFFF" stroke="#2D5F4C" stroke-width="1" rx="16"/>
    <text x="0" y="6" text-anchor="middle"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600"
      fill="#2D5F4C" letter-spacing="0.5">${escapeXml(t.instructionMint)}</text>
  </g>

  <!-- Aleg mark -->
  ${alegMark(W - 28, H - 20, '#5A8070', true)}
</svg>`.trim();
}

// ============================================================
// 7. MONO — Siyah-beyaz iddialı tipografi
// ============================================================

function renderMono(
  W: number,
  H: number,
  qrDataUrl: string,
  tableName: string,
  businessName: string,
  lang: QrLang
): string {
  const t = TEXTS[lang];
  const qrSize = Math.min(W * 0.5, H * 0.42);
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.32;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Black background -->
  <rect width="${W}" height="${H}" fill="#0A0A0A"/>

  <!-- Diagonal stripe accent (top-left) -->
  <polygon points="0,0 ${W * 0.4},0 0,${H * 0.18}" fill="#1A1A1A"/>

  <!-- Top SCAN brutalist label -->
  <text x="40" y="74" text-anchor="start"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="48" font-weight="900"
    fill="#FFFFFF" letter-spacing="-1">${escapeXml(t.topLabelMono)}</text>

  <!-- Underline -->
  <rect x="40" y="86" width="100" height="4" fill="#FFFFFF"/>

  <!-- Row 1 marker -->
  <text x="${W - 40}" y="62" text-anchor="end"
    font-family="ui-monospace, monospace" font-size="11" font-weight="700"
    fill="#888888" letter-spacing="3">No.${escapeXml(tableName.replace(/[^0-9]/g, '') || '01')}</text>
  <text x="${W - 40}" y="80" text-anchor="end"
    font-family="ui-monospace, monospace" font-size="11" font-weight="700"
    fill="#888888" letter-spacing="3">QR-MENU</text>

  <!-- Big white QR card (high contrast) -->
  <rect x="${qrX - 30}" y="${qrY - 30}" width="${qrSize + 60}" height="${qrSize + 60}"
    fill="#FFFFFF" rx="0"/>
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

  <!-- Side L brackets around QR -->
  <g stroke="#FFFFFF" stroke-width="3" fill="none">
    <polyline points="${qrX - 50},${qrY - 30} ${qrX - 50},${qrY - 50} ${qrX - 30},${qrY - 50}"/>
    <polyline points="${qrX + qrSize + 30},${qrY - 50} ${qrX + qrSize + 50},${qrY - 50} ${qrX + qrSize + 50},${qrY - 30}"/>
    <polyline points="${qrX - 50},${qrY + qrSize + 30} ${qrX - 50},${qrY + qrSize + 50} ${qrX - 30},${qrY + qrSize + 50}"/>
    <polyline points="${qrX + qrSize + 30},${qrY + qrSize + 50} ${qrX + qrSize + 50},${qrY + qrSize + 50} ${qrX + qrSize + 50},${qrY + qrSize + 30}"/>
  </g>

  <!-- Table name HUGE -->
  <text x="${W / 2}" y="${qrY + qrSize + 130}" text-anchor="middle"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="74" font-weight="900"
    fill="#FFFFFF" letter-spacing="-3">${escapeXml(tableName.toUpperCase())}</text>

  <!-- Business name in box -->
  <g transform="translate(${W / 2} ${qrY + qrSize + 168})">
    <rect x="-100" y="-14" width="200" height="28" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
    <text x="0" y="6" text-anchor="middle"
      font-family="ui-monospace, monospace" font-size="12" font-weight="700"
      fill="#FFFFFF" letter-spacing="4">${escapeXml(businessName.toUpperCase())}</text>
  </g>

  <!-- Bottom instructions -->
  <text x="${W / 2}" y="${H - 56}" text-anchor="middle"
    font-family="ui-monospace, monospace" font-size="13" font-weight="700"
    fill="#888888" letter-spacing="6">${escapeXml(t.instructionMono)}</text>

  <!-- Aleg mark white -->
  ${alegMark(W - 28, H - 20, '#FFFFFF', true)}
</svg>`.trim();
}

// ============================================================
// Helpers
// ============================================================

// Alt sağ köşede minik "aleg" imzası - tüm tasarımlarda net görünsün
function alegMark(x: number, y: number, color: string, italic: boolean): string {
  const style = italic ? 'italic' : 'normal';
  return `<text x="${x}" y="${y}" text-anchor="end"
    font-family="Georgia, 'Times New Roman', serif" font-style="${style}" font-size="14" font-weight="500"
    fill="${color}" opacity="0.85" letter-spacing="0">aleg</text>`;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================
// SVG → PNG conversion (canvas kullanarak, browser-only)
// ============================================================

export async function svgToPngDataUrl(svgString: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG load failed'));
    };
    img.src = url;
  });
}

// ============================================================
// PNG dosyası olarak indirme
// ============================================================

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
