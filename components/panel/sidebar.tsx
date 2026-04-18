'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PANEL_NAV } from './nav-config';
import { cn } from '@/lib/utils';

interface PanelSidebarProps {
  businessName: string;
}

export function PanelSidebar({ businessName }: PanelSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const currentPath = pathname.startsWith('/panel') ? pathname.replace('/panel', '') || '/' : pathname;

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
            a
          </div>
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
        {PANEL_NAV.map((group) => (
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
                currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
              const disabled = item.comingSoon;

              return (
                <Link
                  key={item.id}
                  href={disabled ? '#' : item.href}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 min-h-[36px] w-full',
                    'rounded-[var(--r-sm)] text-[13px]',
                    'transition-colors duration-100',
                    'border-l-2 border-transparent',
                    collapsed ? 'justify-center px-0' : 'justify-start px-2.5',
                    disabled
                      ? 'text-ink-3 cursor-not-allowed opacity-60'
                      : isActive
                        ? 'bg-card text-ink font-semibold shadow-[var(--shadow-sm)]'
                        : 'text-ink-2 hover:bg-card/50',
                    !collapsed && isActive && !disabled && 'border-l-accent'
                  )}
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  <span
                    className={cn('w-[18px] text-center text-[13px] flex-shrink-0', isActive && !disabled ? 'text-accent' : 'text-ink-3')}
                    style={{ fontFamily: 'var(--f-mono)' }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
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
