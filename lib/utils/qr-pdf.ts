'use client';

import jsPDF from 'jspdf';
import {
  generateCardSvg,
  generateQrDataUrl,
  svgToPngDataUrl,
  type QrDesign,
  type QrLang,
} from './qr-design';

export type QrPdfItem = {
  tableName: string;
  businessName: string;
  qrUrl: string; // QR'ın gideceği URL
};

// ============================================================
// Tekli QR PDF — A6 boyutu, tek kart
// ============================================================

export async function generateSingleQrPdf(
  item: QrPdfItem,
  design: QrDesign,
  lang: QrLang = 'tr'
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6',
  });

  const qrDataUrl = await generateQrDataUrl(item.qrUrl, design);
  const svg = generateCardSvg({
    design,
    qrDataUrl,
    tableName: item.tableName,
    businessName: item.businessName,
    lang,
    width: 560,
    height: 760,
  });

  const pngDataUrl = await svgToPngDataUrl(svg, 3);

  const pageWidth = 105;
  const pageHeight = 148;
  const margin = 4;
  pdf.addImage(
    pngDataUrl,
    'PNG',
    margin,
    margin,
    pageWidth - margin * 2,
    pageHeight - margin * 2
  );

  return pdf.output('blob');
}

// ============================================================
// Toplu QR PDF — A4, 2x2 = 4 QR per sayfa
// ============================================================

export async function generateBulkQrPdf(
  items: QrPdfItem[],
  design: QrDesign,
  lang: QrLang = 'tr',
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginX = 10;
  const marginY = 15;
  const gap = 6;
  const cols = 2;
  const rows = 2;
  const cardW = (210 - marginX * 2 - gap * (cols - 1)) / cols;
  const cardH = (297 - marginY * 2 - gap * (rows - 1)) / rows;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const idxOnPage = i % (cols * rows);

    if (i > 0 && idxOnPage === 0) {
      pdf.addPage();
    }

    const col = idxOnPage % cols;
    const row = Math.floor(idxOnPage / cols);

    const x = marginX + col * (cardW + gap);
    const y = marginY + row * (cardH + gap);

    const qrDataUrl = await generateQrDataUrl(item.qrUrl, design);
    const svg = generateCardSvg({
      design,
      qrDataUrl,
      tableName: item.tableName,
      businessName: item.businessName,
      lang,
      width: 560,
      height: 760,
    });
    const pngDataUrl = await svgToPngDataUrl(svg, 2);

    pdf.addImage(pngDataUrl, 'PNG', x, y, cardW, cardH);

    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.1);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.rect(x, y, cardW, cardH);
    pdf.setLineDashPattern([], 0);

    if (onProgress) onProgress(i + 1, items.length);
  }

  return pdf.output('blob');
}

// ============================================================
// Blob → tarayıcıda indir
// ============================================================

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
