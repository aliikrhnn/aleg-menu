'use client';

import { useEffect, useState } from 'react';
import {
  getAdminKasaPinStatus,
  setAdminKasaPin,
  removeAdminKasaPin,
} from '@/lib/actions/settings';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

export function AdminPinTab() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await getAdminKasaPinStatus();
      if (r.success) setHasPin(!!r.hasPin);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!/^\d{4,6}$/.test(pin1)) {
      toast.error('PIN 4-6 haneli rakam olmalı');
      return;
    }
    if (pin1 !== pin2) {
      toast.error('PIN tekrarı eşleşmiyor');
      return;
    }
    setSaving(true);
    const r = await setAdminKasaPin(pin1);
    setSaving(false);
    if (!r.success) {
      toast.error(r.error || 'PIN kaydedilemedi');
      return;
    }
    setHasPin(true);
    setPin1('');
    setPin2('');
    toast.success(
      hasPin ? 'Kasa PIN güncellendi' : 'Kasa PIN oluşturuldu'
    );
  }

  async function handleRemove() {
    const ok = await confirmDialog({
      title: 'Kasa PIN kaldırılsın mı?',
      body: 'PIN kaldırılırsa kasa sekmesine herkes erişebilir.',
      tone: 'danger',
      confirmLabel: 'Kaldır',
    });
    if (!ok) return;
    setSaving(true);
    const r = await removeAdminKasaPin();
    setSaving(false);
    if (!r.success) {
      toast.error(r.error || 'PIN kaldırılamadı');
      return;
    }
    setHasPin(false);
    toast.success('Kasa PIN kaldırıldı');
  }

  return (
    <div className="max-w-[520px] space-y-6">
      {/* Başlık */}
      <div>
        <div
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--accent)',
          }}
        >
          KASA SEKMESİ GÜVENLİĞİ
        </div>
        <h2
          className="mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          Admin kasa PIN&apos;i
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--ink-2)' }}
        >
          Kasa ekranındaki <strong>Kasa</strong> sekmesi (çevrimiçi durumu, kasa aç/kapat,
          günlük Z raporu) bu PIN ile açılır. PIN belirlediğinde, kasiyerin o sekmeye
          girmek için PIN&apos;i girmesi gerekir. Her sekme girişinde tekrar istenir.
        </p>
      </div>

      {/* Durum kartı */}
      <div
        className="rounded-[var(--r)] p-4 flex items-center gap-3"
        style={{
          background: hasPin
            ? 'color-mix(in srgb, var(--ok) 8%, var(--card))'
            : 'color-mix(in srgb, var(--warn) 8%, var(--card))',
          border: `1px solid ${
            hasPin
              ? 'color-mix(in srgb, var(--ok) 25%, var(--line))'
              : 'color-mix(in srgb, var(--warn) 25%, var(--line))'
          }`,
        }}
      >
        <span
          className="inline-flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: hasPin ? 'var(--ok)' : 'var(--warn)',
            color: '#FAF5EA',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {hasPin ? '🔒' : '⚠'}
        </span>
        <div className="flex-1">
          <div
            className="uppercase mb-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            MEVCUT DURUM
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              color: hasPin ? 'var(--ok)' : 'var(--warn)',
            }}
          >
            {loading
              ? 'Yükleniyor…'
              : hasPin
                ? 'PIN tanımlı · Kasa sekmesi korumalı'
                : 'PIN tanımlı değil · Kasa sekmesi herkese açık'}
          </div>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-[var(--r)] p-5 space-y-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          {hasPin ? 'PIN DEĞİŞTİR' : 'PIN OLUŞTUR'}
        </div>

        <div>
          <label
            className="block mb-1.5 text-xs uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              color: 'var(--ink-2)',
              fontWeight: 600,
            }}
          >
            Yeni PIN (4-6 hane)
          </label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            autoComplete="new-password"
            value={pin1}
            onChange={(e) =>
              setPin1(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="••••"
            className="w-full h-11 px-3 rounded-[8px] focus:outline-none focus:border-accent transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              fontSize: 18,
              letterSpacing: '0.4em',
              color: 'var(--ink)',
            }}
          />
        </div>

        <div>
          <label
            className="block mb-1.5 text-xs uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              color: 'var(--ink-2)',
              fontWeight: 600,
            }}
          >
            PIN Tekrarı
          </label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            autoComplete="new-password"
            value={pin2}
            onChange={(e) =>
              setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="••••"
            className="w-full h-11 px-3 rounded-[8px] focus:outline-none focus:border-accent transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              fontSize: 18,
              letterSpacing: '0.4em',
              color: 'var(--ink)',
            }}
          />
          {pin1 && pin2 && pin1 !== pin2 && (
            <div
              className="mt-1.5 text-xs"
              style={{ color: 'var(--danger)', fontFamily: 'var(--f-mono)' }}
            >
              PIN&apos;ler eşleşmiyor
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          {hasPin && (
            <button
              onClick={handleRemove}
              disabled={saving || loading}
              className="h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--danger)',
              }}
            >
              PIN&apos;i Kaldır
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={
              saving ||
              loading ||
              !pin1 ||
              !pin2 ||
              pin1 !== pin2 ||
              pin1.length < 4
            }
            className="h-10 px-5 rounded-[10px] text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ml-auto"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
            }}
          >
            {saving
              ? 'Kaydediliyor…'
              : hasPin
                ? 'PIN&apos;i Güncelle'
                : 'PIN&apos;i Kaydet'}
          </button>
        </div>
      </div>

      {/* İpucu */}
      <div
        className="text-xs leading-relaxed"
        style={{ color: 'var(--ink-3)' }}
      >
        <strong>İpucu:</strong> Kolay tahmin edilemeyecek bir PIN seç (1234, 0000, doğum
        günü gibi zayıflardan kaçın). PIN&apos;i güvenli bir yerde sakla — kaybedersen
        buradan yeniden oluşturabilirsin.
      </div>
    </div>
  );
}
