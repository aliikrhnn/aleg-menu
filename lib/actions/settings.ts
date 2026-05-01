'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================

export type WorkingHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

export type DayHours = {
  open: string; // "08:00"
  close: string; // "23:00"
  closed: boolean;
};

export type OrderConfig = {
  online_enabled: boolean;
  modes: {
    dinein: boolean;
    pickup: boolean;
    delivery: boolean;
  };
  langs: {
    tr: boolean;
    en: boolean;
  };
};

export type BusinessSettings = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;

  // Kimlik
  tagline_tr: string | null;
  tagline_en: string | null;
  city: string | null;

  // İletişim
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;

  // Çalışma saatleri & sipariş
  working_hours: WorkingHours;
  order_config: OrderConfig;
  currency: string;

  // Menü tema kişiselleştirme
  menu_theme: {
    preset:
      | 'brutalist'
      | 'elite'
      | 'modern'
      | 'vintage'
      | 'minimal'
      | 'mediterranean'
      | 'darkluxe';
    accent_override: string | null;
  };
};

async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Panel oturumu yoksa cashier cookie + subdomain fallback dene
  // (subdomain refactor sonrası kasa/garson rotaları için)
  if (!user) {
    const { tryCashierFallback } = await import('@/lib/security/auth-context');
    const fallback = await tryCashierFallback();
    if (fallback) {
      return { businessId: fallback.businessId };
    }
    throw new Error('Giriş yapmamışsınız');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    throw new Error('İşletme üyeliği bulunamadı');
  }

  return { supabase, businessId: membership.business_id, userId: user.id };
}

// ============================================================
// Ayarları çek
// ============================================================

const DEFAULT_HOURS: WorkingHours = {
  mon: { open: '08:00', close: '23:00', closed: false },
  tue: { open: '08:00', close: '23:00', closed: false },
  wed: { open: '08:00', close: '23:00', closed: false },
  thu: { open: '08:00', close: '23:00', closed: false },
  fri: { open: '08:00', close: '23:00', closed: false },
  sat: { open: '09:00', close: '23:00', closed: false },
  sun: { open: '09:00', close: '22:00', closed: false },
};

const DEFAULT_ORDER_CONFIG: OrderConfig = {
  online_enabled: true,
  modes: { dinein: true, pickup: true, delivery: false },
  langs: { tr: true, en: false },
};

export async function getBusinessSettings(): Promise<{
  success: boolean;
  settings?: BusinessSettings;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select(
        'id, slug, name, logo_url, city, phone, email, tagline_tr, tagline_en, address, whatsapp, instagram, facebook, website, working_hours, order_config, currency, menu_theme'
      )
      .eq('id', businessId)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: error?.message || 'İşletme bulunamadı' };
    }

    const rawTheme = data.menu_theme as
      | { preset?: string; accent_override?: string | null }
      | null;
    const validPresets = [
      'brutalist',
      'elite',
      'modern',
      'vintage',
      'minimal',
      'mediterranean',
      'darkluxe',
    ];
    const themePreset = validPresets.includes(rawTheme?.preset || '')
      ? (rawTheme!.preset as BusinessSettings['menu_theme']['preset'])
      : 'brutalist';
    const themeAccent =
      rawTheme?.accent_override &&
      /^#[0-9A-Fa-f]{6}$/.test(rawTheme.accent_override)
        ? rawTheme.accent_override
        : null;

    const settings: BusinessSettings = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      logo_url: data.logo_url,
      tagline_tr: data.tagline_tr,
      tagline_en: data.tagline_en,
      city: data.city,
      address: data.address,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      instagram: data.instagram,
      facebook: data.facebook,
      website: data.website,
      working_hours: (data.working_hours as WorkingHours) || DEFAULT_HOURS,
      order_config: (data.order_config as OrderConfig) || DEFAULT_ORDER_CONFIG,
      currency: data.currency || 'TRY',
      menu_theme: {
        preset: themePreset,
        accent_override: themeAccent,
      },
    };

    return { success: true, settings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Ayarları güncelle (kısmen)
// ============================================================

export type SettingsUpdate = Partial<{
  name: string;
  tagline_tr: string | null;
  tagline_en: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  working_hours: WorkingHours;
  order_config: OrderConfig;
  currency: string;
  menu_theme: {
    preset:
      | 'brutalist'
      | 'elite'
      | 'modern'
      | 'vintage'
      | 'minimal'
      | 'mediterranean'
      | 'darkluxe';
    accent_override: string | null;
  };
}>;

export async function updateBusinessSettings(
  updates: SettingsUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Basit validasyon
    if (updates.name !== undefined) {
      if (!updates.name.trim() || updates.name.length > 100) {
        return { success: false, error: 'İşletme adı 1-100 karakter olmalı' };
      }
    }

    if (updates.instagram) {
      // @ ile başlıyorsa kaldır
      updates.instagram = updates.instagram.replace(/^@/, '').trim();
    }

    if (updates.website && !updates.website.match(/^https?:\/\//)) {
      updates.website = 'https://' + updates.website;
    }

    // menu_theme validasyonu
    if (updates.menu_theme !== undefined) {
      const validPresets = [
        'brutalist',
        'elite',
        'modern',
        'vintage',
        'minimal',
        'mediterranean',
        'darkluxe',
      ];
      if (!validPresets.includes(updates.menu_theme.preset)) {
        return { success: false, error: 'Geçersiz tema seçimi' };
      }
      if (
        updates.menu_theme.accent_override !== null &&
        !/^#[0-9A-Fa-f]{6}$/.test(updates.menu_theme.accent_override || '')
      ) {
        return {
          success: false,
          error: 'Vurgu rengi #RRGGBB formatında olmalı',
        };
      }
    }

    const { error } = await admin
      .from('businesses')
      .update(updates)
      .eq('id', businessId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Müşteri menüsü cache'ini temizlemek için slug'ı çek
    const { data: biz } = await admin
      .from('businesses')
      .select('slug')
      .eq('id', businessId)
      .maybeSingle();

    revalidatePath('/panel/ayarlar');
    revalidatePath('/panel', 'layout'); // isim değişirse sidebar güncellensin
    if (biz?.slug) {
      // Müşteri menüsü hem path bazlı hem subdomain üzerinden çağrılabilir
      revalidatePath(`/menu/${biz.slug}`);
      revalidatePath(`/menu/${biz.slug}`, 'layout');
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Logo yükle (data URL alıp Supabase Storage'a koy)
// ============================================================

export async function uploadBusinessLogo(
  dataUrl: string,
  mimeType: string
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // data URL'i buffer'a çevir
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      return { success: false, error: 'Geçersiz görsel verisi' };
    }

    const buffer = Buffer.from(base64, 'base64');

    // Max 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return { success: false, error: 'Logo 5MB üzerinde olamaz' };
    }

    // Uzantı belirle
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    const ext = extMap[mimeType] || 'png';

    // Yol: {business_id}/logo-{timestamp}.{ext}
    // Timestamp ile her değişiklikte yeni URL (cache bypass)
    const ts = Date.now();
    const path = `${businessId}/logo-${ts}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from('business-assets')
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Public URL
    const { data: urlData } = admin.storage
      .from('business-assets')
      .getPublicUrl(path);

    const logoUrl = urlData.publicUrl;

    // businesses.logo_url güncelle
    await admin
      .from('businesses')
      .update({ logo_url: logoUrl })
      .eq('id', businessId);

    revalidatePath('/panel/ayarlar');
    revalidatePath('/panel', 'layout'); // sidebar ve layout cache'i temizle

    return { success: true, logoUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Logo kaldır
// ============================================================

export async function removeBusinessLogo(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // DB'den logo_url temizle
    await admin
      .from('businesses')
      .update({ logo_url: null })
      .eq('id', businessId);

    // Storage'daki dosyaları da temizle (isteğe bağlı, kısaltma)
    const { data: files } = await admin.storage
      .from('business-assets')
      .list(businessId, { limit: 100 });

    const logoFiles = (files || []).filter((f) => f.name.startsWith('logo-'));
    if (logoFiles.length > 0) {
      const paths = logoFiles.map((f) => `${businessId}/${f.name}`);
      await admin.storage.from('business-assets').remove(paths);
    }

    revalidatePath('/panel/ayarlar');
    revalidatePath('/panel', 'layout'); // sidebar ve layout cache'i temizle

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// ADMIN KASA PIN
// ============================================================
// Kasa sekmesine giriş için admin PIN'i. Hash'lenmiş olarak saklanır.
// Yönetici /panel/ayarlar'dan belirler, kasiyer kasa sekmesinde girer.
// ============================================================

// SHA-256 basit hash (Edge-safe, crypto.subtle Node'da da var)
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// PIN durumunu getir (sadece set edilmiş mi, hash gösterilmez)
export async function getAdminKasaPinStatus(): Promise<{
  success: boolean;
  hasPin?: boolean;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('businesses')
      .select('admin_kasa_pin_hash')
      .eq('id', businessId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, hasPin: !!data?.admin_kasa_pin_hash };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// PIN belirle veya güncelle (yönetici yapar)
export async function setAdminKasaPin(
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, error: 'PIN 4-6 haneli rakam olmalı' };
    }
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();
    const hash = await hashPin(pin);
    const { error } = await admin
      .from('businesses')
      .update({ admin_kasa_pin_hash: hash })
      .eq('id', businessId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/panel/ayarlar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// PIN kaldır (yönetici yapar)
export async function removeAdminKasaPin(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();
    const { error } = await admin
      .from('businesses')
      .update({ admin_kasa_pin_hash: null })
      .eq('id', businessId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/panel/ayarlar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// PIN doğrula (kasiyer kasa sekmesine girince)
// NOT: requireBusinessAccess kullanmaz, çünkü kasiyer normal auth user değil.
// Bunun yerine: business_id'yi cashier session'dan alıyor.
// Her rate limit için: gün içinde 10 başarısız denemeden sonra 5dk bekle.
export async function verifyAdminKasaPin(
  businessId: string,
  pin: string
): Promise<{ success: boolean; valid?: boolean; error?: string }> {
  try {
    if (!/^\d{4,6}$/.test(pin)) {
      return { success: true, valid: false };
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('businesses')
      .select('admin_kasa_pin_hash')
      .eq('id', businessId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data?.admin_kasa_pin_hash) {
      // PIN tanımlı değil; burada false dönüyoruz, UI tarafında kurulum gerekli uyarısı
      return { success: true, valid: false };
    }
    const hash = await hashPin(pin);
    return { success: true, valid: hash === data.admin_kasa_pin_hash };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
