'use client';

import { useState, useEffect } from 'react';
import type { Station } from '@/lib/actions/stations';

const PRESET_ICONS = [
  '☕', '🍳', '🍰', '🍕', '🍔', '🍹', '🥤', '🍺', '🍷',
  '🧁', '🥐', '🥗', '🍲', '🥩', '🍣', '●', '◆', '★',
];

const PRESET_COLORS = [
  '#C4553A', // accent
  '#B08A3E', // gold
  '#6B8E4E', // ok
  '#5B7FA6', // mavi
  '#8B5A96', // mor
  '#D2691E', // turuncu
  '#8B4513', // kahve
  '#2A4A4A', // koyu yeşil
];

export function StationFormModal({
  station,
  saving,
  onClose,
  onCreate,
  onUpdate,
}: {
  station: Station | null;
  saving: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; icon: string; color: string }) => void;
  onUpdate: (input: { name: string; icon: string; color: string }) => void;
}) {
  const [name, setName] = useState(station?.name || '');
  const [icon, setIcon] = useState(station?.icon || '●');
  const [color, setColor] = useState(station?.color || PRESET_COLORS[0]);

  useEffect(() => {
    setName(station?.name || '');
    setIcon(station?.icon || '●');
    setColor(station?.color || PRESET_COLORS[0]);
  }, [station]);

  const isEdit = station !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert('İstasyon adı gerekli');
      return;
    }
    const input = { name: name.trim(), icon, color };
    if (isEdit) onUpdate(input);
    else onCreate(input);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[500px] rounded-[var(--r)] overflow-hidden"
        style={{ background: 'var(--paper)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between gap-4"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              {isEdit ? 'DÜZENLE' : 'YENİ'}
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
              }}
            >
              {isEdit ? station.name : 'İstasyon oluştur'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full hover:bg-[var(--paper-2)] text-ink-3 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Preview */}
          <div className="flex items-center justify-center mb-6">
            <div
              className="rounded-[12px] px-4 py-3 flex items-center gap-3"
              style={{
                background: 'var(--card)',
                border: `1px solid ${color}`,
                borderTop: `4px solid ${color}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${color} 18%, transparent)`,
                  color: color,
                  fontSize: 22,
                }}
              >
                {icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 20,
                  }}
                >
                  {name || 'İstasyon'}
                </div>
                <div
                  className="text-[10px] uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    color: 'var(--ink-3)',
                  }}
                >
                  ÖNİZLEME
                </div>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="mb-5">
            <label
              className="uppercase block mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              İSTASYON ADI
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bar, Mutfak, Pastane..."
              maxLength={40}
              autoFocus={!isEdit}
              className="w-full h-11 px-3 rounded-[10px] text-[14px]"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
          </div>

          {/* Icon */}
          <div className="mb-5">
            <label
              className="uppercase block mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              İKON
            </label>
            <div className="grid grid-cols-9 gap-1">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className="h-10 rounded-[8px] flex items-center justify-center transition-all"
                  style={{
                    background: icon === ic ? color : 'var(--paper-2)',
                    color: icon === ic ? 'white' : 'var(--ink)',
                    fontSize: 18,
                    border:
                      icon === ic ? `1px solid ${color}` : '1px solid var(--line)',
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mb-6">
            <label
              className="uppercase block mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              RENK
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-10 h-10 rounded-full relative transition-transform"
                  style={{
                    background: c,
                    transform: color === c ? 'scale(1.12)' : 'scale(1)',
                    boxShadow:
                      color === c
                        ? `0 0 0 3px var(--paper), 0 0 0 5px ${c}`
                        : 'none',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 px-5 rounded-[12px] text-[14px] font-semibold text-ink-3 hover:bg-[var(--paper-2)] transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="h-11 px-6 rounded-[12px] text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--paper)' }}
            >
              {saving
                ? 'Kaydediliyor...'
                : isEdit
                ? 'Değişikliği kaydet'
                : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
