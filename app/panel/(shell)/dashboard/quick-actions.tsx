'use client';

import Link from 'next/link';

export function QuickActionsCard({ slug }: { slug: string }) {
  const actions = [
    {
      href: '/panel/menu/urunler',
      icon: '+',
      title: 'Ürün ekle',
      desc: 'Menüne yeni ürün',
    },
    {
      href: '/panel/masalar',
      icon: '◉',
      title: 'QR kodları',
      desc: 'Masa QR tasarla',
    },
    {
      href: '/panel/raporlar',
      icon: '◌',
      title: 'Raporlar',
      desc: 'Satış analizi',
    },
    {
      href: `https://${slug}.alegstudio.com`,
      icon: '↗',
      title: 'Menüyü aç',
      desc: 'Müşteri gözünden',
      external: true,
    },
  ];

  return (
    <div
      className="rounded-[var(--r)] p-6"
      style={{
        background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
        border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
        minHeight: 180,
      }}
    >
      <div
        className="text-accent uppercase mb-4"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}
      >
        HIZLI AKSİYON
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) =>
          a.external ? (
            <a
              key={a.title}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: 'var(--card-2)',
                border: '1px solid var(--line)',
              }}
            >
              <ActionInner icon={a.icon} title={a.title} desc={a.desc} />
            </a>
          ) : (
            <Link
              key={a.title}
              href={a.href}
              className="p-3 rounded-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: 'var(--card-2)',
                border: '1px solid var(--line)',
              }}
            >
              <ActionInner icon={a.icon} title={a.title} desc={a.desc} />
            </Link>
          )
        )}
      </div>
    </div>
  );
}

function ActionInner({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          color: 'var(--accent)',
          fontFamily: 'var(--f-mono)',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink leading-tight">
          {title}
        </div>
        <div
          className="text-[11px] text-ink-3 mt-0.5 truncate"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}
