'use client';

import type { BusinessSettings } from '@/lib/actions/settings';
import { Field, Input, Textarea, Card } from '../shared';

interface Props {
  settings: BusinessSettings;
  onChange: <K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) => void;
}

export function ContactTab({ settings, onChange }: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card
        title="Konum & İletişim"
        description="Müşterinin menüde ve harita linklerinde göreceği bilgiler."
      >
        <div className="flex flex-col gap-4">
          <Field label="Tam Adres" hint="harita linki için">
            <Textarea
              value={settings.address || ''}
              onChange={(v) => onChange('address', v || null)}
              placeholder="Kemankeş Karamustafa Paşa Mah. Kara Mustafa Paşa Sok. No:14, Karaköy/İstanbul"
              rows={2}
              maxLength={250}
            />
          </Field>

          <Field label="Telefon">
            <Input
              value={settings.phone || ''}
              onChange={(v) => onChange('phone', v || null)}
              placeholder="0212 555 00 00"
              type="tel"
              maxLength={30}
            />
          </Field>

          <Field label="WhatsApp" hint="uluslararası format">
            <Input
              value={settings.whatsapp || ''}
              onChange={(v) => onChange('whatsapp', v || null)}
              placeholder="+90 546 231 14 34"
              type="tel"
              maxLength={30}
            />
          </Field>

          <Field label="E-posta">
            <Input
              value={settings.email || ''}
              onChange={(v) => onChange('email', v || null)}
              placeholder="merhaba@alegstudio.com"
              type="email"
              maxLength={100}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Sosyal Medya & Web"
        description="Müşterilerin sizi sosyal medyada bulabilmesi için."
      >
        <div className="flex flex-col gap-4">
          <Field label="Instagram" hint="@ olmadan">
            <Input
              value={settings.instagram || ''}
              onChange={(v) => onChange('instagram', v.replace(/^@/, '') || null)}
              placeholder="aleg.studio"
              prefix="@"
              maxLength={50}
            />
          </Field>

          <Field label="Facebook">
            <Input
              value={settings.facebook || ''}
              onChange={(v) => onChange('facebook', v || null)}
              placeholder="alegstudio"
              maxLength={80}
            />
          </Field>

          <Field label="Web Sitesi">
            <Input
              value={settings.website || ''}
              onChange={(v) => onChange('website', v || null)}
              placeholder="alegstudio.com"
              type="url"
              maxLength={120}
            />
          </Field>

          {/* Preview - küçük social chips */}
          {(settings.instagram || settings.facebook || settings.website) && (
            <div className="mt-2 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
              <div
                className="uppercase mb-2.5 text-ink-3"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                MENÜDE ŞÖYLE GÖZÜKECEK
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.instagram && (
                  <SocialChip
                    label={`@${settings.instagram}`}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  />
                )}
                {settings.facebook && (
                  <SocialChip
                    label={settings.facebook}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    }
                  />
                )}
                {settings.website && (
                  <SocialChip
                    label={settings.website.replace(/^https?:\/\//, '')}
                    icon={
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function SocialChip({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
        color: 'var(--ink-2)',
      }}
    >
      {icon}
      {label}
    </div>
  );
}
