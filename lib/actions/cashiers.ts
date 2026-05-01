'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import {
  checkPinRateLimit,
  recordPinAttempt,
  extractIpFromHeaders,
} from '@/lib/security/pin-rate-limit';
import { createCashierSession } from '@/lib/security/cashier-session';

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

export type CashierRole = 'cashier' | 'waiter' | 'both';

export type Cashier = {
  id: string;
  display_name: string;
  color: string;
  emoji: string;
  role: CashierRole;
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
      .select('id, display_name, color, emoji, role, can_close_day, can_refund, is_active, created_at, last_used_at')
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
//
// AUTH STRATEJİSİ:
//   1. Önce panel oturumu (mevcut akış, eski sayfalar için)
//   2. Yoksa subdomain'den slug → business_id (yeni subdomain rotaları için)
//
// Subdomain'den geliyorsa cashier listesi PUBLIC bilgi olarak döner
// (sadece display_name + emoji + color + role; PIN hash, IP vs. yok).
// Bu güvenli çünkü liste zaten PIN ekranında müşterinin önünde duruyor.
// ============================================================
export async function listActiveCashiers(filterRole?: 'cashier' | 'waiter'): Promise<{
  success: boolean;
  cashiers?: Array<{
    id: string;
    display_name: string;
    color: string;
    emoji: string;
    role: CashierRole;
  }>;
  businessName?: string;
  error?: string;
}> {
  try {
    let businessId: string | null = null;

    // 1. Panel oturumu var mı? (mevcut akış)
    try {
      const ctx = await requireBusinessAccess();
      businessId = ctx.businessId;
    } catch {
      // Panel oturumu yok — subdomain dene
    }

    // 2. Subdomain'den slug çöz (yeni akış)
    if (!businessId) {
      const { headers: getHeaders } = await import('next/headers');
      const { extractSlugFromHost, resolveSlugToBusiness } = await import(
        '@/lib/security/slug-resolver'
      );

      const host = getHeaders().get('host');
      const slug = extractSlugFromHost(host);

      if (slug) {
        const business = await resolveSlugToBusiness(slug);
        if (
          business &&
          business.subscriptionStatus !== 'suspended' &&
          business.subscriptionStatus !== 'cancelled'
        ) {
          businessId = business.id;
        }
      }
    }

    if (!businessId) {
      return { success: false, error: 'Giriş yapmamışsınız' };
    }

    const admin = createAdminClient();

    let cashierQuery = admin
      .from('cashier_accounts')
      .select('id, display_name, color, emoji, role')
      .eq('business_id', businessId)
      .eq('is_active', true);

    // Role filtresi: 'cashier' istenirse role IN (cashier, both); 'waiter' istenirse role IN (waiter, both)
    if (filterRole === 'cashier') {
      cashierQuery = cashierQuery.in('role', ['cashier', 'both']);
    } else if (filterRole === 'waiter') {
      cashierQuery = cashierQuery.in('role', ['waiter', 'both']);
    }

    const [cashierResp, bizResp] = await Promise.all([
      cashierQuery.order('display_name'),
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
      cashiers: (cashierResp.data || []) as Array<{
        id: string;
        display_name: string;
        color: string;
        emoji: string;
        role: CashierRole;
      }>,
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
  role?: CashierRole;
  canCloseDay?: boolean;
  canRefund?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();

    // Validation
    const name = input.displayName.trim();
    if (name.length < 2) return { success: false, error: 'İsim en az 2 harf olmalı' };
    if (name.length > 40) return { success: false, error: 'İsim en fazla 40 harf' };
    // GÜVENLİK: Yeni PIN'ler 6 haneli olmak zorunda (brute force daha zor)
    // Mevcut 4 haneli PIN'ler verifyCashierPin'de hâlâ kabul edilir.
    if (!/^\d{6}$/.test(input.pin)) {
      return { success: false, error: 'PIN 6 haneli sayı olmalı' };
    }
    const role: CashierRole = input.role || 'cashier';
    if (!['cashier', 'waiter', 'both'].includes(role)) {
      return { success: false, error: 'Geçersiz rol' };
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
      return { success: false, error: 'Bu isimde aktif bir kayıt zaten var' };
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
        role: role,
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
    role?: CashierRole;
    canCloseDay?: boolean;
    canRefund?: boolean;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Güvenlik: bu kayıt bizim business'ımızda mı?
    const { data: existing } = await admin
      .from('cashier_accounts')
      .select('id, business_id, display_name')
      .eq('id', id)
      .maybeSingle();

    if (!existing || existing.business_id !== businessId) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }

    const updates: Record<string, unknown> = {};
    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (name.length < 2) return { success: false, error: 'İsim en az 2 harf' };
      updates.display_name = name;
    }
    if (input.color !== undefined) updates.color = input.color;
    if (input.emoji !== undefined) updates.emoji = input.emoji;
    if (input.role !== undefined) {
      if (!['cashier', 'waiter', 'both'].includes(input.role)) {
        return { success: false, error: 'Geçersiz rol' };
      }
      updates.role = input.role;
    }
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

    if (!/^\d{6}$/.test(newPin)) {
      return { success: false, error: 'PIN 6 haneli sayı olmalı' };
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
  pin: string,
  expectedRole?: 'cashier' | 'waiter'
): Promise<{
  success: boolean;
  cashier?: {
    id: string;
    display_name: string;
    color: string;
    emoji: string;
    can_close_day: boolean;
    can_refund: boolean;
    role: CashierRole;
  };
  error?: string;
}> {
  try {
    // ╔══════════════════════════════════════════════════════════════╗
    // ║ BUSINESS ID ÇÖZÜMÜ                                           ║
    // ║ 1. Önce panel oturumu (eski sayfalar için)                   ║
    // ║ 2. Yoksa subdomain'den slug → business_id (yeni rotalar)     ║
    // ╚══════════════════════════════════════════════════════════════╝
    let businessId: string | null = null;
    try {
      const ctx = await requireBusinessAccess();
      businessId = ctx.businessId;
    } catch {
      // Panel oturumu yok — subdomain dene
    }

    if (!businessId) {
      const { extractSlugFromHost, resolveSlugToBusiness } = await import(
        '@/lib/security/slug-resolver'
      );
      const host = headers().get('host');
      const slug = extractSlugFromHost(host);
      if (slug) {
        const business = await resolveSlugToBusiness(slug);
        if (
          business &&
          business.subscriptionStatus !== 'suspended' &&
          business.subscriptionStatus !== 'cancelled'
        ) {
          businessId = business.id;
        }
      }
    }

    if (!businessId) {
      return { success: false, error: 'Giriş yapmamışsınız' };
    }

    const admin = createAdminClient();

    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, error: 'Geçersiz PIN' };
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║ BRUTE FORCE KORUMASI                                         ║
    // ║ IP + cashierId başına aşamalı kilit:                         ║
    // ║   3 yanlış → 60sn · 6 yanlış → 15dk · 10+ → 1 saat           ║
    // ╚══════════════════════════════════════════════════════════════╝
    const headerStore = headers();
    const ipAddress = extractIpFromHeaders(headerStore);
    const userAgent = headerStore.get('user-agent') || null;

    const rateLimit = await checkPinRateLimit({
      admin,
      ipAddress,
      cashierId,
    });

    if (!rateLimit.allowed) {
      // Kilitli denemeyi de logla (audit için)
      await recordPinAttempt({
        admin,
        businessId,
        cashierId,
        ipAddress,
        userAgent,
        result: 'locked',
        expectedRole,
      });
      return { success: false, error: rateLimit.message };
    }

    const { data: cashier } = await admin
      .from('cashier_accounts')
      .select(
        'id, business_id, display_name, color, emoji, pin_hash, can_close_day, can_refund, is_active, role'
      )
      .eq('id', cashierId)
      .maybeSingle();

    if (
      !cashier ||
      cashier.business_id !== businessId ||
      !cashier.is_active
    ) {
      // Cashier bulunamadıysa da logla (saldırı pattern tespiti için)
      await recordPinAttempt({
        admin,
        businessId,
        cashierId,
        ipAddress,
        userAgent,
        result: 'not_found',
        expectedRole,
      });
      return { success: false, error: 'Kasiyer bulunamadı' };
    }

    const valid = await bcrypt.compare(pin, cashier.pin_hash);
    if (!valid) {
      // Yanlış PIN — logla (rate limit için kritik)
      await recordPinAttempt({
        admin,
        businessId,
        cashierId,
        ipAddress,
        userAgent,
        result: 'wrong_pin',
        expectedRole,
      });
      return { success: false, error: 'Yanlış PIN' };
    }

    // Rol kontrolü — kasa giriş ekranı 'cashier' rolündekileri kabul etmeli;
    // garson uygulaması 'waiter' rolündekileri. 'both' rolü her ikisinde de geçerli.
    const cashierRole = (cashier.role as CashierRole) || 'cashier';
    if (expectedRole === 'cashier' && cashierRole === 'waiter') {
      await recordPinAttempt({
        admin,
        businessId,
        cashierId,
        ipAddress,
        userAgent,
        result: 'wrong_role',
        expectedRole,
      });
      return {
        success: false,
        error: 'Bu hesabın kasa yetkisi yok',
      };
    }
    if (expectedRole === 'waiter' && cashierRole === 'cashier') {
      await recordPinAttempt({
        admin,
        businessId,
        cashierId,
        ipAddress,
        userAgent,
        result: 'wrong_role',
        expectedRole,
      });
      return {
        success: false,
        error: 'Bu hesabın garson yetkisi yok',
      };
    }

    // BAŞARILI — audit log
    await recordPinAttempt({
      admin,
      businessId,
      cashierId,
      ipAddress,
      userAgent,
      result: 'success',
      expectedRole,
    });

    // ╔══════════════════════════════════════════════════════════════╗
    // ║ DB-BACKED COOKIE SESSION (subdomain rotaları için)           ║
    // ║ Eski localStorage sistemi paralel çalışıyor — bozulmaz.      ║
    // ║ Yeni subdomain rotaları bu cookie'yi kullanacak (Paket 4-5). ║
    // ║ Hata olursa login bozulmasın — sadece log'la, devam et.      ║
    // ╚══════════════════════════════════════════════════════════════╝
    try {
      await createCashierSession({
        businessId,
        cashierId,
        role: cashierRole,
      });
    } catch (e) {
      // Cookie set edilemese bile login akışını bozma
      // Eski localStorage sistemi devreye girer
      console.error('[verifyCashierPin] cookie session error:', e);
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
        role: cashierRole,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// PIN deneme geçmişi (panel'de görüntülenir)
// Son N saatteki tüm denemeleri listeler
// ============================================================
export async function listPinAttempts(params?: {
  hoursBack?: number; // varsayılan 24
  limit?: number; // varsayılan 100
  onlyFailures?: boolean; // sadece başarısızlar
}): Promise<{
  success: boolean;
  attempts?: Array<{
    id: string;
    cashier_id: string | null;
    cashier_name: string | null; // Joined from cashier_accounts
    ip_address: string | null;
    user_agent: string | null;
    result: string;
    expected_role: string | null;
    created_at: string;
  }>;
  // Aggregate sayılar (banner için faydalı)
  stats?: {
    success: number;
    wrong_pin: number;
    locked: number;
    not_found: number;
    wrong_role: number;
  };
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const hoursBack = params?.hoursBack || 24;
    const limit = Math.min(params?.limit || 100, 500);
    const since = new Date(
      Date.now() - hoursBack * 60 * 60 * 1000
    ).toISOString();

    // Ana sorgu: son N saatteki denemeler
    let query = admin
      .from('pin_attempts')
      .select('id, cashier_id, ip_address, user_agent, result, expected_role, created_at')
      .eq('business_id', businessId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params?.onlyFailures) {
      query = query.in('result', ['wrong_pin', 'locked', 'not_found', 'wrong_role']);
    }

    const { data: attempts, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Cashier isimlerini ayrı sorgu ile al (LEFT JOIN supabase-js'te zor)
    const cashierIds = Array.from(
      new Set((attempts || []).map((a) => a.cashier_id).filter(Boolean))
    ) as string[];

    const cashierNameMap = new Map<string, string>();
    if (cashierIds.length > 0) {
      const { data: cashiers } = await admin
        .from('cashier_accounts')
        .select('id, display_name')
        .in('id', cashierIds);
      (cashiers || []).forEach((c) => {
        cashierNameMap.set(c.id, c.display_name);
      });
    }

    // İstatistikler
    const stats = {
      success: 0,
      wrong_pin: 0,
      locked: 0,
      not_found: 0,
      wrong_role: 0,
    };
    (attempts || []).forEach((a) => {
      if (a.result in stats) {
        stats[a.result as keyof typeof stats]++;
      }
    });

    return {
      success: true,
      attempts: (attempts || []).map((a) => ({
        id: a.id,
        cashier_id: a.cashier_id,
        cashier_name: a.cashier_id ? cashierNameMap.get(a.cashier_id) || null : null,
        ip_address: a.ip_address ? String(a.ip_address) : null,
        user_agent: a.user_agent,
        result: a.result,
        expected_role: a.expected_role,
        created_at: a.created_at,
      })),
      stats,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}

// ============================================================
// Cashier sign out (server-side)
// Cookie session'ı temizler. Client-side localStorage temizlemesi
// useCashierSession hook'unda zaten var.
// ============================================================
export async function signOutCashierSession(): Promise<{ success: boolean }> {
  try {
    const { clearCashierSession } = await import('@/lib/security/cashier-session');
    await clearCashierSession();
    return { success: true };
  } catch (e) {
    console.error('[signOutCashierSession] error:', e);
    // Hata olsa bile başarılı dön — client tarafta zaten localStorage temizleniyor
    return { success: true };
  }
}
