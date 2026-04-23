import Link from 'next/link';
import type { ReactNode } from 'react';
import { CookieBanner } from './cookie-banner';

export type ContentPageProps = {
  eyebrow: string; // Örn: "YASAL · GİZLİLİK"
  title: string; // Ana başlık (düz)
  titleItalic?: string; // İkinci satır italik turuncu
  intro?: string; // Alt açıklama
  lastUpdated?: string; // Son güncelleme tarihi
  children: ReactNode;
  showTOC?: boolean; // İçindekiler göster
};

export function ContentPage({
  eyebrow,
  title,
  titleItalic,
  intro,
  lastUpdated,
  children,
}: ContentPageProps) {
  return (
    <div
      data-theme="warm"
      className="min-h-screen"
      style={{ background: 'var(--paper)' }}
    >
      {/* Üst nav - basit */}
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
          <span>← Ana sayfa</span>
        </Link>
      </nav>

      {/* İçerik */}
      <article className="max-w-[760px] mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Eyebrow */}
        <div
          className="uppercase mb-4 flex items-center gap-3"
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
              width: 24,
              height: 1,
              background: 'var(--accent)',
              display: 'inline-block',
            }}
          />
          {eyebrow}
        </div>

        {/* Başlık */}
        <h1
          className="mb-4"
          style={{
            fontFamily: 'var(--f-serif)',
            fontSize: 'clamp(40px, 5vw, 60px)',
            fontWeight: 700,
            letterSpacing: '-0.035em',
            lineHeight: 0.98,
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

        {/* Intro */}
        {intro && (
          <p
            className="mb-6"
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: 'var(--ink-2)',
            }}
          >
            {intro}
          </p>
        )}

        {/* Son güncelleme */}
        {lastUpdated && (
          <div
            className="mb-10 pb-6 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--ink-3)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            Son güncelleme: {lastUpdated}
          </div>
        )}

        {/* Prose içerik */}
        <div className="aleg-prose">{children}</div>
      </article>

      {/* Footer - basit */}
      <footer
        className="mt-20 px-6 md:px-10 py-10 text-center"
        style={{
          background: 'var(--card-2)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div className="max-w-[760px] mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div
              className="w-7 h-7 rounded-[6px] flex items-center justify-center"
              style={{
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 14,
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
                fontSize: 16,
                fontWeight: 400,
                color: 'var(--ink)',
              }}
            >
              aleg
            </span>
          </Link>
          <div
            className="mt-4 flex items-center justify-center gap-3 flex-wrap"
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
        </div>
      </footer>

      {/* Prose stilleri */}
      <style>{`
        .aleg-prose {
          font-family: var(--f-sans);
          font-size: 16px;
          line-height: 1.7;
          color: var(--ink);
        }
        .aleg-prose h2 {
          font-family: var(--f-serif);
          font-style: italic;
          font-size: 28px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin-top: 48px;
          margin-bottom: 16px;
          color: var(--ink);
        }
        .aleg-prose h2:first-child {
          margin-top: 0;
        }
        .aleg-prose h3 {
          font-size: 17px;
          font-weight: 600;
          margin-top: 32px;
          margin-bottom: 10px;
          color: var(--ink);
        }
        .aleg-prose p {
          margin-bottom: 16px;
          color: var(--ink-2);
        }
        .aleg-prose ul,
        .aleg-prose ol {
          margin-bottom: 16px;
          padding-left: 24px;
          color: var(--ink-2);
        }
        .aleg-prose li {
          margin-bottom: 6px;
        }
        .aleg-prose strong {
          color: var(--ink);
          font-weight: 600;
        }
        .aleg-prose a {
          color: var(--accent);
          text-decoration: underline;
          text-decoration-color: color-mix(in srgb, var(--accent) 40%, transparent);
          text-underline-offset: 3px;
        }
        .aleg-prose a:hover {
          text-decoration-color: var(--accent);
        }
        .aleg-prose hr {
          border: 0;
          border-top: 1px solid var(--line);
          margin: 40px 0;
        }
        .aleg-prose code {
          font-family: var(--f-mono);
          font-size: 13px;
          padding: 2px 6px;
          background: var(--paper-2);
          border-radius: 4px;
          color: var(--ink);
        }
        .aleg-prose blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 20px;
          margin: 24px 0;
          font-style: italic;
          color: var(--ink-2);
        }
      `}</style>

      <CookieBanner />
    </div>
  );
}
