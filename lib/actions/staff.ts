'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { ROLE_COLORS, type StaffRole } from '@/lib/staff-constants';

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

export type { StaffRole };

export type Staff = {
  id: string;
  business_id: string;
  member_id: string | null;
  name: string;
  role: StaffRole | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  hourly_rate: number | null;
  hire_date: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
};

// ============================================================
// LİSTE — Aktif personel listesi
// ============================================================
export async function listStaff(includeInactive = false): Promise<{
  success: boolean;
  staff?: Staff[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    let query = admin
      .from('staff')
      .select(
        'id, business_id, member_id, name, role, email, phone, photo_url, hourly_rate, hire_date, color, active, created_at'
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    return { success: true, staff: (data || []) as Staff[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// EKLE — Yeni personel
// ============================================================
export async function createStaff(input: {
  name: string;
  role: StaffRole;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  hourly_rate?: number | null;
  hire_date?: string | null;
  color?: string | null;
}): Promise<{ success: boolean; staffId?: string; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();

    // Validasyon
    const name = input.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'Geçerli bir ad girin (en az 2 karakter)' };
    }
    if (name.length > 80) {
      return { success: false, error: 'Ad çok uzun (max 80 karakter)' };
    }
    if (!['manager', 'barista', 'server', 'kitchen'].includes(input.role)) {
      return { success: false, error: 'Geçersiz rol' };
    }
    if (input.hourly_rate !== undefined && input.hourly_rate !== null) {
      if (input.hourly_rate < 0 || input.hourly_rate > 10000) {
        return { success: false, error: 'Saatlik ücret 0-10.000 ₺ arası olmalı' };
      }
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('staff')
      .insert({
        business_id: businessId,
        name,
        role: input.role,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        photo_url: input.photo_url || null,
        hourly_rate: input.hourly_rate ?? null,
        hire_date: input.hire_date || null,
        color: input.color || ROLE_COLORS[input.role],
        active: true,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Personel eklenemedi' };
    }

    revalidatePath('/panel/vardiya');
    return { success: true, staffId: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// GÜNCELLE
// ============================================================
export async function updateStaff(input: {
  staffId: string;
  name?: string;
  role?: StaffRole;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  hourly_rate?: number | null;
  hire_date?: string | null;
  color?: string | null;
  active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Doğrula: kayıt bu işletmeye ait
    const { data: existing } = await admin
      .from('staff')
      .select('id, business_id')
      .eq('id', input.staffId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Personel bulunamadı' };
    }

    // Sadece gönderilen alanları güncelle
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length < 2 || trimmed.length > 80) {
        return { success: false, error: 'Geçerli bir ad girin' };
      }
      updates.name = trimmed;
    }
    if (input.role !== undefined) {
      if (!['manager', 'barista', 'server', 'kitchen'].includes(input.role)) {
        return { success: false, error: 'Geçersiz rol' };
      }
      updates.role = input.role;
    }
    if (input.email !== undefined) updates.email = input.email?.trim() || null;
    if (input.phone !== undefined) updates.phone = input.phone?.trim() || null;
    if (input.photo_url !== undefined) updates.photo_url = input.photo_url || null;
    if (input.hourly_rate !== undefined) {
      if (
        input.hourly_rate !== null &&
        (input.hourly_rate < 0 || input.hourly_rate > 10000)
      ) {
        return { success: false, error: 'Saatlik ücret 0-10.000 ₺ arası olmalı' };
      }
      updates.hourly_rate = input.hourly_rate;
    }
    if (input.hire_date !== undefined) updates.hire_date = input.hire_date || null;
    if (input.color !== undefined) updates.color = input.color || null;
    if (input.active !== undefined) updates.active = input.active;

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    const { error } = await admin
      .from('staff')
      .update(updates)
      .eq('id', input.staffId);

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
// SİL — Soft delete (active = false)
// ============================================================
// Personel kayıt kalsın diye soft delete yapıyoruz.
// shifts kayıtları korunur, geçmiş raporlamada hâlâ görünür.
export async function deactivateStaff(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('staff')
      .select('id, business_id')
      .eq('id', staffId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Personel bulunamadı' };
    }

    const { error } = await admin
      .from('staff')
      .update({ active: false })
      .eq('id', staffId);

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
// HARD DELETE — Sadece hiç vardiyası olmayan personel için
// ============================================================
// Yeni eklenip yanlışlıkla yapılmış kayıt için hızlı silme.
// shift kaydı varsa reddeder, kullanıcıyı deactivate'e yönlendirir.
export async function deleteStaff(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('staff')
      .select('id, business_id')
      .eq('id', staffId)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Personel bulunamadı' };
    }

    // Vardiya kaydı var mı kontrol et
    const { count } = await admin
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staffId);

    if (count && count > 0) {
      return {
        success: false,
        error:
          'Bu personelin vardiya kayıtları var. Silmek yerine pasif yapın.',
      };
    }

    const { error } = await admin.from('staff').delete().eq('id', staffId);

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
