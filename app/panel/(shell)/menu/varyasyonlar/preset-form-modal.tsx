'use client';

import React, { useState } from 'react';
import type { Preset, PresetInput } from '@/lib/actions/options';
import { toast } from '@/components/ui/toast';

interface Props {
  initial: Preset | null;
  onSubmit: (input: PresetInput) => void;
  onClose: () => void;
  saving: boolean;
}

type ValueForm = {
  id: string; // local id (key için)
  name_tr: string;
  name_en: string;
  price_delta: number;
  is_default: boolean;
};

function newLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

export function PresetFormModal({ initial, onSubmit, onClose, saving }: Props) {
  const [name_tr, setNameTr] = useState(initial?.name.tr || '');
  const [name_en, setNameEn] = useState(initial?.name.en || '');
  const [type, setType] = useState<'single' | 'multi'>(initial?.type || 'single');
  const [required, setRequired] = useState(initial?.required ?? true);
  const [values, setValues] = useState<ValueForm[]>(
    initial
      ? initial.values.map((v) => ({
          id: v.id,
          name_tr: v.name.tr,
          name_en: v.name.en || '',
          price_delta: v.price_delta,
          is_default: v.is_default,
        }))
      : [
          {
            id: newLocalId(),
            name_tr: '',
            name_en: '',
            price_delta: 0,
            is_default: true,
          },
          {
            id: newLocalId(),
            name_tr: '',
            name_en: '',
            price_delta: 0,
            is_default: false,
          },
        ]
  );

  // AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [aiHoursReset, setAiHoursReset] = useState<number | null>(null);

  // AI panel açılınca rate limit fetch
  React.useEffect(() => {
    if (!aiOpen) return;
    fetch('/api/ai/variation')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.remaining === 'number') {
          setAiRemaining(d.remaining);
          setAiHoursReset(d.hoursUntilReset);
        }
      })
      .catch(() => {});
  }, [aiOpen]);

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'AI hatası');
        if (data.rateLimited) {
          setAiRemaining(0);
          setAiHoursReset(data.hoursUntilReset);
        }
        return;
      }

      // Form alanlarını AI verisi ile doldur
      const ai = data.data;
      setNameTr(ai.name_tr || '');
      setNameEn(ai.name_en || '');
      setType(ai.type === 'multi' ? 'multi' : 'single');
      setRequired(!!ai.required);
      setValues(
        (ai.values || []).map(
          (v: {
            name_tr: string;
            name_en?: string;
            price_delta: number;
            is_default: boolean;
          }) => ({
            id: newLocalId(),
            name_tr: v.name_tr || '',
            name_en: v.name_en || '',
            price_delta: Number(v.price_delta) || 0,
            is_default: !!v.is_default,
          })
        )
      );

      setAiRemaining(typeof data.remaining === 'number' ? data.remaining : null);
      setAiOpen(false);
      setAiPrompt('');
    } catch (err) {
      toast.error('AI hatası: ' + (err instanceof Error ? err.message : 'bilinmeyen'));
    } finally {
      setAiLoading(false);
    }
  }

  function updateValue(id: string, patch: Partial<ValueForm>) {
    setValues((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function addValue() {
    setValues((vs) => [
      ...vs,
      {
        id: newLocalId(),
        name_tr: '',
        name_en: '',
        price_delta: 0,
        is_default: false,
      },
    ]);
  }

  function removeValue(id: string) {
    if (values.length <= 2) {
      toast.error('En az 2 değer olmalı');
      return;
    }
    setValues((vs) => vs.filter((v) => v.id !== id));
  }

  // Tek seçimlik için default tek olmalı
  function setDefault(id: string) {
    if (type === 'single') {
      setValues((vs) =>
        vs.map((v) => ({ ...v, is_default: v.id === id }))
      );
    } else {
      setValues((vs) =>
        vs.map((v) => (v.id === id ? { ...v, is_default: !v.is_default } : v))
      );
    }
  }

  function handleSubmit() {
    if (!name_tr.trim()) {
      toast.error('Şablon adı gerekli (ör: Boy, Süt)');
      return;
    }
    const filled = values.filter((v) => v.name_tr.trim());
    if (filled.length < 2) {
      toast.error('En az 2 değer doldurulmalı');
      return;
    }

    onSubmit({
      name_tr: name_tr.trim(),
      name_en: name_en.trim() || undefined,
      type,
      required,
      values: filled.map((v) => ({
        name_tr: v.name_tr.trim(),
        name_en: v.name_en.trim() || undefined,
        price_delta: Number(v.price_delta) || 0,
        is_default: v.is_default,
      })),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        animation: 'presetFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] w-full max-w-[640px] max-h-[92vh] overflow-y-auto border border-line relative"
        style={{
          boxShadow: '0 30px 60px -20px rgba(42,31,24,0.35)',
          animation: 'presetSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 p-6 pb-4"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            {initial ? 'VARYASYON DÜZENLE' : 'YENİ VARYASYON'}
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            {initial ? name_tr || 'Düzenle' : 'Yeni varyasyon'}
          </h2>

          {/* AI üret butonu - sadece yeni eklemede */}
          {!initial && (
            <button
              type="button"
              onClick={() => setAiOpen((o) => !o)}
              className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-full text-[12px] font-semibold transition-all"
              style={{
                background: aiOpen
                  ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                  : 'var(--paper-2)',
                border: aiOpen
                  ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)'
                  : '1px solid var(--line)',
                color: aiOpen ? 'var(--accent)' : 'var(--ink-2)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
                <path d="M5 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" opacity="0.5" />
              </svg>
              AI ile Üret
              {aiRemaining !== null && aiRemaining > 0 && (
                <span
                  className="text-[9px] uppercase ml-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.1em',
                    opacity: 0.7,
                  }}
                >
                  {aiRemaining}/5
                </span>
              )}
            </button>
          )}

          {/* AI prompt panel */}
          {aiOpen && (
            <div
              className="mt-3 p-3 rounded-[12px]"
              style={{
                background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
                border: '1px dashed color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                NE ÜRETSİN?
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !aiLoading && aiPrompt.trim()) {
                      handleAiGenerate();
                    }
                  }}
                  placeholder="Boy, Süt çeşidi, Ek malzeme, Şeker..."
                  maxLength={200}
                  disabled={aiLoading}
                  className="flex-1 h-10 px-3 rounded-[10px] text-sm focus:outline-none focus:border-accent disabled:opacity-50"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={
                    aiLoading || !aiPrompt.trim() || aiRemaining === 0
                  }
                  className="h-10 px-4 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
                  style={{ background: 'var(--accent)', color: '#FAF5EA' }}
                >
                  {aiLoading ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" className="animate-spin">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round" />
                      </svg>
                      Üretiliyor
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Üret
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {['Boy', 'Süt çeşidi', 'Ek malzeme', 'Şeker', 'Acılık'].map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAiPrompt(s)}
                      disabled={aiLoading}
                      className="h-6 px-2 rounded-full text-[10px] font-medium transition-colors hover:bg-card disabled:opacity-50"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        color: 'var(--ink-3)',
                      }}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
              {aiRemaining === 0 && aiHoursReset !== null && (
                <div
                  className="text-[10px] mt-2 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.1em',
                    color: 'var(--accent)',
                    fontWeight: 700,
                  }}
                >
                  GÜNLÜK LİMİT DOLDU · {aiHoursReset} SAAT SONRA YENİLENİR
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* İsim */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ad · Türkçe" required>
              <Input
                value={name_tr}
                onChange={setNameTr}
                placeholder="Boy"
                maxLength={50}
                autoFocus
              />
            </Field>
            <Field label="Ad · English (opsiyonel)">
              <Input
                value={name_en}
                onChange={setNameEn}
                placeholder="Size"
                maxLength={50}
              />
            </Field>
          </div>

          {/* Tip */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seçim Tipi">
              <div className="flex gap-2">
                <TypeButton
                  active={type === 'single'}
                  onClick={() => {
                    setType('single');
                    // Tek seçim'e geçildiyse: sadece ilk default kalsın
                    setValues((vs) => {
                      const firstDefaultIdx = vs.findIndex((v) => v.is_default);
                      const keepIdx = firstDefaultIdx === -1 ? 0 : firstDefaultIdx;
                      return vs.map((v, idx) => ({ ...v, is_default: idx === keepIdx }));
                    });
                  }}
                  label="Tek Seçim"
                  hint="Boy, Süt, Şeker"
                />
                <TypeButton
                  active={type === 'multi'}
                  onClick={() => setType('multi')}
                  label="Çoklu"
                  hint="Ek malzeme"
                />
              </div>
            </Field>

            <Field label="Zorunluluk">
              <div className="flex gap-2">
                <TypeButton
                  active={required}
                  onClick={() => setRequired(true)}
                  label="Zorunlu"
                  hint="Seçim şart"
                />
                <TypeButton
                  active={!required}
                  onClick={() => setRequired(false)}
                  label="Opsiyonel"
                  hint="Boş geçebilir"
                />
              </div>
            </Field>
          </div>

          {/* Değerler */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                }}
              >
                DEĞERLER ({values.length})
              </span>
              <button
                type="button"
                onClick={addValue}
                className="h-7 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors hover:bg-paper-3"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}
              >
                <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
                Yeni değer
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {values.map((v, idx) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 p-2.5 rounded-[10px]"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0"
                    style={{
                      background: 'var(--paper-3)',
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--ink-3)',
                    }}
                  >
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={v.name_tr}
                    onChange={(e) =>
                      updateValue(v.id, { name_tr: e.target.value })
                    }
                    placeholder="Küçük"
                    maxLength={40}
                    className="flex-1 h-9 px-2.5 rounded-[8px] text-sm focus:outline-none focus:border-accent"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                    }}
                  />

                  {/* Fiyat farkı */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <input
                      type="number"
                      value={v.price_delta}
                      onChange={(e) =>
                        updateValue(v.id, { price_delta: Number(e.target.value) })
                      }
                      step="0.5"
                      className="w-16 h-9 px-2 rounded-[8px] text-sm text-right focus:outline-none focus:border-accent"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        fontFamily: 'var(--f-mono)',
                      }}
                      title="Fiyat farkı (+ veya −)"
                    />
                    <span
                      className="text-[11px] text-ink-3"
                      style={{ fontFamily: 'var(--f-mono)' }}
                    >
                      ₺
                    </span>
                  </div>

                  {/* Default checkbox */}
                  <button
                    type="button"
                    onClick={() => setDefault(v.id)}
                    className="h-7 px-2 rounded-full text-[10px] font-semibold uppercase flex items-center gap-1 transition-all flex-shrink-0"
                    style={{
                      background: v.is_default
                        ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                        : 'transparent',
                      border: '1px solid',
                      borderColor: v.is_default
                        ? 'color-mix(in srgb, var(--accent) 30%, transparent)'
                        : 'var(--line)',
                      color: v.is_default ? 'var(--accent)' : 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.08em',
                    }}
                    title="Varsayılan seçenek"
                  >
                    {v.is_default && '●'} VARSAYILAN
                  </button>

                  {/* Kaldır */}
                  <button
                    type="button"
                    onClick={() => removeValue(v.id)}
                    disabled={values.length <= 2}
                    className="w-7 h-7 rounded-full grid place-items-center transition-colors disabled:opacity-30 hover:bg-paper-3 flex-shrink-0"
                    style={{
                      background: 'transparent',
                      color: 'var(--accent)',
                    }}
                    title="Bu değeri kaldır"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div
              className="text-[11px] text-ink-3 mt-3"
              style={{ fontFamily: 'var(--f-mono)' }}
            >
              İPUCU: Fiyat farkı - baz fiyattan ne kadar artacak/düşecek (+5, 0, -3)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex gap-2 p-5"
          style={{
            background: 'var(--card)',
            borderTop: '1px solid var(--line)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-[10px] text-[13px] font-medium transition-colors hover:bg-paper-3 disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] h-11 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            {saving ? 'Kaydediliyor...' : initial ? 'Değişiklikleri Kaydet' : 'Varyasyon Oluştur'}
          </button>
        </div>

        <style jsx>{`
          @keyframes presetFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes presetSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

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
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          fontWeight: 700,
          color: 'var(--ink-3)',
        }}
      >
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </div>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  maxLength,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      className="w-full h-10 px-3 rounded-[10px] text-sm focus:outline-none focus:border-accent focus:bg-card transition-colors"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
      }}
    />
  );
}

function TypeButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 p-2.5 rounded-[10px] text-left transition-all"
      style={{
        background: active ? 'var(--card)' : 'var(--paper-2)',
        border: active ? '2px solid var(--accent)' : '1px solid var(--line)',
      }}
    >
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="text-[10px] text-ink-3">{hint}</div>
    </button>
  );
}
