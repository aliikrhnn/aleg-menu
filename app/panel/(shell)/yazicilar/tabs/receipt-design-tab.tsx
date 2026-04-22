'use client';

import { useState } from 'react';
import {
  updateReceiptSettings,
  requestTestPrint,
} from '@/lib/actions/printers';
import type { ReceiptSettings } from '@/types/database';
import type { BusinessInfo } from '../printers-manager';
import type { Printer } from '@/lib/actions/printers';
import { ReceiptPreview } from '../components/receipt-preview';

export function ReceiptDesignTab({
  settings,
  setSettings,
  business,
  printers,
}: {
  settings: ReceiptSettings;
  setSettings: (s: ReceiptSettings) => void;
  business: BusinessInfo;
  printers: Printer[];
}) {
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewType, setPreviewType] = useState<'cashier' | 'kitchen'>(
    'cashier'
  );

  const cashierPrinters = printers.filter(
    (p) => p.role === 'cashier' && p.is_active
  );
  const kitchenPrinters = printers.filter(
    (p) => p.role === 'kitchen' && p.is_active
  );
  const firstKitchenStation =
    kitchenPrinters.find((p) => p.station_name)?.station_name || 'Bar';

  async function patch<K extends keyof ReceiptSettings>(
    key: K,
    value: ReceiptSettings[K]
  ) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSaving(true);
    await updateReceiptSettings({ [key]: value });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleTestPrintPreview() {
    const printer =
      previewType === 'cashier' ? cashierPrinters[0] : kitchenPrinters[0];
    if (!printer) {
      alert(
        previewType === 'cashier'
          ? 'Aktif kasa yazıcısı yok'
          : 'Aktif mutfak yazıcısı yok'
      );
      return;
    }
    const r = await requestTestPrint(printer.id, previewType);
    if (!r.success) alert(r.error || 'Test isteği oluşturulamadı');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-6">
      {/* SOL: Ayarlar */}
      <div className="space-y-6">
        {/* Kağıt boyutu */}
        <SettingGroup title="Kağıt boyutu" icon="📏">
          <div className="grid grid-cols-2 gap-2">
            <PaperOption
              selected={settings.paper_width === 48}
              onClick={() => patch('paper_width', 48)}
              label="80 mm"
              sublabel="Standart (48 karakter)"
            />
            <PaperOption
              selected={settings.paper_width === 32}
              onClick={() => patch('paper_width', 32)}
              label="58 mm"
              sublabel="Kompakt (32 karakter)"
            />
          </div>
        </SettingGroup>

        {/* Kasiyer fişi ayarları */}
        <SettingGroup title="Kasa hesap fişi" icon="💳">
          <ToggleRow
            label="İşletme logosu göster"
            desc={
              !business.logo_url
                ? 'Logo henüz yüklenmemiş — yükleyince fişte görünecek'
                : undefined
            }
            value={settings.show_logo}
            onChange={(v) => patch('show_logo', v)}
          />
          <ToggleRow
            label="İşletme sloganı göster"
            desc={
              !business.tagline
                ? 'Slogan henüz girilmemiş — girince fişte görünecek'
                : undefined
            }
            value={settings.show_tagline}
            onChange={(v) => patch('show_tagline', v)}
          />
          <ToggleRow
            label="Adres göster"
            desc={
              !business.address
                ? 'Adres henüz girilmemiş — girince fişte görünecek'
                : undefined
            }
            value={settings.show_address}
            onChange={(v) => patch('show_address', v)}
          />
          <ToggleRow
            label="Telefon göster"
            desc={
              !business.phone
                ? 'Telefon henüz girilmemiş — girince fişte görünecek'
                : undefined
            }
            value={settings.show_phone}
            onChange={(v) => patch('show_phone', v)}
          />

          <div>
            <Label>ÜST YAZI (opsiyonel)</Label>
            <input
              type="text"
              value={settings.header_text}
              onChange={(e) => patch('header_text', e.target.value)}
              placeholder="Hoş geldiniz!"
              maxLength={60}
              className="w-full h-10 px-3 rounded-[10px] text-[13px]"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
              }}
            />
          </div>

          <div>
            <Label>ALT YAZI</Label>
            <input
              type="text"
              value={settings.footer_text}
              onChange={(e) => patch('footer_text', e.target.value)}
              placeholder="Tercih ettiğiniz için teşekkürler!"
              maxLength={80}
              className="w-full h-10 px-3 rounded-[10px] text-[13px]"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
              }}
            />
          </div>
        </SettingGroup>

        {/* Mutfak fişi ayarları */}
        <SettingGroup title="Mutfak / Bar fişi" icon="🍳">
          <ToggleRow
            label="Büyük font"
            desc="Mutfakta 3m'den okunabilsin"
            value={settings.kitchen_big_font}
            onChange={(v) => patch('kitchen_big_font', v)}
          />
          <ToggleRow
            label="Müşteri notunu vurgula"
            desc='">> NOT" şeklinde büyük kalın yazar'
            value={settings.kitchen_show_note_highlight}
            onChange={(v) => patch('kitchen_show_note_highlight', v)}
          />
          <ToggleRow
            label="Fiyatları göster"
            desc="Mutfak fişinde fiyat genelde gösterilmez"
            value={settings.kitchen_show_prices}
            onChange={(v) => patch('kitchen_show_prices', v)}
          />
        </SettingGroup>

        {/* DEĞERLENDİRME QR */}
        <SettingGroup title="Değerlendirme QR" icon="⭐">
          <ToggleRow
            label="Hesap fişine değerlendirme QR'ı ekle"
            desc="Müşteri kareyi okutup deneyimini puanlar. Geri bildirimler panelinize düşer."
            value={settings.review_qr_enabled}
            onChange={(v) => patch('review_qr_enabled', v)}
          />

          {settings.review_qr_enabled && (
            <>
              <div>
                <Label>QR ÜSTÜNDEKİ YAZI</Label>
                <input
                  type="text"
                  value={settings.review_qr_text}
                  onChange={(e) => patch('review_qr_text', e.target.value)}
                  placeholder="Deneyiminizi değerlendirin"
                  maxLength={60}
                  className="w-full h-10 px-3 rounded-[10px] text-[13px]"
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                  }}
                />
              </div>

              <div
                className="pt-3 mt-2"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <ToggleRow
                  label="Akıllı yönlendirme (Google'a yönlendir)"
                  desc="4-5 yıldız verenler Google'a yönlendirilir, düşük puan verenlerin geri bildirimi sadece panelinize gelir."
                  value={settings.review_smart_redirect}
                  onChange={(v) => patch('review_smart_redirect', v)}
                />
              </div>

              {settings.review_smart_redirect && (
                <div>
                  <Label>GOOGLE PLACE ID</Label>
                  <input
                    type="text"
                    value={settings.google_place_id}
                    onChange={(e) => patch('google_place_id', e.target.value)}
                    placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                    className="w-full h-10 px-3 rounded-[10px] text-[13px]"
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      fontFamily: 'var(--f-mono)',
                    }}
                  />
                  <a
                    href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline inline-block mt-2"
                  >
                    Place ID&apos;mi nasıl bulurum? →
                  </a>
                </div>
              )}
            </>
          )}
        </SettingGroup>

        {/* Ayarlar kaydediliyor göstergesi */}
        <div
          className="text-[11px] flex items-center gap-1.5"
          style={{
            color: savedFlash ? 'var(--ok, #6B8E4E)' : 'var(--ink-3)',
            transition: 'color 0.2s',
          }}
        >
          {saving ? (
            <>● Kaydediliyor...</>
          ) : savedFlash ? (
            <>✓ Kaydedildi</>
          ) : (
            <>Ayarlar otomatik kaydedilir</>
          )}
        </div>
      </div>

      {/* SAĞ: Canlı Önizleme */}
      <div className="lg:sticky lg:top-4 self-start">
        {/* Önizleme tab'ları */}
        <div
          className="flex items-center gap-1 mb-4 p-1 rounded-[10px]"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <PreviewTab
            active={previewType === 'cashier'}
            onClick={() => setPreviewType('cashier')}
            icon="💳"
            label="Kasa Fişi"
          />
          <PreviewTab
            active={previewType === 'kitchen'}
            onClick={() => setPreviewType('kitchen')}
            icon="🍳"
            label="Mutfak Fişi"
          />
        </div>

        <ReceiptPreview
          type={previewType}
          settings={settings}
          business={business}
          stationName={firstKitchenStation}
        />

        {/* Test butonu */}
        <div className="mt-4 text-center">
          {(previewType === 'cashier' && cashierPrinters.length > 0) ||
          (previewType === 'kitchen' && kitchenPrinters.length > 0) ? (
            <button
              onClick={handleTestPrintPreview}
              className="h-10 px-5 rounded-[12px] text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--ink)', color: 'var(--paper)' }}
            >
              🖨 {previewType === 'cashier' ? 'Önizleme fişini bastır' : 'Önizleme fişini bastır'}
            </button>
          ) : (
            <div
              className="text-[12px] text-ink-3 px-4 py-2 rounded-[10px] inline-block"
              style={{ background: 'var(--paper-2)' }}
            >
              {previewType === 'cashier'
                ? 'Aktif kasa yazıcısı yok — bastırmak için Yazıcılar tabından ekleyin'
                : 'Aktif mutfak yazıcısı yok — bastırmak için Yazıcılar tabından ekleyin'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== Helper Components ======

function SettingGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <h3
        className="mb-4 flex items-center gap-2"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 20,
          fontWeight: 400,
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PaperOption({
  selected,
  onClick,
  label,
  sublabel,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-[10px] text-left transition-colors"
      style={{
        background: selected
          ? 'color-mix(in srgb, var(--accent) 10%, var(--paper))'
          : 'var(--paper)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div className="text-[11px] text-ink-3 mt-0.5">{sublabel}</div>
    </button>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        {desc && (
          <div className="text-[11px] text-ink-3 mt-0.5">{desc}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0 w-10 h-6 rounded-full relative transition-colors cursor-pointer"
        style={{
          background: value ? 'var(--ok, #6B8E4E)' : 'var(--line)',
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
          style={{
            left: value ? 18 : 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </label>
  );
}

function PreviewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-9 rounded-[8px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
      style={{
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
