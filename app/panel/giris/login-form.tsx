'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('E-posta veya şifre hatalı.');
      setLoading(false);
      return;
    }

    // Başarılı giriş - panel'e yönlen (middleware business member kontrolü yapacak)
    router.push('/');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs text-ink-2 mb-1.5" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
          E-POSTA
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sen@isletmen.com"
          required
          autoComplete="email"
          className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors"
          style={{ fontFamily: 'var(--f-sans)' }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-ink-2" style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
            ŞİFRE
          </label>
          <a
            href="#"
            className="text-xs text-accent hover:underline"
            style={{ fontFamily: 'var(--f-sans)' }}
            onClick={(e) => {
              e.preventDefault();
              alert('Şifre sıfırlama için destek ekibiyle iletişime geç.');
            }}
          >
            Şifremi unuttum
          </a>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors"
          style={{ fontFamily: 'var(--f-sans)' }}
        />
      </div>

      {error && <div className="text-sm text-danger -mt-1">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 h-12 rounded-[10px] bg-accent text-card font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
        style={{ fontFamily: 'var(--f-sans)', color: '#FAF5EA' }}
      >
        {loading ? 'Giriş yapılıyor...' : 'Panele Gir'}
      </button>
    </form>
  );
}
