'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeOwnPassword } from '@/lib/actions/account';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';

const MIN_LENGTH = 8;

type Props = {
  /** True ise: must_change_password=true durumu, mevcut şifre sorulmaz.
   *  False ise: ayarlardan değiştirme, mevcut şifre de istenir. */
  forced: boolean;
};

export function ChangePasswordForm({ forced }: Props) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newOk = newPassword.length >= MIN_LENGTH;
  const matchOk = newPassword === confirm && confirm.length > 0;
  const canSubmit =
    !submitting && newOk && matchOk && (forced || currentPassword.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!newOk) {
      setError(`Yeni şifre en az ${MIN_LENGTH} karakter olmalı`);
      return;
    }
    if (!matchOk) {
      setError('Yeni şifre ve doğrulama eşleşmiyor');
      return;
    }

    setSubmitting(true);
    const r = await changeOwnPassword({
      newPassword,
      currentPassword: forced ? undefined : currentPassword,
    });
    setSubmitting(false);

    if (!r.success) {
      setError(r.error || 'Şifre değiştirilemedi');
      return;
    }

    toast.success('Şifren güncellendi');
    // Auth session yenilensin (yeni metadata cache'lerde temiz olsun)
    router.refresh();

    // Forced ise panele yönlendir; ayarlardan ise sayfada kal
    setTimeout(() => {
      if (forced) {
        window.location.href = '/panel';
      }
    }, 600);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/panel/giris';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mevcut şifre — sadece forced=false ise */}
      {!forced && (
        <Field
          label="Mevcut şifre"
          type={show ? 'text' : 'password'}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          autoFocus
        />
      )}

      <Field
        label="Yeni şifre"
        type={show ? 'text' : 'password'}
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        autoFocus={forced}
        hint={
          newPassword.length > 0 && !newOk
            ? `En az ${MIN_LENGTH} karakter`
            : undefined
        }
      />

      <Field
        label="Yeni şifre tekrar"
        type={show ? 'text' : 'password'}
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        hint={
          confirm.length > 0 && !matchOk ? 'Eşleşmiyor' : undefined
        }
      />

      {/* Göster/gizle */}
      <label
        className="flex items-center gap-2 cursor-pointer select-none"
        style={{ fontSize: 12, color: 'var(--ink-2)' }}
      >
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="cursor-pointer"
        />
        Şifreyi göster
      </label>

      {/* Hata */}
      {error && (
        <div
          className="rounded-[var(--r-sm)] px-3 py-2 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
            color: 'var(--danger)',
            border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-12 rounded-[var(--r-sm)] transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-mono)',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontSize: 12,
        }}
      >
        {submitting ? 'Kaydediliyor…' : 'Şifreyi Belirle'}
      </button>

      {/* Çıkış (forced akışında bile çıkabilsin) */}
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full text-center pt-2"
        style={{
          fontSize: 12,
          color: 'var(--ink-3)',
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.06em',
        }}
      >
        Çıkış yap
      </button>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  autoFocus,
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="w-full h-11 px-3.5 rounded-[var(--r-sm)] outline-none transition-colors"
        style={{
          background: 'var(--paper)',
          border: `1px solid ${hint ? 'var(--warn)' : 'var(--line)'}`,
          fontSize: 14,
          color: 'var(--ink)',
        }}
      />
      {hint && (
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--warn)',
            letterSpacing: '0.04em',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
