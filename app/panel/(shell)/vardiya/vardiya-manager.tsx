'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { listStaff, type Staff } from '@/lib/actions/staff';
import {
  getWeeklyShifts,
  type ShiftTemplate,
} from '@/lib/actions/shifts';
import type {
  ShiftCellValue,
  ShiftTemplateKey,
} from '@/lib/staff-constants';
import { StaffList } from './staff-list';
import { ShiftsGrid } from './shifts-grid';

type TabId = 'staff' | 'shifts';

type Props = {
  initialStaff: Staff[];
  initialTemplates: Record<ShiftTemplateKey, ShiftTemplate> | null;
  error: string | null;
};

// Bu haftanın pazartesi'sini bul (UTC)
function getMondayOfThisWeek(): { weekStart: string; weekDates: string[] } {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setUTCDate(now.getUTCDate() + diff);
  const weekStart = now.toISOString().slice(0, 10);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  return { weekStart, weekDates };
}

const DEFAULT_TEMPLATES: Record<ShiftTemplateKey, ShiftTemplate> = {
  morning: { template_key: 'morning', starts_at: '08:00', ends_at: '14:00' },
  mid: { template_key: 'mid', starts_at: '12:00', ends_at: '18:00' },
  evening: { template_key: 'evening', starts_at: '16:00', ends_at: '23:00' },
};

export function VardiyaManager({
  initialStaff,
  initialTemplates,
  error: initialError,
}: Props) {
  const [tab, setTab] = useState<TabId>('staff');
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [createOpen, setCreateOpen] = useState(false);

  // Vardiya tab'ı için (lazy yüklenecek)
  const [shiftsLoaded, setShiftsLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState<string>('');
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [shifts, setShifts] = useState<
    Record<string, Record<string, ShiftCellValue>>
  >({});
  const [shiftsLoading, setShiftsLoading] = useState(false);

  // Şablonlar (yoksa varsayılan)
  const templates = initialTemplates || DEFAULT_TEMPLATES;

  // Tab'a girince vardiya verisini yükle (sadece ilk seferde)
  useEffect(() => {
    if (tab === 'shifts' && !shiftsLoaded) {
      const { weekStart, weekDates } = getMondayOfThisWeek();
      setWeekStart(weekStart);
      setWeekDates(weekDates);
      setShiftsLoading(true);
      getWeeklyShifts(weekStart).then((r) => {
        setShiftsLoading(false);
        if (r.success && r.shifts) {
          setShifts(r.shifts);
          setShiftsLoaded(true);
        } else {
          toast.error(r.error || 'Vardiya verileri yüklenemedi');
        }
      });
    }
  }, [tab, shiftsLoaded]);

  // Personel değişince bildir
  const reloadStaff = async () => {
    const r = await listStaff(true);
    if (r.success && r.staff) setStaff(r.staff);
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div
            className="uppercase mb-2 flex items-center gap-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            <span
              style={{
                width: 24,
                height: 1,
                background: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            EKİP · VARDİYA
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 'clamp(32px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              color: 'var(--ink)',
            }}
          >
            Personel{' '}
            <span
              style={{
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              ve vardiya.
            </span>
          </h1>
          <p
            className="text-sm mt-2"
            style={{ color: 'var(--ink-2)', maxWidth: 540 }}
          >
            Çalışanlarını ekle, rollerini ata, saatlik ücretlerini gir. Haftalık
            vardiya planını tablodan yap.
          </p>
        </div>

        {tab === 'staff' && (
          <button
            onClick={() => setCreateOpen(true)}
            className="h-11 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              boxShadow:
                '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
            }}
          >
            <span>+</span>
            <span>Yeni Personel</span>
          </button>
        )}
      </div>

      {/* HATA */}
      {initialError && (
        <div
          className="mb-4 p-3 rounded-[10px] text-sm"
          style={{
            background:
              'color-mix(in srgb, var(--danger) 8%, var(--card))',
            border:
              '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
            color: 'var(--danger)',
          }}
        >
          {initialError}
        </div>
      )}

      {/* TAB SEÇİCİ */}
      <div
        className="flex gap-1 p-1 mb-6 rounded-[10px] inline-flex"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
        }}
      >
        {(
          [
            { id: 'staff' as const, label: 'Personeller', count: staff.filter((s) => s.active).length },
            { id: 'shifts' as const, label: 'Haftalık Vardiya', count: null },
          ] as Array<{ id: TabId; label: string; count: number | null }>
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="h-9 px-4 rounded-[8px] text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                background: active ? 'var(--card)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-2)',
                boxShadow: active
                  ? '0 1px 3px rgba(0,0,0,0.08)'
                  : 'none',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: 12,
              }}
            >
              <span>{t.label}</span>
              {t.count !== null && (
                <span
                  style={{
                    fontSize: 10,
                    color: active ? 'var(--accent)' : 'var(--ink-3)',
                    fontWeight: 700,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB İÇERİĞİ */}
      {tab === 'staff' && (
        <StaffList
          initialStaff={staff}
          createOpen={createOpen}
          setCreateOpen={setCreateOpen}
          onChange={reloadStaff}
        />
      )}

      {tab === 'shifts' && (
        <>
          {shiftsLoading ? (
            <div
              className="rounded-[var(--r)] p-12 text-center"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Vardiya yükleniyor...
            </div>
          ) : shiftsLoaded ? (
            <ShiftsGrid
              staff={staff}
              initialTemplates={templates}
              initialShifts={shifts}
              initialWeekStart={weekStart}
              initialWeekDates={weekDates}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
