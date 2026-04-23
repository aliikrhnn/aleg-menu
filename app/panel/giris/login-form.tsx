'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Otomatik focus e-postaya + localStorage'tan e-posta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('aleg-remember-email');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    }
    emailRef.current?.focus();
  }, []);

  // Caps Lock algılama
  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const caps = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(!!caps);
  };

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

    // Beni hatırla
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        window.localStorage.setItem('aleg-remember-email', email);
      } else {
        window.localStorage.removeItem('aleg-remember-email');
      }
    }

    // Subdomain kontrolü
    const hostname = window.location.hostname;
    const isSubdomain = hostname.startsWith('panel.');

    if (isSubdomain) {
      router.push('/');
    } else {
      router.push('/panel');
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* E-posta */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            E-POSTA
          </label>
          <span
            className="text-[11px]"
            style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}
          >
            İşletme adresin
          </span>
        </div>
        <div
          className="flex items-center rounded-[10px] transition-all focus-within:border-accent"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: '0 1px 2px rgba(42,31,24,0.04)',
          }}
        >
          <div
            className="pl-3.5 pr-2 flex items-center justify-center"
            style={{ color: 'var(--ink-3)' }}
          >
            <MailIcon />
          </div>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sen@isletmen.com"
            required
            autoComplete="email"
            className="flex-1 h-12 px-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none"
            style={{ fontFamily: 'var(--f-sans)', fontSize: 14 }}
          />
        </div>
      </div>

      {/* Şifre */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            ŞİFRE
          </label>
          <a
            href="#"
            className="text-[11px] hover:underline"
            style={{
              color: 'var(--accent)',
              textDecoration: 'underline',
              textDecorationColor:
                'color-mix(in srgb, var(--accent) 40%, transparent)',
              textUnderlineOffset: 3,
            }}
            onClick={(e) => {
              e.preventDefault();
              alert(
                'Şifre sıfırlama için destek ekibiyle iletişime geç: destek@alegstudio.com'
              );
            }}
          >
            Şifremi unuttum
          </a>
        </div>
        <div
          className="flex items-center rounded-[10px] transition-all"
          style={{
            background: 'var(--card)',
            border: `1px solid ${
              capsLockOn && passwordFocused ? 'var(--warn)' : 'var(--line)'
            }`,
            boxShadow: '0 1px 2px rgba(42,31,24,0.04)',
          }}
        >
          <div
            className="pl-3.5 pr-2 flex items-center justify-center"
            style={{ color: 'var(--ink-3)' }}
          >
            <LockIcon />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => {
              setPasswordFocused(false);
              setCapsLockOn(false);
            }}
            placeholder="••••••••••"
            required
            autoComplete="current-password"
            className="flex-1 h-12 px-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none"
            style={{ fontFamily: 'var(--f-sans)', fontSize: 14 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="px-3.5 uppercase text-[11px] font-semibold transition-colors hover:opacity-70"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
            tabIndex={-1}
          >
            {showPassword ? 'GİZLE' : 'GÖSTER'}
          </button>
        </div>
        {capsLockOn && passwordFocused && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-[11px]"
            style={{ color: 'var(--warn)' }}
          >
            <span>⚠</span>
            <span>Caps Lock açık</span>
          </div>
        )}
      </div>

      {/* Beni hatırla */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label
          className="flex items-center gap-2 cursor-pointer text-sm select-none"
          style={{ color: 'var(--ink-2)' }}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded accent-accent cursor-pointer"
          />
          <span>Beni bu cihazda hatırla</span>
        </label>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div
          className="p-3 rounded-[10px] text-sm flex items-start gap-2"
          style={{
            background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
            border:
              '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
            color: 'var(--danger)',
          }}
        >
          <span className="flex-shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Ana buton */}
      <button
        type="submit"
        disabled={loading}
        className="group mt-1 h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-sans)',
          boxShadow:
            '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
        }}
      >
        <span>{loading ? 'Giriş yapılıyor...' : 'Giriş yap'}</span>
        {!loading && (
          <span
            className="inline-block transition-transform group-hover:translate-x-1"
            style={{ fontSize: 16 }}
          >
            →
          </span>
        )}
      </button>

      {/* Klavye ipucu */}
      <div
        className="text-center mt-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
        }}
      >
        ↵ ENTER İLE GİRİŞ YAP
      </div>
    </form>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="1.5"
        y="3.5"
        width="13"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 4.5L8 9L14 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="2.5"
        y="7"
        width="11"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 7V5a3 3 0 016 0v2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
