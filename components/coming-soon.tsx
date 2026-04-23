'use client';

import { useState } from 'react';
import Link from 'next/link';

type ComingSoonProps = {
  eyebrow: string;
  title: string;
  titleItalic?: string;
  description: string;
  expectedDate?: string; // "Yaz 2026" gibi
  notifyLabel?: string; // "Hazır olunca haber ver"
  contactMail?: string; // varsa doğrudan mail
  contactLabel?: string; // "Bize yaz"
};

export function ComingSoon({
  eyebrow,
  title,
  titleItalic,
  description,
  expectedDate,
  notifyLabel = 'Hazır olunca haber ver',
  contactMail,
  contactLabel,
}: ComingSoonProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const mailto = `mailto:info@alegstudio.com?subject=${encodeURIComponent(
      `Bekleme listesi: ${eyebrow}`
    )}&body=${encodeURIComponent(
      `Merhaba, ${eyebrow} sayfası hazır olunca haber almak istiyorum.\n\nE-posta: ${email}`
    )}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <div
      data-theme="warm"
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--paper)' }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-20 px-6 md:px-10 py-4 flex items-center justify-between"
        style={{
          background: 'color-mix(in srgb, var(--paper) 85%, transparent)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Ana sayfaya dön"
        >
          <div
            className="w-8 h-8 rounded-[7px] flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.04em',
            }}
          >
            A
          </div>
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            aleg
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm flex items-center gap-1.5 transition-colors hover:text-accent"
          style={{ color: 'var(--ink-2)' }}
        >
          ← Ana sayfa
        </Link>
      </nav>

      {/* İçerik - ortalanmış */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 md:py-20">
        <div className="w-full max-w-[640px] text-center relative">
          {/* Sallanan arka desen */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none opacity-50"
            style={{
              background:
                'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-soft) 40%, transparent) 0%, transparent 60%)',
            }}
          />

          {/* Eyebrow */}
          <div
            className="uppercase mb-5 flex items-center justify-center gap-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            <span
              style={{
                width: 20,
                height: 1,
                background: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            {eyebrow}
            <span
              style={{
                width: 20,
                height: 1,
                background: 'var(--accent)',
                display: 'inline-block',
              }}
            />
          </div>

          {/* Başlık */}
          <h1
            className="mb-5"
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 'clamp(44px, 6vw, 72px)',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 0.95,
              color: 'var(--ink)',
            }}
          >
            {title}
            {titleItalic && (
              <>
                <br />
                <span
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: 'var(--accent)',
                  }}
                >
                  {titleItalic}
                </span>
              </>
            )}
          </h1>

          {/* Açıklama */}
          <p
            className="mb-8 max-w-[520px] mx-auto"
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: 'var(--ink-2)',
            }}
          >
            {description}
          </p>

          {/* Beklenen tarih rozeti */}
          {expectedDate && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: 'var(--gold)',
                  animation: 'aleg-pulse-dot 2s ease-in-out infinite',
                }}
              />
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--gold)',
                }}
              >
                Beklenen: {expectedDate}
              </span>
            </div>
          )}

          <style>{`
            @keyframes aleg-pulse-dot {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.5; }
            }
          `}</style>

          {/* Email yakala formu veya direkt mail */}
          {contactMail ? (
            <a
              href={`mailto:${contactMail}`}
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-[10px] font-semibold text-sm transition-all hover:opacity-95 active:scale-[0.99]"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                boxShadow:
                  '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
              }}
            >
              <span>{contactLabel || 'Bize yaz'}</span>
              <span
                className="transition-transform group-hover:translate-x-1"
                style={{ fontSize: 16 }}
              >
                →
              </span>
            </a>
          ) : submitted ? (
            <div
              className="max-w-md mx-auto rounded-[var(--r)] p-5"
              style={{
                background: 'color-mix(in srgb, var(--ok) 8%, var(--card))',
                border:
                  '1px solid color-mix(in srgb, var(--ok) 25%, var(--line))',
              }}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 18%, transparent)',
                  color: 'var(--ok)',
                  fontSize: 16,
                }}
              >
                ✓
              </div>
              <div
                className="mb-1"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 400,
                  color: 'var(--ink)',
                }}
              >
                Teşekkürler!
              </div>
              <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Mail istemcin açıldı. Hazır olunca ilk haber sana gelir.
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="max-w-md mx-auto flex items-center gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sen@example.com"
                required
                className="flex-1 h-12 px-4 rounded-[10px] transition-all focus:outline-none focus:border-accent"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-sans)',
                  fontSize: 14,
                  color: 'var(--ink)',
                  boxShadow: '0 1px 2px rgba(42,31,24,0.04)',
                }}
              />
              <button
                type="submit"
                className="group h-12 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] flex-shrink-0"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  boxShadow:
                    '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
                }}
              >
                <span className="hidden sm:inline">{notifyLabel}</span>
                <span className="sm:hidden">Haber ver</span>
                <span
                  className="transition-transform group-hover:translate-x-1"
                  style={{ fontSize: 16 }}
                >
                  →
                </span>
              </button>
            </form>
          )}

          {/* Alt link */}
          <div
            className="mt-10 text-xs"
            style={{ color: 'var(--ink-3)' }}
          >
            Bu arada{' '}
            <Link
              href="/"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              ana sayfaya
            </Link>
            {' '}dönüp Aleg&apos;i incelemeye devam edebilirsin.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 md:px-10 py-8 text-center"
        style={{
          background: 'var(--card-2)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div
          className="flex items-center justify-center gap-3 flex-wrap"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
          }}
        >
          <Link href="/gizlilik" className="hover:underline">
            Gizlilik
          </Link>
          <Link href="/sartlar" className="hover:underline">
            Şartlar
          </Link>
          <Link href="/kvkk" className="hover:underline">
            KVKK
          </Link>
          <Link href="/cerezler" className="hover:underline">
            Çerezler
          </Link>
          <Link href="/iletisim" className="hover:underline">
            İletişim
          </Link>
        </div>
        <div
          className="mt-3 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.12em',
            color: 'var(--ink-3)',
          }}
        >
          © 2026 Aleg Studio · Econexsus Ltd. Şti.
        </div>
      </footer>
    </div>
  );
}
