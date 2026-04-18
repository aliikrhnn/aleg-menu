'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

export async function deleteBusiness(businessId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const admin = createAdminClient();

    // Önce owner_user_id'yi al
    const { data: business } = await admin
      .from('businesses')
      .select('owner_user_id')
      .eq('id', businessId)
      .maybeSingle();

    // İşletmeyi sil (CASCADE ile her şey silinir)
    const { error } = await admin.from('businesses').delete().eq('id', businessId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Auth user'ı da sil (varsa)
    if (business?.owner_user_id) {
      await admin.auth.admin.deleteUser(business.owner_user_id);
    }

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
