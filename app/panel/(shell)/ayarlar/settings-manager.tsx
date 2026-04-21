'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateBusinessSettings,
  uploadBusinessLogo,
  removeBusinessLogo,
  type BusinessSettings,
  type WorkingHours,
  type OrderConfig,
} from '@/lib/actions/settings';
import { IdentityTab } from './tabs/identity-tab';
import { ContactTab } from './tabs/contact-tab';
import { HoursTab } from './tabs/hours-tab';
import { OrdersTab } from './tabs/orders-tab';
import { PreviewTab } from './tabs/preview-tab';

type TabId = 'identity' | 'contact' | 'hours' | 'orders' | 'preview';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'identity', label: 'Kimlik', icon: 'sparkle' },
  { id: 'contact', label: 'İletişim', icon: 'phone' },
  { id: 'hours', label: 'Çalışma Saatleri', icon: 'clock' },
  { id: 'orders', label: 'Sipariş', icon: 'cart' },
  { id: 'preview', label: 'Önizleme', icon: 'eye' },
];

interface Props {
  initialSettings: BusinessSettings;
  rootDomain: string;
}

export function SettingsManager({ initialSettings, rootDomain }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('identity');
  const [settings, setSettings] = useState<BusinessSettings>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [logoToast, setLogoToast] = useState<{
    show: boolean;
    type: 'uploaded' | 'removed';
  }>({ show: false, type: 'uploaded' });
  const [, startTransition] = useTransition();

  // initialSettings değişirse (router.refresh sonrası) state'i güncelle
  // Ancak kullanıcının yaptığı değişiklikler (dirty) korunsun
  useEffect(() => {
    if (!dirty) {
      setSettings(initialSettings);
    } else {
      // Sadece logo_url'i güncelle (diğer alanlar değişmedi ama logo server'dan geldi)
      setSettings((prev) => ({
        ...prev,
        logo_url: initialSettings.logo_url,
      }));
    }
  }, [initialSettings, dirty]);

  // Her alanı değiştiren helper
  function patch<K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  // Logo yükle
  async function handleLogoUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo en fazla 5MB olabilir');
      return;
    }
    if (!file.type.match(/^image\/(png|jpeg|webp|svg\+xml)$/)) {
      alert('Sadece PNG, JPG, WebP ve SVG desteklenir');
      return;
    }

    // File → dataURL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setSaving(true);
      const result = await uploadBusinessLogo(dataUrl, file.type);
      setSaving(false);

      if (!result.success) {
        alert(result.error || 'Logo yüklenemedi');
        return;
      }

      // State'i güncelle
      setSettings((prev) => ({ ...prev, logo_url: result.logoUrl || null }));

      // Belirgin toast göster
      setLogoToast({ show: true, type: 'uploaded' });
      setTimeout(() => setLogoToast({ show: false, type: 'uploaded' }), 3000);

      // Sidebar ve diğer yerler güncellensin
      startTransition(() => router.refresh());
    };
    reader.readAsDataURL(file);
  }

  async function handleLogoRemove() {
    if (!confirm('Logoyu kaldırmak istediğinden emin misin?')) return;
    setSaving(true);
    const result = await removeBusinessLogo();
    setSaving(false);

    if (!result.success) {
      alert(result.error || 'Logo kaldırılamadı');
      return;
    }

    setSettings((prev) => ({ ...prev, logo_url: null }));
    setLogoToast({ show: true, type: 'removed' });
    setTimeout(() => setLogoToast({ show: false, type: 'removed' }), 3000);

    // Sidebar güncellensin
    startTransition(() => router.refresh());
  }

  // Kaydet (tüm alanları)
  async function handleSave() {
    setSaving(true);
    const result = await updateBusinessSettings({
      name: settings.name,
      tagline_tr: settings.tagline_tr,
      tagline_en: settings.tagline_en,
      city: settings.city,
      address: settings.address,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      instagram: settings.instagram,
      facebook: settings.facebook,
      website: settings.website,
      working_hours: settings.working_hours,
      order_config: settings.order_config,
      currency: settings.currency,
    });
    setSaving(false);

    if (!result.success) {
      alert(result.error || 'Kaydedilemedi');
      return;
    }

    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
    startTransition(() => router.refresh());
  }

  // Tamamlanma göstergesi
  const completion = {
    logo: !!settings.logo_url,
    basics: !!settings.name && !!settings.tagline_tr && !!settings.city,
    contact: !!settings.address && !!settings.phone,
    hours: true, // Her zaman varsayılan saatler var
  };
  const completedCount = Object.values(completion).filter(Boolean).length;
  const totalCount = Object.keys(completion).length;

  const previewUrl = `https://${settings.slug}.${rootDomain}`;

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1200px] mx-auto pb-28">
      {/* ============ HERO ============ */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div
            className="text-accent uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            İŞLETME
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 42,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--ink)',
            }}
          >
            Ayarlar
          </h1>
          <p className="text-ink-2 text-sm mt-2 max-w-[500px]">
            İşletme bilgilerin, çalışma saatlerin ve sipariş ayarların. Menüde ve QR kartlarda otomatik görünür.
          </p>
        </div>

        {/* Demo link */}
        <div className="flex flex-col items-end gap-1.5">
          <div
            className="text-ink-3 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            MÜŞTERİ LİNKİ
          </div>
          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-4 rounded-full font-semibold text-[13px] flex items-center gap-1.5 transition-colors hover:bg-paper-3"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
              title="Müşteri menüsünü yeni sekmede aç"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {settings.slug}.{rootDomain}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(previewUrl);
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 1500);
              }}
              className="h-9 w-9 rounded-full grid place-items-center transition-colors hover:bg-paper-3"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
              title="Linki kopyala"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ============ COMPLETION BAR ============ */}
      <div
        className="flex items-center gap-3 px-4 py-3 mb-6 rounded-[14px]"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="flex gap-1.5 items-center flex-1 flex-wrap">
          <CompletionItem done={completion.logo} label="Logo" />
          <CompletionItem done={completion.basics} label="Temel bilgiler" />
          <CompletionItem done={completion.contact} label="İletişim" />
          <CompletionItem done={completion.hours} label="Çalışma saatleri" />
        </div>
        <div
          className="text-[11px] flex-shrink-0"
          style={{
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
            color: completedCount === totalCount ? 'var(--ok)' : 'var(--ink-3)',
            fontWeight: 700,
          }}
        >
          {completedCount}/{totalCount} TAMAM
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div
        className="relative flex gap-1 p-1 mb-6 overflow-x-auto"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {TABS.map((tb) => {
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--ink)';
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--card) 60%, transparent)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--ink-3)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              className="relative h-9 px-4 rounded-[8px] text-[13px] font-medium flex-shrink-0 whitespace-nowrap"
              style={{
                background: active ? 'var(--card)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: active ? '0 1px 3px rgba(42,31,24,0.08), 0 0 0 1px rgba(42,31,24,0.04)' : 'none',
                transition: 'background 0.18s ease, color 0.18s ease, box-shadow 0.25s ease, transform 0.25s ease',
                transform: active ? 'translateY(0)' : 'translateY(0)',
              }}
            >
              {/* Mini accent nokta - aktif tab'ın üstünde */}
              {active && (
                <span
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: -5,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: 'dotFadeIn 0.3s ease',
                  }}
                />
              )}
              {tb.label}
            </button>
          );
        })}

        <style jsx>{`
          @keyframes dotFadeIn {
            from {
              opacity: 0;
              transform: translate(-50%, 4px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
        `}</style>
      </div>

      {/* ============ TAB CONTENT ============ */}
      <div>
        {tab === 'identity' && (
          <IdentityTab
            settings={settings}
            onChange={patch}
            onLogoUpload={handleLogoUpload}
            onLogoRemove={handleLogoRemove}
            saving={saving}
          />
        )}

        {tab === 'contact' && (
          <ContactTab settings={settings} onChange={patch} />
        )}

        {tab === 'hours' && (
          <HoursTab
            hours={settings.working_hours}
            onChange={(h: WorkingHours) => patch('working_hours', h)}
          />
        )}

        {tab === 'orders' && (
          <OrdersTab
            config={settings.order_config}
            currency={settings.currency}
            onChangeConfig={(c: OrderConfig) => patch('order_config', c)}
            onChangeCurrency={(c: string) => patch('currency', c)}
          />
        )}

        {tab === 'preview' && (
          <PreviewTab settings={settings} />
        )}
      </div>

      {/* ============ LOGO TOAST ============ */}
      {logoToast.show && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-3 px-5 py-3 rounded-full"
          style={{
            background: logoToast.type === 'uploaded' ? 'var(--ok)' : 'var(--ink)',
            color: 'white',
            boxShadow: '0 10px 30px -10px rgba(42,31,24,0.5)',
            animation: 'logoToastSlide 0.3s ease',
          }}
        >
          {logoToast.type === 'uploaded' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Logo kaydedildi</div>
                <div className="text-[11px] opacity-90">Sidebar ve önizlemeler güncellendi</div>
              </div>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Logo kaldırıldı</div>
                <div className="text-[11px] opacity-80">Varsayılan monograma döndün</div>
              </div>
            </>
          )}

          <style jsx>{`
            @keyframes logoToastSlide {
              from {
                opacity: 0;
                transform: translate(-50%, 20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translate(-50%, 0) scale(1);
              }
            }
          `}</style>
        </div>
      )}

      {/* ============ SABİT KAYDET BAR ============ */}
      {(dirty || savedFlash) && !logoToast.show && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full"
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            boxShadow: '0 10px 30px -10px rgba(42,31,24,0.5)',
            animation: 'saveBarSlide 0.3s ease',
          }}
        >
          {savedFlash && !dirty ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium">Kaydedildi</span>
            </>
          ) : (
            <>
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
              <span className="text-sm">Kaydedilmemiş değişiklikler var</span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-2 h-8 px-4 rounded-full font-semibold text-[13px] transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#FAF5EA' }}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </>
          )}

          <style jsx>{`
            @keyframes saveBarSlide {
              from {
                opacity: 0;
                transform: translate(-50%, 20px);
              }
              to {
                opacity: 1;
                transform: translate(-50%, 0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Completion Item (Dairecikler)
// ============================================================

function CompletionItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          background: done ? 'var(--ok)' : 'transparent',
          border: done ? 'none' : '1.5px solid var(--line-2)',
        }}
      >
        {done && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span
        className="text-[11px] font-medium"
        style={{
          color: done ? 'var(--ink)' : 'var(--ink-3)',
          textDecoration: done ? 'none' : 'none',
        }}
      >
        {label}
      </span>
    </div>
  );
}
