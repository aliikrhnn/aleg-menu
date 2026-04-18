'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV } from './nav-config';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Pathname'i admin prefix olmadan al (middleware sayesinde URL'de görünmüyor zaten)
  const currentPath = pathname.startsWith('/admin') ? pathname.replace('/admin', '') || '/' : pathname;

  return (
    <aside
      className={cn(
        'flex-shrink-0 bg-paper-2 border-r border-line',
        'grid grid-rows-[auto_1fr_auto] overflow-hidden',
        'transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[256px]'
      )}
    >
      {/* Brand */}
      <div className={cn('border-b border-line', collapsed ? 'px-3.5 py-4' : 'px-[18px] py-5')}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[var(--r-sm)] bg-super text-card flex items-center justify-center flex-shrink-0"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.04em',
            }}
          >
            a
          </div>
          {!collapsed && (
            <div className="grid gap-0">
              <strong
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 18,
                  letterSpacing: '-0.02em',
                }}
                className="text-ink"
              >
                Aleg
              </strong>
              <span
                className="text-super uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                }}
              >
                Platform Admin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 py-2.5 overflow-y-auto grid content-start gap-0.5">
        {ADMIN_NAV.map((group) => (
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
              const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 min-h-[36px] w-full',
                    'rounded-[var(--r-sm)] text-[13px]',
                    'transition-colors duration-100',
                    'border-l-2 border-transparent',
                    collapsed ? 'justify-center px-0' : 'justify-start px-2.5',
                    isActive
                      ? 'bg-card text-ink font-semibold shadow-[var(--shadow-sm)]'
                      : 'text-ink-2 hover:bg-card/50',
                    !collapsed && isActive && 'border-l-super'
                  )}
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  <span
                    className={cn('w-[18px] text-center text-[13px] flex-shrink-0', isActive ? 'text-super' : 'text-ink-3')}
                    style={{ fontFamily: 'var(--f-mono)' }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={cn(
                        'rounded-full',
                        item.badgeTone === 'warn' && 'text-warn bg-warn/15',
                        item.badgeTone === 'danger' && 'text-danger bg-danger/15',
                        !item.badgeTone && 'text-ink-3'
                      )}
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                      }}
                    >
                      {item.badge}
                    </span>
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
