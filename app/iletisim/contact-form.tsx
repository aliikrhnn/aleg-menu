'use client';

import { useState } from 'react';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Genel');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // mailto link — backend gelince fetch'e çevrilir
    const body = `Ad: ${name}\nE-posta: ${email}\nKonu: ${subject}\n\n${message}`;
    const mailto = `mailto:info@alegstudio.com?subject=${encodeURIComponent(
      `[Aleg İletişim] ${subject}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    setSent(true);
  };

  if (sent) {
    return (
      <div
        className="not-prose rounded-[var(--r)] p-6 text-center my-6"
        style={{
          background: 'color-mix(in srgb, var(--ok) 8%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--ok) 25%, var(--line))',
        }}
      >
        <div
          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--ok) 18%, transparent)',
            color: 'var(--ok)',
            fontSize: 20,
          }}
        >
          ✓
        </div>
        <div
          className="mb-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            fontWeight: 400,
            color: 'var(--ink)',
          }}
        >
          Mail istemcin açıldı
        </div>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          Eğer açılmadıysa, mesajını{' '}
          <a
            href="mailto:info@alegstudio.com"
            style={{ color: 'var(--accent)' }}
          >
            info@alegstudio.com
          </a>{' '}
          adresine yollayabilirsin.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-4 text-sm"
          style={{
            color: 'var(--ink-3)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Yeni mesaj yaz
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="not-prose flex flex-col gap-4 my-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="AD SOYAD"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Ali Yılmaz"
          required
        />
        <FormField
          label="E-POSTA"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="sen@isletmen.com"
          required
        />
      </div>

      <div>
        <label
          className="uppercase mb-1.5 block"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          KONU
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full h-11 px-3 rounded-[10px] transition-all"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            fontFamily: 'var(--f-sans)',
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          <option>Genel</option>
          <option>Demo talebi</option>
          <option>Teknik destek</option>
          <option>Fiyatlandırma</option>
          <option>İş birliği</option>
          <option>Geri bildirim</option>
          <option>Diğer</option>
        </select>
      </div>

      <div>
        <label
          className="uppercase mb-1.5 block"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          MESAJ
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          placeholder="Nasıl yardımcı olabiliriz?"
          className="w-full px-3 py-2.5 rounded-[10px] resize-y transition-all"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            fontFamily: 'var(--f-sans)',
            fontSize: 14,
            color: 'var(--ink)',
            minHeight: 120,
          }}
        />
      </div>

      <button
        type="submit"
        className="group mt-2 h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-sans)',
          boxShadow:
            '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
        }}
      >
        <span>Mesajı gönder</span>
        <span
          className="inline-block transition-transform group-hover:translate-x-1"
          style={{ fontSize: 16 }}
        >
          →
        </span>
      </button>

      <p
        className="text-xs text-center"
        style={{ color: 'var(--ink-3)', marginTop: 4 }}
      >
        Mail istemcin açılacak. Göndermeden önce mesajını kontrol edebilirsin.
      </p>
    </form>
  );
}

function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="uppercase mb-1.5 block"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-11 px-3 rounded-[10px] transition-all"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--f-sans)',
          fontSize: 14,
          color: 'var(--ink)',
        }}
      />
    </div>
  );
}
