'use client';

import { useState, useEffect } from 'react';
import {
  generateQrDataUrl,
  generateCardSvg,
  svgToPngDataUrl,
  downloadDataUrl,
  DESIGN_META,
  type QrDesign,
  type QrLang,
} from '@/lib/utils/qr-design';
import { toast } from '@/components/ui/toast';
import {
  generateSingleQrPdf,
  generateBulkQrPdf,
  downloadBlob,
  type QrPdfItem,
} from '@/lib/utils/qr-pdf';

type Mode =
  | { kind: 'single'; item: QrPdfItem }
  | { kind: 'bulk'; items: QrPdfItem[] };

interface QrPickerModalProps {
  mode: Mode;
  onClose: () => void;
}

const DESIGNS: QrDesign[] = ['minimal', 'warm', 'dark', 'kraft'];

export function QrPickerModal({ mode, onClose }: QrPickerModalProps) {
  const [selected, setSelected] = useState<QrDesign>('warm');
  const [lang, setLang] = useState<QrLang>('tr');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [previewSvg, setPreviewSvg] = useState<string>('');

  const previewItem: QrPdfItem =
    mode.kind === 'single' ? mode.item : mode.items[0] || { tableName: 'Masa 1', businessName: 'İşletme', qrUrl: 'https://example.com' };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qrData = await generateQrDataUrl(previewItem.qrUrl, selected);
        const svg = generateCardSvg({
          design: selected,
          qrDataUrl: qrData,
          tableName: previewItem.tableName,
          businessName: previewItem.businessName,
          lang,
          width: 560,
          height: 760,
        });
        if (!cancelled) setPreviewSvg(svg);
      } catch (e) {
        console.error('Preview error:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, lang, previewItem.qrUrl, previewItem.tableName, previewItem.businessName]);

  async function handleDownloadPng() {
    if (mode.kind !== 'single') return;
    setBusy('png');
    try {
      const qrData = await generateQrDataUrl(mode.item.qrUrl, selected);
      const svg = generateCardSvg({
        design: selected,
        qrDataUrl: qrData,
        tableName: mode.item.tableName,
        businessName: mode.item.businessName,
        lang,
        width: 1120,
        height: 1520,
      });
      const png = await svgToPngDataUrl(svg, 2);
      const safeName = mode.item.tableName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
      downloadDataUrl(png, `qr-${safeName}-${selected}.png`);
    } catch (e) {
      toast.error('PNG oluşturulamadı: ' + (e instanceof Error ? e.message : 'hata'));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadSinglePdf() {
    if (mode.kind !== 'single') return;
    setBusy('pdf');
    try {
      const blob = await generateSingleQrPdf(mode.item, selected, lang);
      const safeName = mode.item.tableName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
      downloadBlob(blob, `qr-${safeName}-${selected}.pdf`);
    } catch (e) {
      toast.error('PDF oluşturulamadı: ' + (e instanceof Error ? e.message : 'hata'));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadBulkPdf() {
    if (mode.kind !== 'bulk') return;
    setBusy('pdf');
    setProgress({ done: 0, total: mode.items.length });
    try {
      const blob = await generateBulkQrPdf(mode.items, selected, lang, (done, total) =>
        setProgress({ done, total })
      );
      downloadBlob(blob, `qr-kodlar-${selected}.pdf`);
    } catch (e) {
      toast.error('PDF oluşturulamadı: ' + (e instanceof Error ? e.message : 'hata'));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  const title =
    mode.kind === 'single'
      ? `QR Kodu — ${mode.item.tableName}`
      : `Tüm Masalar İçin QR (${mode.items.length})`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'qpFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] w-full max-w-[880px] max-h-[92vh] border border-line relative flex flex-col md:flex-row overflow-hidden"
        style={{
          boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'qpSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[14px] right-[14px] z-10 w-[32px] h-[32px] rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Left: design picker + actions */}
        <div className="flex-1 min-w-0 p-6 md:p-7 overflow-y-auto">
          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            QR KODU İNDİR
          </div>
          <h2
            className="mb-1"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h2>
          <p className="text-ink-2 text-sm mb-5">
            Tasarım seç ve indir. Yazdırıp masalara yapıştırabilirsin.
          </p>

          {/* Dil seçici */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="uppercase text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              DİL
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setLang('tr')}
                className="h-7 px-3 rounded-full text-[11px] font-semibold transition-colors"
                style={{
                  background: lang === 'tr' ? 'var(--ink)' : 'var(--paper-2)',
                  color: lang === 'tr' ? 'var(--paper)' : 'var(--ink-2)',
                  border: `1px solid ${lang === 'tr' ? 'var(--ink)' : 'var(--line)'}`,
                }}
              >
                Türkçe
              </button>
              <button
                onClick={() => setLang('en')}
                className="h-7 px-3 rounded-full text-[11px] font-semibold transition-colors"
                style={{
                  background: lang === 'en' ? 'var(--ink)' : 'var(--paper-2)',
                  color: lang === 'en' ? 'var(--paper)' : 'var(--ink-2)',
                  border: `1px solid ${lang === 'en' ? 'var(--ink)' : 'var(--line)'}`,
                }}
              >
                English
              </button>
            </div>
          </div>

          {/* Design cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {DESIGNS.map((d) => {
              const meta = DESIGN_META[d];
              const isActive = selected === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className="text-left rounded-[12px] p-3 transition-all"
                  style={{
                    background: isActive ? meta.preview.bg : 'var(--paper-2)',
                    border: isActive
                      ? `2px solid var(--accent)`
                      : '1px solid var(--line)',
                    boxShadow: isActive ? '0 2px 8px rgba(196,85,58,0.15)' : 'none',
                  }}
                >
                  {/* Mini preview */}
                  <div
                    className="w-full h-16 rounded-[8px] mb-2 grid place-items-center relative overflow-hidden"
                    style={{ background: meta.preview.bg }}
                  >
                    <div
                      className="w-8 h-8 rounded-[4px]"
                      style={{ background: meta.preview.ink }}
                    />
                    <span
                      className="absolute bottom-1 right-1.5 text-[8px]"
                      style={{
                        fontFamily: 'var(--f-serif)',
                        fontStyle: 'italic',
                        color: meta.preview.accent,
                        opacity: 0.6,
                      }}
                    >
                      aleg
                    </span>
                  </div>
                  <div
                    className="text-xs font-semibold mb-0.5"
                    style={{
                      color: isActive ? meta.preview.ink : 'var(--ink)',
                    }}
                  >
                    {meta.label}
                  </div>
                  <div
                    className="text-[10px]"
                    style={{
                      color: isActive
                        ? `color-mix(in srgb, ${meta.preview.ink} 65%, transparent)`
                        : 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.04em',
                      lineHeight: 1.3,
                    }}
                  >
                    {meta.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Download actions */}
          <div className="flex flex-col gap-2">
            {mode.kind === 'single' && (
              <>
                <button
                  onClick={handleDownloadPng}
                  disabled={!!busy}
                  className="h-11 px-5 rounded-[12px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--accent)',
                    color: '#FAF5EA',
                  }}
                >
                  {busy === 'png' ? (
                    <Spinner />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {busy === 'png' ? 'PNG oluşturuluyor...' : 'PNG Olarak İndir'}
                </button>
                <button
                  onClick={handleDownloadSinglePdf}
                  disabled={!!busy}
                  className="h-11 px-5 rounded-[12px] font-semibold text-sm transition-colors hover:bg-paper-3 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                  }}
                >
                  {busy === 'pdf' ? (
                    <Spinner />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {busy === 'pdf' ? 'PDF hazırlanıyor...' : 'PDF Olarak İndir (A6)'}
                </button>
              </>
            )}

            {mode.kind === 'bulk' && (
              <button
                onClick={handleDownloadBulkPdf}
                disabled={!!busy || mode.items.length === 0}
                className="h-11 px-5 rounded-[12px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                }}
              >
                {busy === 'pdf' ? (
                  <>
                    <Spinner />
                    {progress ? `${progress.done}/${progress.total} hazırlanıyor...` : 'Hazırlanıyor...'}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Tümünü PDF İndir ({mode.items.length} kart)
                  </>
                )}
              </button>
            )}

            <p className="text-ink-3 text-[11px] mt-2 text-center" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
              {mode.kind === 'bulk'
                ? 'A4 sayfada 2x2 ızgara · kesilerek yapıştırılabilir'
                : 'Yüksek çözünürlük · 1120×1520 px'}
            </p>
          </div>
        </div>

        {/* Right: preview */}
        <div
          className="md:w-[340px] md:flex-shrink-0 p-5 flex items-center justify-center"
          style={{
            background: 'var(--paper-2)',
            borderLeft: '1px solid var(--line)',
          }}
        >
          {previewSvg ? (
            <div
              className="qr-preview-wrap w-full max-w-[280px] rounded-[8px] overflow-hidden shadow-lg"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          ) : (
            <div className="text-ink-3 text-xs">Önizleme hazırlanıyor...</div>
          )}
        </div>

        <style jsx global>{`
          .qr-preview-wrap svg {
            display: block;
            width: 100% !important;
            height: auto !important;
            max-width: 100%;
          }
        `}</style>

        <style jsx>{`
          @keyframes qpFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes qpSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="32"
        strokeDashoffset="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
