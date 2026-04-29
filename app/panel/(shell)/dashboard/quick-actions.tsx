'use client';

import Link from 'next/link';

type ActionItem = {
  href: string;
  icon: string;
  title: string;
  desc: string;
  external?: boolean;
  hint?: string;
};

export function QuickActionsCard({ slug }: { slug: string }) {
  const actions: ActionItem[] = [
    {
      href: '/panel/menu/urunler',
      icon: '+',
      title: 'Ürün ekle',
      desc: 'Menüne yeni',
      hint: 'plus',
    },
    {
      href: '/panel/masalar',
      icon: '◉',
      title: 'QR kodları',
      desc: 'Masa QR tasarla',
      hint: 'rotate',
    },
    {
      href: '/panel/raporlar',
      icon: '◌',
      title: 'Raporlar',
      desc: 'Satış analizi',
      hint: 'rotate',
    },
    {
      href: `https://${slug}.alegstudio.com`,
      icon: '↗',
      title: 'Menüyü aç',
      desc: 'Müşteri gözünden',
      external: true,
      hint: 'slide',
    },
  ];

  return (
    <div
      className="rounded-[var(--r)] p-6 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--accent) 5%, var(--card)) 0%, color-mix(in srgb, var(--gold, #B8903E) 4%, var(--card)) 100%)',
        border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
        minHeight: 180,
      }}
    >
      {/* Sparkle overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 70%)',
          animation: 'qaSparkle 4s ease-in-out infinite',
        }}
      />

      <div
        className="text-accent uppercase mb-4 flex items-center gap-1.5 relative z-10"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
        }}
      >
        <span
          className="inline-block"
          style={{
            animation: 'qaBolt 2.6s ease-in-out infinite',
          }}
        >
          ⚡
        </span>
        HIZLI AKSİYON
      </div>

      <div className="grid grid-cols-2 gap-2 relative z-10">
        {actions.map((a, idx) =>
          a.external ? (
            <a
              key={a.title}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="block"
              style={{
                animation: `qaCardIn 0.45s ease-out ${idx * 60}ms both`,
              }}
            >
              <ActionCard icon={a.icon} title={a.title} desc={a.desc} hint={a.hint} />
            </a>
          ) : (
            <Link
              key={a.title}
              href={a.href}
              className="block"
              style={{
                animation: `qaCardIn 0.45s ease-out ${idx * 60}ms both`,
              }}
            >
              <ActionCard icon={a.icon} title={a.title} desc={a.desc} hint={a.hint} />
            </Link>
          )
        )}
      </div>

      <style jsx>{`
        @keyframes qaSparkle {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes qaBolt {
          0%, 90%, 100% { transform: scale(1) rotate(0); }
          93% { transform: scale(1.2) rotate(-12deg); }
          96% { transform: scale(1.15) rotate(8deg); }
        }
        @keyframes qaCardIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// AKSİYON KARTI
// ============================================================
function ActionCard({
  icon,
  title,
  desc,
  hint,
}: {
  icon: string;
  title: string;
  desc: string;
  hint?: string;
}) {
  return (
    <div
      className="p-3 rounded-[10px] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97] group/action"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-9 h-9 rounded-[8px] grid place-items-center flex-shrink-0 transition-all"
          style={{
            background:
              'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
            fontFamily: 'var(--f-mono)',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          <span
            className={`qa-icon-${hint || 'plain'} inline-block`}
            style={{ display: 'inline-block' }}
          >
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-semibold leading-tight truncate"
            style={{ color: 'var(--ink)' }}
          >
            {title}
          </div>
          <div
            className="text-[11px] mt-0.5 truncate"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}
          >
            {desc}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Plus ikonu - hover'da büyüyor */
        .group\\/action:hover .qa-icon-plus {
          animation: qaPlusPulse 0.45s ease-out;
        }
        /* Rotate icon - hover'da dönüyor */
        .group\\/action:hover .qa-icon-rotate {
          animation: qaRotate 0.6s ease-out;
        }
        /* Slide icon - hover'da kayıyor */
        .group\\/action:hover .qa-icon-slide {
          animation: qaSlide 0.45s ease-out;
        }

        @keyframes qaPlusPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.4) rotate(90deg); }
          100% { transform: scale(1) rotate(90deg); }
        }
        @keyframes qaRotate {
          from { transform: rotate(0); }
          to { transform: rotate(180deg); }
        }
        @keyframes qaSlide {
          0% { transform: translate(0, 0); }
          50% { transform: translate(4px, -4px) scale(1.1); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
