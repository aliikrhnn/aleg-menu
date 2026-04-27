'use client';

import { useState, useTransition } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import {
  CallButton,
  createCallButton,
  updateCallButton,
  deleteCallButton,
} from '@/lib/actions/call-buttons';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

const COLORS = [
  { id: 'accent', label: 'Brick', cssVar: '--accent' },
  { id: 'gold', label: 'Gold', cssVar: '--gold' },
  { id: 'ok', label: 'Olive', cssVar: '--ok' },
  { id: 'super', label: 'Steel', cssVar: '--super' },
  { id: 'danger', label: 'Tomato', cssVar: '--danger' },
];

const EMOJI_PRESETS = ['', '🔔', '☕', '💨', '🍽', '🧾', '💧', '🔥', '🥢', '🎉'];

interface Props {
  initialButtons: CallButton[];
  error: string | null;
}

export function CallButtonsManager({ initialButtons, error }: Props) {
  const [buttons, setButtons] = useState<CallButton[]>(initialButtons);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CallButton | null>(null);

  const openNewForm = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEditForm = (b: CallButton) => {
    setEditing(b);
    setShowForm(true);
  };

  const handleSaved = (saved: CallButton) => {
    setButtons((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleToggleActive = async (b: CallButton) => {
    const result = await updateCallButton(b.id, { is_active: !b.is_active });
    if (result.success) {
      setButtons((prev) =>
        prev.map((x) =>
          x.id === b.id ? { ...x, is_active: !x.is_active } : x
        )
      );
      toast.success(b.is_active ? 'Buton kapatıldı' : 'Buton aktif edildi');
    } else {
      toast.error(result.error || 'İşlem başarısız');
    }
  };

  const handleDelete = async (b: CallButton) => {
    const ok = await confirmDialog({
      title: 'Çağrı butonunu sil?',
      body: `"${b.name}" butonu silinecek. Geçmiş çağrı kayıtları korunur.`,
      confirmLabel: 'Sil',
      tone: 'danger',
    });
    if (!ok) return;

    const result = await deleteCallButton(b.id);
    if (result.success) {
      setButtons((prev) => prev.filter((x) => x.id !== b.id));
      toast.success('Buton silindi');
    } else {
      toast.error(result.error || 'Silinemedi');
    }
  };

  return (
    <div data-theme="warm">
      {/* Başlık */}
      <div className="mb-7">
        <div
          className="text-ink-3 uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
          }}
        >
          OPERASYON · ÇAĞRI BUTONLARI
        </div>
        <h1
          className="text-ink"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 36,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          Müşteri çağrıları
        </h1>
        <p
          className="text-ink-2 mt-2 max-w-[640px]"
          style={{ fontSize: 14, lineHeight: 1.55 }}
        >
          Müşteri QR menüden bu butonlara basarak ihtiyaçlarını size iletir.
          İstediğiniz kadar buton ekleyebilir, sıralayabilir, silebilirsiniz.
        </p>
      </div>

      {error && (
        <div
          className="mb-5 p-4 rounded-[12px]"
          style={{
            background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
            color: 'var(--danger)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Liste */}
      <div className="grid gap-2.5">
        {buttons.length === 0 && !showForm && (
          <div
            className="p-8 rounded-[14px] text-center"
            style={{
              background: 'var(--card)',
              border: '1px dashed var(--line)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink-3)',
                marginBottom: 8,
              }}
            >
              Henüz çağrı butonu yok
            </div>
            <div
              className="text-ink-3 mb-4"
              style={{ fontSize: 13 }}
            >
              İlk butonunu eklemeye ne dersin?
            </div>
            <button
              onClick={openNewForm}
              className="h-10 px-5 rounded-[10px] text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
              }}
            >
              + Yeni Buton Ekle
            </button>
          </div>
        )}

        {buttons.map((b) => {
          const colorVar = `var(--${b.color || 'accent'})`;
          return (
            <div
              key={b.id}
              className="p-4 rounded-[14px] flex items-center gap-3 transition-all"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                opacity: b.is_active ? 1 : 0.55,
              }}
            >
              {/* Renkli ikon kutusu */}
              <div
                className="w-12 h-12 rounded-[12px] grid place-items-center flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${colorVar} 14%, transparent)`,
                  color: colorVar,
                  fontSize: 22,
                }}
              >
                {b.emoji ? (
                  b.emoji
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-ink"
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {b.name}
                </div>
                <div
                  className="text-ink-3 uppercase mt-0.5"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    letterSpacing: '0.12em',
                  }}
                >
                  {b.is_active ? 'AKTİF' : 'KAPALI'} · {b.color}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Aktif/pasif toggle */}
                <button
                  onClick={() => handleToggleActive(b)}
                  className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: b.is_active
                      ? 'color-mix(in srgb, var(--ok) 14%, transparent)'
                      : 'var(--paper-2)',
                    color: b.is_active ? 'var(--ok)' : 'var(--ink-3)',
                  }}
                >
                  {b.is_active ? 'Açık' : 'Kapalı'}
                </button>

                {/* Düzenle */}
                <button
                  onClick={() => openEditForm(b)}
                  className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: 'var(--paper-2)',
                    color: 'var(--ink-2)',
                  }}
                >
                  Düzenle
                </button>

                {/* Sil */}
                <button
                  onClick={() => handleDelete(b)}
                  className="h-9 w-9 rounded-[8px] grid place-items-center transition-all active:scale-95"
                  style={{
                    background: 'transparent',
                    color: 'var(--ink-3)',
                  }}
                  aria-label="Sil"
                  title="Sil"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {buttons.length > 0 && !showForm && (
          <button
            onClick={openNewForm}
            className="mt-2 h-12 rounded-[12px] text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'transparent',
              border: '1px dashed var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            + Yeni Buton Ekle
          </button>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ButtonForm
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ============================================================
// FORM
// ============================================================
function ButtonForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: CallButton | null;
  onClose: () => void;
  onSaved: (b: CallButton) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '');
  const [color, setColor] = useState(initial?.color || 'accent');
  const [pending, startTransition] = useTransition();

  const isEdit = !!initial;

  // ESC ile kapama (submit sırasında değil)
  useEscapeKey(onClose, !pending);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Buton adı gerekli');
      return;
    }
    startTransition(async () => {
      if (isEdit && initial) {
        const result = await updateCallButton(initial.id, {
          name: name.trim(),
          emoji: emoji.trim() || null,
          color,
        });
        if (result.success) {
          onSaved({ ...initial, name: name.trim(), emoji: emoji.trim() || null, color });
          toast.success('Buton güncellendi');
        } else {
          toast.error(result.error || 'Kaydedilemedi');
        }
      } else {
        const result = await createCallButton({
          name: name.trim(),
          emoji: emoji.trim() || null,
          color,
        });
        if (result.success && result.button) {
          onSaved(result.button);
          toast.success('Buton eklendi');
        } else {
          toast.error(result.error || 'Eklenemedi');
        }
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="bg-paper w-full sm:max-w-[460px] rounded-t-[22px] sm:rounded-[22px] border border-line"
        style={{
          boxShadow: '0 30px 60px -20px rgba(42,31,24,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2">
          <div
            className="text-ink-3 uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
            }}
          >
            {isEdit ? 'BUTONU DÜZENLE' : 'YENİ ÇAĞRI BUTONU'}
          </div>
          <h3
            className="text-ink"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              lineHeight: 1.2,
            }}
          >
            {isEdit ? name || initial?.name : 'Müşteri ne için çağıracak?'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Buton Adı */}
          <div>
            <label
              className="block mb-1.5 text-ink-2 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
              }}
            >
              Buton Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Garson Çağır, Nargile Yenile, Hesap İste"
              maxLength={40}
              className="w-full h-11 px-3.5 rounded-[10px] text-sm bg-card border border-line text-ink focus:border-accent focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Emoji */}
          <div>
            <label
              className="block mb-1.5 text-ink-2 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
              }}
            >
              İkon (opsiyonel)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJI_PRESETS.map((e) => {
                const isSel = emoji === e;
                return (
                  <button
                    key={e || 'none'}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className="w-11 h-11 rounded-[10px] grid place-items-center transition-all active:scale-90"
                    style={{
                      background: isSel
                        ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                        : 'var(--card)',
                      border: `1px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                      fontSize: 20,
                    }}
                  >
                    {e || (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Renk */}
          <div>
            <label
              className="block mb-1.5 text-ink-2 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
              }}
            >
              Renk
            </label>
            <div className="flex gap-2">
              {COLORS.map((c) => {
                const isSel = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className="flex-1 h-11 rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                    style={{
                      background: isSel
                        ? `color-mix(in srgb, var(${c.cssVar}) 14%, transparent)`
                        : 'var(--card)',
                      border: `1px solid ${
                        isSel ? `var(${c.cssVar})` : 'var(--line)'
                      }`,
                    }}
                    title={c.label}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ background: `var(${c.cssVar})` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Önizleme */}
          {name && (
            <div>
              <label
                className="block mb-1.5 text-ink-2 uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                }}
              >
                Önizleme
              </label>
              <div
                className="p-4 rounded-[12px] text-center"
                style={{
                  background: `color-mix(in srgb, var(--${color}) 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, var(--${color}) 30%, transparent)`,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    color: `var(--${color})`,
                    marginBottom: 4,
                  }}
                >
                  {emoji || '🔔'}
                </div>
                <div
                  className="text-ink"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  {name}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aksiyonlar */}
        <div className="px-6 pb-6 pt-2 flex gap-2">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 h-12 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending || !name.trim()}
            className="flex-1 h-12 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
            }}
          >
            {pending ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}
