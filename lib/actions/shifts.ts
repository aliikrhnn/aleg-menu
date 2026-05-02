'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { ShiftTemplateKey, ShiftCellValue } from '@/lib/staff-constants';

// ============================================================
// İzin kontrolü
// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('id, business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { user, businessId: membership.business_id, memberId: membership.id };
}

// ============================================================
// TYPES (re-export — eski importlar bozulmasın)
// ============================================================

export type { ShiftTemplateKey, ShiftCellValue };

export type ShiftTemplate = {
  template_key: ShiftTemplateKey;
  starts_at: string; // 'HH:MM' format
  ends_at: string;
};

export type ShiftRecord = {
  id: string;
  staff_id: string;
  shift_date: string; // 'YYYY-MM-DD'
  template: ShiftCellValue;
  starts_at: string; // ISO
  ends_at: string; // ISO
};

// ============================================================
// VARSAYILAN TEMPLATE'LER
// ============================================================
// İşletme yeni açıldığında veya template kaydı yoksa kullanılır
const DEFAULT_TEMPLATES: Record<ShiftTemplateKey, { starts_at: string; ends_at: string }> = {
  morning: { starts_at: '08:00', ends_at: '14:00' },
  mid: { starts_at: '12:00', ends_at: '18:00' },
  evening: { starts_at: '16:00', ends_at: '23:00' },
};

// ============================================================
// TEMPLATE — Vardiya saati ayarları
// ============================================================
export async function getShiftTemplates(): Promise<{
  success: boolean;
  templates?: Record<ShiftTemplateKey, ShiftTemplate>;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('shift_templates')
      .select('template_key, starts_at, ends_at')
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };

    // Map'e çevir, eksikleri varsayılanla doldur
    const result: Record<ShiftTemplateKey, ShiftTemplate> = {
      morning: {
        template_key: 'morning',
        starts_at: DEFAULT_TEMPLATES.morning.starts_at,
        ends_at: DEFAULT_TEMPLATES.morning.ends_at,
      },
      mid: {
        template_key: 'mid',
        starts_at: DEFAULT_TEMPLATES.mid.starts_at,
        ends_at: DEFAULT_TEMPLATES.mid.ends_at,
      },
      evening: {
        template_key: 'evening',
        starts_at: DEFAULT_TEMPLATES.evening.starts_at,
        ends_at: DEFAULT_TEMPLATES.evening.ends_at,
      },
    };

    (data || []).forEach((row) => {
      const k = row.template_key as ShiftTemplateKey;
      if (k in result) {
        result[k] = {
          template_key: k,
          // PostgreSQL 'time' tipi 'HH:MM:SS' döner, 'HH:MM'a kısalt
          starts_at: String(row.starts_at).slice(0, 5),
          ends_at: String(row.ends_at).slice(0, 5),
        };
      }
    });

    return { success: true, templates: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function updateShiftTemplate(input: {
  template_key: ShiftTemplateKey;
  starts_at: string;
  ends_at: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();

    // Validasyon: HH:MM formatı
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRe.test(input.starts_at) || !timeRe.test(input.ends_at)) {
      return { success: false, error: 'Geçersiz saat formatı (HH:MM bekleniyor)' };
    }
    if (!['morning', 'mid', 'evening'].includes(input.template_key)) {
      return { success: false, error: 'Geçersiz template' };
    }

    const admin = createAdminClient();

    // upsert: var ise güncelle, yoksa ekle
    const { error } = await admin.from('shift_templates').upsert(
      {
        business_id: businessId,
        template_key: input.template_key,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
      },
      { onConflict: 'business_id,template_key' }
    );

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/vardiya');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// HAFTALIK GETİR
// ============================================================
// weekStart: 'YYYY-MM-DD' formatında haftanın başı (Pazartesi)
// 7 günlük matriks döner: { 'staff_id': { '2026-04-20': 'morning', ... } }
export async function getWeeklyShifts(
  weekStart: string
): Promise<{
  success: boolean;
  shifts?: Record<string, Record<string, ShiftCellValue>>;
  weekDates?: string[]; // ['2026-04-20', '2026-04-21', ..., '2026-04-26']
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();

    // Validasyon
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(weekStart)) {
      return { success: false, error: 'Geçersiz tarih formatı' };
    }

    // Haftanın 7 gününü hesapla
    const start = new Date(weekStart + 'T00:00:00Z');
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }
    const weekEnd = weekDates[6];

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('shifts')
      .select('staff_id, shift_date, template')
      .eq('business_id', businessId)
      .gte('shift_date', weekStart)
      .lte('shift_date', weekEnd);

    if (error) return { success: false, error: error.message };

    // Matriks yapısına dönüştür
    const matrix: Record<string, Record<string, ShiftCellValue>> = {};
    (data || []).forEach((row) => {
      if (!matrix[row.staff_id]) matrix[row.staff_id] = {};
      // template 'off' / 'morning' / 'mid' / 'evening' dışında bir şeyse 'off' say
      const tpl = (row.template as ShiftCellValue) || 'off';
      matrix[row.staff_id][row.shift_date] = tpl;
    });

    return { success: true, shifts: matrix, weekDates };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// TEK HÜCRE KAYDET
// ============================================================
// Hücreye tıklandığında çağrılır: off -> morning -> mid -> evening döngü
export async function setShift(input: {
  staff_id: string;
  shift_date: string;
  template: ShiftCellValue;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();

    // Validasyon
    if (!['off', 'morning', 'mid', 'evening'].includes(input.template)) {
      return { success: false, error: 'Geçersiz vardiya tipi' };
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(input.shift_date)) {
      return { success: false, error: 'Geçersiz tarih' };
    }

    const admin = createAdminClient();

    // Personel bu işletmeye ait mi?
    const { data: staffRow } = await admin
      .from('staff')
      .select('id, business_id')
      .eq('id', input.staff_id)
      .maybeSingle();

    if (!staffRow || staffRow.business_id !== businessId) {
      return { success: false, error: 'Personel bulunamadı' };
    }

    // 'off' ise mevcut kaydı sil (boş bırakmak)
    if (input.template === 'off') {
      const { error } = await admin
        .from('shifts')
        .delete()
        .eq('staff_id', input.staff_id)
        .eq('shift_date', input.shift_date);

      if (error) return { success: false, error: error.message };

      revalidatePath('/panel/vardiya');
      return { success: true };
    }

    // Diğer durumlarda template'ten saatleri al
    const { data: tplRow } = await admin
      .from('shift_templates')
      .select('starts_at, ends_at')
      .eq('business_id', businessId)
      .eq('template_key', input.template)
      .maybeSingle();

    const tplStart =
      (tplRow?.starts_at as string) || DEFAULT_TEMPLATES[input.template].starts_at;
    const tplEnd =
      (tplRow?.ends_at as string) || DEFAULT_TEMPLATES[input.template].ends_at;

    // shift_date'in başlangıç/bitiş timestamp'leri (UTC)
    // İşletme local timezone'unu sonradan ekleyebiliriz, şimdilik UTC kabul
    const startsAt = new Date(`${input.shift_date}T${tplStart.slice(0, 5)}:00Z`);
    let endsAt = new Date(`${input.shift_date}T${tplEnd.slice(0, 5)}:00Z`);

    // Eğer end < start ise (gece vardiyası), end ertesi güne taşı
    if (endsAt <= startsAt) {
      endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
    }

    // upsert (staff_id + shift_date unique)
    const { error } = await admin.from('shifts').upsert(
      {
        business_id: businessId,
        staff_id: input.staff_id,
        shift_date: input.shift_date,
        template: input.template,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      },
      { onConflict: 'staff_id,shift_date' }
    );

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/vardiya');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// TÜM HAFTAYI TEMİZLE — opsiyonel hızlı reset
// ============================================================
export async function clearWeeklyShifts(input: {
  weekStart: string;
}): Promise<{ success: boolean; deleted?: number; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(input.weekStart)) {
      return { success: false, error: 'Geçersiz tarih' };
    }

    const start = new Date(input.weekStart + 'T00:00:00Z');
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const weekEnd = end.toISOString().slice(0, 10);

    const admin = createAdminClient();

    const { error, count } = await admin
      .from('shifts')
      .delete({ count: 'exact' })
      .eq('business_id', businessId)
      .gte('shift_date', input.weekStart)
      .lte('shift_date', weekEnd);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/vardiya');
    return { success: true, deleted: count || 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
