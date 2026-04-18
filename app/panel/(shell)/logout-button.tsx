'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="h-9 px-3 rounded-[10px] text-ink-2 hover:bg-paper-2 text-xs uppercase transition-colors"
      style={{
        fontFamily: 'var(--f-mono)',
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      Çıkış
    </button>
  );
}
