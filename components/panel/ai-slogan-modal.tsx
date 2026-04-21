'use client';

import { useState, useEffect } from 'react';

interface Props {
  businessName: string;
  city: string | null;
  initialLang: 'tr' | 'en';
  onSelect: (slogan: string, lang: 'tr' | 'en') => void;
  onClose: () => void;
}

const STYLES = [
  { id: 'minimal', label: 'Minimal', hint: 'Kısa, çarpıcı' },
  { id: 'poetic', label: 'Şiirsel', hint: 'Hissi, akıcı' },
  { id: 'playful', label: 'Eğlenceli', hint: 'Sıcak, samimi' },
  { id: 'modern', label: 'Modern', hint: 'Profesyonel' },
];

export function AiSloganModal({
  businessName,
  city,
  initialLang,
  onSelect,
  onClose,
}: Props) {
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('minimal');
  const [lang, setLang] = useState<'tr' | 'en'>(initialLang);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    used: number;
    limit: number;
    resetsIn?: number;
  } | null>(null);

  // Modal açıldığında rate limit'i çek
  useEffect(() => {
    fetch('/api/ai/slogan')
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
    setSuggestions([]);

    try {
      const response = await fetch('/api/ai/slogan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName || 'İşletmem',
          description,
          style,
          lang,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 429 rate limit
        if (response.status === 429 && data.rateLimit) {
          setRateLimit(data.rateLimit);
        }
        throw new Error(data.error || 'Öneri alınamadı');
      }

      setSuggestions(data.slogans || []);
      if (data.rateLimit) {
        setRateLimit(data.rateLimit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata oluştu');
    } finally {
      setLoading(false);
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
        className="bg-card rounded-[22px] w-full max-w-[560px] max-h-[92vh] overflow-y-auto border border-line relative p-7"
        style={{
          boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'aiSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] w-[32px] h-[32px] rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
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
            AI SLOGAN ÖNERİCİ
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
          Slogan önerileri al
        </h2>
        <p className="text-ink-2 text-sm mb-5">
          Aleg işletmeni analiz edip 4 özgün slogan önerir. Beğendiğini seç.
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
            <LangButton active={lang === 'tr'} onClick={() => setLang('tr')} label="Türkçe" />
            <LangButton active={lang === 'en'} onClick={() => setLang('en')} label="English" />
          </div>
        </div>

        {/* Açıklama */}
        <div className="mb-4">
          <label className="block mb-1.5">
            <span
              className="block uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              NE YAPIYORSUN?
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              city
                ? `${city}'da third-wave filtre kahve ve özel Türk kahvesi...`
                : 'Üçüncü nesil filtre kahve ve özel ev tatlıları...'
            }
            rows={2}
            maxLength={200}
            className="w-full px-3.5 py-2.5 rounded-[10px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors resize-none text-sm"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          />
          <div className="text-[10px] text-ink-3 mt-1" style={{ fontFamily: 'var(--f-mono)' }}>
            {description.length}/200 — daha iyi öneriler için kısa tut
          </div>
        </div>

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
          <div className="grid grid-cols-2 gap-1.5">
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
              Aleg düşünüyor...
            </>
          ) : suggestions.length > 0 ? (
            <>
              <span>🔄</span> Yeniden Öner
            </>
          ) : (
            <>
              <span>✨</span> 4 Slogan Öner
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

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            <div
              className="uppercase text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              ÖNERİLER — BİRİNİ SEÇ
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelect(s, lang);
                  onClose();
                }}
                className="text-left p-3.5 rounded-[12px] transition-all group"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  className="flex items-start justify-between gap-3"
                >
                  <span
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 18,
                      fontWeight: 400,
                      color: 'var(--ink)',
                      lineHeight: 1.3,
                    }}
                  >
                    {s}
                  </span>
                  <span
                    className="flex-shrink-0 text-accent text-xs font-semibold group-hover:translate-x-0.5 transition-transform"
                    style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}
                  >
                    SEÇ →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

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

function LangButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 rounded-full text-[11px] font-semibold transition-colors"
      style={{
        background: active ? 'var(--ink)' : 'var(--paper-2)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
      }}
    >
      {label}
    </button>
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
