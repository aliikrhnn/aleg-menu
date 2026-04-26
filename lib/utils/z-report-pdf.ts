'use client';

/**
 * GÜN SONU PDF OLUŞTURUCU
 *
 * Günlük kapanış raporunu A4 dikey formatta, warm tema ile PDF olarak üretir.
 *
 * Tasarım notları:
 * - jsPDF default font (helvetica) Türkçe karakterleri destekliyor (latin1)
 * - Tüm renkler sabit hex (CSS var'ı burada çalışmaz)
 * - Sayfa akışı: header → hero → ekstralar → ödeme → saat bar chart → kasiyer → ürünler → footer
 */

import jsPDF from 'jspdf';
import type { ZReport } from '@/lib/actions/payments';

// ============================================================
// Renk paleti (warm tema) - hex değerleri
// ============================================================
const COLORS = {
  paper: '#FAF5EA',
  paper2: '#F2ECDD',
  card: '#FFFFFF',
  ink: '#2A1F18',
  ink2: '#564439',
  ink3: '#8A7A6D',
  line: '#E5DCC7',
  accent: '#C4553A',
  accentSoft: '#F4E5DF',
  ok: '#6B8E4E',
  okSoft: '#E8EEDE',
  warn: '#D4903F',
  warnSoft: '#F7ECD9',
  danger: '#B83A2E',
  gold: '#B8903E',
  super: '#5A6B7E',
};

// Rengi paper üzerine alfa ile karıştır (yaklaşık)
function mixColor(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Paper rengine alfa ile blend (FAF5EA)
  const pr = 0xfa,
    pg = 0xf5,
    pb = 0xea;
  const mr = Math.round(r * alpha + pr * (1 - alpha));
  const mg = Math.round(g * alpha + pg * (1 - alpha));
  const mb = Math.round(b * alpha + pb * (1 - alpha));
  return (
    '#' +
    [mr, mg, mb].map((n) => n.toString(16).padStart(2, '0')).join('')
  );
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Karti',
  transfer: 'Havale/EFT',
  online: 'Online Odeme',
  split: 'Bolunmus',
  other: 'Diger',
};

// ============================================================
// Yardımcılar
// ============================================================

function money(n: number | null | undefined): string {
  const num = typeof n === 'number' && !isNaN(n) ? n : 0;
  return (
    'TL ' +
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  );
}

function fmtDateLong(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

// Türkçe karakterleri ASCII'ye çevir (jsPDF latin1 için güvenli)
// helvetica latin1 aslında Türkçeyi destekler ama bazı görüntüleyicilerde bozulma olur
// İsim ve başlıklar için ASCII'ye düşürüyoruz
function asciify(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

function hexToRgb(hex: string | null | undefined): [number, number, number] {
  // Null/undefined veya bozuk input için default accent
  if (!hex || typeof hex !== 'string') return [196, 85, 58]; // #C4553A
  let h = hex.replace('#', '').trim();
  // 3-char hex destekle (#abc → #aabbcc)
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    return [196, 85, 58]; // fallback
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [
    isNaN(r) ? 0 : r,
    isNaN(g) ? 0 : g,
    isNaN(b) ? 0 : b,
  ];
}

function setFill(pdf: jsPDF, hex: string | null | undefined) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setFillColor(r, g, b);
}

function setDraw(pdf: jsPDF, hex: string | null | undefined) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setDrawColor(r, g, b);
}

function setText(pdf: jsPDF, hex: string | null | undefined) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setTextColor(r, g, b);
}

// ============================================================
// Ana fonksiyon
// ============================================================

export async function generateZReportPdf(
  report: ZReport,
  opts?: { generatedBy?: string | null }
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ============================================================
  // GLOBAL NaN/undefined KORUMASI — tüm numeric args sanitize edilir
  // jsPDF içindeki f2() helper'ı NaN görünce "Invalid argument" fırlatır
  // ============================================================
  const safeNum = (v: unknown, fallback = 0): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return isFinite(n) ? n : fallback;
  };

  // setFillColor / setDrawColor / setTextColor wrap — RGB NaN yakala
  const origSetFillColor = pdf.setFillColor.bind(pdf);
  const origSetDrawColor = pdf.setDrawColor.bind(pdf);
  const origSetTextColor = pdf.setTextColor.bind(pdf);

  (pdf as unknown as { setFillColor: (...a: unknown[]) => unknown }).setFillColor =
    function (...args: unknown[]) {
      const r = safeNum(args[0], 0);
      const g = safeNum(args[1], 0);
      const b = safeNum(args[2], 0);
      return origSetFillColor(r, g, b);
    };

  (pdf as unknown as { setDrawColor: (...a: unknown[]) => unknown }).setDrawColor =
    function (...args: unknown[]) {
      const r = safeNum(args[0], 0);
      const g = safeNum(args[1], 0);
      const b = safeNum(args[2], 0);
      return origSetDrawColor(r, g, b);
    };

  (pdf as unknown as { setTextColor: (...a: unknown[]) => unknown }).setTextColor =
    function (...args: unknown[]) {
      const r = safeNum(args[0], 0);
      const g = safeNum(args[1], 0);
      const b = safeNum(args[2], 0);
      return origSetTextColor(r, g, b);
    };

  // setFontSize + setLineWidth de wrap
  const origSetFontSize = pdf.setFontSize.bind(pdf);
  const origSetLineWidth = pdf.setLineWidth.bind(pdf);

  (pdf as unknown as { setFontSize: (s: unknown) => unknown }).setFontSize =
    function (s: unknown) {
      return origSetFontSize(safeNum(s, 10));
    };

  (pdf as unknown as { setLineWidth: (w: unknown) => unknown }).setLineWidth =
    function (w: unknown) {
      return origSetLineWidth(safeNum(w, 0.2));
    };

  // text/rect/roundedRect/line argümanlarını wrap et
  const origText = pdf.text.bind(pdf);
  const origRect = pdf.rect.bind(pdf);
  const origRoundedRect = pdf.roundedRect.bind(pdf);
  const origLine = pdf.line.bind(pdf);

  (pdf as unknown as { text: (...a: unknown[]) => unknown }).text = function (
    ...args: unknown[]
  ) {
    const str = args[0];
    const safeStr =
      str == null
        ? ''
        : Array.isArray(str)
          ? str.map((s) => (s == null ? '' : String(s)))
          : String(str);
    const x = safeNum(args[1], 0);
    const y = safeNum(args[2], 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return origText(safeStr as any, x, y, args[3] as any);
  };

  (pdf as unknown as { rect: (...a: unknown[]) => unknown }).rect = function (
    ...args: unknown[]
  ) {
    const x = safeNum(args[0], 0);
    const y = safeNum(args[1], 0);
    const w = safeNum(args[2], 0);
    const h = safeNum(args[3], 0);
    if (w <= 0 || h <= 0) return pdf;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return origRect(x, y, w, h, args[4] as any);
  };

  (pdf as unknown as { roundedRect: (...a: unknown[]) => unknown }).roundedRect =
    function (...args: unknown[]) {
      const x = safeNum(args[0], 0);
      const y = safeNum(args[1], 0);
      const w = safeNum(args[2], 0);
      const h = safeNum(args[3], 0);
      const rx = safeNum(args[4], 0);
      const ry = safeNum(args[5], 0);
      if (w <= 0 || h <= 0) return pdf;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return origRoundedRect(x, y, w, h, rx, ry, args[6] as any);
    };

  (pdf as unknown as { line: (...a: unknown[]) => unknown }).line = function (
    ...args: unknown[]
  ) {
    const x1 = safeNum(args[0], 0);
    const y1 = safeNum(args[1], 0);
    const x2 = safeNum(args[2], 0);
    const y2 = safeNum(args[3], 0);
    return origLine(x1, y1, x2, y2);
  };

  const PAGE_W = 210;
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  // Report alanlarını null-safe default'la (eski cache veya eksik veri için)
  const r = report as ZReport & Record<string, unknown>;
  if (!Array.isArray(r.by_station)) r.by_station = [];
  if (!Array.isArray(r.complimentary_items)) r.complimentary_items = [];
  if (!Array.isArray(r.cancelled_items)) r.cancelled_items = [];
  if (!Array.isArray(r.cancelled_orders)) r.cancelled_orders = [];
  if (!Array.isArray(r.refunded_orders)) r.refunded_orders = [];
  if (!Array.isArray(r.by_hour)) r.by_hour = [];
  if (!Array.isArray(r.by_cashier)) r.by_cashier = [];
  if (!Array.isArray(r.top_products)) r.top_products = [];
  if (!r.rates) r.rates = { complimentary_rate: 0, cancellation_rate: 0 };
  if (!r.reconciliation) {
    r.reconciliation = {
      gross_sales: 0,
      discount_total: 0,
      complimentary_total: 0,
      cancelled_total: 0,
      net_sales: 0,
      cash_total: 0,
      card_total: 0,
      other_total: 0,
      opening_amount: null,
      cash_refunds: 0,
      expected_cash: null,
      declared_cash: null,
      declared_card: null,
      cash_variance: null,
      card_variance: null,
    };
  }
  if (!r.on_account_summary) {
    r.on_account_summary = {
      new_charges_count: 0,
      new_charges_amount: 0,
      payments_received_count: 0,
      payments_received_amount: 0,
      net_change: 0,
      new_charges: [],
      payments_received: [],
    };
  }

  // Arkaplan paper tonuna boyayalım
  setFill(pdf, COLORS.paper);
  pdf.rect(0, 0, PAGE_W, 297, 'F');

  // ============================================================
  // HEADER — Turuncu accent çizgi + başlık bloğu
  // ============================================================
  setFill(pdf, COLORS.accent);
  pdf.rect(0, 0, PAGE_W, 4, 'F'); // üst turuncu şerit

  y = MARGIN + 2;

  // "GÜN SONU" mono etiket
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  setText(pdf, COLORS.accent);
  pdf.text('GUN SONU · ' + asciify((report.range?.label || 'BUGUN').toUpperCase()), MARGIN, y);

  y += 8;

  // Büyük italic başlık - business name
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(24);
  setText(pdf, COLORS.ink);
  pdf.text(asciify(report.business.name), MARGIN, y);

  y += 8;

  // Tarih — range.label varsa onu göster, yoksa eski fmtDateLong
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  setText(pdf, COLORS.ink2);
  if (report.range) {
    const fromD = new Date(report.range.from);
    const toD = new Date(report.range.to);
    const fmtDateTime = (d: Date) =>
      d.toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    pdf.text(
      asciify(`${fmtDateTime(fromD)}  -  ${fmtDateTime(toD)}`),
      MARGIN,
      y
    );
  } else {
    pdf.text(asciify(fmtDateLong(report.date)), MARGIN, y);
  }

  // Sağ üst: adres (varsa)
  if (report.business.address) {
    pdf.setFontSize(9);
    setText(pdf, COLORS.ink3);
    const addrLines = pdf.splitTextToSize(asciify(report.business.address), 70);
    pdf.text(addrLines, PAGE_W - MARGIN, MARGIN + 6, { align: 'right' });
  }
  if (report.business.phone) {
    pdf.setFontSize(9);
    setText(pdf, COLORS.ink3);
    pdf.text(asciify(report.business.phone), PAGE_W - MARGIN, MARGIN + 18, {
      align: 'right',
    });
  }

  y += 6;

  // İnce ayırıcı çizgi
  setDraw(pdf, COLORS.line);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);

  y += 8;

  // ============================================================
  // HERO GRID — 6 ana metrik (3x2)
  // ============================================================
  const heroH = 22;
  const heroW = (CONTENT_W - 4) / 3; // 3 kolon

  const heroData = [
    {
      label: 'TOPLAM CIRO',
      value: money(report.total_revenue),
      accent: true,
    },
    {
      label: 'SIPARIS',
      value: String(report.total_orders_paid),
      sub:
        report.total_orders !== report.total_orders_paid
          ? `${report.total_orders} toplam`
          : undefined,
    },
    {
      label: 'SEPET ORT.',
      value: money(report.average_basket),
    },
    {
      label: 'ACIK SIPARIS',
      value: String(report.open_orders),
      color: report.open_orders > 0 ? COLORS.warn : undefined,
    },
    {
      label: 'IPTAL',
      value: String(report.total_cancelled),
      sub:
        report.total_cancelled_amount > 0
          ? money(report.total_cancelled_amount)
          : undefined,
      color: report.total_cancelled > 0 ? COLORS.warn : undefined,
    },
    {
      label: 'IADE',
      value: String(report.total_refunded),
      color: report.total_refunded > 0 ? COLORS.danger : undefined,
    },
    {
      label: 'ORT. HAZIRLAMA',
      value:
        report.avg_prep_minutes !== null
          ? `${Math.round(report.avg_prep_minutes)}dk`
          : '—',
      sub:
        report.avg_prep_minutes !== null ? 'siparis - odeme' : undefined,
    },
  ];

  for (let i = 0; i < heroData.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * (heroW + 2);
    const yy = y + row * (heroH + 2);
    drawHeroCard(pdf, x, yy, heroW, heroH, heroData[i]);
  }

  const heroRows = Math.ceil(heroData.length / 3);
  y += heroH * heroRows + 2 * (heroRows - 1) + 8;

  // ============================================================
  // EKSTRALAR — bahşiş / indirim / ikram (varsa)
  // ============================================================
  const hasExtras =
    report.total_tip > 0 ||
    report.total_discount > 0 ||
    report.total_complimentary > 0;

  if (hasExtras) {
    drawSectionLabel(pdf, MARGIN, y, 'EKSTRALAR');
    y += 6;

    const extraW = (CONTENT_W - 4) / 3;
    const extras = [
      {
        label: 'BAHSIS',
        value: money(report.total_tip),
        color: COLORS.ok,
        softBg: COLORS.okSoft,
      },
      {
        label: 'INDIRIM',
        value: money(report.total_discount),
        color: COLORS.warn,
        softBg: COLORS.warnSoft,
      },
      {
        label: 'IKRAM',
        value: money(report.total_complimentary),
        color: COLORS.accent,
        softBg: COLORS.accentSoft,
      },
    ];

    for (let i = 0; i < extras.length; i++) {
      const x = MARGIN + i * (extraW + 2);
      drawExtraCard(pdf, x, y, extraW, 16, extras[i]);
    }
    y += 16 + 8;
  }

  // ============================================================
  // ORANLAR (ikram + iptal yüzdesi)
  // ============================================================
  if (
    report.rates &&
    (report.rates.complimentary_rate > 0 || report.rates.cancellation_rate > 0)
  ) {
    const cardH = 14;
    const cardW = (CONTENT_W - 2) / 2;

    // İkram oranı kutusu
    setFill(pdf, COLORS.accentSoft);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, cardW, cardH, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLORS.accent);
    pdf.text('IKRAM ORANI', MARGIN + 4, y + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(pdf, COLORS.accent);
    pdf.text(
      `%${report.rates.complimentary_rate.toFixed(1)}`,
      MARGIN + cardW - 4,
      y + 10,
      { align: 'right' }
    );

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(pdf, COLORS.ink3);
    pdf.text('brut ciroya gore', MARGIN + 4, y + 10);

    // İptal oranı kutusu
    const x2 = MARGIN + cardW + 2;
    setFill(pdf, COLORS.warnSoft);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x2, y, cardW, cardH, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLORS.warn);
    pdf.text('IPTAL ORANI', x2 + 4, y + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(pdf, COLORS.warn);
    pdf.text(
      `%${report.rates.cancellation_rate.toFixed(1)}`,
      x2 + cardW - 4,
      y + 10,
      { align: 'right' }
    );

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(pdf, COLORS.ink3);
    pdf.text('acilan siparislere gore', x2 + 4, y + 10);

    y += cardH + 8;
  }

  // ============================================================
  // KASA HESABI · MUTABAKAT
  // ============================================================
  if (report.reconciliation) {
    const rec = report.reconciliation;

    // Satırları hazırla
    const incomeLines: Array<{ label: string; value: string; bold?: boolean; muted?: boolean; accent?: boolean }> = [];
    incomeLines.push({ label: 'Brut satis', value: money(rec.gross_sales) });
    if (rec.complimentary_total > 0) {
      incomeLines.push({
        label: 'Ikramlar',
        value: '-' + money(rec.complimentary_total),
        muted: true,
      });
    }
    if (rec.discount_total > 0) {
      incomeLines.push({
        label: 'Indirimler',
        value: '-' + money(rec.discount_total),
        muted: true,
      });
    }
    incomeLines.push({
      label: 'NET SATIS',
      value: money(rec.net_sales),
      bold: true,
      accent: true,
    });

    const tahsilatLines: Array<{ label: string; value: string; bold?: boolean; muted?: boolean }> = [];
    if (rec.cash_total > 0) {
      tahsilatLines.push({ label: 'Nakit tahsilat', value: money(rec.cash_total) });
    }
    if (rec.card_total > 0) {
      tahsilatLines.push({ label: 'Kart tahsilat', value: money(rec.card_total) });
    }
    if (rec.other_total > 0) {
      tahsilatLines.push({ label: 'Diger', value: money(rec.other_total), muted: true });
    }
    tahsilatLines.push({
      label: 'TOPLAM TAHSILAT',
      value: money(rec.cash_total + rec.card_total + rec.other_total),
      bold: true,
    });

    const drawLineBox = (
      lines: Array<{ label: string; value: string; bold?: boolean; muted?: boolean; accent?: boolean }>,
      x: number,
      yStart: number,
      width: number
    ): number => {
      const rowH = 7;
      const boxH = lines.length * rowH + 4;
      setFill(pdf, COLORS.card);
      setDraw(pdf, COLORS.line);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, yStart, width, boxH, 2, 2, 'FD');

      let yy = yStart + 5;
      for (const ln of lines) {
        pdf.setFont('helvetica', ln.bold ? 'bold' : 'normal');
        pdf.setFontSize(ln.bold ? 9 : 10);
        setText(pdf, ln.muted ? COLORS.ink3 : ln.bold ? COLORS.ink3 : COLORS.ink);
        pdf.text(asciify(ln.label), x + 4, yy);

        pdf.setFont('helvetica', ln.bold ? 'bold' : 'normal');
        pdf.setFontSize(ln.bold ? 11 : 10);
        setText(pdf, ln.muted ? COLORS.ink3 : ln.accent ? COLORS.accent : COLORS.ink);
        pdf.text(ln.value, x + width - 4, yy, { align: 'right' });

        yy += rowH;
      }
      return boxH;
    };

    // Sayfa taşma
    const approxH =
      10 +
      Math.max(incomeLines.length, tahsilatLines.length) * 7 +
      (rec.opening_amount !== null ? 40 : 0) +
      8;
    if (y + approxH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'KASA HESABI · MUTABAKAT');
    y += 6;

    // İki sütun: sol gelir, sağ tahsilat
    const colW = (CONTENT_W - 4) / 2;
    const incomeH = drawLineBox(incomeLines, MARGIN, y, colW);
    const tahsH = drawLineBox(tahsilatLines, MARGIN + colW + 4, y, colW);
    y += Math.max(incomeH, tahsH) + 4;

    // Nakit + kart mutabakat (oturum açıksa/kapalıysa)
    if (rec.opening_amount !== null) {
      const mutabLines: Array<{ label: string; value: string; bold?: boolean; muted?: boolean }> = [
        { label: 'Kasa acilis', value: money(rec.opening_amount) },
        { label: 'Nakit tahsilat', value: '+' + money(rec.cash_total) },
      ];
      if (rec.cash_refunds > 0) {
        mutabLines.push({
          label: 'Nakit iade',
          value: '-' + money(rec.cash_refunds),
          muted: true,
        });
      }
      mutabLines.push({
        label: 'BEKLENEN KASA',
        value: money(rec.expected_cash || 0),
        bold: true,
      });

      if (rec.declared_cash !== null) {
        mutabLines.push({ label: 'Sayilan kasa', value: money(rec.declared_cash) });
      }

      const mutabH = drawLineBox(mutabLines, MARGIN, y, CONTENT_W);
      y += mutabH + 2;

      // NAKİT FARK banner'ı
      if (rec.cash_variance !== null) {
        const isZero = Math.abs(rec.cash_variance) < 0.005;
        const isOver = rec.cash_variance > 0;
        const varColor = isZero ? COLORS.ok : isOver ? COLORS.gold : COLORS.danger;
        const statusLabel = isZero ? 'TAM UYUYOR' : isOver ? 'FAZLA' : 'EKSIK';

        setFill(pdf, mixColor(varColor, 0.1));
        pdf.setLineWidth(0);
        pdf.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        setText(pdf, varColor);
        pdf.text('NAKIT FARKI · ' + statusLabel, MARGIN + 4, y + 6.5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(
          (isOver ? '+' : '') + money(rec.cash_variance),
          PAGE_W - MARGIN - 4,
          y + 6.5,
          { align: 'right' }
        );
        y += 12;
      }

      // KART FARK banner'ı
      if (rec.declared_card !== null && rec.card_variance !== null) {
        const cardLines = [
          { label: 'Sistem kart toplam', value: money(rec.card_total) },
          { label: 'Beyan edilen kart', value: money(rec.declared_card) },
        ];
        const cardH = drawLineBox(cardLines, MARGIN, y, CONTENT_W);
        y += cardH + 2;

        const isZero = Math.abs(rec.card_variance) < 0.005;
        const isOver = rec.card_variance > 0;
        const varColor = isZero ? COLORS.ok : isOver ? COLORS.gold : COLORS.danger;
        const statusLabel = isZero ? 'TAM UYUYOR' : isOver ? 'FAZLA' : 'EKSIK';

        setFill(pdf, mixColor(varColor, 0.1));
        pdf.setLineWidth(0);
        pdf.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        setText(pdf, varColor);
        pdf.text('KART FARKI · ' + statusLabel, MARGIN + 4, y + 6.5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(
          (isOver ? '+' : '') + money(rec.card_variance),
          PAGE_W - MARGIN - 4,
          y + 6.5,
          { align: 'right' }
        );
        y += 12;
      }
    }
    y += 4;
  }

  // ============================================================
  // ÖDEME YÖNTEMİ DAĞILIMI
  // ============================================================
  const methodEntries = Object.entries(report.by_method).sort(
    (a, b) => b[1].amount - a[1].amount
  );

  if (methodEntries.length > 0) {
    drawSectionLabel(pdf, MARGIN, y, 'ODEME YONTEMI DAGILIMI');
    y += 6;

    // Kart bg
    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, methodEntries.length * 8 + 4, 2, 2, 'FD');

    let yy = y + 5;
    for (const [method, data] of methodEntries) {
      const pct =
        report.total_revenue > 0 ? (data.amount / report.total_revenue) * 100 : 0;
      const label = METHOD_LABELS[method] || method;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      setText(pdf, COLORS.ink);
      pdf.text(asciify(label), MARGIN + 4, yy);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink3);
      pdf.text(`${data.count} odeme · ${pct.toFixed(1)}%`, MARGIN + 40, yy);

      // Sağ: amount
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setText(pdf, COLORS.ink);
      pdf.text(money(data.amount), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      // Bar altında
      const barY = yy + 1.5;
      const barMaxW = CONTENT_W - 8;
      setFill(pdf, COLORS.line);
      pdf.rect(MARGIN + 4, barY, barMaxW, 1.2, 'F');
      setFill(pdf, COLORS.accent);
      pdf.rect(MARGIN + 4, barY, (barMaxW * pct) / 100, 1.2, 'F');

      yy += 8;
    }
    y += methodEntries.length * 8 + 4 + 8;
  }

  // ============================================================
  // AÇIK HESAP (CARİ) — yeni borçlanma + tahsilat + net
  // ============================================================
  if (
    report.on_account_summary &&
    (report.on_account_summary.new_charges_count > 0 ||
      report.on_account_summary.payments_received_count > 0)
  ) {
    const oas = report.on_account_summary;
    const detailRowsCount =
      oas.new_charges.length + oas.payments_received.length;
    const detailH = detailRowsCount > 0 ? Math.min(detailRowsCount, 12) * 5 + 6 : 0;
    const neededH = 10 + 28 + detailH + 6;

    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'ACIK HESAP (CARI)');

    // Net göstergesi sağda
    const netPositive = oas.net_change > 0;
    const netZero = oas.net_change === 0;
    const netColor = netZero
      ? COLORS.ink3
      : netPositive
        ? COLORS.ok
        : COLORS.accent;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, netColor);
    const netLabel = `NET: ${netPositive ? '+' : netZero ? '' : '-'}${money(Math.abs(oas.net_change))}`;
    pdf.text(netLabel, PAGE_W - MARGIN, y + 3, { align: 'right' });
    y += 6;

    // Üç satırlık özet kartı
    setFill(pdf, COLORS.paper2);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 26, 2, 2, 'FD');

    // Yeni borçlanma
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setText(pdf, COLORS.ink);
    pdf.text(
      `+ Yeni borclanma (${oas.new_charges_count} siparis)`,
      MARGIN + 4,
      y + 6
    );
    setText(pdf, COLORS.accent);
    pdf.text(money(oas.new_charges_amount), PAGE_W - MARGIN - 4, y + 6, {
      align: 'right',
    });

    // Tahsilat
    setText(pdf, COLORS.ink);
    pdf.text(
      `- Tahsilat (${oas.payments_received_count} odeme)`,
      MARGIN + 4,
      y + 14
    );
    setText(pdf, COLORS.ok);
    pdf.text(money(oas.payments_received_amount), PAGE_W - MARGIN - 4, y + 14, {
      align: 'right',
    });

    // Ayraç + Net
    setDraw(pdf, COLORS.line);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(MARGIN + 4, y + 18, PAGE_W - MARGIN - 4, y + 18);
    pdf.setLineDashPattern([], 0);

    setText(pdf, COLORS.ink2);
    pdf.text('Net Degisim', MARGIN + 4, y + 23);
    setText(pdf, netColor);
    pdf.setFontSize(10);
    pdf.text(
      `${netPositive ? '+' : netZero ? '' : '-'}${money(Math.abs(oas.net_change))}`,
      PAGE_W - MARGIN - 4,
      y + 23,
      { align: 'right' }
    );
    pdf.setFontSize(9);

    y += 30;

    // Detaylar (max 12 satır gösterilir)
    if (detailRowsCount > 0) {
      const allItems: Array<{
        time: string;
        name: string;
        amount: number;
        isCharge: boolean;
        method?: string;
      }> = [];
      oas.new_charges.forEach((c) =>
        allItems.push({
          time: c.time,
          name: c.customer_name,
          amount: c.amount,
          isCharge: true,
        })
      );
      oas.payments_received.forEach((p) =>
        allItems.push({
          time: p.time,
          name: p.customer_name,
          amount: p.amount,
          isCharge: false,
          method: p.method,
        })
      );
      // Saate göre sırala
      allItems.sort((a, b) => a.time.localeCompare(b.time));

      const showCount = Math.min(12, allItems.length);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      for (let i = 0; i < showCount; i++) {
        const it = allItems[i];
        if (y > 270) {
          pdf.addPage();
          setFill(pdf, COLORS.paper);
          pdf.rect(0, 0, PAGE_W, 297, 'F');
          y = MARGIN;
        }
        setText(pdf, COLORS.ink3);
        pdf.text(it.time, MARGIN + 2, y);
        setText(pdf, COLORS.ink2);
        const labelTxt = it.isCharge
          ? asciify(it.name)
          : `${asciify(it.name)} (${it.method === 'cash' ? 'Nakit' : it.method === 'card' ? 'Kart' : it.method === 'transfer' ? 'Havale' : it.method})`;
        pdf.text(labelTxt.substring(0, 50), MARGIN + 14, y);
        setText(pdf, it.isCharge ? COLORS.accent : COLORS.ok);
        pdf.text(
          `${it.isCharge ? '+' : '-'}${money(it.amount)}`,
          PAGE_W - MARGIN - 2,
          y,
          { align: 'right' }
        );
        y += 4.2;
      }
      if (allItems.length > 12) {
        setText(pdf, COLORS.ink3);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `+${allItems.length - 12} hareket daha`,
          MARGIN + 2,
          y + 2
        );
        y += 6;
      }
    }
    y += 6;
  }

  // ============================================================
  // İSTASYONA GÖRE SATIŞ (horizontal bar)
  // ============================================================
  if (report.by_station && report.by_station.length > 0) {
    if (y + 50 > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    const stTotal = report.by_station.reduce(
      (s, st) => s + (Number(st.revenue) || 0),
      0
    );
    const rowH = 8;
    const neededH = 10 + report.by_station.length * rowH + 4;

    // Sayfa taşma kontrolü
    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'ISTASYONA GORE SATIS');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLORS.ink3);
    pdf.text(
      `${report.by_station.length} istasyon`,
      PAGE_W - MARGIN,
      y + 3,
      { align: 'right' }
    );
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(
      MARGIN,
      y,
      CONTENT_W,
      report.by_station.length * rowH + 4,
      2,
      2,
      'FD'
    );

    let yy = y + 5;
    for (let i = 0; i < report.by_station.length; i++) {
      const st = report.by_station[i];
      const stRevenue = Number(st.revenue) || 0;
      const pct = stTotal > 0 ? (stRevenue / stTotal) * 100 : 0;
      const safePct = isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));

      // İstasyon adı (sol)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, st.station_id ? COLORS.ink : COLORS.ink3);
      const displayName = st.station_id
        ? String(st.name || 'Istasyon')
        : `${String(st.name || 'Atanmamis')} (atanmamis)`;
      pdf.text(asciify(displayName), MARGIN + 4, yy);

      // Yüzde + kalem
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(
        `${safePct.toFixed(1)}% · ${Number(st.item_count) || 0} kalem`,
        MARGIN + 55,
        yy
      );

      // Tutar sağda
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink);
      pdf.text(money(stRevenue), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      // Progress bar altta
      const barY = yy + 1.2;
      const barMaxW = CONTENT_W - 90;
      setFill(pdf, COLORS.paper2);
      pdf.rect(MARGIN + 4, barY, barMaxW, 1.4, 'F');

      // İstasyon rengini kullan (fallback accent) — hexToRgb zaten NaN-safe
      const stColor = st.station_id ? st.color : '#8A7A6D';
      setFill(pdf, stColor);
      const barFillW = (barMaxW * safePct) / 100;
      if (barFillW > 0) {
        pdf.rect(MARGIN + 4, barY, barFillW, 1.4, 'F');
      }

      yy += rowH;
    }
    y += report.by_station.length * rowH + 4 + 8;
  }

  // ============================================================
  // SAAT BAZLI ÖDEME (bar chart)
  // ============================================================
  if (report.by_hour.length > 0) {
    // Sayfa taşma kontrolü
    if (y > 230) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'SAAT BAZLI ODEME');
    if (report.peak_hour !== null) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      setText(pdf, COLORS.accent);
      pdf.text(
        `EN YOGUN: ${String(report.peak_hour).padStart(2, '0')}:00`,
        PAGE_W - MARGIN,
        y + 3,
        { align: 'right' }
      );
    }
    y += 6;

    const chartH = 30;
    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, chartH + 6, 2, 2, 'FD');

    const maxAmount = Math.max(...report.by_hour.map((h) => h.amount), 1);
    const barCount = report.by_hour.length;
    const gap = 1;
    const innerW = CONTENT_W - 8;
    const barW = (innerW - gap * (barCount - 1)) / barCount;

    for (let i = 0; i < report.by_hour.length; i++) {
      const { hour, amount } = report.by_hour[i];
      const isPeak = hour === report.peak_hour;
      const h = Math.max(1, (amount / maxAmount) * chartH);
      const x = MARGIN + 4 + i * (barW + gap);
      const barY = y + 4 + (chartH - h);

      setFill(pdf, isPeak ? COLORS.accent : COLORS.ink2);
      if (!isPeak) {
        setFill(pdf, '#A89788'); // ink2'nin soluk hali
      }
      pdf.rect(x, barY, barW, h, 'F');

      // Saat label
      pdf.setFont('helvetica', isPeak ? 'bold' : 'normal');
      pdf.setFontSize(6);
      setText(pdf, isPeak ? COLORS.accent : COLORS.ink3);
      pdf.text(
        String(hour).padStart(2, '0'),
        x + barW / 2,
        y + chartH + 9,
        { align: 'center' }
      );
    }

    y += chartH + 14;
  }

  // ============================================================
  // PAKET C: PİK 3 SAAT
  // ============================================================
  if (report.peak_hours && report.peak_hours.length > 0) {
    // Sayfa taşma
    if (y + 30 > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'PIK 3 SAAT');
    y += 6;

    const peakBoxH = 20;
    const peakBoxW = (CONTENT_W - 4) / 3;
    const peakLabels = ['1. PIK', '2. PIK', '3. PIK'];

    for (let i = 0; i < Math.min(3, report.peak_hours.length); i++) {
      const h = report.peak_hours[i];
      const x = MARGIN + i * (peakBoxW + 2);
      const isFirst = i === 0;

      // Arkaplan
      setFill(pdf, isFirst ? COLORS.accentSoft : COLORS.card);
      setDraw(pdf, isFirst ? COLORS.accent : COLORS.line);
      pdf.setLineWidth(isFirst ? 0.5 : 0.3);
      pdf.roundedRect(x, y, peakBoxW, peakBoxH, 2, 2, 'FD');

      // Label (1. PIK / 2. PIK / 3. PIK)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      setText(pdf, isFirst ? COLORS.accent : COLORS.ink3);
      pdf.text(peakLabels[i], x + 3, y + 4);

      // Saat (büyük italic)
      pdf.setFont('helvetica', 'bolditalic');
      pdf.setFontSize(14);
      setText(pdf, isFirst ? COLORS.accent : COLORS.ink);
      pdf.text(`${String(h.hour).padStart(2, '0')}:00`, x + 3, y + 12);

      // Count + amount
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setText(pdf, COLORS.ink3);
      pdf.text(
        `${h.count} odeme · ${money(h.amount)}`,
        x + 3,
        y + 17
      );
    }

    y += peakBoxH + 8;
  }

  // ============================================================
  // PAKET C: SİPARİŞ KAYNAĞI DAĞILIMI
  // ============================================================
  const sourceEntries = Object.entries(report.by_source || {})
    .sort((a, b) => b[1].amount - a[1].amount);

  if (sourceEntries.length > 0) {
    const SOURCE_LABELS_PDF: Record<string, string> = {
      manual: 'Kasiyer',
      qr: 'QR Menu',
      waiter: 'Garson',
      delivery: 'Paket',
      phone: 'Telefon',
      online: 'Online',
    };

    const rowH = 8;
    const neededH = 10 + sourceEntries.length * rowH;

    // Sayfa taşma
    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'SIPARIS KAYNAGI');
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(
      MARGIN,
      y,
      CONTENT_W,
      sourceEntries.length * rowH + 3,
      2,
      2,
      'FD'
    );

    let yy = y + 5;
    for (const [src, data] of sourceEntries) {
      const label = SOURCE_LABELS_PDF[src] || src;
      const pct =
        report.total_revenue > 0
          ? (data.amount / report.total_revenue) * 100
          : 0;

      // Label
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink);
      pdf.text(label, MARGIN + 3, yy);

      // Bar (solda 45mm sonrası başlar)
      const barX = MARGIN + 48;
      const barMaxW = CONTENT_W - 48 - 50;
      const barW = Math.max(0, (pct / 100) * barMaxW);
      // Track
      setFill(pdf, COLORS.line);
      pdf.roundedRect(barX, yy - 2.5, barMaxW, 2.5, 1, 1, 'F');
      // Fill
      if (barW > 0) {
        setFill(pdf, COLORS.accent);
        pdf.roundedRect(barX, yy - 2.5, barW, 2.5, 1, 1, 'F');
      }

      // Count + amount
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setText(pdf, COLORS.ink2);
      pdf.text(
        `${data.count} · ${money(data.amount)}`,
        MARGIN + CONTENT_W - 3 - 20,
        yy,
        { align: 'right' }
      );

      // Yüzde
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setText(pdf, COLORS.ink3);
      pdf.text(
        `%${pct.toFixed(0)}`,
        MARGIN + CONTENT_W - 3,
        yy,
        { align: 'right' }
      );

      yy += rowH;
    }

    y += sourceEntries.length * rowH + 3 + 8;
  }

  // ============================================================
  // PAKET C: HAFTALIK TREND (son 7 gün mini bar chart)
  // ============================================================
  if (report.weekly_trend && report.weekly_trend.length > 0) {
    const weekH = 32;
    // Sayfa taşma
    if (y + weekH + 10 > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'HAFTALIK TREND');
    y += 6;

    // Kart arkaplanı
    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, weekH, 2, 2, 'FD');

    const chartPadX = 6;
    const chartPadT = 4;
    const chartPadB = 6; // label için
    const chartAreaW = CONTENT_W - chartPadX * 2;
    const chartAreaH = weekH - chartPadT - chartPadB;
    const barGap = 2;
    const barW =
      (chartAreaW - barGap * (report.weekly_trend.length - 1)) /
      report.weekly_trend.length;
    const maxRevenue = Math.max(
      ...report.weekly_trend.map((d) => d.revenue),
      1
    );
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < report.weekly_trend.length; i++) {
      const d = report.weekly_trend[i];
      const isToday = d.date === todayStr;
      const bx = MARGIN + chartPadX + i * (barW + barGap);
      const bh = d.revenue > 0 ? (d.revenue / maxRevenue) * chartAreaH : 0.8;
      const by = y + chartPadT + chartAreaH - bh;

      // Bar
      setFill(pdf, isToday ? COLORS.accent : COLORS.ink2);
      pdf.roundedRect(bx, by, barW, bh, 0.5, 0.5, 'F');

      // Label (gün kısaltması)
      pdf.setFont('helvetica', isToday ? 'bold' : 'normal');
      pdf.setFontSize(7);
      setText(pdf, isToday ? COLORS.accent : COLORS.ink3);
      pdf.text(
        asciify(d.day_label),
        bx + barW / 2,
        y + weekH - 2,
        { align: 'center' }
      );
    }

    y += weekH + 8;
  }

  // ============================================================
  // KASİYERE GÖRE (2+ kasiyer varsa)
  // ============================================================
  if (report.by_cashier.length > 1) {
    // Sayfa taşma kontrolü
    const neededH = 10 + report.by_cashier.length * 7;
    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'KASIYERE GORE');
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, report.by_cashier.length * 7 + 3, 2, 2, 'FD');

    let yy = y + 5;
    for (let i = 0; i < report.by_cashier.length; i++) {
      const c = report.by_cashier[i];
      const pct =
        report.total_revenue > 0 ? (c.amount / report.total_revenue) * 100 : 0;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      setText(pdf, COLORS.ink);
      pdf.text(asciify(c.cashier_name), MARGIN + 4, yy);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink3);
      pdf.text(`${c.count} siparis · ${pct.toFixed(1)}%`, MARGIN + 55, yy);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setText(pdf, COLORS.ink);
      pdf.text(money(c.amount), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      yy += 7;
    }
    y += report.by_cashier.length * 7 + 3 + 8;
  }

  // ============================================================
  // EN ÇOK SATANLAR (top 10)
  // ============================================================
  if (report.top_products.length > 0) {
    const top = report.top_products.slice(0, 10);
    const neededH = 10 + top.length * 6 + 4;
    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'EN COK SATANLAR');
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, top.length * 6 + 4, 2, 2, 'FD');

    let yy = y + 5;
    for (let i = 0; i < top.length; i++) {
      const p = top[i];

      // Rank
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(String(i + 1).padStart(2, '0'), MARGIN + 4, yy);

      // Ürün adı
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      setText(pdf, COLORS.ink);
      pdf.text(asciify(p.name), MARGIN + 12, yy);

      // Quantity
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink3);
      pdf.text(`x ${p.quantity}`, MARGIN + 120, yy);

      // Revenue sağda
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      setText(pdf, COLORS.ink);
      pdf.text(money(p.revenue), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      yy += 6;
    }
    y += top.length * 6 + 4 + 6;
  }

  // ============================================================
  // İPTAL SİPARİŞLER (detay listesi)
  // ============================================================
  if (report.cancelled_orders.length > 0) {
    const list = report.cancelled_orders.slice(0, 20);
    const neededH = 10 + list.length * 7 + 4;
    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'IPTAL EDILEN SIPARISLER');
    // Sağda toplam
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLORS.warn);
    pdf.text(
      `${report.total_cancelled} adet · ${money(report.total_cancelled_amount)}`,
      PAGE_W - MARGIN,
      y + 3,
      { align: 'right' }
    );
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, list.length * 7 + 4, 2, 2, 'FD');

    let yy = y + 5;
    for (const c of list) {
      // Sipariş no
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink);
      pdf.text(asciify(c.order_no), MARGIN + 4, yy);

      // Zaman
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(String(c.time || ""), MARGIN + 25, yy);

      // Kasiyer
      if (c.cashier_name) {
        pdf.text(asciify(c.cashier_name), MARGIN + 42, yy);
      }

      // Sebep (varsa)
      if (c.reason) {
        pdf.setFont('helvetica', 'italic');
        setText(pdf, COLORS.ink2);
        const reasonText = pdf.splitTextToSize(asciify(c.reason), 70);
        pdf.text(reasonText[0] || '', MARGIN + 78, yy);
      }

      // Tutar sağda
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.warn);
      pdf.text(money(c.total), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      yy += 7;
    }
    y += list.length * 7 + 4 + 6;

    if (report.cancelled_orders.length > 20) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(
        `+ ${report.cancelled_orders.length - 20} daha...`,
        MARGIN,
        y
      );
      y += 6;
    }
  }

  // ============================================================
  // İADE SİPARİŞLER
  // ============================================================
  if (report.refunded_orders.length > 0) {
    const list = report.refunded_orders.slice(0, 15);
    const neededH = 10 + list.length * 7 + 4;
    if (y + neededH > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'IADE EDILEN SIPARISLER');
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, list.length * 7 + 4, 2, 2, 'FD');

    let yy = y + 5;
    for (const r of list) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink);
      pdf.text(asciify(r.order_no), MARGIN + 4, yy);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(String(r.time || ""), MARGIN + 25, yy);

      if (r.cashier_name) {
        pdf.text(asciify(r.cashier_name), MARGIN + 42, yy);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.danger);
      pdf.text(`-${money(r.total)}`, PAGE_W - MARGIN - 4, yy, {
        align: 'right',
      });

      yy += 7;
    }
    y += list.length * 7 + 4 + 6;
  }

  // ============================================================
  // İKRAM EDİLEN ÜRÜNLER (ürün bazında tek tek)
  // ============================================================
  if (report.complimentary_items && report.complimentary_items.length > 0) {
    const list = report.complimentary_items;
    const rowH = 6;
    const neededH = 10 + list.length * rowH + 4;

    // Sayfa taşma kontrolü
    if (y + Math.min(neededH, 100) > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'IKRAM EDILEN URUNLER');
    // Sağda özet
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLORS.accent);
    pdf.text(
      `${list.length} kalem · ${money(report.total_complimentary)} · %${report.rates.complimentary_rate.toFixed(1)}`,
      PAGE_W - MARGIN,
      y + 3,
      { align: 'right' }
    );
    y += 6;

    // Kutu
    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, list.length * rowH + 4, 2, 2, 'FD');

    let yy = y + 4.5;
    for (const it of list) {
      // Sayfa taşma
      if (yy > 275) {
        pdf.addPage();
        setFill(pdf, COLORS.paper);
        pdf.rect(0, 0, PAGE_W, 297, 'F');
        y = MARGIN;
        yy = y + 4.5;
        setFill(pdf, COLORS.card);
        setDraw(pdf, COLORS.line);
        pdf.setLineWidth(0.3);
        // Yeni sayfa için bo sınırsız; kısa kalan kısımla devam
      }

      // Ürün adı
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink);
      let x = MARGIN + 4;
      pdf.text(asciify(it.product_name), x, yy);
      x += Math.min(pdf.getTextWidth(asciify(it.product_name)) + 3, 60);

      // Quantity
      if (it.quantity > 1) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setText(pdf, COLORS.ink3);
        pdf.text(`x ${it.quantity}`, x, yy);
        x += 10;
      }

      // Saat
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(String(it.time || ""), x, yy);
      x += 12;

      // Kasiyer
      if (it.cashier_name) {
        setText(pdf, COLORS.ink2);
        pdf.text(asciify(it.cashier_name), x, yy);
        x += Math.min(pdf.getTextWidth(asciify(it.cashier_name)) + 3, 25);
      }

      // Sebep (italik)
      if (it.reason) {
        pdf.setFont('helvetica', 'italic');
        setText(pdf, COLORS.accent);
        const reasonText = pdf.splitTextToSize(asciify(`"${it.reason}"`), 50);
        pdf.text(reasonText[0] || '', x, yy);
      }

      // Tutar sağda
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.accent);
      pdf.text(money(it.total), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      yy += rowH;
    }
    y += list.length * rowH + 4 + 6;
  }

  // ============================================================
  // SİLİNEN / İPTAL EDİLEN ÜRÜNLER
  // ============================================================
  if (report.cancelled_items && report.cancelled_items.length > 0) {
    const list = report.cancelled_items;
    const rowH = 6;
    const cancelTotal = list.reduce((s, i) => s + i.total, 0);
    const neededH = 10 + list.length * rowH + 4;

    if (y + Math.min(neededH, 100) > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    drawSectionLabel(pdf, MARGIN, y, 'SILINEN / IPTAL URUNLER');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLORS.warn);
    pdf.text(
      `${list.length} kalem · ${money(cancelTotal)} · %${report.rates.cancellation_rate.toFixed(1)}`,
      PAGE_W - MARGIN,
      y + 3,
      { align: 'right' }
    );
    y += 6;

    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, y, CONTENT_W, list.length * rowH + 4, 2, 2, 'FD');

    let yy = y + 4.5;
    for (const it of list) {
      if (yy > 275) {
        pdf.addPage();
        setFill(pdf, COLORS.paper);
        pdf.rect(0, 0, PAGE_W, 297, 'F');
        y = MARGIN;
        yy = y + 4.5;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.ink);
      let x = MARGIN + 4;
      pdf.text(asciify(it.product_name), x, yy);
      x += Math.min(pdf.getTextWidth(asciify(it.product_name)) + 3, 60);

      if (it.quantity > 1) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setText(pdf, COLORS.ink3);
        pdf.text(`x ${it.quantity}`, x, yy);
        x += 10;
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text(String(it.time || ""), x, yy);
      x += 12;

      if (it.cashier_name) {
        setText(pdf, COLORS.ink2);
        pdf.text(asciify(it.cashier_name), x, yy);
        x += Math.min(pdf.getTextWidth(asciify(it.cashier_name)) + 3, 25);
      }

      if (it.order_reason) {
        pdf.setFont('helvetica', 'italic');
        setText(pdf, COLORS.warn);
        const reasonText = pdf.splitTextToSize(
          asciify(`"${it.order_reason}"`),
          50
        );
        pdf.text(reasonText[0] || '', x, yy);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLORS.warn);
      pdf.text(money(it.total), PAGE_W - MARGIN - 4, yy, { align: 'right' });

      yy += rowH;
    }
    y += list.length * rowH + 4 + 6;
  }

  // ============================================================
  // KASA ÖZETİ · NAKİT / KART / FARK (en son, büyük ve belirgin)
  // ============================================================
  {
    const rec = r.reconciliation;
    const systemCash = Number(rec.expected_cash ?? rec.cash_total) || 0;
    const systemCard = Number(rec.card_total) || 0;
    const declaredCash = rec.declared_cash != null
      ? Number(rec.declared_cash) || 0
      : null;
    const declaredCard = rec.declared_card != null
      ? Number(rec.declared_card) || 0
      : null;
    const cashVar = rec.cash_variance != null
      ? Number(rec.cash_variance) || 0
      : declaredCash != null
        ? declaredCash - systemCash
        : null;
    const cardVar = rec.card_variance != null
      ? Number(rec.card_variance) || 0
      : declaredCard != null
        ? declaredCard - systemCard
        : null;

    // Özeti her zaman göster — beyan olmasa bile sistem değerleri gözüksün
    const boxH = declaredCash != null || declaredCard != null ? 62 : 34;

    // Sayfa taşma
    if (y + boxH + 10 > 270) {
      pdf.addPage();
      setFill(pdf, COLORS.paper);
      pdf.rect(0, 0, PAGE_W, 297, 'F');
      y = MARGIN;
    }

    // Başlık
    drawSectionLabel(pdf, MARGIN, y, 'KASA OZETI');
    y += 6;

    // Büyük kutu — accent shadow
    setFill(pdf, COLORS.card);
    setDraw(pdf, COLORS.accent);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, 'FD');

    const colW = (CONTENT_W - 8) / 2;
    const col1X = MARGIN + 4;
    const col2X = MARGIN + colW + 4;
    let yy = y + 7;

    // NAKİT başlık
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setText(pdf, COLORS.ok);
    pdf.text('NAKIT', col1X, yy);

    // KART başlık
    setText(pdf, COLORS.super);
    pdf.text('KART (POS)', col2X, yy);

    yy += 5;

    // Sistem değerleri
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText(pdf, COLORS.ink3);
    pdf.text('Sistem:', col1X, yy);
    pdf.text('Sistem:', col2X, yy);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setText(pdf, COLORS.ink);
    pdf.text(money(systemCash), col1X + colW - 6, yy, { align: 'right' });
    pdf.text(money(systemCard), col2X + colW - 6, yy, { align: 'right' });

    yy += 6;

    if (declaredCash != null || declaredCard != null) {
      // Beyan edilen
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLORS.ink3);
      pdf.text('Girilen:', col1X, yy);
      pdf.text('Girilen:', col2X, yy);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      setText(pdf, COLORS.ink);
      pdf.text(
        declaredCash != null ? money(declaredCash) : '-',
        col1X + colW - 6,
        yy,
        { align: 'right' }
      );
      pdf.text(
        declaredCard != null ? money(declaredCard) : '-',
        col2X + colW - 6,
        yy,
        { align: 'right' }
      );

      yy += 8;

      // FARK - büyük ve belirgin
      const hasCashVar = cashVar != null && Math.abs(cashVar) >= 0.01;
      const hasCardVar = cardVar != null && Math.abs(cardVar) >= 0.01;

      // Fark satır ayraç çizgisi
      setDraw(pdf, COLORS.line);
      pdf.setLineWidth(0.3);
      pdf.line(col1X, yy - 4, col1X + colW - 6, yy - 4);
      pdf.line(col2X, yy - 4, col2X + colW - 6, yy - 4);

      // FARK etiketleri
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      const cashVarColor = !hasCashVar
        ? COLORS.ok
        : (cashVar as number) < 0
          ? COLORS.danger
          : COLORS.gold;
      const cardVarColor = !hasCardVar
        ? COLORS.ok
        : (cardVar as number) < 0
          ? COLORS.danger
          : COLORS.gold;

      setText(pdf, cashVarColor);
      pdf.text('FARK:', col1X, yy);
      setText(pdf, cardVarColor);
      pdf.text('FARK:', col2X, yy);

      // Fark miktarı - büyük. TAMAM durumunda "Tam" kısa metin (jsPDF ✓ encoding sorunu)
      pdf.setFont('helvetica', 'bold');

      const cashVarText = !hasCashVar
        ? 'Tam'
        : (cashVar as number) > 0
          ? `+${money(cashVar as number)}`
          : money(cashVar as number);
      const cardVarText = !hasCardVar
        ? 'Tam'
        : (cardVar as number) > 0
          ? `+${money(cardVar as number)}`
          : money(cardVar as number);

      setText(pdf, cashVarColor);
      pdf.setFontSize(13);
      pdf.text(cashVarText, col1X + colW - 6, yy, { align: 'right' });

      setText(pdf, cardVarColor);
      pdf.setFontSize(13);
      pdf.text(cardVarText, col2X + colW - 6, yy, { align: 'right' });
    }

    y += boxH + 6;

    // FARK VARSA BÜYÜK KIRMIZI UYARI BANDI
    const hasAnyVariance =
      (cashVar != null && Math.abs(cashVar) >= 0.01) ||
      (cardVar != null && Math.abs(cardVar) >= 0.01);

    if (hasAnyVariance) {
      // Sayfa taşma
      if (y + 20 > 270) {
        pdf.addPage();
        setFill(pdf, COLORS.paper);
        pdf.rect(0, 0, PAGE_W, 297, 'F');
        y = MARGIN;
      }

      // Kırmızı büyük uyarı kutusu
      setFill(pdf, COLORS.danger);
      pdf.rect(MARGIN, y, CONTENT_W, 18, 'F');

      // ⚠ ikonu (text)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      setText(pdf, '#FAF5EA'); // cream
      pdf.text('!', MARGIN + 6, y + 12);

      // Başlık
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      setText(pdf, '#FAF5EA');
      pdf.text('DIKKAT · KASA FARKI VAR', MARGIN + 14, y + 8);

      // Detay
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setText(pdf, '#FAF5EA');
      const parts: string[] = [];
      if (cashVar != null && Math.abs(cashVar) >= 0.01) {
        parts.push(
          `Nakit: ${(cashVar as number) > 0 ? 'fazla +' : 'eksik '}${money(Math.abs(cashVar as number))}`
        );
      }
      if (cardVar != null && Math.abs(cardVar) >= 0.01) {
        parts.push(
          `Kart: ${(cardVar as number) > 0 ? 'fazla +' : 'eksik '}${money(Math.abs(cardVar as number))}`
        );
      }
      pdf.text(parts.join('  ·  '), MARGIN + 14, y + 14);

      y += 18 + 6;
    }
  }

  // ============================================================
  // FOOTER (tüm sayfalar için)
  // ============================================================
  const pageCount = (pdf as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    // Alt ince çizgi
    setDraw(pdf, COLORS.line);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, 283, PAGE_W - MARGIN, 283);

    const now = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    setText(pdf, COLORS.ink3);
    pdf.text('alegstudio.com', MARGIN, 288);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(pdf, COLORS.ink3);
    const generatedLine = opts?.generatedBy
      ? `Olusturuldu: ${asciify(now)} · ${asciify(opts.generatedBy)}`
      : `Olusturuldu: ${asciify(now)}`;
    pdf.text(generatedLine, PAGE_W / 2, 288, { align: 'center' });

    pdf.text(`Sayfa ${p}/${pageCount}`, PAGE_W - MARGIN, 288, { align: 'right' });
  }

  // ============================================================
  // İNDİR
  // ============================================================
  const slug = asciify(report.business.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);
  const filename = `gun-sonu-${report.date}-${slug || 'isletme'}.pdf`;

  pdf.save(filename);
}

// ============================================================
// Çizim yardımcıları
// ============================================================

function drawHeroCard(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: {
    label: string;
    value: string;
    accent?: boolean;
    color?: string;
    sub?: string;
  }
) {
  // Kart bg
  setFill(pdf, data.accent ? COLORS.accentSoft : COLORS.card);
  setDraw(pdf, data.accent ? COLORS.accent : COLORS.line);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setText(pdf, COLORS.ink3);
  pdf.text(data.label, x + 3, y + 5);

  // Value
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(13);
  setText(pdf, data.color || (data.accent ? COLORS.accent : COLORS.ink));
  pdf.text(data.value, x + 3, y + 13);

  // Sub (opsiyonel)
  if (data.sub) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(pdf, COLORS.ink3);
    pdf.text(data.sub, x + 3, y + 18);
  }
}

function drawExtraCard(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: { label: string; value: string; color: string; softBg: string }
) {
  setFill(pdf, data.softBg);
  setDraw(pdf, data.color);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setText(pdf, COLORS.ink3);
  pdf.text(data.label, x + 3, y + 5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  setText(pdf, data.color);
  pdf.text(data.value, x + 3, y + 12);
}

function drawSectionLabel(pdf: jsPDF, x: number, y: number, label: string) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  setText(pdf, COLORS.ink3);
  pdf.text(label, x, y);
}
