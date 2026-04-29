'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import type { PrintableMenuData } from '@/lib/actions/printable-menu';
import {
  TEMPLATE_LIST,
  SIZE_LIST,
  SIZES,
  type TemplateId,
  type PaperSize,
} from '@/lib/printable-menu/templates';
import { PrintMenuDocument } from '@/lib/printable-menu/print-menu-document';
import { toast } from '@/components/ui/toast';

type Props = {
  data: PrintableMenuData;
};

export function PrintableMenuClient({ data }: Props) {
  const [templateId, setTemplateId] = useState<TemplateId>('classic');
  const [size, setSize] = useState<PaperSize>('a4');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);

  const docRef = useRef<HTMLDivElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  // QR oluştur
  useEffect(() => {
    QRCode.toDataURL(data.qr_url, {
      width: 600,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [data.qr_url]);

  // Önizleme alanı boyutuna göre scale otomatik hesapla
  useEffect(() => {
    function recalc() {
      if (!previewWrapRef.current) return;
      const sizeSpec = SIZES[size];
      const docWidthPx = sizeSpec.width_mm * 3.7795;
      const docHeightPx = sizeSpec.height_mm * 3.7795;
      const wrapW = previewWrapRef.current.clientWidth - 64; // padding
      const wrapH = previewWrapRef.current.clientHeight - 64;
      const scaleW = wrapW / docWidthPx;
      const scaleH = wrapH / docHeightPx;
      const finalScale = Math.min(scaleW, scaleH, 1);
      setPreviewScale(Math.max(0.2, finalScale));
    }
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [size]);

  // PDF indir
  async function handleDownloadPdf() {
    if (!docRef.current || downloading) return;
    setDownloading('pdf');
    try {
      const sizeSpec = SIZES[size];
      // html-to-image: PNG dataUrl
      const dataUrl = await htmlToImage.toPng(docRef.current, {
        cacheBust: true,
        pixelRatio: 3, // yüksek çözünürlük
        backgroundColor: undefined,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [sizeSpec.width_mm, sizeSpec.height_mm],
        compress: true,
      });
      pdf.addImage(
        dataUrl,
        'PNG',
        0,
        0,
        sizeSpec.width_mm,
        sizeSpec.height_mm,
        undefined,
        'FAST'
      );
      pdf.save(`${data.business.slug}-menu-${templateId}-${size}.pdf`);
      toast.success('PDF indirildi');
    } catch (err) {
      console.error(err);
      toast.error('PDF oluşturulamadı');
    } finally {
      setDownloading(null);
    }
  }

  // PNG indir
  async function handleDownloadPng() {
    if (!docRef.current || downloading) return;
    setDownloading('png');
    try {
      const dataUrl = await htmlToImage.toPng(docRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: undefined,
      });
      const link = document.createElement('a');
      link.download = `${data.business.slug}-menu-${templateId}-${size}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG indirildi');
    } catch (err) {
      console.error(err);
      toast.error('PNG oluşturulamadı');
    } finally {
      setDownloading(null);
    }
  }

  const productCount = data.categories.reduce(
    (s, c) => s + c.products.length,
    0
  );

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1600px] mx-auto pb-28">
      {/* HEADER */}
      <div className="mb-8">
        <div
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--accent)',
          }}
        >
          MENÜ TASARIM · BASKIYA HAZIR
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 44,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: 'var(--ink)',
          }}
        >
          Basılı menü tasarımı
        </h1>
        <p
          className="text-base mt-2"
          style={{ color: 'var(--ink-2)', maxWidth: 720 }}
        >
          Şablon ve boyut seç, masaya koyabileceğin profesyonel menü
          PDF&apos;ini saniyeler içinde indir. Üstte ürün ve fiyatlar, altta QR
          ile dijital menüne yönlendirme.
        </p>
      </div>

      {/* Boş veri uyarısı */}
      {productCount === 0 && (
        <div
          className="rounded-[var(--r)] p-5 mb-6"
          style={{
            background:
              'color-mix(in srgb, var(--gold, #B8903E) 8%, var(--card))',
            border:
              '1px solid color-mix(in srgb, var(--gold, #B8903E) 26%, var(--line))',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              marginBottom: 4,
            }}
          >
            Önce menüye ürün ekle
          </h3>
          <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>
            Basılı menü oluşturabilmek için en az bir kategori ve ürün gerekli.
            <br />
            <a
              href="/panel/menu"
              className="font-semibold mt-2 inline-block"
              style={{ color: 'var(--accent)' }}
            >
              Menü&apos;ye git →
            </a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* SOL PANEL - kontroller */}
        <div className="space-y-6">
          {/* Şablon seçimi */}
          <Section title="Şablon" eyebrow="Adım 1">
            <div className="space-y-2">
              {TEMPLATE_LIST.map((t) => (
                <TemplateButton
                  key={t.id}
                  template={t}
                  selected={templateId === t.id}
                  onClick={() => setTemplateId(t.id)}
                />
              ))}
            </div>
          </Section>

          {/* Boyut seçimi */}
          <Section title="Boyut" eyebrow="Adım 2">
            <div className="space-y-2">
              {SIZE_LIST.map((s) => (
                <SizeButton
                  key={s.id}
                  size={s}
                  selected={size === s.id}
                  onClick={() => setSize(s.id)}
                />
              ))}
            </div>
          </Section>

          {/* İndirme butonları */}
          <Section title="İndir" eyebrow="Adım 3">
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!!downloading || productCount === 0}
                className="w-full h-12 rounded-[10px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {downloading === 'pdf' ? 'Hazırlanıyor…' : (
                  <>
                    PDF olarak indir <span>↓</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!!downloading || productCount === 0}
                className="w-full h-12 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {downloading === 'png' ? 'Hazırlanıyor…' : (
                  <>
                    PNG olarak indir <span>↓</span>
                  </>
                )}
              </button>
            </div>
            <p
              className="text-[11px] mt-3"
              style={{ color: 'var(--ink-3)', lineHeight: 1.4 }}
            >
              PDF: yazıcıya gönder. PNG: web/sosyal medya için.
            </p>
          </Section>

          {/* Bilgi */}
          <Section title="İçerik" eyebrow="Özet">
            <div className="space-y-1.5 text-[12.5px]">
              <InfoRow label="Kategori" value={String(data.categories.length)} />
              <InfoRow label="Ürün" value={String(productCount)} />
              <InfoRow
                label="QR"
                value={data.qr_url.replace(/^https?:\/\//, '')}
                small
              />
            </div>
          </Section>
        </div>

        {/* SAĞ PANEL - önizleme */}
        <div
          ref={previewWrapRef}
          className="rounded-[var(--r)] flex items-start justify-center overflow-auto"
          style={{
            background:
              'linear-gradient(135deg, var(--paper-2) 0%, var(--card-2) 100%)',
            border: '1px solid var(--line)',
            minHeight: 700,
            padding: 32,
            position: 'relative',
          }}
        >
          {productCount > 0 && (
            <div
              style={{
                width: SIZES[size].width_mm * 3.7795 * previewScale,
                height: SIZES[size].height_mm * 3.7795 * previewScale,
              }}
            >
              <PrintMenuDocument
                ref={docRef}
                data={data}
                templateId={templateId}
                size={size}
                qrDataUrl={qrDataUrl}
                scale={previewScale}
              />
            </div>
          )}
          {productCount === 0 && (
            <div
              className="text-center py-20"
              style={{ color: 'var(--ink-3)' }}
            >
              <div className="text-4xl mb-3 opacity-40">📄</div>
              <p
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                }}
              >
                Önizleme için önce ürün ekle
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION
// ============================================================
function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--accent)',
        }}
      >
        {eyebrow}
      </div>
      <h3
        className="mb-3"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ============================================================
// TEMPLATE BUTTON
// ============================================================
function TemplateButton({
  template,
  selected,
  onClick,
}: {
  template: (typeof TEMPLATE_LIST)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-[10px] p-3 transition-all flex items-center gap-3"
      style={{
        background: selected ? 'var(--paper-2)' : 'var(--card)',
        border: selected
          ? '2px solid var(--ink)'
          : '2px solid var(--line)',
        transform: selected ? 'scale(1.005)' : 'scale(1)',
      }}
    >
      {/* Mini renk önizlemesi */}
      <div
        className="flex-shrink-0 grid place-items-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: template.preview.paper,
          color: template.preview.ink,
          fontFamily: template.fonts.serif,
          fontStyle: template.fonts.italicHeadings ? 'italic' : 'normal',
          fontSize: 18,
          fontWeight: 400,
          border: `1px solid ${template.colors.line}`,
          position: 'relative',
        }}
      >
        Aa
        {/* Accent badge */}
        <span
          className="absolute"
          style={{
            top: -4,
            right: -4,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: template.preview.accent,
            border: '2px solid var(--card)',
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-[14px] font-semibold mb-0.5"
          style={{ color: 'var(--ink)' }}
        >
          {template.name}
        </div>
        <div
          className="text-[11px] truncate"
          style={{ color: 'var(--ink-3)' }}
        >
          {template.description}
        </div>
      </div>

      {selected && (
        <span
          className="grid place-items-center rounded-full flex-shrink-0"
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
    </button>
  );
}

// ============================================================
// SIZE BUTTON
// ============================================================
function SizeButton({
  size,
  selected,
  onClick,
}: {
  size: (typeof SIZE_LIST)[number];
  selected: boolean;
  onClick: () => void;
}) {
  // Boyut mini görsel - oransal
  const previewMaxW = 32;
  const previewMaxH = 44;
  const ratio = size.width_mm / size.height_mm;
  let w, h;
  if (ratio > previewMaxW / previewMaxH) {
    w = previewMaxW;
    h = previewMaxW / ratio;
  } else {
    h = previewMaxH;
    w = previewMaxH * ratio;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-[10px] p-3 transition-all flex items-center gap-3"
      style={{
        background: selected ? 'var(--paper-2)' : 'var(--card)',
        border: selected
          ? '2px solid var(--ink)'
          : '2px solid var(--line)',
      }}
    >
      <div
        className="flex-shrink-0 grid place-items-center"
        style={{
          width: previewMaxW,
          height: previewMaxH,
        }}
      >
        <div
          style={{
            width: w,
            height: h,
            background: '#fff',
            border: `1px solid var(--line)`,
            boxShadow: '0 2px 4px rgba(42,31,24,0.06)',
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-[14px] font-semibold mb-0.5 flex items-baseline gap-2"
          style={{ color: 'var(--ink)' }}
        >
          {size.name}
          <span
            className="text-[10px]"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
              fontWeight: 400,
              letterSpacing: '0.04em',
            }}
          >
            {size.width_mm}×{size.height_mm}mm
          </span>
        </div>
        <div
          className="text-[11px] truncate"
          style={{ color: 'var(--ink-3)' }}
        >
          {size.description}
        </div>
      </div>

      {selected && (
        <span
          className="grid place-items-center rounded-full flex-shrink-0"
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
    </button>
  );
}

// ============================================================
// INFO ROW
// ============================================================
function InfoRow({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[10px] uppercase font-bold flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.16em',
          color: 'var(--ink-3)',
          width: 60,
        }}
      >
        {label}
      </span>
      <span
        className="truncate"
        style={{
          color: 'var(--ink)',
          fontFamily: small ? 'var(--f-mono)' : 'inherit',
          fontWeight: small ? 400 : 600,
          fontSize: small ? 11 : 13,
        }}
      >
        {value}
      </span>
    </div>
  );
}
