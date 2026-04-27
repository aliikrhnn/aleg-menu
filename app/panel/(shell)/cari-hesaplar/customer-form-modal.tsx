'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import {
  getCustomer,
  updateCustomer,
} from '@/lib/actions/customers';

type CreateInput = {
  name: string;
  phone?: string;
  email?: string;
  note?: string;
};

type Props = {
  customerId: string | null; // null = yeni
  onClose: () => void;
  onSubmit: (input: CreateInput) => Promise<boolean>; // create için
  onUpdated: () => void; // update sonrası
};

export function CustomerFormModal({
  customerId,
  onClose,
  onSubmit,
  onUpdated,
}: Props) {
  const isEdit = !!customerId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  // ESC tuşu ile kapama (submitting hariç)
  useEscapeKey(onClose, !submitting);

  useEffect(() => {
    if (!customerId) return;
    let live = true;
    setLoading(true);
    getCustomer(customerId).then((r) => {
      if (!live) return;
      if (!r.success || !r.customer) {
        toast.error(r.error || 'Yüklenemedi');
        setLoading(false);
        return;
      }
      setName(r.customer.name);
      setPhone(r.customer.phone || '');
      setEmail(r.customer.email || '');
      setNote(r.customer.note || '');
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [customerId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Ad zorunlu');
      return;
    }
    setSubmitting(true);
    if (isEdit && customerId) {
      const r = await updateCustomer({
        customerId,
        name,
        phone,
        email,
        note,
      });
      setSubmitting(false);
      if (!r.success) {
        toast.error(r.error || 'Güncellenemedi');
        return;
      }
      toast.success('Güncellendi');
      onUpdated();
    } else {
      const ok = await onSubmit({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        note: note.trim() || undefined,
      });
      setSubmitting(false);
      if (!ok) return;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-[480px] rounded-[14px] flex flex-col overflow-hidden aleg-modal-desktop-first aleg-modal-content"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            {isEdit ? 'KULLANICIYI DÜZENLE' : 'YENİ KULLANICI'}
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.025em',
            }}
          >
            {isEdit ? 'Bilgileri güncelle' : 'Yeni cari kullanıcı ekle'}
          </h2>
        </div>

        {loading ? (
          <div
            className="px-5 py-12 text-center"
            style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}
          >
            Yükleniyor…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Ad */}
            <Field label="AD SOYAD" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="örn: Ahmet Yılmaz"
                autoFocus={!isEdit}
                className="w-full h-11 px-3 rounded-[8px] text-sm"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </Field>

            {/* Telefon */}
            <Field label="TELEFON">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0532 123 45 67"
                className="w-full h-11 px-3 rounded-[8px] text-sm"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                  fontFamily: 'var(--f-mono)',
                }}
              />
            </Field>

            {/* Email */}
            <Field label="E-POSTA">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full h-11 px-3 rounded-[8px] text-sm"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </Field>

            {/* Not */}
            <Field label="NOT">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="örn: Lojman müdürü, her sabah gelir"
                rows={3}
                className="w-full px-3 py-2.5 rounded-[8px] text-sm resize-none"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                  fontFamily: 'var(--f-sans)',
                  lineHeight: 1.5,
                }}
              />
            </Field>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-5 py-4 flex gap-2 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || loading || !name.trim()}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {submitting ? 'Kaydediliyor…' : isEdit ? 'Güncelle' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="uppercase mb-1.5 flex items-baseline gap-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-2)',
        }}
      >
        <span>{label}</span>
        {required && <span style={{ color: 'var(--accent)' }}>*</span>}
      </div>
      {children}
    </div>
  );
}
