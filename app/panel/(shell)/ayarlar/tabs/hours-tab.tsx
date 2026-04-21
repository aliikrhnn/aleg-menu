'use client';

import type { WorkingHours, DayHours } from '@/lib/actions/settings';
import { Card } from '../shared';

interface Props {
  hours: WorkingHours;
  onChange: (h: WorkingHours) => void;
}

const DAYS: Array<{ key: keyof WorkingHours; label: string; short: string }> = [
  { key: 'mon', label: 'Pazartesi', short: 'PZT' },
  { key: 'tue', label: 'Salı', short: 'SAL' },
  { key: 'wed', label: 'Çarşamba', short: 'ÇAR' },
  { key: 'thu', label: 'Perşembe', short: 'PER' },
  { key: 'fri', label: 'Cuma', short: 'CUM' },
  { key: 'sat', label: 'Cumartesi', short: 'CMT' },
  { key: 'sun', label: 'Pazar', short: 'PAZ' },
];

export function HoursTab({ hours, onChange }: Props) {
  function updateDay(key: keyof WorkingHours, patch: Partial<DayHours>) {
    onChange({
      ...hours,
      [key]: { ...hours[key], ...patch },
    });
  }

  // Pazartesi saatlerini diğer günlere kopyala (hafta içi)
  function copyWeekdays() {
    const mon = hours.mon;
    onChange({
      ...hours,
      tue: { ...mon },
      wed: { ...mon },
      thu: { ...mon },
      fri: { ...mon },
    });
  }

  // Her günü aynı yap
  function copyAll() {
    const mon = hours.mon;
    const next: WorkingHours = {
      mon: { ...mon },
      tue: { ...mon },
      wed: { ...mon },
      thu: { ...mon },
      fri: { ...mon },
      sat: { ...mon },
      sun: { ...mon },
    };
    onChange(next);
  }

  // Mevcut durum: bugün açık mı?
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday
  const todayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Array<
    keyof WorkingHours
  >)[today];
  const todayData = hours[todayKey];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <Card
        title="Çalışma Saatleri"
        description="Her gün için açılış-kapanış. Kapalı günler için 'kapalı' işaretle."
      >
        {/* Hızlı şablonlar */}
        <div className="flex gap-2 mb-5 pb-4 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          <div
            className="uppercase self-center text-ink-3 mr-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              fontWeight: 700,
            }}
          >
            HIZLI ŞABLON
          </div>
          <button
            type="button"
            onClick={copyWeekdays}
            className="h-8 px-3 rounded-full text-xs font-medium transition-colors hover:bg-paper-3"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Pazartesiyi hafta içine kopyala
          </button>
          <button
            type="button"
            onClick={copyAll}
            className="h-8 px-3 rounded-full text-xs font-medium transition-colors hover:bg-paper-3"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Pazartesiyi tümüne kopyala
          </button>
        </div>

        {/* Her gün için satır */}
        <div className="flex flex-col">
          {DAYS.map((day, i) => {
            const d = hours[day.key];
            const isToday = day.key === todayKey;

            return (
              <div
                key={day.key}
                className="flex items-center gap-3 py-3"
                style={{
                  borderBottom: i < DAYS.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                {/* Gün adı */}
                <div className="w-24 flex-shrink-0 flex items-center gap-2">
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: d.closed ? 'var(--ink-3)' : 'var(--ink)',
                    }}
                  >
                    {day.label}
                  </span>
                  {isToday && (
                    <span
                      className="uppercase text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                        color: 'var(--accent)',
                        fontFamily: 'var(--f-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                      }}
                    >
                      BUGÜN
                    </span>
                  )}
                </div>

                {/* Kapalı toggle */}
                <button
                  type="button"
                  onClick={() => updateDay(day.key, { closed: !d.closed })}
                  className="h-8 px-3 rounded-full text-xs font-medium transition-colors flex-shrink-0"
                  style={{
                    background: d.closed ? 'var(--paper-3)' : 'color-mix(in srgb, var(--ok) 15%, transparent)',
                    border: '1px solid',
                    borderColor: d.closed ? 'var(--line)' : 'color-mix(in srgb, var(--ok) 30%, transparent)',
                    color: d.closed ? 'var(--ink-3)' : 'var(--ok)',
                  }}
                >
                  {d.closed ? '✕ Kapalı' : '✓ Açık'}
                </button>

                {/* Saat girişleri */}
                {!d.closed && (
                  <div className="flex items-center gap-2 flex-1">
                    <TimeInput
                      value={d.open}
                      onChange={(v) => updateDay(day.key, { open: v })}
                    />
                    <span className="text-ink-3 text-xs">—</span>
                    <TimeInput
                      value={d.close}
                      onChange={(v) => updateDay(day.key, { close: v })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sağ: Şimdiki durum özeti */}
      <Card title="Şu Anda" description="Müşterinin göreceği durum">
        <div className="flex flex-col gap-4">
          <div
            className="p-5 rounded-[12px] text-center"
            style={{
              background: todayData.closed
                ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                : 'color-mix(in srgb, var(--ok) 8%, transparent)',
              border: `1px solid ${
                todayData.closed
                  ? 'color-mix(in srgb, var(--accent) 25%, transparent)'
                  : 'color-mix(in srgb, var(--ok) 25%, transparent)'
              }`,
            }}
          >
            <div
              className="inline-flex items-center gap-1.5 mb-2"
            >
              <span
                className={`w-2 h-2 rounded-full ${todayData.closed ? '' : 'animate-pulse'}`}
                style={{
                  background: todayData.closed ? 'var(--accent)' : 'var(--ok)',
                }}
              />
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                  color: todayData.closed ? 'var(--accent)' : 'var(--ok)',
                }}
              >
                {todayData.closed ? 'BUGÜN KAPALI' : 'BUGÜN AÇIK'}
              </span>
            </div>
            {!todayData.closed && (
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 500,
                  color: 'var(--ink)',
                }}
              >
                {todayData.open} — {todayData.close}
              </div>
            )}
          </div>

          {/* Hafta özeti */}
          <div className="flex flex-col">
            <div
              className="uppercase mb-2 text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              HAFTA ÖZETİ
            </div>
            {DAYS.map((day, i) => {
              const d = hours[day.key];
              const isToday = day.key === todayKey;
              return (
                <div
                  key={day.key}
                  className="flex items-center justify-between py-1.5"
                  style={{
                    borderBottom: i < DAYS.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <span
                    className="text-[12px]"
                    style={{
                      color: isToday ? 'var(--ink)' : 'var(--ink-2)',
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {day.label}
                  </span>
                  <span
                    className="text-[12px]"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      color: d.closed ? 'var(--ink-3)' : 'var(--ink)',
                    }}
                  >
                    {d.closed ? '— kapalı —' : `${d.open} — ${d.close}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-2.5 rounded-[8px] text-[13px] focus:outline-none focus:border-accent transition-colors"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
        fontFamily: 'var(--f-mono)',
        color: 'var(--ink)',
      }}
    />
  );
}
