'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AgentStatusBadge } from '@/components/panel/agent-status-badge';

interface PanelTopbarProps {
  user: {
    email?: string;
    full_name?: string | null;
  };
  businessStatus?: string;
  businessId?: string;
}

export function PanelTopbar({ user, businessStatus, businessId }: PanelTopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dış tıklamada menüyü kapat
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();

    // Subdomain'de /'a, lokalde /panel/giris'e
    const isSubdomain =
      typeof window !== 'undefined' && window.location.hostname.startsWith('panel.');
    router.push(isSubdomain ? '/giris' : '/panel/giris');
    router.refresh();
  };

  const initials = (user.full_name || user.email || 'A')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-[60px] flex-shrink-0 border-b border-line bg-card flex items-center px-6 gap-4">
      <div className="relative flex-1 max-w-md">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
        >
          ⌕
        </span>
        <input
          type="text"
          placeholder="Ürün, masa veya sipariş ara..."
          className="w-full h-9 pl-8 pr-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
          style={{ fontFamily: 'var(--f-sans)' }}
        />
      </div>

      <div className="flex-1" />

      {/* Print Agent durum göstergesi */}
      {businessId && (
        <div className="hidden md:block mr-2">
          <AgentStatusBadge businessId={businessId} context="panel" />
        </div>
      )}

      {businessStatus === 'trial' && (
        <div
          className="hidden md:flex items-center gap-2 px-3 h-7 rounded-full bg-accent/10 text-accent"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          DENEME SÜRECİ
        </div>
      )}

      {businessStatus === 'active' && (
        <div
          className="hidden md:flex items-center gap-2 px-3 h-7 rounded-full bg-ok/10 text-ok"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
          AKTİF
        </div>
      )}

      {/* User menu - tıklanabilir dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 h-10 pl-2 pr-2.5 rounded-full transition-colors hover:bg-paper-2"
          style={{
            border: menuOpen ? '1px solid var(--line)' : '1px solid transparent',
            background: menuOpen ? 'var(--paper-2)' : 'transparent',
          }}
        >
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-medium leading-tight text-ink">
              {user.full_name || 'Kullanıcı'}
            </div>
            <div className="text-[11px] text-ink-3">{user.email}</div>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold text-sm flex-shrink-0"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            {initials}
          </div>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-3 transition-transform flex-shrink-0"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            className="absolute top-full right-0 mt-2 w-[260px] rounded-[14px] overflow-hidden z-50"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: '0 4px 10px rgba(42,31,24,0.08), 0 20px 40px -15px rgba(42,31,24,0.2)',
              animation: 'menuSlide 0.15s ease-out',
            }}
          >
            {/* User header */}
            <div
              className="px-4 py-3.5"
              style={{
                background: 'var(--paper-2)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold text-base flex-shrink-0"
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {user.full_name || 'Kullanıcı'}
                  </div>
                  <div className="text-[11px] text-ink-3 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <MenuLink
                href="/panel/ayarlar"
                onClick={() => setMenuOpen(false)}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                label="İşletme Ayarları"
              />
              <MenuLink
                href="/panel/abonelik"
                onClick={() => setMenuOpen(false)}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                }
                label="Abonelik"
                disabled
                hint="yakında"
              />
            </div>

            {/* Logout */}
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-paper-2"
                style={{ color: 'var(--accent)' }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="font-medium">Çıkış Yap</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes menuSlide {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
  disabled,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  if (disabled) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-not-allowed"
        style={{ color: 'var(--ink-3)' }}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
        {hint && (
          <span
            className="uppercase text-[9px] px-1.5 py-0.5 rounded"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
              color: 'var(--ink-3)',
              background: 'var(--paper-2)',
              fontWeight: 700,
            }}
          >
            {hint}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-paper-2"
      style={{ color: 'var(--ink)' }}
    >
      <span className="flex-shrink-0 text-ink-2">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
    </Link>
  );
}
