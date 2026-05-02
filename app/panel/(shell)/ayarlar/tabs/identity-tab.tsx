'use client';
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';
import type { BusinessSettings } from '@/lib/actions/settings';
import { Field, Input, Textarea, Card } from '../shared';
import { AiSloganModal } from '@/components/panel/ai-slogan-modal';
import { AiMonogramModal } from '@/components/panel/ai-monogram-modal';
import { toast } from '@/components/ui/toast';

interface Props {
  settings: BusinessSettings;
  onChange: <K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) => void;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  saving: boolean;
}

export function IdentityTab({
  settings,
  onChange,
  onLogoUpload,
  onLogoRemove,
  saving,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sloganModal, setSloganModal] = useState(false);
  const [monogramModal, setMonogramModal] = useState(false);

  // SVG string'i File'a çevir → upload
  async function handleMonogramSelect(svgString: string) {
    try {
      // SVG'yi File objesine çevir
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const file = new File([blob], 'ai-monogram.svg', { type: 'image/svg+xml' });
      onLogoUpload(file);
    } catch (err) {
      toast.error('Logo kaydedilemedi: ' + (err instanceof Error ? err.message : 'hata'));
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Sol: Logo ve temel bilgiler */}
      <Card
        title="İşletme Kimliği"
        description="Logo, isim ve kısa slogan. Menüde ve QR kartlarında görünür."
      >
        <div className="flex flex-col gap-5">
          {/* Logo uploader */}
          <Field label="Logo" hint="PNG · JPG · SVG · max 5MB">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) onLogoUpload(file);
              }}
              onClick={() => fileRef.current?.click()}
              className="rounded-[14px] cursor-pointer transition-all hover:border-ink-3"
              style={{
                background: 'var(--paper-2)',
                border: '1.5px dashed var(--line-2)',
                padding: 24,
                textAlign: 'center',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {settings.logo_url ? (
                <>
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="max-h-[100px] max-w-[80%] object-contain"
                  />
                  <div className="text-[11px] text-ink-3">
                    Değiştirmek için tıkla veya sürükle
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-14 h-14 rounded-[14px] grid place-items-center"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--ink-3)"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div className="text-sm font-semibold text-ink">Logo Yükle</div>
                  <div className="text-[11px] text-ink-3">
                    Tıkla veya dosyayı buraya bırak
                  </div>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onLogoUpload(file);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />
            </div>
          </Field>

          {/* Logo actions - upload sonrası */}
          {settings.logo_url && (
            <div className="flex gap-2 -mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="h-9 px-3.5 rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 transition-colors hover:bg-paper-3 disabled:opacity-50"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Değiştir
              </button>
              <button
                type="button"
                onClick={() => setMonogramModal(true)}
                disabled={saving || !settings.name}
                className="h-9 px-3.5 rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #E08060)',
                  color: '#FAF5EA',
                }}
              >
                <span>✨</span>
                AI ile Üret
              </button>
              <button
                type="button"
                onClick={onLogoRemove}
                disabled={saving}
                className="h-9 px-3.5 rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{
                  color: 'var(--accent)',
                  background: 'transparent',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Kaldır
              </button>
            </div>
          )}

          {/* Logo yoksa - AI ile üret alternatifi */}
          {!settings.logo_url && settings.name && (
            <button
              type="button"
              onClick={() => setMonogramModal(true)}
              disabled={saving}
              className="h-10 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 -mt-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #E08060)',
                color: '#FAF5EA',
              }}
            >
              <span>✨</span>
              Veya AI ile Monogram Logo Üret
            </button>
          )}

          <Field label="İşletme Adı" required>
            <Input
              value={settings.name}
              onChange={(v) => onChange('name', v)}
              placeholder="Karaköy Kahve"
              maxLength={100}
            />
          </Field>

          <Field label="Şehir">
            <Input
              value={settings.city || ''}
              onChange={(v) => onChange('city', v || null)}
              placeholder="İstanbul"
              maxLength={50}
            />
          </Field>

          {/* SLOGAN BÖLÜMÜ - AI destekli */}
          <div className="flex flex-col gap-3 -mt-1">
            <div className="flex items-center justify-between">
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
                SLOGAN
              </span>
              <button
                type="button"
                onClick={() => setSloganModal(true)}
                disabled={!settings.name}
                className="h-7 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #E08060)',
                  color: '#FAF5EA',
                }}
                title={!settings.name ? 'Önce işletme adını yaz' : 'Aleg slogan önerisin'}
              >
                <span>✨</span>
                AI ile Öner
              </button>
            </div>

            <Field label="Türkçe" hint="menü hero'sunda görünür">
              <Textarea
                value={settings.tagline_tr || ''}
                onChange={(v) => onChange('tagline_tr', v || null)}
                placeholder="Üçüncü nesil kahve, ilk izlenim."
                rows={2}
                maxLength={120}
              />
            </Field>

            <Field label="English (opsiyonel)">
              <Textarea
                value={settings.tagline_en || ''}
                onChange={(v) => onChange('tagline_en', v || null)}
                placeholder="Third-wave coffee, first impressions."
                rows={2}
                maxLength={120}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Sağ: Canlı Önizleme */}
      <Card title="Canlı Önizleme" description="Logo kullanımı farklı yüzeylerde">
        <div className="flex flex-col gap-3">
          {/* Light lockup - menu header */}
          <div
            className="p-5 rounded-[12px] flex items-center gap-3"
            style={{
              background: '#F4EEE2',
              border: '1px solid #D6C9B2',
            }}
          >
            <LogoMark
              logoUrl={settings.logo_url}
              name={settings.name || 'Aleg'}
              bg="#2A1F18"
              fg="#F4EEE2"
              size={48}
            />
            <div className="flex-1 min-w-0">
              <div
                className="truncate"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#2A1F18',
                }}
              >
                {settings.name || 'İşletme adı'}
              </div>
              {settings.tagline_tr && (
                <div
                  className="truncate text-[11px] mt-0.5"
                  style={{ color: '#5A4A3D', opacity: 0.7 }}
                >
                  {settings.tagline_tr}
                </div>
              )}
            </div>
            <span
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.14em',
                color: '#8C7A69',
              }}
            >
              MENÜ
            </span>
          </div>

          {/* Dark lockup */}
          <div
            className="p-5 rounded-[12px] flex items-center gap-3"
            style={{
              background: '#1A1410',
              border: '1px solid #4A3A2C',
            }}
          >
            <LogoMark
              logoUrl={settings.logo_url}
              name={settings.name || 'Aleg'}
              bg="#F2E9DA"
              fg="#1A1410"
              size={48}
              invertLogo
            />
            <div className="flex-1 min-w-0">
              <div
                className="truncate"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#F2E9DA',
                }}
              >
                {settings.name || 'İşletme adı'}
              </div>
              {settings.tagline_tr && (
                <div
                  className="truncate text-[11px] mt-0.5"
                  style={{ color: '#C8B89E' }}
                >
                  {settings.tagline_tr}
                </div>
              )}
            </div>
            <span
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.14em',
                color: '#8C7A63',
              }}
            >
              DARK
            </span>
          </div>

          {/* Favicon / küçük */}
          <div
            className="p-4 rounded-[12px] flex items-center gap-3"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            <LogoMark
              logoUrl={settings.logo_url}
              name={settings.name || 'A'}
              bg="var(--ink)"
              fg="var(--paper)"
              size={28}
              radius={8}
            />
            <LogoMark
              logoUrl={settings.logo_url}
              name={settings.name || 'A'}
              bg="var(--accent)"
              fg="#FAF5EA"
              size={32}
              radius={9}
            />
            <LogoMark
              logoUrl={settings.logo_url}
              name={settings.name || 'A'}
              bg="var(--paper)"
              fg="var(--ink)"
              size={36}
              radius={10}
            />
            <span
              className="ml-auto uppercase text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.14em',
              }}
            >
              İKON
            </span>
          </div>

          {/* Tip */}
          <div
            className="text-[11px] text-ink-3 px-3 py-2 rounded-[8px]"
            style={{ background: 'var(--paper-2)' }}
          >
            💡 Şeffaf arka planlı PNG veya SVG en iyisi. Karanlık ve açık temada doğru görünür.
          </div>
        </div>
      </Card>

      {/* ============ WIFI KARTI ============ */}
      <Card
        title="WiFi"
        description="Müşteri menüsünde tıklanabilir kart. Müşteri tek tıkla bağlanabilir."
      >
        <div className="space-y-4">
          <Field label="Ağ adı (SSID)" hint="Yönlendiricinin yayın adı">
            <Input
              value={settings.menu_theme.wifi.ssid || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  wifi: { ...settings.menu_theme.wifi, ssid: v || null },
                })
              }
              placeholder="Cafe-Misafir"
              maxLength={64}
            />
          </Field>

          <Field label="Şifre" hint="Boş bırakırsan müşteri menüsünde gösterilmez">
            <Input
              value={settings.menu_theme.wifi.password || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  wifi: { ...settings.menu_theme.wifi, password: v || null },
                })
              }
              placeholder="••••••••"
              maxLength={128}
              type="text"
            />
          </Field>

          <Field label="Güvenlik tipi">
            <div className="grid grid-cols-4 gap-2">
              {(['WPA', 'WPA3', 'WEP', 'nopass'] as const).map((sec) => {
                const selected = settings.menu_theme.wifi.security === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      onChange('menu_theme', {
                        ...settings.menu_theme,
                        wifi: { ...settings.menu_theme.wifi, security: sec },
                      })
                    }
                    className="h-10 rounded-[var(--r-sm)] text-xs font-semibold transition-all uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.06em',
                      background: selected
                        ? 'var(--ink)'
                        : 'var(--card)',
                      color: selected
                        ? 'var(--paper)'
                        : 'var(--ink-2)',
                      border: selected
                        ? '1px solid var(--ink)'
                        : '1px solid var(--line)',
                    }}
                  >
                    {sec === 'nopass' ? 'Açık' : sec}
                  </button>
                );
              })}
            </div>
          </Field>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.menu_theme.wifi.hidden}
              onChange={(e) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  wifi: {
                    ...settings.menu_theme.wifi,
                    hidden: e.target.checked,
                  },
                })
              }
              className="cursor-pointer"
            />
            <span className="text-sm text-ink-2">
              Gizli ağ (SSID yayını yok)
            </span>
          </label>

          {settings.menu_theme.wifi.ssid && (
            <div
              className="p-3 rounded-[var(--r-sm)] text-xs"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-3)',
              }}
            >
              💡 Müşteri menüsünde "WiFi" kartı görünür. Tıklayınca şifre +
              QR kod açılır. iPhone/Android kamerası QR'ı tarayınca otomatik
              bağlanır.
            </div>
          )}
        </div>
      </Card>

      {/* ============ SOSYAL MEDYA QR KARTI ============ */}
      <Card
        title="Sosyal Medya"
        description="Hesap bağlantıları. Müşteri menüsünde QR kodları otomatik oluşturulur."
      >
        <div className="space-y-4">
          {/* Mevcut alanlar — kısa hatırlatma */}
          <div
            className="p-3 rounded-[var(--r-sm)] text-xs"
            style={{ background: 'var(--paper-2)', color: 'var(--ink-3)' }}
          >
            Instagram, Facebook ve websitesi <strong>Yer & İletişim</strong>{' '}
            sekmesinden eklenir. Aşağıda ek platformlar.
          </div>

          <Field label="TikTok" hint="https://tiktok.com/@kullanici">
            <Input
              value={settings.menu_theme.social_links.tiktok || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  social_links: {
                    ...settings.menu_theme.social_links,
                    tiktok: v || null,
                  },
                })
              }
              placeholder="https://tiktok.com/@..."
            />
          </Field>

          <Field label="X (Twitter)" hint="https://x.com/kullanici">
            <Input
              value={settings.menu_theme.social_links.x || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  social_links: {
                    ...settings.menu_theme.social_links,
                    x: v || null,
                  },
                })
              }
              placeholder="https://x.com/..."
            />
          </Field>

          <Field label="YouTube" hint="https://youtube.com/@kanal">
            <Input
              value={settings.menu_theme.social_links.youtube || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  social_links: {
                    ...settings.menu_theme.social_links,
                    youtube: v || null,
                  },
                })
              }
              placeholder="https://youtube.com/@..."
            />
          </Field>

          <Field label="Threads" hint="https://threads.net/@kullanici">
            <Input
              value={settings.menu_theme.social_links.threads || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  social_links: {
                    ...settings.menu_theme.social_links,
                    threads: v || null,
                  },
                })
              }
              placeholder="https://threads.net/@..."
            />
          </Field>

          <Field label="LinkedIn" hint="https://linkedin.com/company/...">
            <Input
              value={settings.menu_theme.social_links.linkedin || ''}
              onChange={(v) =>
                onChange('menu_theme', {
                  ...settings.menu_theme,
                  social_links: {
                    ...settings.menu_theme.social_links,
                    linkedin: v || null,
                  },
                })
              }
              placeholder="https://linkedin.com/..."
            />
          </Field>
        </div>
      </Card>

      {/* AI Modals */}
      {sloganModal && (
        <AiSloganModal
          businessName={settings.name}
          city={settings.city}
          initialLang="tr"
          onSelect={(slogan, lang) => {
            if (lang === 'tr') {
              onChange('tagline_tr', slogan);
            } else {
              onChange('tagline_en', slogan);
            }
          }}
          onClose={() => setSloganModal(false)}
        />
      )}

      {monogramModal && (
        <AiMonogramModal
          businessName={settings.name}
          onSelect={handleMonogramSelect}
          onClose={() => setMonogramModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// LogoMark - küçük logo/monogram
// ============================================================

function LogoMark({
  logoUrl,
  name,
  bg,
  fg,
  size = 40,
  radius,
  invertLogo,
}: {
  logoUrl: string | null;
  name: string;
  bg: string;
  fg: string;
  size?: number;
  radius?: number;
  invertLogo?: boolean;
}) {
  const r = radius ?? size * 0.25;
  return (
    <div
      className="flex-shrink-0 grid place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: bg,
        color: fg,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{
            maxWidth: '70%',
            maxHeight: '70%',
            objectFit: 'contain',
            filter: invertLogo ? 'brightness(0) invert(1)' : 'none',
          }}
        />
      ) : (
        <span
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: size * 0.5,
            fontWeight: 600,
            letterSpacing: '-0.03em',
          }}
        >
          {name[0]?.toUpperCase() || 'A'}
        </span>
      )}
    </div>
  );
}
