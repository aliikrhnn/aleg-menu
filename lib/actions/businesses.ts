'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';

// ============================================================
// Permission check - sadece super_admin yapabilir
// ============================================================
async function requireSuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Yetkisiz: Giriş yapmamışsınız');
  }

  const { data: isSuperAdmin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!isSuperAdmin) {
    throw new Error('Yetkisiz: Süper admin değilsiniz');
  }

  return user;
}

// ============================================================
// Yardımcı: Platform audit log yaz
// ============================================================
async function writeAuditLog(input: {
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string;
  businessId?: string | null;
  meta?: Record<string, unknown>;
  tone?: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive';
}) {
  try {
    const admin = createAdminClient();
    await admin.from('platform_audit_logs').insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      actor_name: input.actorName,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId,
      target_label: input.targetLabel,
      business_id: input.businessId,
      meta: input.meta || {},
      tone: input.tone || 'muted',
    });
  } catch {
    // Audit log opsiyonel, hata olursa ana akışı etkileme
  }
}

// ============================================================
// Yeni İşletme Oluşturma
// ============================================================

export type CreateBusinessInput = {
  // İşletme bilgileri
  business_name: string;
  business_slug: string;
  city: string;
  business_type: string;

  // Sahibi bilgileri
  owner_full_name: string;
  owner_email: string;
  owner_phone: string;

  // Plan
  plan_id: string;
};

export type CreateBusinessResult = {
  success: boolean;
  error?: string;
  business_id?: string;
  temp_password?: string;
};

export async function createBusiness(input: CreateBusinessInput): Promise<CreateBusinessResult> {
  try {
    await requireSuperAdmin();

    // Validation
    if (!input.business_name || input.business_name.length < 2) {
      return { success: false, error: 'İşletme adı en az 2 karakter olmalı' };
    }
    if (!input.owner_email.includes('@')) {
      return { success: false, error: 'Geçersiz e-posta adresi' };
    }
    const slug = slugify(input.business_slug || input.business_name);
    if (!slug || slug.length < 2) {
      return { success: false, error: 'Geçersiz slug' };
    }

    // Service role client - RLS bypass eder, super admin işlemleri için
    const admin = createAdminClient();

    // 1. Slug çakışıyor mu kontrol et
    const { data: existing } = await admin
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `"${slug}" slug'ı zaten kullanılıyor` };
    }

    // 2. E-posta çakışıyor mu kontrol et
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const userExists = existingUsers?.users.some((u) => u.email === input.owner_email);
    if (userExists) {
      return { success: false, error: `"${input.owner_email}" zaten kayıtlı` };
    }

    // 3. Geçici şifre üret
    const tempPassword = generateTempPassword();

    // 4. Auth kullanıcısı oluştur
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.owner_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.owner_full_name,
        // Yeni kafe sahibi geçici şifreyle giriş yapacak. İlk login sonrası
        // panel layout bu flag'i görüp /panel/sifre-degistir'e yönlendirecek.
        must_change_password: true,
      },
    });

    if (authError || !authData.user) {
      return { success: false, error: `Kullanıcı oluşturma hatası: ${authError?.message}` };
    }

    const newUserId = authData.user.id;

    // 5. Business oluştur
    const { data: business, error: businessError } = await admin
      .from('businesses')
      .insert({
        slug,
        name: input.business_name,
        city: input.city,
        business_type: input.business_type,
        email: input.owner_email,
        phone: input.owner_phone,
        plan_id: input.plan_id,
        owner_user_id: newUserId,
        subscription_status: 'trial',
      })
      .select('id')
      .single();

    if (businessError || !business) {
      // Rollback: user'ı sil
      await admin.auth.admin.deleteUser(newUserId);
      return { success: false, error: `İşletme oluşturma hatası: ${businessError?.message}` };
    }

    // 6. Sahibi rolü oluştur
    const { data: ownerRole, error: roleError } = await admin
      .from('roles')
      .insert({
        business_id: business.id,
        name: 'Sahip',
        is_owner: true,
        is_default: false,
        permissions: {
          menu: ['read', 'write'],
          pos: ['read', 'write'],
          reports: ['read', 'write'],
          team: ['read', 'write'],
          settings: ['read', 'write'],
        },
      })
      .select('id')
      .single();

    if (roleError || !ownerRole) {
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from('businesses').delete().eq('id', business.id);
      return { success: false, error: `Rol oluşturma hatası: ${roleError?.message}` };
    }

    // 7. Member kaydı oluştur (sahibi)
    const { error: memberError } = await admin.from('business_members').insert({
      business_id: business.id,
      user_id: newUserId,
      role_id: ownerRole.id,
      full_name: input.owner_full_name,
      phone: input.owner_phone,
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      // Devam et — kritik değil, manuel düzeltilebilir
      console.error('Member kayıt hatası (işletme oluşturuldu):', memberError);
    }

    // 8. Ana şube oluştur
    await admin.from('branches').insert({
      business_id: business.id,
      name: 'Ana Şube',
      slug: 'merkez',
      is_main: true,
      active: true,
    });

    revalidatePath('/admin/isletmeler');
    revalidatePath('/admin');

    return {
      success: true,
      business_id: business.id,
      temp_password: tempPassword,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
    return { success: false, error: message };
  }
}

// ============================================================
// İşletme silme
// ============================================================

// ============================================================
// İşletme silme öncesi preflight (uyarılar için)
// ============================================================

export type DeleteBusinessPreflight = {
  business_name: string;
  business_slug: string;
  open_orders: number;          // unpaid sipariş sayısı
  open_cash_session: boolean;   // açık kasa oturumu var mı
  total_orders: number;
  total_products: number;
  total_members: number;
  on_account_balance: number;   // toplam cari bakiye (₺)
};

export async function getDeleteBusinessPreflight(
  businessId: string
): Promise<{ success: boolean; data?: DeleteBusinessPreflight; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();

    const { data: business } = await admin
      .from('businesses')
      .select('id, name, slug')
      .eq('id', businessId)
      .maybeSingle();

    if (!business) {
      return { success: false, error: 'İşletme bulunamadı' };
    }

    // Paralel sayım
    const [
      openOrdersR,
      cashSessionR,
      totalOrdersR,
      productsR,
      membersR,
      accountR,
    ] = await Promise.all([
      admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .in('payment_status', ['unpaid']),
      admin
        .from('cash_sessions')
        .select('id')
        .eq('business_id', businessId)
        .eq('status', 'open')
        .maybeSingle(),
      admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId),
      admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId),
      admin
        .from('business_members')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId),
      // Cari bakiye toplamı (varsa)
      admin
        .from('customers')
        .select('on_account_balance')
        .eq('business_id', businessId),
    ]);

    const balanceTotal = (accountR.data || []).reduce(
      (s: number, r: { on_account_balance: number | null }) =>
        s + Number(r.on_account_balance || 0),
      0
    );

    return {
      success: true,
      data: {
        business_name: business.name as string,
        business_slug: business.slug as string,
        open_orders: openOrdersR.count || 0,
        open_cash_session: !!cashSessionR.data,
        total_orders: totalOrdersR.count || 0,
        total_products: productsR.count || 0,
        total_members: membersR.count || 0,
        on_account_balance: balanceTotal,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

// ============================================================
// İşletme Silme — kalıcı, geri alınamaz
// ============================================================

export async function deleteBusiness(
  businessId: string,
  options?: { force?: boolean }
): Promise<{
  success: boolean;
  error?: string;
  /** Force kullanılmadıysa ve risk varsa burada uyarı detayı döner */
  blockedBy?: {
    open_orders?: number;
    open_cash_session?: boolean;
    on_account_balance?: number;
  };
}> {
  try {
    const actor = await requireSuperAdmin();
    const admin = createAdminClient();

    // 1. İşletme var mı + bilgi al
    const { data: business } = await admin
      .from('businesses')
      .select('id, name, slug, owner_user_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!business) {
      return { success: false, error: 'İşletme bulunamadı' };
    }

    // 2. Preflight (kazara silme önleme — force ile bypass edilir)
    if (!options?.force) {
      const preflight = await getDeleteBusinessPreflight(businessId);
      if (!preflight.success || !preflight.data) {
        return { success: false, error: preflight.error || 'Preflight hata' };
      }
      const p = preflight.data;
      const hasRisk =
        p.open_orders > 0 || p.open_cash_session || p.on_account_balance > 0;
      if (hasRisk) {
        return {
          success: false,
          blockedBy: {
            open_orders: p.open_orders,
            open_cash_session: p.open_cash_session,
            on_account_balance: p.on_account_balance,
          },
        };
      }
    }

    // 3. İstatistik snapshot — silmeden önce (audit details için)
    const [productCountR, totalOrderCountR] = await Promise.all([
      admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId),
      admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId),
    ]);

    // 4. Multi-tenant kontrolü: sahibi başka işletmenin de sahibi/üyesi mi?
    let canDeleteAuthUser = false;
    if (business.owner_user_id) {
      const [otherOwnerR, otherMembershipR] = await Promise.all([
        admin
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('owner_user_id', business.owner_user_id)
          .neq('id', businessId),
        admin
          .from('business_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', business.owner_user_id)
          .neq('business_id', businessId),
      ]);
      canDeleteAuthUser =
        (otherOwnerR.count || 0) === 0 && (otherMembershipR.count || 0) === 0;
    }

    // 5. İşletmeyi sil — DB'de ON DELETE CASCADE ile alt kayıtlar silinir
    const { error: deleteError } = await admin
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (deleteError) {
      // Audit: başarısız silme denemesi
      await writeAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'business.delete_failed',
        targetType: 'business',
        targetId: businessId,
        targetLabel: business.name as string,
        businessId,
        meta: { error: deleteError.message, forced: !!options?.force },
        tone: 'danger',
      });
      return { success: false, error: deleteError.message };
    }

    // 6. Auth user'ı sil (sadece başka yere bağlı değilse)
    let authUserDeleted = false;
    if (canDeleteAuthUser && business.owner_user_id) {
      const { error: authError } = await admin.auth.admin.deleteUser(
        business.owner_user_id
      );
      authUserDeleted = !authError;
    }

    // 7. Audit log — silme başarılı
    await writeAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'business.deleted',
      targetType: 'business',
      targetId: businessId,
      targetLabel: business.name as string,
      // business_id null bırak çünkü artık silindi (FK SET NULL'a düşmesin diye)
      businessId: null,
      meta: {
        slug: business.slug,
        product_count: productCountR.count || 0,
        total_order_count: totalOrderCountR.count || 0,
        auth_user_deleted: authUserDeleted,
        owner_user_id: business.owner_user_id,
        forced: !!options?.force,
      },
      tone: 'danger',
    });

    revalidatePath('/admin/isletmeler');
    revalidatePath('/admin');

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

// ============================================================
// İşletme durumu değiştir (askıya al / aktif et)
// ============================================================

export async function updateBusinessStatus(
  businessId: string,
  status: 'active' | 'suspended' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const admin = createAdminClient();
    const { error } = await admin
      .from('businesses')
      .update({ subscription_status: status })
      .eq('id', businessId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/isletmeler');
    revalidatePath(`/admin/isletmeler/${businessId}`);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Hata' };
  }
}

// ============================================================
// Yardımcı: Geçici şifre üret
// ============================================================

function generateTempPassword(): string {
  // 12 karakter, büyük/küçük harf + rakam + sembol
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%';
  let password = '';

  // 8 normal karakter
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  // 2 sembol
  for (let i = 0; i < 2; i++) {
    password += symbols[Math.floor(Math.random() * symbols.length)];
  }
  // 2 rakam daha (sayısal güç için)
  for (let i = 0; i < 2; i++) {
    password += Math.floor(Math.random() * 10);
  }

  // Karıştır
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
