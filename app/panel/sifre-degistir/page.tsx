import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChangePasswordForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SifreDegistirPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login değilse giriş sayfasına
  if (!user) {
    redirect('/panel/giris');
  }

  const mustChange = !!user.user_metadata?.must_change_password;
  const fullName = (user.user_metadata?.full_name as string) || '';

  return (
    <div
      className="w-full max-w-[440px] rounded-[var(--r)] p-7 sm:p-9"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: '0 12px 40px -16px rgba(0,0,0,0.18)',
      }}
    >
      {/* Eyebrow */}
      <div
        className="uppercase mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: mustChange ? 'var(--accent)' : 'var(--ink-3)',
        }}
      >
        {mustChange ? 'GÜVENLİK · İLK GİRİŞ' : 'HESAP'}
      </div>

      {/* Başlık */}
      <h1
        className="mb-3"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1.05,
        }}
      >
        {mustChange ? 'Şifreni belirle' : 'Şifreni değiştir'}
      </h1>

      {/* Açıklama */}
      <p
        className="mb-6 text-ink-2"
        style={{ fontSize: 14, lineHeight: 1.55 }}
      >
        {mustChange ? (
          <>
            Hoş geldin{fullName ? `, ${fullName.split(' ')[0]}` : ''}.
            Hesabını güvene alman için sana özel bir şifre belirle. Geçici
            şifren artık geçerli olmayacak.
          </>
        ) : (
          <>Yeni şifreni belirle. Tüm cihazlarda yenisi geçerli olacak.</>
        )}
      </p>

      <ChangePasswordForm forced={mustChange} />
    </div>
  );
}
