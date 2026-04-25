'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  getSoundSettings,
  updateSoundSettings,
  type SoundSettings,
  DEFAULT_SOUND_SETTINGS,
} from '@/lib/actions/sound-settings';
import { SOUND_OPTIONS, playSound, type SoundId } from '@/lib/sounds';
import { toast } from '@/components/ui/toast';

export function SoundsTab() {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await getSoundSettings();
      if (r.success && r.settings) {
        setSettings(r.settings);
      }
      setLoading(false);
    })();
  }, []);

  const handleSelect = (
    field: 'call_sound' | 'order_sound',
    value: SoundId
  ) => {
    setSettings((s) => ({ ...s, [field]: value }));
    setDirty(true);
    // Anında önizleme - seçilen sesi çal
    playSound(value, settings.volume);
  };

  const handleVolumeChange = (v: number) => {
    setSettings((s) => ({ ...s, volume: v }));
    setDirty(true);
  };

  const handlePreview = (id: SoundId) => {
    playSound(id, settings.volume);
  };

  const handleSave = () => {
    startTransition(async () => {
      const r = await updateSoundSettings(settings);
      if (r.success) {
        toast.success('Ses ayarları kaydedildi');
        setDirty(false);
      } else {
        toast.error(r.error || 'Kaydedilemedi');
      }
    });
  };

  if (loading) {
    return (
      <div className="py-12 text-center" style={{ color: 'var(--ink-3)' }}>
        <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18 }}>
          Yükleniyor...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[760px]">
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
          KASA · BİLDİRİM SESLERİ
        </div>
        <h2
          className="text-ink mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          Sesi nasıl duymak istersin?
        </h2>
        <p className="text-ink-2" style={{ fontSize: 14, lineHeight: 1.55 }}>
          Müşteri çağrısı geldiğinde ve yeni sipariş düştüğünde kasada
          duyacağın sesleri özelleştirebilirsin. Önizleme için ▶ butonuna bas.
        </p>
      </div>

      {/* Volume */}
      <SectionCard
        eyebrow="GENEL"
        title="Ses seviyesi"
        description={`%${Math.round(settings.volume * 100)}`}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: 18, color: 'var(--ink-3)' }}>🔊</span>
          <button
            onClick={() => playSound('classic', settings.volume)}
            className="ml-2 h-9 px-3 rounded-[8px] text-xs font-semibold transition-all active:scale-95"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
            }}
          >
            ▶ TEST
          </button>
        </div>
      </SectionCard>

      {/* Çağrı Sesi */}
      <SectionCard
        eyebrow="ÇAĞRILAR"
        title="Müşteri çağrı sesi"
        description="Garson çağırma butonu kullanıldığında çalar"
      >
        <SoundList
          selected={settings.call_sound}
          onSelect={(id) => handleSelect('call_sound', id)}
          onPreview={handlePreview}
        />
      </SectionCard>

      {/* Yeni Sipariş Sesi */}
      <SectionCard
        eyebrow="SİPARİŞLER"
        title="Yeni sipariş sesi"
        description="QR menüden yeni bir sipariş düştüğünde çalar"
      >
        <SoundList
          selected={settings.order_sound}
          onSelect={(id) => handleSelect('order_sound', id)}
          onPreview={handlePreview}
        />
      </SectionCard>

      {/* Kaydet bar */}
      <div
        className="sticky bottom-0 mt-8 py-4 -mx-4 px-4 border-t"
        style={{
          background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderColor: 'var(--line)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: dirty ? 'var(--warn)' : 'var(--ink-3)',
              textTransform: 'uppercase',
            }}
          >
            {dirty ? '● Kaydedilmedi' : '○ Tüm değişiklikler kayıtlı'}
          </div>
          <button
            onClick={handleSave}
            disabled={pending || !dirty}
            className="h-11 px-5 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-sans)',
            }}
          >
            {pending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION CARD
// ============================================================
function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <div
          className="uppercase mb-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--accent)',
          }}
        >
          {eyebrow}
        </div>
        <h3
          className="text-ink"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="text-ink-3 mt-0.5"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            {description}
          </p>
        )}
      </div>
      <div
        className="p-4 rounded-[14px]"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================
// SOUND LIST
// ============================================================
function SoundList({
  selected,
  onSelect,
  onPreview,
}: {
  selected: string;
  onSelect: (id: SoundId) => void;
  onPreview: (id: SoundId) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {SOUND_OPTIONS.map((opt) => {
        const isSel = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className="relative p-3.5 rounded-[12px] flex items-start gap-3 text-left transition-all active:scale-[0.98]"
            style={{
              background: isSel
                ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
                : 'var(--paper)',
              border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
              boxShadow: isSel
                ? '0 4px 12px -2px color-mix(in srgb, var(--accent) 22%, transparent)'
                : 'none',
            }}
          >
            {/* Check işaret - seçili olanda */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: isSel ? 'var(--accent)' : 'var(--paper-2)',
                color: isSel ? '#FAF5EA' : 'var(--ink-3)',
                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
              }}
            >
              {isSel ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-ink"
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: 1.2,
                }}
              >
                {opt.name}
              </div>
              <div
                className="text-ink-3 mt-0.5"
                style={{ fontSize: 11.5, lineHeight: 1.4 }}
              >
                {opt.description}
              </div>
            </div>

            {/* Önizleme butonu - card'ın üzerinde, tıklayınca onSelect değil play */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(opt.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onPreview(opt.id);
                }
              }}
              className="w-9 h-9 rounded-full grid place-items-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                cursor: 'pointer',
              }}
              aria-label="Sesi dinle"
              title="Sesi dinle"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
