'use client';

import type { OrderConfig } from '@/lib/actions/settings';
import { Card, Toggle } from '../shared';

interface Props {
  config: OrderConfig;
  currency: string;
  onChangeConfig: (c: OrderConfig) => void;
  onChangeCurrency: (c: string) => void;
}

const CURRENCIES = [
  { code: 'TRY', symbol: '₺', label: 'Türk Lirası' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'Amerikan Doları' },
  { code: 'GBP', symbol: '£', label: 'İngiliz Sterlini' },
];

export function OrdersTab({
  config,
  currency,
  onChangeConfig,
  onChangeCurrency,
}: Props) {
  // Hiç mod aktif değilse uyarı
  const noModeActive =
    !config.modes.dinein && !config.modes.pickup && !config.modes.delivery;

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card
        title="Sipariş Yönetimi"
        description="Müşterinin hangi yöntemlerle sipariş verebileceğini kontrol et."
      >
        <div className="flex flex-col gap-2">
          {/* Master switch */}
          <div
            className="p-4 rounded-[12px] mb-3"
            style={{
              background: config.online_enabled
                ? 'color-mix(in srgb, var(--ok) 8%, transparent)'
                : 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: `1px solid ${
                config.online_enabled
                  ? 'color-mix(in srgb, var(--ok) 25%, transparent)'
                  : 'color-mix(in srgb, var(--accent) 25%, transparent)'
              }`,
            }}
          >
            <Toggle
              checked={config.online_enabled}
              onChange={(v) =>
                onChangeConfig({ ...config, online_enabled: v })
              }
              label="Online Sipariş"
              hint={
                config.online_enabled
                  ? 'Müşteriler menüden sipariş verebilir'
                  : 'Menü görüntülenir ama sipariş alınmaz (sadece görüntüleme modu)'
              }
            />
          </div>

          {/* Mod toggle'ları */}
          <div
            className="text-[11px] uppercase mb-1 text-ink-3"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.12em',
              fontWeight: 700,
            }}
          >
            AKTİF SİPARİŞ MODLARI
          </div>

          <div
            className="rounded-[12px] overflow-hidden"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              opacity: config.online_enabled ? 1 : 0.5,
              pointerEvents: config.online_enabled ? 'auto' : 'none',
            }}
          >
            <ModeRow
              icon="🍽️"
              label="Masada"
              hint="QR koddan, masaya siparişle"
              checked={config.modes.dinein}
              onChange={(v) =>
                onChangeConfig({
                  ...config,
                  modes: { ...config.modes, dinein: v },
                })
              }
            />
            <ModeRow
              icon="🥡"
              label="Gel-Al"
              hint="Müşteri dükkândan alır"
              checked={config.modes.pickup}
              onChange={(v) =>
                onChangeConfig({
                  ...config,
                  modes: { ...config.modes, pickup: v },
                })
              }
            />
            <ModeRow
              icon="🛵"
              label="Paket Servis"
              hint="Teslimat adresine götürülür"
              checked={config.modes.delivery}
              onChange={(v) =>
                onChangeConfig({
                  ...config,
                  modes: { ...config.modes, delivery: v },
                })
              }
              last
            />
          </div>

          {noModeActive && config.online_enabled && (
            <div
              className="mt-3 p-3 rounded-[10px] text-[12px]"
              style={{
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                color: 'var(--accent)',
              }}
            >
              ⚠ En az bir sipariş modu aktif olmalı
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Para Birimi & Dil"
        description="Menüde fiyatların ve metinlerin gösterileceği dil ve birim."
      >
        <div className="flex flex-col gap-5">
          {/* Para birimi */}
          <div>
            <div
              className="uppercase mb-2 text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              PARA BİRİMİ
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map((c) => {
                const active = currency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => onChangeCurrency(c.code)}
                    className="flex items-center gap-3 p-3 rounded-[10px] transition-all text-left"
                    style={{
                      background: active ? 'var(--card)' : 'var(--paper-2)',
                      border: active
                        ? '2px solid var(--accent)'
                        : '1px solid var(--line)',
                    }}
                  >
                    <span
                      className="w-9 h-9 rounded-[8px] grid place-items-center flex-shrink-0"
                      style={{
                        background: active ? 'var(--accent)' : 'var(--card)',
                        color: active ? '#FAF5EA' : 'var(--ink)',
                        fontFamily: 'var(--f-serif)',
                        fontStyle: 'italic',
                        fontSize: 18,
                        fontWeight: 600,
                      }}
                    >
                      {c.symbol}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-ink">
                        {c.code}
                      </div>
                      <div className="text-[10px] text-ink-3 truncate">
                        {c.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diller */}
          <div>
            <div
              className="uppercase mb-2 text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              DESTEKLENEN DİLLER
            </div>
            <div
              className="rounded-[12px] overflow-hidden"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <span className="text-lg flex-shrink-0">🇹🇷</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Türkçe</div>
                  <div className="text-[11px] text-ink-3">
                    Zorunlu, kaldırılamaz
                  </div>
                </div>
                <span
                  className="h-7 px-2.5 rounded-full text-[10px] font-semibold flex items-center"
                  style={{
                    background: 'color-mix(in srgb, var(--ok) 15%, transparent)',
                    color: 'var(--ok)',
                  }}
                >
                  ✓ Aktif
                </span>
              </div>
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-lg flex-shrink-0">🇬🇧</span>
                <div className="flex-1 min-w-0">
                  <Toggle
                    checked={config.langs.en}
                    onChange={(v) =>
                      onChangeConfig({
                        ...config,
                        langs: { ...config.langs, en: v },
                      })
                    }
                    label="English"
                    hint="Müşteri menüde dil değiştirebilir"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ModeRow({
  icon,
  label,
  hint,
  checked,
  onChange,
  last,
}: {
  icon: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        borderBottom: !last ? '1px solid var(--line)' : 'none',
      }}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <Toggle
          checked={checked}
          onChange={onChange}
          label={label}
          hint={hint}
        />
      </div>
    </div>
  );
}
