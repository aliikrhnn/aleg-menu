'use client';

import Link from 'next/link';

export function OnboardingCard({
  productCount,
  tableCount,
  slug,
}: {
  productCount: number;
  tableCount: number;
  slug: string;
}) {
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
      done: tableCount > 0,
    },
    {
      n: 3,
      title: 'QR ile test et',
      desc: 'Müşteri gözünden bak',
      href: `https://${slug}.alegstudio.com`,
      external: true,
      done: false,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;

  return (
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
          step.external ? (
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
  );
}

function StepContent({
  step,
}: {
  step: { n: number; title: string; desc: string; done: boolean; external?: boolean };
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
          {step.title} {step.external && <span className="text-xs">↗</span>}
        </div>
        <div className="text-[12px] text-ink-3 mt-0.5">{step.desc}</div>
      </div>
    </>
  );
}
