'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import {
  uploadCustomMenu,
  deleteCustomMenu,
  type CustomMenuFile,
} from '@/lib/actions/custom-menu';
import { toast } from '@/components/ui/toast';

type Props = {
  initial: {
    qr_url: string;
    business_name: string;
    custom_menu: CustomMenuFile | null;
  };
};

type QrPosition = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right';
type QrSize = 'small' | 'medium' | 'large';

const QR_SIZE_MAP: Record<QrSize, { px: number; label: string }> = {
  small: { px: 90, label: 'Küçük' },
  medium: { px: 130, label: 'Orta' },
  large: { px: 180, label: 'Büyük' },
};

const QR_POSITIONS: Array<{ id: QrPosition; label: string; icon: string }> = [
  { id: 'bottom-center', label: 'Alt orta', icon: '◯' },
  { id: 'bottom-right', label: 'Alt sağ', icon: '◜' },
  { id: 'bottom-left', label: 'Alt sol', icon: '◝' },
  { id: 'top-right', label: 'Üst sağ', icon: '◞' },
];

export function CustomMenuClient({ initial }: Props) {
  const [customMenu, setCustomMenu] = useState<CustomMenuFile | null>(
    initial.custom_menu
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // QR ayarları
  const [qrPosition, setQrPosition] = useState<QrPosition>('bottom-center');
  const [qrSize, setQrSize] = useState<QrSize>('medium');
  const [qrShowLabel, setQrShowLabel] = useState(true);
  const [qrFrameColor, setQrFrameColor] = useState<'white' | 'dark'>('white');

  // Görsel doğal boyutu
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  // QR oluştur
  useEffect(() => {
    QRCode.toDataURL(initial.qr_url, {
      width: 600,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [initial.qr_url]);

  // Görsel boyutunu öğren
  useEffect(() => {
    if (!customMenu || !customMenu.mime.startsWith('image/')) {
      setNaturalSize(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setNaturalSize(null);
    img.src = customMenu.url;
  }, [customMenu]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Dosya 8MB\'dan büyük olamaz');
      return;
    }

    const allowedMimes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
    ];
    if (!allowedMimes.includes(file.type)) {
      toast.error('Sadece PNG, JPG veya PDF kabul edilir');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadCustomMenu(formData);
      if (res.success && res.data) {
        setCustomMenu(res.data);
        toast.success('Menü yüklendi');
      } else {
        toast.error(res.error || 'Yükleme başarısız');
      }
    } catch {
      toast.error('Yükleme sırasında hata');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Yüklü menü silinecek. Emin misin?')) return;
    const res = await deleteCustomMenu();
    if (res.success) {
      setCustomMenu(null);
      toast.success('Menü silindi');
    } else {
      toast.error(res.error || 'Silme başarısız');
    }
  }

  async function handleDownloadPdf() {
    if (!docRef.current || !customMenu) return;
    setDownloading(true);
    try {
      // PDF için boyutu hesapla
      // Görsel ise: doğal oranı koru, A4'e sığdır
      // PDF ise: dosyayı yeniden işleyemediğimiz için PNG olarak çekip basacağız
      const dataUrl = await htmlToImage.toPng(docRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });

      // Aspect ratio'a göre PDF boyutu
      let pdfW = 210;
      let pdfH = 297;
      if (naturalSize) {
        const ratio = naturalSize.w / naturalSize.h;
        if (ratio > 1) {
          // yatay
          pdfW = 297;
          pdfH = 210;
        }
      }

      const pdf = new jsPDF({
        orientation: pdfW > pdfH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pdfW > pdfH ? [pdfH, pdfW] : [pdfW, pdfH],
        compress: true,
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');

      pdf.save(`ozel-menu-qr-${Date.now()}.pdf`);
      toast.success('PDF indirildi');
    } catch (err) {
      console.error(err);
      toast.error('PDF oluşturulamadı');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPng() {
    if (!docRef.current || !customMenu) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(docRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `ozel-menu-qr-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG indirildi');
    } catch (err) {
      console.error(err);
      toast.error('PNG oluşturulamadı');
    } finally {
      setDownloading(false);
    }
  }

  // QR konumu için CSS pozisyon
  const qrPositionStyle: React.CSSProperties = (() => {
    const margin = 20;
    switch (qrPosition) {
      case 'bottom-center':
        return {
          bottom: margin,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom-right':
        return { bottom: margin, right: margin };
      case 'bottom-left':
        return { bottom: margin, left: margin };
      case 'top-right':
        return { top: margin, right: margin };
    }
  })();

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1700px] mx-auto pb-28">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <a
          href="/panel/menu-tasarim"
          style={{ color: 'var(--ink-3)' }}
          className="hover:opacity-70 transition-opacity"
        >
          Menü Tasarımı
        </a>
        <span style={{ color: 'var(--ink-3)' }}>/</span>
        <span style={{ color: 'var(--ink-2)' }}>Özel Tasarım</span>
      </div>

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
          MENÜ TASARIM · ÖZEL YÜKLEME
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
          Kendi tasarımına QR ekle
        </h1>
        <p
          className="text-base mt-2"
          style={{ color: 'var(--ink-2)', maxWidth: 760 }}
        >
          Tasarladığın menüyü (PNG, JPG veya PDF) yükle. Sistem altına
          dijital menü QR kodunu ekleyip baskıya hazır PDF&apos;ini
          oluşturur.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* SOL — yükleme + ayarlar */}
        <div className="space-y-6">
          {/* Upload alanı */}
          {!customMenu && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-[var(--r)] p-8 text-center cursor-pointer transition-all"
              style={{
                background: dragOver ? 'var(--paper-2)' : 'var(--card)',
                border: dragOver
                  ? '2px dashed var(--accent)'
                  : '2px dashed var(--line)',
              }}
            >
              <div className="text-5xl mb-3 opacity-40">⤴</div>
              <h3
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  color: 'var(--ink)',
                  marginBottom: 6,
                }}
              >
                Tasarımını sürükle bırak
              </h3>
              <p
                className="text-[12.5px] mb-4"
                style={{ color: 'var(--ink-3)' }}
              >
                veya tıklayıp seç
              </p>
              <div
                className="text-[10px] uppercase font-bold"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.16em',
                  color: 'var(--ink-3)',
                }}
              >
                PNG · JPG · PDF · max 8MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {uploading && (
                <div
                  className="mt-4 text-[12px]"
                  style={{ color: 'var(--accent)' }}
                >
                  Yükleniyor...
                </div>
              )}
            </div>
          )}

          {/* Yüklü dosya bilgisi */}
          {customMenu && (
            <div
              className="rounded-[var(--r)] p-5"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--accent)',
                }}
              >
                YÜKLÜ TASARIM
              </div>
              <div
                className="text-[13px] font-semibold mb-1 truncate"
                style={{ color: 'var(--ink)' }}
              >
                {customMenu.filename}
              </div>
              <div
                className="text-[11px] mb-3"
                style={{ color: 'var(--ink-3)' }}
              >
                {customMenu.mime.toUpperCase().replace('IMAGE/', '')}
                {naturalSize && (
                  <>
                    {' · '}
                    {naturalSize.w}×{naturalSize.h}px
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-10 rounded-[8px] text-[11px] font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--paper-2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Değiştir
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-10 px-4 rounded-[8px] text-[11px] font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background:
                      'color-mix(in srgb, #DC2626 8%, var(--card))',
                    color: '#DC2626',
                    border: '1px solid color-mix(in srgb, #DC2626 24%, var(--line))',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Sil
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          )}

          {/* QR Konum */}
          {customMenu && customMenu.mime.startsWith('image/') && (
            <>
              <div
                className="rounded-[var(--r)] p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--accent)',
                  }}
                >
                  QR KONUMU
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QR_POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setQrPosition(p.id)}
                      className="flex items-center gap-2 px-3 h-10 rounded-[8px] text-[12px] font-semibold transition-all"
                      style={{
                        background:
                          qrPosition === p.id
                            ? 'var(--ink)'
                            : 'var(--card)',
                        color:
                          qrPosition === p.id
                            ? 'var(--paper)'
                            : 'var(--ink)',
                        border:
                          qrPosition === p.id
                            ? '1px solid var(--ink)'
                            : '1px solid var(--line)',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Boyut */}
              <div
                className="rounded-[var(--r)] p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--accent)',
                  }}
                >
                  QR BOYUTU
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(QR_SIZE_MAP) as QrSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQrSize(s)}
                      className="px-3 h-10 rounded-[8px] text-[12px] font-semibold transition-all"
                      style={{
                        background:
                          qrSize === s ? 'var(--ink)' : 'var(--card)',
                        color: qrSize === s ? 'var(--paper)' : 'var(--ink)',
                        border:
                          qrSize === s
                            ? '1px solid var(--ink)'
                            : '1px solid var(--line)',
                      }}
                    >
                      {QR_SIZE_MAP[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR çerçeve rengi + label */}
              <div
                className="rounded-[var(--r)] p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--accent)',
                  }}
                >
                  QR ÇERÇEVE
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setQrFrameColor('white')}
                    className="px-3 h-10 rounded-[8px] text-[12px] font-semibold transition-all"
                    style={{
                      background:
                        qrFrameColor === 'white'
                          ? 'var(--ink)'
                          : 'var(--card)',
                      color:
                        qrFrameColor === 'white'
                          ? 'var(--paper)'
                          : 'var(--ink)',
                      border:
                        qrFrameColor === 'white'
                          ? '1px solid var(--ink)'
                          : '1px solid var(--line)',
                    }}
                  >
                    Beyaz
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrFrameColor('dark')}
                    className="px-3 h-10 rounded-[8px] text-[12px] font-semibold transition-all"
                    style={{
                      background:
                        qrFrameColor === 'dark' ? 'var(--ink)' : 'var(--card)',
                      color:
                        qrFrameColor === 'dark'
                          ? 'var(--paper)'
                          : 'var(--ink)',
                      border:
                        qrFrameColor === 'dark'
                          ? '1px solid var(--ink)'
                          : '1px solid var(--line)',
                    }}
                  >
                    Koyu
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setQrShowLabel(!qrShowLabel)}
                  className="w-full flex items-center justify-between py-2 text-[13px]"
                  style={{ color: 'var(--ink)' }}
                >
                  <span>&quot;Dijital menü&quot; etiketi</span>
                  <span
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 999,
                      background: qrShowLabel
                        ? 'var(--ink)'
                        : 'var(--line)',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'var(--paper)',
                        transform: qrShowLabel
                          ? 'translateX(16px)'
                          : 'translateX(0)',
                        transition: 'transform 200ms',
                      }}
                    />
                  </span>
                </button>
              </div>

              {/* İndir */}
              <div
                className="rounded-[var(--r)] p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--accent)',
                  }}
                >
                  İNDİR
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="w-full h-12 rounded-[10px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
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
                    {downloading ? 'Hazırlanıyor…' : 'PDF olarak indir ↓'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    disabled={downloading}
                    className="w-full h-11 rounded-[10px] transition-colors disabled:opacity-50"
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
                    {downloading ? 'Hazırlanıyor…' : 'PNG indir ↓'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* PDF için bilgi */}
          {customMenu && customMenu.mime === 'application/pdf' && (
            <div
              className="rounded-[var(--r)] p-5"
              style={{
                background:
                  'color-mix(in srgb, var(--gold, #B8903E) 8%, var(--card))',
                border:
                  '1px solid color-mix(in srgb, var(--gold, #B8903E) 26%, var(--line))',
              }}
            >
              <h3
                className="text-[14px] font-semibold mb-1"
                style={{ color: 'var(--ink)' }}
              >
                PDF dosyası yüklendi
              </h3>
              <p
                className="text-[12px]"
                style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}
              >
                PDF&apos;ler için QR konumu otomatik ayarlanır. Yüklediğin
                PDF&apos;in son sayfasının altına QR şeridi eklenir.
                Önizleme şu an PDF için görüntülenmiyor; indir butonuna
                bastığında QR&apos;lı versiyon iniyor.
              </p>
              <button
                type="button"
                onClick={() => window.open(customMenu.url, '_blank')}
                className="mt-3 px-3 h-9 rounded-[8px] text-[11px] font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                PDF&apos;i aç ↗
              </button>
            </div>
          )}
        </div>

        {/* SAĞ — önizleme */}
        <div
          className="rounded-[var(--r)] flex items-center justify-center overflow-auto"
          style={{
            background:
              'linear-gradient(135deg, var(--paper-2) 0%, var(--card-2) 100%)',
            border: '1px solid var(--line)',
            minHeight: 700,
            padding: 32,
          }}
        >
          {!customMenu && (
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
                Önizleme için tasarımını yükle
              </p>
            </div>
          )}

          {customMenu && customMenu.mime.startsWith('image/') && (
            <div
              ref={docRef}
              data-print-doc
              style={{
                position: 'relative',
                background: '#fff',
                maxWidth: '100%',
                boxShadow:
                  '0 30px 60px -20px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={customMenu.url}
                alt={customMenu.filename}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />

              {/* QR overlay */}
              {qrDataUrl && (
                <div
                  style={{
                    position: 'absolute',
                    ...qrPositionStyle,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      background:
                        qrFrameColor === 'white'
                          ? '#fff'
                          : 'rgba(20, 20, 20, 0.95)',
                      padding: 12,
                      borderRadius: 8,
                      boxShadow:
                        '0 8px 24px -4px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {qrShowLabel && (
                      <div
                        style={{
                          fontFamily:
                            '"JetBrains Mono", ui-monospace, monospace',
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: '0.18em',
                          color:
                            qrFrameColor === 'white' ? '#1A1A1A' : '#FAFAFA',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          marginTop: 2,
                        }}
                      >
                        DİJİTAL MENÜ
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      style={{
                        width: QR_SIZE_MAP[qrSize].px,
                        height: QR_SIZE_MAP[qrSize].px,
                        display: 'block',
                        background: '#fff',
                      }}
                    />
                    {qrShowLabel && (
                      <div
                        style={{
                          fontFamily:
                            '"JetBrains Mono", ui-monospace, monospace',
                          fontSize: 7,
                          letterSpacing: '0.06em',
                          color:
                            qrFrameColor === 'white' ? '#5C5C5C' : '#B8B8BC',
                          textAlign: 'center',
                          maxWidth: QR_SIZE_MAP[qrSize].px,
                          wordBreak: 'break-all',
                          marginBottom: 2,
                        }}
                      >
                        {initial.qr_url.replace(/^https?:\/\//, '')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {customMenu && customMenu.mime === 'application/pdf' && (
            <div
              className="text-center py-20"
              style={{ color: 'var(--ink-3)' }}
            >
              <div className="text-5xl mb-4 opacity-40">📑</div>
              <p
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'var(--ink-2)',
                }}
              >
                PDF önizlemesi şu an mevcut değil
              </p>
              <p
                className="text-[12px] mt-2"
                style={{ color: 'var(--ink-3)', maxWidth: 360 }}
              >
                Sol panelden &quot;PDF&apos;i aç&quot; ile orijinali görebilirsin.
                <br />İlerleyen sürümde PDF&apos;in son sayfasına QR
                otomatik basılacak.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
