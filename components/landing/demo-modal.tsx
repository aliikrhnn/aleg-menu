'use client';

import { useEffect } from 'react';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoModal({ open, onClose }: DemoModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Gerçek API entegrasyonu eklenecek (mail/telegram/db)
    alert('Teşekkürler! 24 saat içinde sana ulaşacağız.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] max-w-[560px] w-full p-9 max-h-[90vh] overflow-y-auto border border-line relative"
        style={{
          boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-[18px] right-[18px] w-[34px] h-[34px] rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
          aria-label="kapat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Eyebrow */}
        <span
          className="text-ink-3 uppercase block mb-5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            fontWeight: 500,
          }}
        >
          Demo Talebi · 24 Saat İçinde Dönüş
        </span>

        {/* Title */}
        <h3
          className="text-ink mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 36,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          İşletmen için 15 dakika ayır.
        </h3>

        <p className="text-ink-2 text-sm mb-6 leading-relaxed">
          Sana en uygun zamanda online demo gösterelim. Sorularını yanıtlayalım, gerekiyorsa
          işletmen için özel bir kurulum planı yapalım.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Ad Soyad" required>
            <input
              required
              placeholder="Mehmet Yılmaz"
              className="form-input"
              autoComplete="name"
            />
          </Field>
          <Field label="İşletme Adı" required>
            <input
              required
              placeholder="Ceylan Café"
              className="form-input"
              autoComplete="organization"
            />
          </Field>
          <Field label="Telefon" required>
            <input
              required
              placeholder="+90 5•• ••• •• ••"
              className="form-input"
              autoComplete="tel"
              type="tel"
            />
          </Field>
          <Field label="E-posta" required>
            <input
              required
              type="email"
              placeholder="sen@isletmen.com"
              className="form-input"
              autoComplete="email"
            />
          </Field>
          <Field label="Şehir">
            <select className="form-input">
              <option>İstanbul</option>
              <option>Ankara</option>
              <option>İzmir</option>
              <option>Isparta</option>
              <option>Antalya</option>
              <option>Bursa</option>
              <option>Eskişehir</option>
              <option>Diğer</option>
            </select>
          </Field>
          <Field label="İşletme Tipi">
            <select className="form-input">
              <option>Kafe</option>
              <option>Specialty Coffee</option>
              <option>Restoran</option>
              <option>Brunch & Kahvaltı</option>
              <option>Bar / Pub</option>
              <option>Pastane / Fırın</option>
              <option>Hızlı Tüketim</option>
              <option>Tatlıcı / Dondurmacı</option>
              <option>Catering / Event</option>
              <option>Otel Restoranı</option>
              <option>Diğer</option>
            </select>
          </Field>
          <Field label="Masa Sayısı" full>
            <select className="form-input">
              <option>1–5 masa</option>
              <option>6–15 masa</option>
              <option>16–30 masa</option>
              <option>30+ masa</option>
            </select>
          </Field>
          <Field label="Ek Mesaj (opsiyonel)" full>
            <textarea
              placeholder="Aleg'den ne bekliyorsun? Hangi sorunlarını çözmeli?"
              className="form-input min-h-[70px] resize-y"
              rows={3}
            />
          </Field>

          <button
            type="submit"
            className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-accent text-[#FDF8EC] font-medium hover:-translate-y-px transition-all"
            style={{
              fontSize: 16,
              boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
            }}
          >
            Demo Talep Et
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>

          <p
            className="sm:col-span-2 text-center text-ink-3 leading-relaxed mt-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9.5,
              letterSpacing: '0.08em',
            }}
          >
            24 saat içinde sana ulaşırız · KVKK kapsamında bilgilerin korunur
          </p>
        </form>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .form-input {
          width: 100%;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 11px 14px;
          font-family: var(--f-sans);
          font-size: 14px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: var(--accent);
        }
        .form-input::placeholder {
          color: var(--ink-3);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <label
        className="text-ink-3 uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
        }}
      >
        {label} {required && <span className="text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}
