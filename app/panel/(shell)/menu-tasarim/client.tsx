'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import type {
  PrintableMenuData,
  PrintableMenuCategory,
} from '@/lib/actions/printable-menu';
import { fetchLogoAsDataUrl } from '@/lib/actions/printable-menu';
import {
  TEMPLATE_LIST,
  SIZE_LIST,
  SIZES,
  HEADER_VARIANTS,
  FOOTER_VARIANTS,
  FONT_PRESETS,
  type TemplateId,
  type PaperSize,
  type HeaderVariant,
  type FooterVariant,
  type FontPresetId,
} from '@/lib/printable-menu/templates';
import { PrintMenuDocument, type SocialQr } from '@/lib/printable-menu/print-menu-document';
import { toast } from '@/components/ui/toast';

type Props = {
  data: PrintableMenuData;
};

const MM = 3.7795;

export function PrintableMenuClient({ data }: Props) {
  // Ana ayarlar
  const [templateId, setTemplateId] = useState<TemplateId>('classic');
  const [size, setSize] = useState<PaperSize>('a4');
  const [headerVariant, setHeaderVariant] = useState<HeaderVariant>('centered');
  const [footerVariant, setFooterVariant] = useState<FooterVariant>('social');
  const [showDietaryTags, setShowDietaryTags] = useState(true);
  const [showSinceBadge, setShowSinceBadge] = useState(true);
  const [customSignature, setCustomSignature] = useState('');

  // Yeni: Font seçimi
  const [fontPreset, setFontPreset] = useState<FontPresetId>('template');

  // Yeni: Sosyal QR seçimi (hangi platformlar menüye eklenecek)
  type SocialPlatform =
    | 'instagram'
    | 'facebook'
    | 'website'
    | 'tiktok'
    | 'x'
    | 'youtube'
    | 'threads'
    | 'linkedin';

  // Tüm platformların URL'lerini settings'ten topla
  const availableSocials = useMemo<
    Array<{ id: SocialPlatform; label: string; url: string; icon: string }>
  >(() => {
    const out: Array<{ id: SocialPlatform; label: string; url: string; icon: string }> = [];
    const push = (
      id: SocialPlatform,
      label: string,
      url: string | null | undefined,
      icon: string
    ) => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        out.push({ id, label, url, icon });
      }
    };
    push('instagram', 'Instagram', data.business.instagram, '📷');
    push('facebook', 'Facebook', data.business.facebook, '📘');
    push('website', 'Web', data.business.website, '🌐');
    push('tiktok', 'TikTok', data.business.social_links.tiktok, '🎵');
    push('x', 'X', data.business.social_links.x, '𝕏');
    push('youtube', 'YouTube', data.business.social_links.youtube, '▶');
    push('threads', 'Threads', data.business.social_links.threads, '@');
    push('linkedin', 'LinkedIn', data.business.social_links.linkedin, 'in');
    return out;
  }, [data.business]);

  const [socialEnabled, setSocialEnabled] = useState<Record<string, boolean>>(
    {}
  );

  // Seçilen platformlar için QR'ları client-side oluştur
  const [socialQrs, setSocialQrs] = useState<SocialQr[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function gen() {
      const enabled = availableSocials.filter((s) => socialEnabled[s.id]);
      const qrs: SocialQr[] = [];
      for (const s of enabled) {
        try {
          const dataUrl = await QRCode.toDataURL(s.url, {
            margin: 1,
            width: 240,
            color: { dark: '#1a1a1a', light: '#FFFFFF' },
          });
          qrs.push({
            id: s.id,
            label: s.label,
            url: s.url,
            qrDataUrl: dataUrl,
            icon: s.icon,
          });
        } catch {
          // Yoksay
        }
      }
      if (!cancelled) setSocialQrs(qrs);
    }
    gen();
    return () => {
      cancelled = true;
    };
  }, [availableSocials, socialEnabled]);

  // Masa seçimi (sadece masa-bazlı QR — genel QR kaldırıldı)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    data.tables[0]?.id || null
  );

  // Logo mode
  type LogoMode = 'original' | 'white-frame' | 'monogram';
  const [logoMode, setLogoMode] = useState<LogoMode>('original');

  // Panel UI durum
  const [activeSection, setActiveSection] = useState<
    | 'template'
    | 'size'
    | 'header'
    | 'footer'
    | 'extras'
    | 'qr'
    | 'logo'
    | 'font'
    | 'social'
    | 'download'
  >('template');

  // Kaynak veriler
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [downloading, setDownloading] = useState<
    'pdf' | 'png' | 'bulk' | 'tables' | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);

  const docRef = useRef<HTMLDivElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  // Aktif QR URL'i (seçili masaya göre)
  const activeQrUrl = useMemo(() => {
    if (selectedTableId) {
      const t = data.tables.find((x) => x.id === selectedTableId);
      if (t) return t.qr_url;
    }
    // Hiç masa yoksa veya seçim yoksa: genel URL fallback (qr-less)
    return data.qr_url;
  }, [selectedTableId, data.qr_url, data.tables]);

  // QR oluştur (aktif URL'e göre)
  useEffect(() => {
    QRCode.toDataURL(activeQrUrl, {
      width: 600,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [activeQrUrl]);

  // Logo'yu base64 dataURL olarak al
  useEffect(() => {
    if (!data.business.logo_url) {
      setLogoDataUrl(null);
      return;
    }
    fetchLogoAsDataUrl(data.business.logo_url).then((res) => {
      if (res.success && res.dataUrl) {
        setLogoDataUrl(res.dataUrl);
      }
    });
  }, [data.business.logo_url]);

  // Önizleme scale auto-fit
  useEffect(() => {
    function recalc() {
      if (!previewWrapRef.current) return;
      const sizeSpec = SIZES[size];
      const docWidthPx = sizeSpec.width_mm * MM;
      const docHeightPx = sizeSpec.height_mm * MM;
      const wrapW = previewWrapRef.current.clientWidth - 64;
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

  // ============================================================
  // ÇOKLU SAYFA BÖLME ALGORİTMASI
  // Her sayfaya yaklaşık ne kadar ürün sığar? Boyuta göre tahmin.
  // ============================================================
  const pages = useMemo(() => {
    return splitIntoPages(data.categories, size);
  }, [data.categories, size]);

  // Sayfa numarası geçerli olsun
  useEffect(() => {
    if (currentPage > pages.length) setCurrentPage(1);
  }, [pages.length, currentPage]);

  // ============================================================
  // İNDİRME FONKSİYONLARI
  // ============================================================
  async function captureDocAsDataUrl(): Promise<string | null> {
    if (!docRef.current) return null;
    return await htmlToImage.toPng(docRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: undefined,
    });
  }

  async function handleDownloadPdf() {
    if (!docRef.current || downloading) return;
    setDownloading('pdf');
    try {
      // Çoklu sayfa varsa: her sayfayı ayrı ayrı capture etmeliyiz
      // Şu an currentPage göstereniyoruz, diğerlerini almak için
      // currentPage state'ini değiştirip her birini capture edeceğiz
      const sizeSpec = SIZES[size];
      const totalPages = pages.length;

      const pdf = new jsPDF({
        orientation: sizeSpec.isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: sizeSpec.isLandscape
          ? [sizeSpec.height_mm, sizeSpec.width_mm]
          : [sizeSpec.width_mm, sizeSpec.height_mm],
        compress: true,
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Sayfaları sırayla göster ve capture et
      for (let i = 1; i <= totalPages; i++) {
        setCurrentPage(i);
        // Render'ın bitmesini bekle (React state update + re-render + paint)
        await new Promise((r) => setTimeout(r, 80));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => setTimeout(r, 80));

        const dataUrl = await captureDocAsDataUrl();
        if (!dataUrl) continue;

        if (i > 1) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
      }

      // İlk sayfaya geri dön
      setCurrentPage(1);

      pdf.save(`${data.business.slug}-menu-${templateId}-${size}.pdf`);
      toast.success(
        totalPages > 1 ? `PDF indirildi (${totalPages} sayfa)` : 'PDF indirildi'
      );
    } catch (err) {
      console.error(err);
      toast.error('PDF oluşturulamadı');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadPng() {
    if (!docRef.current || downloading) return;
    setDownloading('png');
    try {
      // PNG için sadece şu anki sayfayı al (PNG çoklu sayfa olamaz)
      const dataUrl = await captureDocAsDataUrl();
      if (!dataUrl) {
        toast.error('PNG oluşturulamadı');
        return;
      }
      const pageInfo = pages.length > 1 ? `-sayfa${currentPage}` : '';
      const link = document.createElement('a');
      link.download = `${data.business.slug}-menu-${templateId}-${size}${pageInfo}.png`;
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

  // Toplu indirme: A4, A5, Pláka — sırayla 3 PDF
  async function handleBulkDownload() {
    if (!docRef.current || downloading) return;
    setDownloading('bulk');
    const originalSize = size;
    const originalPage = currentPage;
    try {
      const targetSizes: PaperSize[] = ['a4', 'a5', 'plate'];
      for (const sz of targetSizes) {
        setSize(sz);
        // İlk sayfaya dön
        setCurrentPage(1);
        // Re-render bekle
        await new Promise((r) => setTimeout(r, 200));
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const sizeSpec = SIZES[sz];
        const targetPages = splitIntoPages(data.categories, sz);
        const total = targetPages.length;

        const pdf = new jsPDF({
          orientation: sizeSpec.isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: sizeSpec.isLandscape
            ? [sizeSpec.height_mm, sizeSpec.width_mm]
            : [sizeSpec.width_mm, sizeSpec.height_mm],
          compress: true,
        });

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        for (let i = 1; i <= total; i++) {
          setCurrentPage(i);
          await new Promise((r) => setTimeout(r, 120));
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          await new Promise((r) => setTimeout(r, 80));

          const dataUrl = await captureDocAsDataUrl();
          if (!dataUrl) continue;
          if (i > 1) pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
        }

        pdf.save(`${data.business.slug}-menu-${templateId}-${sz}.pdf`);
        // Browser'a download için fırsat ver
        await new Promise((r) => setTimeout(r, 400));
      }

      toast.success('3 boyut da indirildi');
    } catch (err) {
      console.error(err);
      toast.error('Toplu indirme başarısız');
    } finally {
      setSize(originalSize);
      setCurrentPage(originalPage);
      setDownloading(null);
    }
  }

  // Tüm masalar için ayrı PDF üret, ZIP olarak indir
  async function handleBulkTablesDownload() {
    if (!docRef.current || downloading) return;
    if (data.tables.length === 0) {
      toast.error('Masa bulunamadı');
      return;
    }
    setDownloading('tables');
    const originalSelected = selectedTableId;
    const originalPage = currentPage;
    try {
      const sizeSpec = SIZES[size];
      const targetPages = splitIntoPages(data.categories, size);
      const totalPages = targetPages.length;

      const zip = new JSZip();
      const folder = zip.folder(`${data.business.slug}-masa-menuleri`);

      let processed = 0;
      for (const table of data.tables) {
        setSelectedTableId(table.id);
        setCurrentPage(1);
        // QR'ın yeniden render olması için bekle
        await new Promise((r) => setTimeout(r, 250));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => setTimeout(r, 80));

        const pdf = new jsPDF({
          orientation: sizeSpec.isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: sizeSpec.isLandscape
            ? [sizeSpec.height_mm, sizeSpec.width_mm]
            : [sizeSpec.width_mm, sizeSpec.height_mm],
          compress: true,
        });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        for (let i = 1; i <= totalPages; i++) {
          setCurrentPage(i);
          await new Promise((r) => setTimeout(r, 120));
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          await new Promise((r) => setTimeout(r, 80));

          const dataUrl = await captureDocAsDataUrl();
          if (!dataUrl) continue;
          if (i > 1) pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
        }

        // Masa adını güvenli filename'e çevir
        const safeName = table.name
          .toLowerCase()
          .replace(/[çğıöşü]/g, (c) =>
            ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] || c
          )
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `masa-${processed + 1}`;

        const pdfBlob = pdf.output('blob');
        folder?.file(`${safeName}.pdf`, pdfBlob);
        processed++;
      }

      // ZIP üret ve indir
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `${data.business.slug}-masa-menuleri-${templateId}-${size}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      // URL temizle
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);

      toast.success(`${processed} masa için PDF zip'lendi`);
    } catch (err) {
      console.error(err);
      toast.error('Toplu masa indirme başarısız');
    } finally {
      setSelectedTableId(originalSelected);
      setCurrentPage(originalPage);
      setDownloading(null);
    }
  }

  const productCount = data.categories.reduce(
    (s, c) => s + c.products.length,
    0
  );

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1700px] mx-auto pb-28">
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
          style={{ color: 'var(--ink-2)', maxWidth: 760 }}
        >
          Şablon ve boyut seç, header/footer varyasyonu ayarla,
          allergen/şefin önerisi rozetlerini aç-kapat. Çoklu sayfa
          otomatik. Tek tıkla 3 boyut hepsi indir.
        </p>

        {/* Özel tasarım CTA */}
        <a
          href="/panel/menu-tasarim/ozel"
          className="mt-5 inline-flex items-center gap-3 px-4 py-3 rounded-[10px] transition-all hover:opacity-90 group"
          style={{
            background:
              'color-mix(in srgb, var(--accent) 8%, var(--card))',
            border:
              '1px solid color-mix(in srgb, var(--accent) 28%, var(--line))',
            textDecoration: 'none',
          }}
        >
          <span
            className="grid place-items-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'var(--paper)',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ⤴
          </span>
          <div className="flex-1">
            <div
              className="text-[10px] uppercase font-bold mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              ALTERNATİF
            </div>
            <div
              className="text-[14px] font-semibold"
              style={{ color: 'var(--ink)' }}
            >
              Kendi tasarımım var
            </div>
            <div
              className="text-[11px] mt-0.5"
              style={{ color: 'var(--ink-3)' }}
            >
              Tasarımcına yaptırdıysan PNG/JPG/PDF yükle, altına QR ekleyelim.
            </div>
          </div>
          <span
            className="flex-shrink-0 transition-transform group-hover:translate-x-1"
            style={{ color: 'var(--accent)', fontSize: 18 }}
          >
            →
          </span>
        </a>
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
            Basılı menü oluşturabilmek için en az bir kategori ve ürün gerekli.{' '}
            <a
              href="/panel/menu"
              className="font-semibold inline-block"
              style={{ color: 'var(--accent)' }}
            >
              Menü&apos;ye git →
            </a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* SOL PANEL - kontroller (accordion stili) */}
        <div className="space-y-3">
          {/* 1. Şablon */}
          <Section
            title="Şablon"
            eyebrow="1"
            open={activeSection === 'template'}
            onToggle={() =>
              setActiveSection(
                activeSection === 'template' ? 'size' : 'template'
              )
            }
            summary={TEMPLATE_LIST.find((t) => t.id === templateId)?.name || ''}
          >
            <div className="space-y-2">
              {TEMPLATE_LIST.map((tt) => (
                <SelectButton
                  key={tt.id}
                  selected={templateId === tt.id}
                  onClick={() => setTemplateId(tt.id)}
                  preview={
                    <div
                      className="flex-shrink-0 grid place-items-center"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: tt.preview.paper,
                        color: tt.preview.ink,
                        fontFamily: tt.fonts.serif,
                        fontStyle: tt.fonts.italicHeadings ? 'italic' : 'normal',
                        fontSize: 18,
                        border: `1px solid ${tt.colors.line}`,
                        position: 'relative',
                      }}
                    >
                      Aa
                      <span
                        className="absolute"
                        style={{
                          top: -4,
                          right: -4,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: tt.preview.accent,
                          border: '2px solid var(--card)',
                        }}
                      />
                    </div>
                  }
                  title={tt.name}
                  description={tt.description}
                />
              ))}
            </div>
          </Section>

          {/* 2. Boyut */}
          <Section
            title="Boyut"
            eyebrow="2"
            open={activeSection === 'size'}
            onToggle={() =>
              setActiveSection(activeSection === 'size' ? 'logo' : 'size')
            }
            summary={SIZES[size].name}
          >
            <div className="space-y-2">
              {SIZE_LIST.map((s) => {
                const previewMaxW = 32;
                const previewMaxH = 44;
                const ratio = s.width_mm / s.height_mm;
                let w, h;
                if (ratio > previewMaxW / previewMaxH) {
                  w = previewMaxW;
                  h = previewMaxW / ratio;
                } else {
                  h = previewMaxH;
                  w = previewMaxH * ratio;
                }
                return (
                  <SelectButton
                    key={s.id}
                    selected={size === s.id}
                    onClick={() => setSize(s.id)}
                    preview={
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
                            border: '1px solid var(--line)',
                            boxShadow: '0 2px 4px rgba(42,31,24,0.06)',
                          }}
                        />
                      </div>
                    }
                    title={s.name}
                    titleSuffix={
                      <span
                        className="text-[10px]"
                        style={{
                          fontFamily: 'var(--f-mono)',
                          color: 'var(--ink-3)',
                        }}
                      >
                        {s.width_mm}×{s.height_mm}mm
                      </span>
                    }
                    description={s.description}
                  />
                );
              })}
            </div>
          </Section>

          {/* 3. Logo Modu */}
          <Section
            title="Logo modu"
            eyebrow="3"
            open={activeSection === 'logo'}
            onToggle={() =>
              setActiveSection(activeSection === 'logo' ? 'header' : 'logo')
            }
            summary={
              logoMode === 'original'
                ? 'Orijinal'
                : logoMode === 'white-frame'
                  ? 'Beyaz çerçeve'
                  : 'Sadece monogram'
            }
          >
            {!data.business.logo_url && (
              <div
                className="rounded-[8px] p-3 mb-3 text-[12px]"
                style={{
                  background:
                    'color-mix(in srgb, var(--gold, #B8903E) 8%, var(--card))',
                  border:
                    '1px solid color-mix(in srgb, var(--gold, #B8903E) 26%, var(--line))',
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}
              >
                Logo yüklü değil. Logo yüklersen modlar farklı görünür.{' '}
                <a
                  href="/panel/ayarlar"
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                >
                  Ayarlar →
                </a>
              </div>
            )}
            <div className="space-y-2">
              <SelectButton
                selected={logoMode === 'original'}
                onClick={() => setLogoMode('original')}
                title="Orijinal"
                description="Logo olduğu gibi basılır. Açık zeminli/şeffaf logolar açık temalarda iyi durur."
              />
              <SelectButton
                selected={logoMode === 'white-frame'}
                onClick={() => setLogoMode('white-frame')}
                title="Beyaz çerçeve"
                description="Logo beyaz daire içinde. Koyu temalarda (Elite, Foto Hero, Editorial) garantili görünür."
              />
              <SelectButton
                selected={logoMode === 'monogram'}
                onClick={() => setLogoMode('monogram')}
                title="Sadece monogram"
                description={`Logo yerine işletme baş harfi (${data.business.name.charAt(0).toUpperCase()}). Her zeminde temiz durur.`}
              />
            </div>
          </Section>

          {/* 4. Header */}
          <Section
            title="Üst bölge"
            eyebrow="4"
            open={activeSection === 'header'}
            onToggle={() =>
              setActiveSection(
                activeSection === 'header' ? 'footer' : 'header'
              )
            }
            summary={
              HEADER_VARIANTS.find((h) => h.id === headerVariant)?.name || ''
            }
          >
            <div className="space-y-2">
              {HEADER_VARIANTS.map((h) => (
                <SelectButton
                  key={h.id}
                  selected={headerVariant === h.id}
                  onClick={() => setHeaderVariant(h.id)}
                  title={h.name}
                  description={h.description}
                />
              ))}
            </div>
            {!data.business.logo_url && (
              <div
                className="mt-3 p-3 rounded-[8px] text-[11px]"
                style={{
                  background: 'var(--paper-2)',
                  color: 'var(--ink-3)',
                  border: '1px solid var(--line)',
                }}
              >
                💡 Logo eklersen header çok daha güzel görünür.{' '}
                <a
                  href="/panel/ayarlar"
                  style={{
                    color: 'var(--accent)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Ayarlar
                </a>
              </div>
            )}
          </Section>

          {/* 5. Footer */}
          <Section
            title="Alt bölge"
            eyebrow="5"
            open={activeSection === 'footer'}
            onToggle={() =>
              setActiveSection(
                activeSection === 'footer' ? 'extras' : 'footer'
              )
            }
            summary={
              FOOTER_VARIANTS.find((f) => f.id === footerVariant)?.name || ''
            }
          >
            <div className="space-y-2">
              {FOOTER_VARIANTS.map((f) => (
                <SelectButton
                  key={f.id}
                  selected={footerVariant === f.id}
                  onClick={() => setFooterVariant(f.id)}
                  title={f.name}
                  description={f.description}
                />
              ))}
            </div>
            {footerVariant === 'full' && (
              <div className="mt-3">
                <label
                  className="block text-[10px] uppercase font-bold mb-1.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.16em',
                    color: 'var(--ink-3)',
                  }}
                >
                  Özel imza / kapanış
                </label>
                <input
                  type="text"
                  value={customSignature}
                  onChange={(e) => setCustomSignature(e.target.value)}
                  placeholder="Afiyet olsun"
                  className="w-full rounded-[8px] px-3 h-10 text-[13px]"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            )}
          </Section>

          {/* 6. Extras (rozetler) */}
          <Section
            title="Rozetler"
            eyebrow="6"
            open={activeSection === 'extras'}
            onToggle={() =>
              setActiveSection(
                activeSection === 'extras' ? 'font' : 'extras'
              )
            }
            summary={
              showDietaryTags && showSinceBadge
                ? 'Hepsi açık'
                : showDietaryTags
                  ? 'Allergen'
                  : showSinceBadge
                    ? 'Since'
                    : 'Kapalı'
            }
          >
            <ToggleRow
              label="Diet/allergen rozetleri"
              description="Vegan, glütensiz, helal, ev yapımı..."
              checked={showDietaryTags}
              onChange={setShowDietaryTags}
            />
            <ToggleRow
              label="Since rozeti"
              description={`Kuruluş yılı (${data.business.created_year})`}
              checked={showSinceBadge}
              onChange={setShowSinceBadge}
            />
            <div
              className="mt-3 p-3 rounded-[8px] text-[11px]"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-3)',
                border: '1px solid var(--line)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--ink)' }}>Şefin önerisi</strong>{' '}
              rozeti otomatik gösterilir. Ürünlerde &quot;Şefin önerisi&quot;
              olarak işaretle.
              <br />
              <strong style={{ color: 'var(--ink)' }}>🌶 Acılık</strong>{' '}
              ürün ayarındaki acılık seviyesine göre.
            </div>
          </Section>

          {/* 7. Yazı Tipi */}
          <Section
            title="Yazı Tipi"
            eyebrow="7"
            open={activeSection === 'font'}
            onToggle={() =>
              setActiveSection(activeSection === 'font' ? 'social' : 'font')
            }
            summary={
              fontPreset === 'template'
                ? 'Şablon varsayılanı'
                : FONT_PRESETS[fontPreset].name
            }
          >
            <div className="grid grid-cols-1 gap-2">
              {/* Şablon varsayılanı */}
              <button
                onClick={() => setFontPreset('template')}
                className="text-left p-3 rounded-[8px] transition-all"
                style={{
                  background:
                    fontPreset === 'template'
                      ? 'color-mix(in oklab, var(--ink) 4%, var(--card))'
                      : 'var(--card)',
                  border:
                    fontPreset === 'template'
                      ? '2px solid var(--ink)'
                      : '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--ink)',
                  }}
                >
                  Şablon varsayılanı
                </div>
                <div
                  className="mt-1"
                  style={{ fontSize: 11, color: 'var(--ink-3)' }}
                >
                  Seçtiğin şablonun kendi font'unu kullanır
                </div>
              </button>

              {/* 4 preset */}
              {(['serif', 'sans', 'display', 'mono'] as const).map((id) => {
                const p = FONT_PRESETS[id];
                const selected = fontPreset === id;
                return (
                  <button
                    key={id}
                    onClick={() => setFontPreset(id)}
                    className="text-left p-3 rounded-[8px] transition-all"
                    style={{
                      background: selected
                        ? 'color-mix(in oklab, var(--ink) 4%, var(--card))'
                        : 'var(--card)',
                      border: selected
                        ? '2px solid var(--ink)'
                        : '1px solid var(--line)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: p.serif,
                        fontStyle: p.italic ? 'italic' : 'normal',
                        fontSize: 20,
                        fontWeight: id === 'display' ? 700 : 500,
                        color: 'var(--ink)',
                        lineHeight: 1,
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 11, color: 'var(--ink-3)' }}
                    >
                      {p.description}
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              className="mt-3 p-3 rounded-[8px] text-[11px]"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-3)',
                border: '1px solid var(--line)',
                lineHeight: 1.5,
              }}
            >
              💡 Bu seçim sadece <strong>basılı PDF/PNG menü</strong> için.
              Müşterinin telefonda gördüğü dijital menü için Ayarlar → Tema
              sekmesinden ayrıca seçilir.
            </div>
          </Section>

          {/* 8. Sosyal QR */}
          <Section
            title="Sosyal QR"
            eyebrow="8"
            open={activeSection === 'social'}
            onToggle={() =>
              setActiveSection(activeSection === 'social' ? 'qr' : 'social')
            }
            summary={
              availableSocials.length === 0
                ? 'Hesap eklenmemiş'
                : socialQrs.length === 0
                  ? 'Seçim yok'
                  : `${socialQrs.length} hesap`
            }
          >
            {availableSocials.length === 0 ? (
              <div
                className="p-3 rounded-[8px] text-[12px]"
                style={{
                  background: 'var(--paper-2)',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--line)',
                  lineHeight: 1.5,
                }}
              >
                Henüz sosyal medya hesabı eklenmemiş. Önce{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  Ayarlar → Kimlik
                </strong>{' '}
                sayfasından Instagram, TikTok, YouTube vb. hesaplarını ekle.
                Sonra buraya dönüp QR&apos;larını seçebilirsin.
              </div>
            ) : (
              <>
                <div
                  className="mb-3 p-3 rounded-[8px] text-[11px]"
                  style={{
                    background: 'var(--paper-2)',
                    color: 'var(--ink-3)',
                    border: '1px solid var(--line)',
                    lineHeight: 1.5,
                  }}
                >
                  💡 Seçtiğin hesapların QR&apos;ları menünün altına eklenir.
                  Müşteriler tarayıp profile gider.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableSocials.map((s) => {
                    const checked = !!socialEnabled[s.id];
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setSocialEnabled((prev) => ({
                            ...prev,
                            [s.id]: !prev[s.id],
                          }))
                        }
                        className="flex items-center gap-2 p-3 rounded-[8px] text-left transition-all"
                        style={{
                          background: checked
                            ? 'color-mix(in oklab, var(--ink) 4%, var(--card))'
                            : 'var(--card)',
                          border: checked
                            ? '2px solid var(--ink)'
                            : '1px solid var(--line)',
                        }}
                      >
                        <div
                          className="flex-shrink-0 w-7 h-7 rounded-full grid place-items-center"
                          style={{
                            background: checked
                              ? 'var(--ink)'
                              : 'var(--paper-2)',
                            color: checked
                              ? 'var(--paper)'
                              : 'var(--ink-2)',
                            fontSize: 14,
                            border: checked
                              ? 'none'
                              : '1px solid var(--line)',
                          }}
                        >
                          {checked ? '✓' : s.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--ink)',
                            }}
                          >
                            {s.label}
                          </div>
                          <div
                            className="truncate"
                            style={{
                              fontSize: 10,
                              color: 'var(--ink-3)',
                            }}
                          >
                            {s.url.replace(/^https?:\/\//, '')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {socialQrs.length > 0 && (
                  <div
                    className="mt-3 text-[11px] flex items-center justify-between"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <span>
                      <strong style={{ color: 'var(--ink)' }}>
                        {socialQrs.length}
                      </strong>{' '}
                      QR menüye eklendi
                    </span>
                    <button
                      onClick={() => setSocialEnabled({})}
                      className="text-[11px] underline"
                      style={{ color: 'var(--ink-2)' }}
                    >
                      Hepsini kaldır
                    </button>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* 9. Masa seçici */}
          <Section
            title="Masa"
            eyebrow="9"
            open={activeSection === 'qr'}
            onToggle={() =>
              setActiveSection(activeSection === 'qr' ? 'download' : 'qr')
            }
            summary={
              data.tables.length === 0
                ? 'Masa yok'
                : selectedTableId
                  ? data.tables.find((t) => t.id === selectedTableId)?.name ||
                    '-'
                  : 'Masa seçilmedi'
            }
          >
            <div
              className="rounded-[8px] p-3 mb-3 text-[11.5px]"
              style={{
                background:
                  'color-mix(in srgb, var(--accent) 6%, var(--card))',
                border:
                  '1px solid color-mix(in srgb, var(--accent) 22%, var(--line))',
                color: 'var(--ink-2)',
                lineHeight: 1.5,
              }}
            >
              📍 Her basılı menü, üzerine basıldığı masanın QR&apos;ını
              taşır. Müşteri taradığında otomatik o masaya atanır, sipariş
              karışmaz.
            </div>

            {data.tables.length === 0 ? (
              <div
                className="rounded-[8px] p-3 text-[12px]"
                style={{
                  background:
                    'color-mix(in srgb, var(--gold, #B8903E) 8%, var(--card))',
                  border:
                    '1px solid color-mix(in srgb, var(--gold, #B8903E) 26%, var(--line))',
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}
              >
                Henüz masa eklenmemiş. Önce masa ekle ve QR kodlarını
                oluştur.{' '}
                <a
                  href="/panel/masalar"
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                >
                  Masalar →
                </a>
              </div>
            ) : (
              <>
                <label
                  className="block text-[10px] uppercase font-bold mb-1.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.16em',
                    color: 'var(--ink-3)',
                  }}
                >
                  Önizleme için masa seç ({data.tables.length})
                </label>
                <select
                  value={selectedTableId || ''}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full rounded-[8px] px-3 h-10 text-[13px]"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                  }}
                >
                  {data.tables.map((tbl) => (
                    <option key={tbl.id} value={tbl.id}>
                      {tbl.name}
                      {tbl.zone_name ? ` · ${tbl.zone_name}` : ''}
                    </option>
                  ))}
                </select>
                <div
                  className="mt-3 p-3 rounded-[8px] text-[11px]"
                  style={{
                    background: 'var(--paper-2)',
                    color: 'var(--ink-3)',
                    border: '1px solid var(--line)',
                    lineHeight: 1.5,
                  }}
                >
                  💡 İndir bölümünde &quot;Tüm masalar için ZIP&quot;
                  seçeneğiyle her masa için ayrı PDF&apos;leri tek seferde
                  indirebilirsin.
                </div>
              </>
            )}
          </Section>

          {/* 10. İndir */}
          <Section
            title="İndir"
            eyebrow="10"
            open={activeSection === 'download'}
            onToggle={() =>
              setActiveSection(
                activeSection === 'download' ? 'template' : 'download'
              )
            }
            summary={pages.length > 1 ? `${pages.length} sayfa` : 'Hazır'}
          >
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
                {downloading === 'pdf'
                  ? 'Hazırlanıyor…'
                  : pages.length > 1
                    ? `PDF (${pages.length} sayfa) ↓`
                    : 'PDF olarak indir ↓'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!!downloading || productCount === 0}
                className="w-full h-11 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                {downloading === 'png' ? 'Hazırlanıyor…' : 'PNG indir ↓'}
              </button>
              <button
                type="button"
                onClick={handleBulkDownload}
                disabled={!!downloading || productCount === 0}
                className="w-full h-11 rounded-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:
                    'color-mix(in srgb, var(--accent) 14%, var(--card))',
                  color: 'var(--accent)',
                  border:
                    '1px solid color-mix(in srgb, var(--accent) 32%, var(--line))',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {downloading === 'bulk'
                  ? 'Toplu indiriliyor…'
                  : '⊟ A4 + A5 + Pláka birden'}
              </button>

              {/* Tüm masalar için ZIP */}
              {data.tables.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkTablesDownload}
                  disabled={!!downloading || productCount === 0}
                  className="w-full h-11 rounded-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      'color-mix(in srgb, var(--gold, #B8903E) 14%, var(--card))',
                    color: 'var(--gold, #B8903E)',
                    border:
                      '1px solid color-mix(in srgb, var(--gold, #B8903E) 32%, var(--line))',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                  title={`${data.tables.length} masa için ayrı PDF üretilip ZIP'lenecek`}
                >
                  {downloading === 'tables'
                    ? `Masalar üretiliyor… (${data.tables.length})`
                    : `▦ ${data.tables.length} masa için ZIP`}
                </button>
              )}
            </div>
            <div
              className="mt-3 text-[11px]"
              style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}
            >
              {pages.length > 1 && (
                <div className="mb-1">
                  📄 Bu boyutta menü{' '}
                  <strong style={{ color: 'var(--ink)' }}>
                    {pages.length} sayfa
                  </strong>{' '}
                  oldu. Hepsi tek PDF&apos;te.
                </div>
              )}
              PDF: yazıcıya gönder.
              <br />
              PNG: web/sosyal medya için.
              <br />
              Toplu: Tek tıkla en yaygın 3 boyut.
            </div>
          </Section>
        </div>

        {/* SAĞ PANEL - önizleme */}
        <div
          ref={previewWrapRef}
          className="rounded-[var(--r)] flex flex-col overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, var(--paper-2) 0%, var(--card-2) 100%)',
            border: '1px solid var(--line)',
            minHeight: 700,
          }}
        >
          {/* Sayfa navigasyonu */}
          {pages.length > 1 && productCount > 0 && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                background: 'var(--card)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div
                className="text-[11px] uppercase font-bold"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.16em',
                  color: 'var(--ink-3)',
                }}
              >
                Sayfa {currentPage} / {pages.length}
              </div>
              <div className="flex items-center gap-2">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className="grid place-items-center transition-all"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background:
                        currentPage === i + 1 ? 'var(--ink)' : 'transparent',
                      color:
                        currentPage === i + 1
                          ? 'var(--paper)'
                          : 'var(--ink)',
                      border:
                        currentPage === i + 1
                          ? 'none'
                          : '1px solid var(--line)',
                      fontFamily: 'var(--f-mono)',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="flex-1 flex items-start justify-center overflow-auto"
            style={{ padding: 32 }}
          >
            {productCount > 0 && (
              <div
                style={{
                  width: SIZES[size].width_mm * MM * previewScale,
                  height: SIZES[size].height_mm * MM * previewScale,
                }}
              >
                <PrintMenuDocument
                  ref={docRef}
                  data={data}
                  templateId={templateId}
                  size={size}
                  qrDataUrl={qrDataUrl}
                  qrUrlOverride={activeQrUrl}
                  tableLabel={
                    selectedTableId
                      ? data.tables.find((t) => t.id === selectedTableId)?.name
                      : undefined
                  }
                  logoDataUrl={logoDataUrl}
                  logoMode={logoMode}
                  headerVariant={headerVariant}
                  footerVariant={footerVariant}
                  showDietaryTags={showDietaryTags}
                  showSinceBadge={showSinceBadge}
                  customSignature={customSignature}
                  scale={previewScale}
                  pageCategories={pages[currentPage - 1] || data.categories}
                  pageNumber={currentPage}
                  totalPages={pages.length}
                  fontPreset={fontPreset}
                  socialQrs={socialQrs}
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
    </div>
  );
}

// ============================================================
// SAYFA BÖLME ALGORİTMASI
// Her boyut için sayfa başına yaklaşık ürün sayısı tahmini
// ============================================================
function splitIntoPages(
  categories: PrintableMenuCategory[],
  size: PaperSize
): PrintableMenuCategory[][] {
  // Boyut bazlı kapasiteler (yaklaşık, ürün ortalama 1 satır + tarif 1 satır)
  const PRODUCTS_PER_PAGE: Record<PaperSize, number> = {
    a4: 28,
    a4_landscape: 24, // 2 sütun, daha az dikey alan
    a5: 16,
    plate: 36,
  };
  const max = PRODUCTS_PER_PAGE[size];

  const pages: PrintableMenuCategory[][] = [];
  let currentPage: PrintableMenuCategory[] = [];
  let currentCount = 0;

  for (const cat of categories) {
    const catSize = cat.products.length + 1; // +1 kategori başlığı
    // Sayfa neredeyse doluysa veya kategori bu sayfaya sığmazsa
    if (currentCount + catSize > max && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentCount = 0;
    }
    // Tek kategori sayfayı aşıyorsa, bu kategoriyi parçala
    if (catSize > max) {
      // Kategoriyi ürün gruplarına böl
      const productsPerSubpage = max - 1; // başlık çıkar
      let remaining = [...cat.products];
      let isFirstChunk = true;
      while (remaining.length > 0) {
        const chunk = remaining.slice(0, productsPerSubpage);
        remaining = remaining.slice(productsPerSubpage);
        // Eğer mevcut sayfaya az şey varsa öncekine ekle, ama burada
        // basitleştirip her chunk'ı yeni sayfa yapalım
        if (isFirstChunk && currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          currentCount = 0;
        }
        currentPage.push({
          ...cat,
          name: isFirstChunk ? cat.name : `${cat.name} (devam)`,
          products: chunk,
        });
        currentCount += chunk.length + 1;
        isFirstChunk = false;
        if (remaining.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          currentCount = 0;
        }
      }
    } else {
      currentPage.push(cat);
      currentCount += catSize;
    }
  }

  if (currentPage.length > 0) pages.push(currentPage);

  // En az 1 sayfa garantisi
  if (pages.length === 0) pages.push([]);

  return pages;
}

// ============================================================
// SECTION (accordion)
// ============================================================
function Section({
  title,
  eyebrow,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  eyebrow: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--r)]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors"
      >
        <span
          className="grid place-items-center flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: open ? 'var(--ink)' : 'var(--paper-2)',
            color: open ? 'var(--paper)' : 'var(--ink-3)',
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {eyebrow}
        </span>
        <div className="flex-1 text-left">
          <div
            className="text-[14px] font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {title}
          </div>
          {summary && !open && (
            <div
              className="text-[11px] mt-0.5"
              style={{ color: 'var(--ink-3)' }}
            >
              {summary}
            </div>
          )}
        </div>
        <span
          className="text-[14px]"
          style={{
            color: 'var(--ink-3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div style={{ borderTop: '1px solid var(--line)', marginBottom: 12 }} />
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SELECT BUTTON (genel kullanım)
// ============================================================
function SelectButton({
  selected,
  onClick,
  preview,
  title,
  titleSuffix,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  preview?: React.ReactNode;
  title: string;
  titleSuffix?: React.ReactNode;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-[10px] p-3 transition-all flex items-center gap-3"
      style={{
        background: selected ? 'var(--paper-2)' : 'var(--card)',
        border: selected ? '2px solid var(--ink)' : '2px solid var(--line)',
      }}
    >
      {preview}
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-semibold mb-0.5 flex items-baseline gap-2"
          style={{ color: 'var(--ink)' }}
        >
          {title}
          {titleSuffix}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {description}
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
// TOGGLE ROW
// ============================================================
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 py-3 text-left"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-semibold mb-0.5"
          style={{ color: 'var(--ink)' }}
        >
          {label}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {description}
        </div>
      </div>
      <span
        className="flex-shrink-0 transition-all"
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: checked ? 'var(--ink)' : 'var(--line)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          className="block transition-all"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--paper)',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
  );
}
