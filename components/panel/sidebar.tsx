'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { PANEL_NAV } from './nav-config';
import { cn } from '@/lib/utils';

type SidebarStation = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
};

interface PanelSidebarProps {
  businessName: string;
  logoUrl?: string | null;
  businessId: string;
  initialStations: SidebarStation[];
}

export function PanelSidebar({
  businessName,
  logoUrl,
  businessId,
  initialStations,
}: PanelSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [stations, setStations] = useState<SidebarStation[]>(initialStations);

  const currentPath = pathname.startsWith('/panel') ? pathname.replace('/panel', '') || '/' : pathname;

  // Stations için Supabase Realtime
  useEffect(() => {
    if (!businessId) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function refreshStations() {
      const { data } = await supabase
        .from('stations')
        .select('id, name, slug, icon, color, sort_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (data) {
        setStations(
          data.map((s) => ({
            id: s.id as string,
            name: s.name as string,
            slug: (s.slug as string) || (s.id as string).slice(0, 8),
            icon: (s.icon as string) || '●',
            color: (s.color as string) || '#C4553A',
          }))
        );
      }
    }

    const channel = supabase
      .channel('sidebar-stations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stations',
          filter: `business_id=eq.${businessId}`,
        },
        refreshStations
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  return (
    <aside
      className={cn(
        'flex-shrink-0 bg-paper-2 border-r border-line',
        'grid grid-rows-[auto_1fr_auto] overflow-hidden',
        'transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className={cn('border-b border-line', collapsed ? 'px-3.5 py-4' : 'px-[18px] py-5')}>
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <div
              className="w-9 h-9 rounded-[var(--r-sm)] flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                padding: 3,
              }}
            >
              <img
                src={logoUrl}
                alt={businessName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-[var(--r-sm)] bg-accent flex items-center justify-center flex-shrink-0"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                fontWeight: 500,
                color: '#FAF5EA',
                letterSpacing: '-0.04em',
              }}
            >
              {businessName?.[0]?.toLowerCase() || 'a'}
            </div>
          )}
          {!collapsed && (
            <div className="grid gap-0 min-w-0">
              <strong
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 16,
                  letterSpacing: '-0.02em',
                }}
                className="text-ink truncate"
              >
                {businessName}
              </strong>
              <span
                className="text-accent uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                }}
              >
                İŞLETME PANELİ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 py-2.5 overflow-y-auto grid content-start gap-0.5">
        {(() => {
          // Dinamik MUTFAK EKRANLARI grubu oluştur
          // KDS'ler yeni sekmede açılır (openInNewTab) — kullanıcı geri tuşuyla
          // panele dönebilsin, mutfak ekranı kapansa bile panel açık kalır.
          // openInNewTab: target=_blank ama URL transform yapmaz (KDS aynı subdomain'de).
          const kitchenGroup = {
            group: 'MUTFAK EKRANLARI',
            items: [
              {
                id: 'kds-all',
                label: 'Tümü',
                href: '/kds',
                icon: '◈',
                openInNewTab: true,
              },
              ...stations.map((s) => ({
                id: `kds-${s.slug}`,
                label: s.name,
                href: `/kds/${s.slug}`,
                icon: s.icon,
                color: s.color,
                openInNewTab: true,
              })),
            ],
          };

          // GÜNLÜK'ten sonra MUTFAK EKRANLARI ekle
          const allGroups: typeof PANEL_NAV = [];
          for (const group of PANEL_NAV) {
            allGroups.push(group);
            if (group.group === 'GÜNLÜK') {
              allGroups.push(kitchenGroup);
            }
          }
          return allGroups;
        })().map((group) => (
          <div key={group.group} className="grid gap-px mt-1.5">
            {!collapsed && (
              <div
                className="text-ink-3 uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  padding: '10px 10px 6px',
                }}
              >
                {group.group}
              </div>
            )}
            {collapsed && <div className="h-px bg-line mx-2 my-2" />}
            {group.items.map((item) => {
              const isActive =
                currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href) && item.href !== '/kds');
              // /kds için sadece exact match
              const kdsActive = item.href === '/kds' && currentPath === '/kds';
              const finalActive = isActive || kdsActive;
              const disabled = 'comingSoon' in item && item.comingSoon;
              const itemColor = 'color' in item ? item.color : undefined;

              const isOnPanelSubdomain =
                typeof window !== 'undefined' &&
                window.location.hostname.startsWith('panel.');

              // external: yeni sekmede açılacak (/kasa gibi ayrı app)
              const external = 'external' in item && item.external;
              // openInNewTab: yeni sekme ama URL transform YOK (KDS gibi aynı subdomain'de kalan)
              const openInNewTab = 'openInNewTab' in item && item.openInNewTab;
              const opensNewTab = external || openInNewTab;

              // External linkler her zaman absolute '/kasa' gibi
              // Subdomain'deysek root domain'e gitmek için tam URL kullan
              // openInNewTab durumunda URL'i panel altında bırak (KDS panel.alegstudio.com/kds)
              const resolvedHref = external
                ? isOnPanelSubdomain
                  ? `${window.location.protocol}//${window.location.hostname.replace('panel.', '')}${item.href}`
                  : item.href
                : isOnPanelSubdomain
                  ? item.href
                  : item.href === '/'
                    ? '/panel'
                    : `/panel${item.href}`;

              return (
                <Link
                  key={item.id}
                  href={disabled ? '#' : resolvedHref}
                  target={opensNewTab ? '_blank' : undefined}
                  rel={opensNewTab ? 'noopener' : undefined}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex items-center gap-2.5 min-h-[36px] w-full',
                    'rounded-[var(--r-sm)] text-[13px]',
                    'transition-all duration-200',
                    'border-l-2 border-transparent',
                    collapsed ? 'justify-center px-0' : 'justify-start px-2.5',
                    disabled
                      ? 'text-ink-3 cursor-not-allowed opacity-60'
                      : finalActive
                        ? 'bg-card text-ink font-semibold shadow-[var(--shadow-sm)]'
                        : 'text-ink-2 hover:text-ink hover:bg-card hover:translate-x-0.5 hover:shadow-[0_1px_2px_rgba(42,31,24,0.04)]',
                    !collapsed && finalActive && !disabled && 'border-l-accent'
                  )}
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  {/* Hover'da sol tarafta ince accent çizgi */}
                  {!disabled && !finalActive && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 bg-accent/50 rounded-r transition-all duration-200 group-hover:h-[18px]"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'w-[18px] text-center text-[13px] flex-shrink-0 transition-colors duration-200',
                      finalActive && !disabled
                        ? ''
                        : !disabled
                          ? 'text-ink-3 group-hover:text-accent'
                          : 'text-ink-3'
                    )}
                    style={{
                      fontFamily: 'var(--f-mono)',
                      color: finalActive && !disabled
                        ? (itemColor || 'var(--accent)')
                        : undefined,
                    }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {external && !disabled && (
                        <span
                          className="text-[10px] text-ink-3 opacity-70"
                          aria-hidden
                        >
                          ↗
                        </span>
                      )}
                      {disabled && (
                        <span
                          className="text-[9px] text-ink-3 uppercase bg-paper-3 px-1.5 py-0.5 rounded"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                          }}
                        >
                          YAKINDA
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-line p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'w-full h-9 rounded-[var(--r-sm)] hover:bg-card text-ink-3 hover:text-ink-2 transition-colors',
            'flex items-center justify-center gap-2 text-xs'
          )}
          style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
        >
          {collapsed ? '→' : '← DARALT'}
        </button>
      </div>
    </aside>
  );
}
