'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { toast } from '@/components/ui/toast';
import {
  getWeeklyShifts,
  setShift,
  updateShiftTemplate,
  type ShiftTemplate,
} from '@/lib/actions/shifts';
import {
  type Staff,
  type StaffRole,
} from '@/lib/actions/staff';
import {
  getRoleColor,
  ROLE_LABELS,
  SHIFT_COLORS,
  SHIFT_LABELS,
  type ShiftCellValue,
  type ShiftTemplateKey,
} from '@/lib/staff-constants';

type Props = {
  staff: Staff[];
  initialTemplates: Record<ShiftTemplateKey, ShiftTemplate>;
  initialShifts: Record<string, Record<string, ShiftCellValue>>;
  initialWeekStart: string;
  initialWeekDates: string[];
};

const DAY_LABELS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PZR'];

// ============================================================
// HELPERS
// ============================================================
function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // pazartesi'ye kadar
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function formatDate(dateStr: string): { day: string; date: number } {
  const d = new Date(dateStr + 'T00:00:00Z');
  return {
    day: DAY_LABELS[(d.getUTCDay() + 6) % 7], // Mon=0
    date: d.getUTCDate(),
  };
}

// ============================================================
// MAIN
// ============================================================
export function ShiftsGrid({
  staff,
  initialTemplates,
  initialShifts,
  initialWeekStart,
  initialWeekDates,
}: Props) {
  const [templates, setTemplates] =
    useState<Record<ShiftTemplateKey, ShiftTemplate>>(initialTemplates);
  const [shifts, setShifts] = useState<
    Record<string, Record<string, ShiftCellValue>>
  >(initialShifts);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [weekDates, setWeekDates] = useState(initialWeekDates);
  const [, startTransition] = useTransition();

  // Aktif personel (bu sayfada vardiya planlanan)
  const activeStaff = useMemo(() => staff.filter((s) => s.active), [staff]);

  // Vardiya saatleri (her template için)
  const shiftHours = useMemo(
    () => ({
      morning: hoursBetween(templates.morning.starts_at, templates.morning.ends_at),
      mid: hoursBetween(templates.mid.starts_at, templates.mid.ends_at),
      evening: hoursBetween(
        templates.evening.starts_at,
        templates.evening.ends_at
      ),
      off: 0,
    }),
    [templates]
  );

  // Personel başına haftalık toplam
  const totalForStaff = (staffId: string): number => {
    let total = 0;
    weekDates.forEach((date) => {
      const cell = shifts[staffId]?.[date] || 'off';
      total += shiftHours[cell] || 0;
    });
    return Math.round(total * 10) / 10;
  };

  // Genel haftalık toplam
  const weeklyTotal = useMemo(() => {
    let total = 0;
    activeStaff.forEach((p) => {
      total += totalForStaff(p.id);
    });
    return Math.round(total * 10) / 10;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStaff, shifts, shiftHours, weekDates]);

  // Hücre tıklama: off -> morning -> mid -> evening -> off
  const cycleCell = (staffId: string, date: string) => {
    const order: ShiftCellValue[] = ['off', 'morning', 'mid', 'evening'];
    const cur = shifts[staffId]?.[date] || 'off';
    const next = order[(order.indexOf(cur) + 1) % order.length];

    // Optimistic update
    setShifts((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), [date]: next },
    }));

    // Backend kaydet
    startTransition(async () => {
      const r = await setShift({
        staff_id: staffId,
        shift_date: date,
        template: next,
      });
      if (!r.success) {
        // Rollback
        setShifts((prev) => ({
          ...prev,
          [staffId]: { ...(prev[staffId] || {}), [date]: cur },
        }));
        toast.error(r.error || 'Vardiya kaydedilemedi');
      }
    });
  };

  // Template güncelle (saat değişimi)
  const updateTemplate = (
    key: ShiftTemplateKey,
    field: 'starts_at' | 'ends_at',
    value: string
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  // Template kaydet (blur veya Enter)
  const saveTemplate = (key: ShiftTemplateKey) => {
    const tpl = templates[key];
    startTransition(async () => {
      const r = await updateShiftTemplate({
        template_key: key,
        starts_at: tpl.starts_at,
        ends_at: tpl.ends_at,
      });
      if (!r.success) {
        toast.error(r.error || 'Saat ayarı kaydedilemedi');
      }
    });
  };

  // Hafta değiştir
  const navigateWeek = async (direction: 'prev' | 'next' | 'today') => {
    let newStart: Date;
    if (direction === 'today') {
      newStart = getMondayOfWeek(new Date());
    } else {
      const cur = new Date(weekStart + 'T00:00:00Z');
      cur.setUTCDate(cur.getUTCDate() + (direction === 'next' ? 7 : -7));
      newStart = cur;
    }
    const newWeekStart = newStart.toISOString().slice(0, 10);

    const r = await getWeeklyShifts(newWeekStart);
    if (r.success && r.shifts && r.weekDates) {
      setWeekStart(newWeekStart);
      setWeekDates(r.weekDates);
      setShifts(r.shifts);
    } else {
      toast.error(r.error || 'Hafta yüklenemedi');
    }
  };

  // PDF / yazdırma — yeni pencerede temalı HTML aç, kullanıcı Ctrl+P / Cmd+P ile PDF kaydeder
  const exportPdf = () => {
    const startDate = formatDate(weekDates[0]);
    const endDate = formatDate(weekDates[6]);
    const monthYear = new Date(weekDates[0] + 'T00:00:00Z').toLocaleDateString(
      'tr-TR',
      { month: 'long', year: 'numeric' }
    );

    const timeOf = (k: ShiftCellValue) =>
      k === 'off' ? '—' : `${templates[k].starts_at}–${templates[k].ends_at}`;

    const rows = activeStaff
      .map((p) => {
        const initials = p.name
          .split(' ')
          .map((s) => s[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        const color = p.color || getRoleColor(p.role as StaffRole);
        const cells = weekDates
          .map((date) => {
            const v: ShiftCellValue = shifts[p.id]?.[date] || 'off';
            const bg = v === 'off' ? '#F2ECDD' : SHIFT_COLORS[v] + '22';
            const dotColor = v === 'off' ? '#8A7A6D' : SHIFT_COLORS[v];
            const txtColor = v === 'off' ? '#8A7A6D' : '#2A1F18';
            return `<td style="padding:8px 6px;border:1px solid #E5DCC7;background:${bg};vertical-align:top">
                      <div style="display:flex;align-items:center;gap:5px">
                        <span style="width:6px;height:6px;border-radius:50%;background:${dotColor};display:inline-block"></span>
                        <span style="font-size:11px;font-weight:600;color:${txtColor}">${SHIFT_LABELS[v]}</span>
                      </div>
                      <div style="font-size:9.5px;color:#8A7A6D;margin-top:2px;font-family:monospace">${timeOf(v)}</div>
                    </td>`;
          })
          .join('');
        return `<tr>
          <td style="padding:10px 12px;border:1px solid #E5DCC7;vertical-align:middle">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;border-radius:50%;background:${color};color:#FAF5EA;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:monospace;letter-spacing:0.04em">${initials}</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:#2A1F18">${p.name}</div>
                <div style="font-size:9.5px;color:#8A7A6D;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px">${ROLE_LABELS[p.role as StaffRole] || p.role || '—'}</div>
              </div>
            </div>
          </td>
          ${cells}
          <td style="padding:10px 12px;border:1px solid #E5DCC7;text-align:right;vertical-align:middle">
            <div style="font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:18px;color:#2A1F18">${totalForStaff(p.id)}<span style="font-size:11px;color:#8A7A6D">h</span></div>
          </td>
        </tr>`;
      })
      .join('');

    const headers = ['Çalışan', ...DAY_LABELS, 'Saat']
      .map(
        (h) =>
          `<th style="padding:10px 8px;border:1px solid #E5DCC7;background:#F2ECDD;font-size:10px;font-family:monospace;letter-spacing:0.12em;color:#8A7A6D;text-align:left;text-transform:uppercase;font-weight:700">${h}</th>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="tr"><head>
<meta charset="utf-8"/>
<title>Vardiya Planı · ${startDate.date}-${endDate.date} ${monthYear}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: 'Bricolage Grotesque', -apple-system, sans-serif; color:#2A1F18; background:#FAF5EA; margin:0; padding:24px; }
  h1 { font-family:'Instrument Serif', Georgia, serif; font-size:32px; font-weight:400; margin:0 0 4px; letter-spacing:-0.02em }
  h1 em { font-style:italic; color:#C4553A; font-weight:400 }
  .eyebrow { font-family:monospace; font-size:10px; letter-spacing:0.16em; color:#C4553A; text-transform:uppercase; font-weight:700; margin-bottom:8px }
  .sub { font-size:12px; color:#8A7A6D; font-family:monospace; margin-bottom:24px }
  table { width:100%; border-collapse:collapse; margin-bottom:24px }
  .footer { display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid #E5DCC7; font-size:11px; color:#8A7A6D; font-family:monospace }
  .total { font-family:'Instrument Serif',serif; font-style:italic; font-size:24px; color:#2A1F18 }
  .legend { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px; font-size:11px; color:#564439 }
  .legend span.dot { width:10px; height:10px; border-radius:2px; display:inline-block; margin-right:5px; vertical-align:middle }
  @media print { body { padding:0 } button { display:none } }
</style></head>
<body>
  <div class="eyebrow"><span style="display:inline-block;width:24px;height:1px;background:#C4553A;vertical-align:middle;margin-right:8px"></span>VARDİYA PLANI</div>
  <h1>Haftalık <em>vardiya.</em></h1>
  <div class="sub">${startDate.date}—${endDate.date} ${monthYear}</div>

  <div class="legend">
    <span><span class="dot" style="background:#B08A3E"></span>Sabah ${timeOf('morning')}</span>
    <span><span class="dot" style="background:#C4553A"></span>Öğle ${timeOf('mid')}</span>
    <span><span class="dot" style="background:#6B7A4B"></span>Akşam ${timeOf('evening')}</span>
    <span><span class="dot" style="background:#C5B79C;opacity:0.5"></span>İzinli</span>
  </div>

  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>Aleg · alegstudio.com</span>
    <span>HAFTALIK TOPLAM: <span class="total">${weeklyTotal}h</span> · ${activeStaff.length} kişi</span>
  </div>

  <button onclick="window.print()" style="position:fixed;bottom:20px;right:20px;background:#C4553A;color:#FAF5EA;padding:12px 20px;border:none;border-radius:10px;font-family:monospace;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15)">PDF olarak yazdır</button>
  <script>setTimeout(()=>window.print(),300)</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) {
      toast.error('Pop-up engellenmiş, izin ver');
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  // Boş durum
  if (activeStaff.length === 0) {
    return (
      <div
        className="rounded-[var(--r)] p-12 text-center"
        style={{
          background: 'var(--card)',
          border: '1px dashed var(--line)',
        }}
      >
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full grid place-items-center"
          style={{
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)',
            fontSize: 26,
          }}
        >
          ◷
        </div>
        <h3
          className="mb-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--ink)',
          }}
        >
          Önce personel ekle
        </h3>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          Vardiya planı yapabilmek için en az bir aktif personel gerekli.
        </p>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HAFTA NAVIGASYON */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center transition-all hover:opacity-90"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              fontSize: 14,
            }}
            title="Önceki hafta"
          >
            ‹
          </button>
          <button
            onClick={() => navigateWeek('today')}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all hover:opacity-90"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Bu Hafta
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center transition-all hover:opacity-90"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              fontSize: 14,
            }}
            title="Sonraki hafta"
          >
            ›
          </button>
          <div
            className="ml-2 text-sm"
            style={{
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {weekDates[0] && (
              <>
                {formatDate(weekDates[0]).date} — {formatDate(weekDates[6]).date}{' '}
                {new Date(weekDates[0] + 'T00:00:00Z').toLocaleDateString('tr-TR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="text-xs hidden md:block"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
            }}
          >
            Hücreye tıklayarak vardiya türünü seç
          </div>
          <button
            onClick={exportPdf}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              background: 'var(--ink)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
            title="PDF olarak yazdır"
          >
            <span>↓</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* TEMPLATE EDİTÖR — Sabah/Öğle/Akşam saatleri + Toplam */}
      <div
        className="rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.14em',
                color: 'var(--accent)',
                fontWeight: 700,
              }}
            >
              VARDİYA SAATLERİ
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                marginTop: 3,
                color: 'var(--ink)',
              }}
            >
              İşletme çalışma saatleri
            </div>
          </div>
          <div
            className="text-xs"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            Saat değişikliği vardiyalara anında yansır
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          {(['morning', 'mid', 'evening'] as ShiftTemplateKey[]).map((k) => (
            <div
              key={k}
              style={{
                padding: '16px 18px',
                borderRight: '1px solid var(--line)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: SHIFT_COLORS[k],
                  }}
                />
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {SHIFT_LABELS[k]}
                </div>
                <div
                  style={{
                    marginLeft: 'auto',
                    fontFamily: 'var(--f-serif)',
                    fontSize: 18,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                  }}
                >
                  {shiftHours[k]}
                  <span style={{ fontSize: 11, opacity: 0.5 }}>h</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TimeField
                  label="Başlangıç"
                  value={templates[k].starts_at}
                  onChange={(v) => updateTemplate(k, 'starts_at', v)}
                  onBlur={() => saveTemplate(k)}
                />
                <TimeField
                  label="Bitiş"
                  value={templates[k].ends_at}
                  onChange={(v) => updateTemplate(k, 'ends_at', v)}
                  onBlur={() => saveTemplate(k)}
                />
              </div>
            </div>
          ))}
          {/* Toplam haftalık saat */}
          <div
            style={{
              padding: '16px 18px',
              background: 'var(--ink)',
              color: '#FAF5EA',
            }}
          >
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                fontFamily: 'var(--f-mono)',
                opacity: 0.7,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              Haftalık Toplam
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 36,
                marginTop: 4,
              }}
            >
              {weeklyTotal}
              <span style={{ fontSize: 14, opacity: 0.5 }}>h</span>
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.5,
                marginTop: 4,
                fontFamily: 'var(--f-mono)',
              }}
            >
              {activeStaff.length} kişi
            </div>
          </div>
        </div>
      </div>

      {/* HAFTALIK MATRİKS */}
      <div
        className="rounded-[var(--r)] overflow-x-auto"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ minWidth: 900 }}>
          {/* Tablo başlığı */}
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: '220px repeat(7, 1fr) 80px',
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              gap: 8,
              fontSize: 10.5,
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <div>Çalışan</div>
            {weekDates.map((date) => {
              const f = formatDate(date);
              return (
                <div key={date} className="text-center">
                  <div>{f.day}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      marginTop: 2,
                      color: 'var(--ink-2)',
                    }}
                  >
                    {f.date}
                  </div>
                </div>
              );
            })}
            <div className="text-right">SAAT</div>
          </div>

          {/* Personel satırları */}
          {activeStaff.map((p, pi) => {
            const initials = p.name
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const color = p.color || getRoleColor(p.role as StaffRole);

            return (
              <div
                key={p.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: '220px repeat(7, 1fr) 80px',
                  padding: '12px 18px',
                  borderBottom:
                    pi < activeStaff.length - 1
                      ? '1px solid var(--line)'
                      : 'none',
                  gap: 8,
                }}
              >
                {/* İsim hücresi */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full grid place-items-center text-white"
                    style={{
                      background: color,
                      fontFamily: 'var(--f-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-semibold truncate"
                      style={{
                        fontSize: 13,
                        color: 'var(--ink)',
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </div>
                    <div
                      className="uppercase"
                      style={{
                        fontSize: 9.5,
                        fontFamily: 'var(--f-mono)',
                        letterSpacing: '0.08em',
                        color: 'var(--ink-3)',
                      }}
                    >
                      {ROLE_LABELS[p.role as StaffRole] || p.role || '—'}
                    </div>
                  </div>
                </div>

                {/* Gün hücreleri */}
                {weekDates.map((date) => {
                  const v: ShiftCellValue =
                    shifts[p.id]?.[date] || 'off';
                  const time =
                    v === 'off'
                      ? '—'
                      : `${templates[v].starts_at}–${templates[v].ends_at}`;
                  return (
                    <button
                      key={date}
                      onClick={() => cycleCell(p.id, date)}
                      className="text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        padding: '8px 7px',
                        borderRadius: 8,
                        background:
                          v === 'off'
                            ? 'transparent'
                            : `${SHIFT_COLORS[v]}1F`,
                        border: `1px solid ${
                          v === 'off'
                            ? 'var(--line)'
                            : `${SHIFT_COLORS[v]}55`
                        }`,
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              v === 'off'
                                ? 'var(--ink-3)'
                                : SHIFT_COLORS[v],
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              v === 'off' ? 'var(--ink-3)' : 'var(--ink)',
                          }}
                        >
                          {SHIFT_LABELS[v]}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          fontFamily: 'var(--f-mono)',
                          color: 'var(--ink-3)',
                          marginTop: 2,
                        }}
                      >
                        {time}
                      </div>
                    </button>
                  );
                })}

                {/* Toplam saat */}
                <div
                  className="text-right"
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--ink)',
                  }}
                >
                  {totalForStaff(p.id)}
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>h</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renk açıklaması */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        {(['morning', 'mid', 'evening', 'off'] as const).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: SHIFT_COLORS[k],
                opacity: k === 'off' ? 0.5 : 1,
              }}
            />
            <span style={{ color: 'var(--ink-2)' }}>{SHIFT_LABELS[k]}</span>
            {k !== 'off' && (
              <span
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                }}
              >
                ({shiftHours[k]}h)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function TimeField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="grid gap-1">
      <span
        className="uppercase"
        style={{
          fontSize: 9.5,
          fontFamily: 'var(--f-mono)',
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          padding: '7px 9px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: 'var(--paper-2)',
          fontSize: 13,
          fontFamily: 'var(--f-mono)',
          color: 'var(--ink)',
          width: '100%',
        }}
      />
    </label>
  );
}
