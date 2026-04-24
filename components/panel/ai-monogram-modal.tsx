'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/toast';

interface Props {
  businessName: string;
  onSelect: (svgString: string) => void;
  onClose: () => void;
}

const STYLES = [
  { id: 'classic', label: 'Klasik', hint: 'Editorial, zarif' },
  { id: 'modern', label: 'Modern', hint: 'Minimal, temiz' },
  { id: 'vintage', label: 'Vintage', hint: 'El yapımı his' },
  { id: 'warm', label: 'Warm', hint: 'Sıcak, kağıt' },
  { id: 'minimal', label: 'Sade', hint: 'Tek harf' },
  { id: 'bold', label: 'Bold', hint: 'Dikkat çekici' },
];

type Variant = {
  name: string;
  description: string;
  svg: string;
};

export function AiMonogramModal({ businessName, onSelect, onClose }: Props) {
  const [style, setStyle] = useState('classic');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    used: number;
    limit: number;
    resetsIn?: number;
  } | null>(null);

  // Modal açıldığında rate limit'i çek
  useEffect(() => {
    fetch('/api/ai/monogram')
      .then((r) => r.json())
      .then((data) => {
        if (data.rateLimit) setRateLimit(data.rateLimit);
      })
      .catch(() => {
        // sessizce geç
      });
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setVariants([]);

    try {
      const response = await fetch('/api/ai/monogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName || 'İşletmem',
          style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.rateLimit) {
          setRateLimit(data.rateLimit);
        }
        throw new Error(data.error || 'Monogram üretilemedi');
      }

      setVariants(data.variants || []);
      if (data.rateLimit) {
        setRateLimit(data.rateLimit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectVariant(variant: Variant) {
    // SVG'yi File'a çevir ve upload (logo olarak)
    onSelect(variant.svg);
    onClose();
  }

  // Varyantı bilgisayara PNG olarak indir (yüksek çözünürlük)
  async function handleDownloadVariant(variant: Variant, index: number) {
    try {
      // SVG'yi 800x800 PNG'ye çevir
      const svgBlob = new Blob([variant.svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 800;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          toast.error('İndirme hatası');
          return;
        }
        // Şeffaf arka plan
        ctx.clearRect(0, 0, size, size);
        // SVG'yi çiz
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);

        // PNG olarak indir
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('PNG dönüşümü başarısız');
            return;
          }
          const pngUrl = URL.createObjectURL(blob);
          const safeName = (businessName || 'logo')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${safeName}-monogram-${index + 1}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error('SVG yüklenemedi');
      };
      img.src = url;
    } catch (err) {
      toast.error('İndirme hatası: ' + (err instanceof Error ? err.message : 'bilinmeyen'));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        animation: 'aiFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] w-full max-w-[620px] max-h-[92vh] overflow-y-auto border border-line relative p-7"
        style={{
          boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'aiSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] w-[32px] h-[32px] rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xl">✨</span>
          <div
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            AI MONOGRAM LOGO
          </div>
        </div>
        <h2
          className="mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            lineHeight: 1,
          }}
        >
          Logo oluştur
        </h2>
        <p className="text-ink-2 text-sm mb-5">
          Aleg işletme adından 3 farklı özgün monogram üretir. Beğendiğini logo olarak kullan.
        </p>

        {/* Stil seçici */}
        <div className="mb-5">
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            TARZ
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className="text-left p-2.5 rounded-[10px] transition-all"
                style={{
                  background: style === s.id ? 'var(--card)' : 'var(--paper-2)',
                  border: style === s.id ? '2px solid var(--accent)' : '1px solid var(--line)',
                }}
              >
                <div className="text-[13px] font-semibold text-ink">{s.label}</div>
                <div className="text-[10px] text-ink-3">{s.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading || !businessName || (rateLimit !== null && rateLimit.used >= rateLimit.limit)}
          className="w-full h-11 rounded-[12px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: '#FAF5EA' }}
        >
          {loading ? (
            <>
              <Spinner />
              Aleg tasarlıyor... (10-15 saniye sürebilir)
            </>
          ) : variants.length > 0 ? (
            <>
              <span>🔄</span> Yeni Varyantlar Üret
            </>
          ) : (
            <>
              <span>✨</span> 3 Monogram Üret
            </>
          )}
        </button>

        {/* Rate limit rozet */}
        {rateLimit && (
          <div
            className="mt-2.5 flex items-center justify-center gap-2 text-[10px] uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
              fontWeight: 700,
              color: rateLimit.used >= rateLimit.limit ? 'var(--accent)' : 'var(--ink-3)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: rateLimit.used >= rateLimit.limit ? 'var(--accent)' : 'var(--ok)',
              }}
            />
            {rateLimit.used}/{rateLimit.limit} KULLANILDI
            {rateLimit.resetsIn && rateLimit.used >= rateLimit.limit && (
              <span className="ml-1">· {rateLimit.resetsIn} SAAT SONRA YENİLENİR</span>
            )}
          </div>
        )}

        {/* Hint */}
        {!variants.length && !loading && !rateLimit && (
          <div className="mt-3 text-[11px] text-ink-3 text-center" style={{ fontFamily: 'var(--f-mono)' }}>
            SVG formatında · düzenlenebilir · yüksek kalite
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-3 px-3 py-2 rounded-[10px] text-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {error}
          </div>
        )}

        {/* Variants */}
        {variants.length > 0 && (
          <div className="mt-6">
            <div
              className="uppercase mb-3 text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              VARYANTLAR — BEĞENDİĞİNİ KULLAN VEYA İNDİR
            </div>
            <div className="grid grid-cols-3 gap-3">
              {variants.map((v, i) => (
                <div
                  key={i}
                  className="rounded-[14px] overflow-hidden"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {/* SVG preview */}
                  <div
                    className="aspect-square flex items-center justify-center p-6"
                    style={{ background: 'var(--card)' }}
                    dangerouslySetInnerHTML={{ __html: v.svg }}
                  />
                  {/* Info */}
                  <div className="p-3 border-t border-line">
                    <div className="text-[12px] font-semibold text-ink truncate mb-0.5">
                      {v.name}
                    </div>
                    <div
                      className="text-[10px] text-ink-3 line-clamp-2 mb-2.5"
                      style={{ lineHeight: 1.3 }}
                    >
                      {v.description}
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSelectVariant(v)}
                        className="flex-1 h-8 rounded-[8px] text-[11px] font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#FAF5EA' }}
                        title="Bu logoyu kullan"
                      >
                        Seç
                      </button>
                      <button
                        onClick={() => handleDownloadVariant(v, i)}
                        className="w-8 h-8 rounded-[8px] grid place-items-center transition-colors hover:bg-paper-3"
                        style={{
                          background: 'var(--paper-2)',
                          border: '1px solid var(--line)',
                          color: 'var(--ink-2)',
                        }}
                        title="Bilgisayara indir (PNG)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-ink-3 text-center" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
              SEÇ: logo olarak kaydet · İNDİR: dosya olarak bilgisayara al
            </div>
          </div>
        )}

        <style jsx global>{`
          .monogram-preview svg {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
          }
        `}</style>
        <style jsx>{`
          @keyframes aiFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes aiSlideUp {
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
