'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TopbarProps {
  user: {
    email?: string;
    full_name?: string | null;
  };
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  };

  // Avatar için baş harfler
  const initials = (user.full_name || user.email || 'A')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-[60px] flex-shrink-0 border-b border-line bg-card flex items-center px-6 gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
        >
          ⌕
        </span>
        <input
          type="text"
          placeholder="İşletme, kullanıcı veya komut ara..."
          className="w-full h-9 pl-8 pr-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm placeholder:text-ink-3 focus:outline-none focus:border-super focus:ring-1 focus:ring-super/20"
          style={{ fontFamily: 'var(--f-sans)' }}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.04em' }}
        >
          ⌘K
        </span>
      </div>

      <div className="flex-1" />

      {/* Status pill */}
      <div
        className="hidden md:flex items-center gap-2 px-3 h-7 rounded-full bg-ok/10 text-ok"
        style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
        SİSTEM AKTİF
      </div>

      {/* User menu */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-[13px] font-medium leading-tight">{user.full_name || 'Süper Admin'}</div>
          <div className="text-[11px] text-ink-3">{user.email}</div>
        </div>
        <div
          className="w-9 h-9 rounded-full bg-super-soft text-super flex items-center justify-center font-semibold text-sm"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="text-ink-3 hover:text-ink text-xs uppercase transition-colors"
          style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}
          title="Çıkış"
        >
          ↗
        </button>
      </div>
    </header>
  );
}
