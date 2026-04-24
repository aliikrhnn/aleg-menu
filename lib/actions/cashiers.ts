'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

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
    .select('id, business_id, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { user, businessId: membership.business_id, memberId: membership.id };
}

// ============================================================
// TYPES
// ============================================================

export type Cashier = {
  id: string;
  display_name: string;
  color: string;
  emoji: string;
  can_close_day: boolean;
  can_refund: boolean;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  // Stats
  total_payments?: number;
  total_amount?: number;
};

// ============================================================
// Kasiyer listesi (admin için - tam detay)
// ============================================================
export async function listCashiers(): Promise<{
  success: boolean;
  cashiers?: Cashier[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('cashier_accounts')
      .select('id, display_name, color, emoji, can_close_day, can_refund, is_active, created_at, last_used_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Stats: her kasiyerin bugünkü ödeme sayısı/tutarı
    const cashierIds = (data || []).map((c) => c.id);
    const statsMap = new Map<string, { count: number; amount: number }>();

    if (cashierIds.length > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: logs } = await admin
        .from('payment_logs')
        .select('cashier_id, amount, action')
        .eq('business_id', businessId)
        .in('cashier_id', cashierIds)
        .gte('performed_at', startOfDay.toISOString());

      (logs || []).forEach((log) => {
        if (log.action !== 'payment' || !log.cashier_id) return;
        const existing = statsMap.get(log.cashier_id) || { count: 0, amount: 0 };
        statsMap.set(log.cashier_id, {
          count: existing.count + 1,
          amount: existing.amount + Number(log.amount),
        });
      });
    }

    const cashiers: Cashier[] = (data || []).map((c) => ({
      ...c,
      total_payments: statsMap.get(c.id)?.count || 0,
      total_amount: statsMap.get(c.id)?.amount || 0,
    }));

    return { success: true, cashiers };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// Aktif kasiyerler (kasa giriş ekranı için - PIN hash DAHİL değil)
// ============================================================
export async function listActiveCashiers(): Promise<{
  success: boolean;
  cashiers?: Array<{
    id: string;
    display_name: string;
    color: string;
    emoji: string;
  }>;
  businessName?: string;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const [cashierResp, bizResp] = await Promise.all([
      admin
        .from('cashier_accounts')
        .select('id, display_name, color, emoji')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_name'),
      admin
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .maybeSingle(),
    ]);

    if (cashierResp.error) {
      return { success: false, error: cashierResp.error.message };
    }

    return {
      success: true,
      cashiers: cashierResp.data || [],
      businessName: bizResp.data?.name || 'Kafe',
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// Kasiyer oluştur
// ============================================================
export async function createCashier(input: {
  displayName: string;
  pin: string; // 4-6 hane sayı
  color?: string;
  emoji?: string;
  canCloseDay?: boolean;
  canRefund?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();

    // Validation
    const name = input.displayName.trim();
    if (name.length < 2) return { success: false, error: 'İsim en az 2 harf olmalı' };
    if (name.length > 40) return { success: false, error: 'İsim en fazla 40 harf' };
    if (!/^\d{4,6}$/.test(input.pin)) {
      return { success: false, error: 'PIN 4-6 haneli sayı olmalı' };
    }

    const admin = createAdminClient();

    // Duplicate kontrolü
    const { data: existing } = await admin
      .from('cashier_accounts')
      .select('id')
      .eq('business_id', businessId)
      .ilike('display_name', name)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Bu isimde aktif bir kasiyer zaten var' };
    }

    const pinHash = await bcrypt.hash(input.pin, 10);

    const { data, error } = await admin
      .from('cashier_accounts')
      .insert({
        business_id: businessId,
        display_name: name,
        pin_hash: pinHash,
        color: input.color || '#C4553A',
        emoji: input.emoji || '👤',
        can_close_day: input.canCloseDay ?? false,
        can_refund: input.canRefund ?? false,
        created_by: memberId,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/kasiyerler');
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// Kasiyer güncelle
// ============================================================
export async function updateCashier(
  id: string,
  input: {
    displayName?: string;
    color?: string;
    emoji?: string;
    canCloseDay?: boolean;
    canRefund?: boolean;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Güvenlik: bu kasiyer bizim business'ımızda mı?
    const { data: existing } = await admin
      .from('cashier_accounts')
      .select('id, business_id, display_name')
      .eq('id', id)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Kasiyer bulunamadı' };
    }

    const updates: Record<string, unknown> = {};
    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (name.length < 2) return { success: false, error: 'İsim en az 2 harf' };
      updates.display_name = name;
    }
    if (input.color !== undefined) updates.color = input.color;
    if (input.emoji !== undefined) updates.emoji = input.emoji;
    if (input.canCloseDay !== undefined) updates.can_close_day = input.canCloseDay;
    if (input.canRefund !== undefined) updates.can_refund = input.canRefund;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    const { error } = await admin
      .from('cashier_accounts')
      .update(updates)
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/kasiyerler');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// PIN değiştir
// ============================================================
export async function changePin(
  id: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!/^\d{4,6}$/.test(newPin)) {
      return { success: false, error: 'PIN 4-6 haneli sayı olmalı' };
    }

    const { data: existing } = await admin
      .from('cashier_accounts')
      .select('id, business_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Kasiyer bulunamadı' };
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    const { error } = await admin
      .from('cashier_accounts')
      .update({ pin_hash: pinHash })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/kasiyerler');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// Kasiyer sil (soft delete - is_active = false)
// ============================================================
export async function deleteCashier(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return updateCashier(id, { isActive: false });
}

// ============================================================
// PIN doğrula (kasa uygulamasından çağrılır)
// ============================================================
export async function verifyCashierPin(
  cashierId: string,
  pin: string
): Promise<{
  success: boolean;
  cashier?: {
    id: string;
    display_name: string;
    color: string;
    emoji: string;
    can_close_day: boolean;
    can_refund: boolean;
  };
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, error: 'Geçersiz PIN' };
    }

    const { data: cashier } = await admin
      .from('cashier_accounts')
      .select('id, business_id, display_name, color, emoji, pin_hash, can_close_day, can_refund, is_active')
      .eq('id', cashierId)
      .maybeSingle();

    if (
      !cashier ||
      cashier.business_id !== businessId ||
      !cashier.is_active
    ) {
      return { success: false, error: 'Kasiyer bulunamadı' };
    }

    const valid = await bcrypt.compare(pin, cashier.pin_hash);
    if (!valid) {
      return { success: false, error: 'Yanlış PIN' };
    }

    // last_used_at güncelle (arka planda, hata olsa sorun değil)
    admin
      .from('cashier_accounts')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', cashierId)
      .then(() => {
        /* ignore */
      });

    return {
      success: true,
      cashier: {
        id: cashier.id,
        display_name: cashier.display_name,
        color: cashier.color,
        emoji: cashier.emoji,
        can_close_day: cashier.can_close_day,
        can_refund: cashier.can_refund,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}
