'use client';

import Link from 'next/link';
import { useState } from 'react';

export function OnboardingCard({
  productCount,
  tableCount,
  slug,
}: {
  productCount: number;
  tableCount: number;
  slug: string;
}) {
  const [showQrPrompt, setShowQrPrompt] = useState(false);

  // Masa varsa subdomain'e git, yoksa modal aç
  const hasTable = tableCount > 0;

  // Tamamlanma kontrolü
  const steps = [
    {
      n: 1,
      title: 'Kategorilerini ekle',
      desc: 'Kahve, yiyecek, tatlı...',
      href: '/panel/menu',
      done: productCount > 0,
    },
    {
      n: 2,
      title: 'Masalarını hazırla',
      desc: 'Zone ve masa ekle',
      href: '/panel/masalar',
      done: hasTable,
    },
    {
      n: 3,
      title: 'QR ile test et',
      desc: hasTable ? 'Müşteri gözünden bak' : 'Önce bir masa ekle',
      href: hasTable ? `https://${slug}.alegstudio.com` : '#open-qr-prompt',
      external: hasTable,
      done: false,
      requiresTable: !hasTable,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;

  return (
    <>
      <div
        className="rounded-[var(--r)] p-6 mb-6"
        style={{
          background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
        }}
      >
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <div
              className="text-accent uppercase mb-1.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
              }}
            >
              BAŞLAMAK İÇİN · {completed}/{total}
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              İlk {total} adım
            </h2>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ width: 100, background: 'var(--paper-2)' }}
            >
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${(completed / total) * 100}%`,
                  background: 'var(--accent)',
                }}
              />
            </div>
            <span
              className="text-accent"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              %{Math.round((completed / total) * 100)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step) =>
            step.requiresTable ? (
              <button
                key={step.n}
                type="button"
                onClick={() => setShowQrPrompt(true)}
                className="flex items-center gap-3 p-3 rounded-[10px] transition-colors hover:bg-[var(--card-2)] w-full text-left"
              >
                <StepContent step={step} />
              </button>
            ) : step.external ? (
              <a
                key={step.n}
                href={step.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-[10px] transition-colors hover:bg-[var(--card-2)]"
              >
                <StepContent step={step} />
              </a>
            ) : (
              <Link
                key={step.n}
                href={step.href}
                className="flex items-center gap-3 p-3 rounded-[10px] transition-colors hover:bg-[var(--card-2)]"
              >
                <StepContent step={step} />
              </Link>
            )
          )}
        </div>
      </div>

      {showQrPrompt && (
        <QrPromptModal onClose={() => setShowQrPrompt(false)} />
      )}
    </>
  );
}

function StepContent({
  step,
}: {
  step: {
    n: number;
    title: string;
    desc: string;
    done: boolean;
    external?: boolean;
    requiresTable?: boolean;
  };
}) {
  return (
    <>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: step.done ? 'var(--ok)' : 'var(--accent)',
          color: 'white',
          fontFamily: 'var(--f-mono)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {step.done ? '✓' : step.n}
      </div>
      <div className="flex-1">
        <div
          className="text-[14px] font-medium text-ink flex items-center gap-1"
          style={{
            textDecoration: step.done ? 'line-through' : 'none',
            opacity: step.done ? 0.6 : 1,
          }}
        >
          {step.title}{' '}
          {step.external && <span className="text-xs">↗</span>}
        </div>
        <div className="text-[12px] text-ink-3 mt-0.5">{step.desc}</div>
      </div>
    </>
  );
}

// ============================================================
// QR PROMPT MODAL — masa yokken görünür
// ============================================================
function QrPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--r)] overflow-hidden"
        style={{ background: 'var(--card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* İllüstrasyon header */}
        <div
          className="px-6 pt-8 pb-6 flex flex-col items-center text-center"
          style={{
            background:
              'color-mix(in srgb, var(--accent) 8%, var(--card))',
            borderBottom:
              '1px solid color-mix(in srgb, var(--accent) 15%, var(--line))',
          }}
        >
          {/* QR + masa SVG illüstrasyon */}
          <div className="mb-5">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Masa zemini (oval gölge) */}
              <ellipse
                cx="60"
                cy="106"
                rx="32"
                ry="4"
                fill="var(--accent)"
                opacity="0.12"
              />
              {/* Masa */}
              <rect
                x="30"
                y="74"
                width="60"
                height="6"
                rx="2"
                fill="var(--accent)"
              />
              <rect
                x="36"
                y="80"
                width="3"
                height="22"
                fill="var(--accent)"
                opacity="0.6"
              />
              <rect
                x="81"
                y="80"
                width="3"
                height="22"
                fill="var(--accent)"
                opacity="0.6"
              />
              {/* QR kod (büyük, masada) */}
              <rect
                x="42"
                y="22"
                width="36"
                height="48"
                rx="4"
                fill="var(--card)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              {/* QR kare desenler */}
              <rect x="46" y="26" width="6" height="6" fill="var(--accent)" />
              <rect x="68" y="26" width="6" height="6" fill="var(--accent)" />
              <rect x="46" y="48" width="6" height="6" fill="var(--accent)" />
              <rect x="56" y="36" width="3" height="3" fill="var(--accent)" />
              <rect x="62" y="36" width="3" height="3" fill="var(--accent)" />
              <rect x="56" y="42" width="3" height="3" fill="var(--accent)" />
              <rect x="68" y="42" width="3" height="3" fill="var(--accent)" />
              <rect x="56" y="48" width="3" height="3" fill="var(--accent)" />
              <rect x="62" y="54" width="3" height="3" fill="var(--accent)" />
              <rect x="68" y="54" width="3" height="3" fill="var(--accent)" />
              <rect x="50" y="60" width="3" height="3" fill="var(--accent)" />
              <rect x="62" y="60" width="3" height="3" fill="var(--accent)" />
              <rect x="56" y="66" width="3" height="3" fill="var(--accent)" />
              <rect x="68" y="66" width="3" height="3" fill="var(--accent)" />
              {/* Telefon (aşağı sağda küçük) */}
              <rect
                x="86"
                y="48"
                width="20"
                height="32"
                rx="3"
                fill="var(--card)"
                stroke="var(--accent)"
                strokeWidth="1.5"
              />
              <rect
                x="89"
                y="52"
                width="14"
                height="20"
                rx="1"
                fill="var(--accent)"
                opacity="0.18"
              />
              <circle cx="96" cy="76" r="1.4" fill="var(--accent)" />
            </svg>
          </div>
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
            className="mb-2"
          >
            Önce bir masa ekle
          </h3>
          <p className="text-[14px] text-ink-2 leading-relaxed max-w-xs">
            Müşteri menüsünü test edebilmen için en az bir masa lazım. Her
            masa kendi QR kodunu otomatik üretir.
          </p>
        </div>

        {/* Aksiyon */}
        <div className="px-6 py-5 flex flex-col gap-2">
          <Link
            href="/panel/masalar"
            className="h-11 rounded-[var(--r-sm)] flex items-center justify-center font-semibold text-[14px] transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
            onClick={onClose}
          >
            Masa eklemeye git →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[var(--r-sm)] flex items-center justify-center font-medium text-[13px] text-ink-2 hover:bg-[var(--paper-2)]"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
