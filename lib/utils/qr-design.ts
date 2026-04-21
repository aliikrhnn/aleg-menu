'use client';

import QRCode from 'qrcode';

// ============================================================
// QR Design Templates
// ============================================================
// 4 farklı kart tasarımı. Her biri SVG string üretir.
// SVG'yi sonra PNG'ye veya PDF'e çevirebiliriz.
// ============================================================

export type QrDesign = 'minimal' | 'warm' | 'dark' | 'kraft';

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
    instruction: 'Kameranı aç · menüyü görüntüle',
    instructionWarm: 'kameranı aç, menüyü görüntüle',
    instructionDark: 'kamerayı yönelt · menüyü gör',
    instructionKraft: '— tara ve sipariş ver —',
  },
  en: {
    topLabel: 'QR · ORDER',
    topLabelDark: 'DIGITAL MENU',
    instruction: 'Open camera · view menu',
    instructionWarm: 'open camera, view menu',
    instructionDark: 'scan with camera · view menu',
    instructionKraft: '— scan & order —',
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
};

// QR kodunu PNG data URL olarak üret
export async function generateQrDataUrl(url: string, design: QrDesign): Promise<string> {
  // QR her zaman KOYU renkte - çünkü her tasarımda QR'ın arkasında
  // açık renk bir kart var (dark tema'da da krem kart)
  const fg =
    design === 'kraft'
      ? '#3A2816' // kraft'ta koyu kahverengi
      : '#1A1410'; // diğerlerinde siyah-kahverengi

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
