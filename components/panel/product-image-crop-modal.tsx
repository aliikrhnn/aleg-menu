'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Props {
  imageFile: File;
  onCropped: (dataUrl: string, mimeType: string) => void;
  onClose: () => void;
}

const ASPECT = 4 / 3; // 4:3 ratio
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 900;

export function ProductImageCropModal({ imageFile, onCropped, onClose }: Props) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // File → dataURL
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        ASPECT,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }

  async function handleCrop() {
    if (!completedCrop || !imgRef.current) {
      alert('Lütfen bir alan seç');
      return;
    }

    setLoading(true);
    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context alınamadı');

      // Beyaz arka plan
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      // Doğal ölçek (DOM boyutu ile natural boyut arasında)
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Pixel crop değerlerini doğal boyuta çevir
      const sourceX = completedCrop.x * scaleX;
      const sourceY = completedCrop.y * scaleY;
      const sourceWidth = completedCrop.width * scaleX;
      const sourceHeight = completedCrop.height * scaleY;

      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT
      );

      // JPEG olarak export
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCropped(dataUrl, 'image/jpeg');
    } catch (err) {
      alert('Kırpma hatası: ' + (err instanceof Error ? err.message : 'bilinmeyen'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 65%, transparent)',
        backdropFilter: 'blur(6px)',
        animation: 'cropFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] w-full max-w-[560px] max-h-[92vh] overflow-y-auto border border-line relative p-6"
        style={{
          boxShadow: '0 30px 60px -20px rgba(42,31,24,0.35)',
          animation: 'cropSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors z-10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

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
          RESIM KIRPMA · 4:3
        </div>
        <h2
          className="mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            lineHeight: 1,
          }}
        >
          Görseli kırp
        </h2>
        <p className="text-ink-2 text-[13px] mb-4">
          Köşelerden sürükleyerek alan boyutunu, ortadan tutarak pozisyonu ayarla.
        </p>

        {/* Crop area */}
        <div
          className="rounded-[12px] mb-4 overflow-hidden"
          style={{
            background: 'var(--paper-3)',
            border: '1px solid var(--line)',
            padding: 8,
          }}
        >
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={ASPECT}
              keepSelection
              minWidth={100}
              style={{ width: '100%' }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt=""
                onLoad={onImageLoad}
                style={{
                  maxWidth: '100%',
                  maxHeight: '50vh',
                  display: 'block',
                }}
              />
            </ReactCrop>
          )}
        </div>

        {/* Hint */}
        <div
          className="text-[11px] text-ink-3 mb-4 px-3 py-2 rounded-[8px]"
          style={{ background: 'var(--paper-2)' }}
        >
          💡 Ürün resmi 1200×900 boyutunda kaydedilir. Tüm menü kartlarında aynı oranda görünür.
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-[10px] text-[13px] font-medium transition-colors hover:bg-paper-3 disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            İptal
          </button>
          <button
            onClick={handleCrop}
            disabled={loading || !completedCrop}
            className="flex-1 h-11 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            {loading ? (
              <>
                <Spinner />
                Kaydediliyor...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Kırp ve Kaydet
              </>
            )}
          </button>
        </div>

        <style jsx global>{`
          @keyframes cropFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes cropSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .ReactCrop__crop-selection {
            border: 2px solid var(--accent) !important;
            box-shadow: 0 0 0 9999px rgba(42, 31, 24, 0.5) !important;
          }
          .ReactCrop__drag-handle::after {
            background-color: var(--accent) !important;
            border-color: #FAF5EA !important;
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
