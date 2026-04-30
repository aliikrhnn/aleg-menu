'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'business-assets';
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
];

export type CustomMenuFile = {
  url: string;
  path: string;
  uploaded_at: string;
  filename: string;
  mime: string;
  width?: number; // sadece görsel ise
  height?: number;
};

async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { businessId: membership.business_id as string };
}

// ============================================================
// Yüklü custom menu'yü getir (settings.custom_menu jsonb)
// ============================================================
export async function getCustomMenu(): Promise<{
  success: boolean;
  data?: CustomMenuFile | null;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select('custom_menu')
      .eq('id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data?.custom_menu) return { success: true, data: null };

    return { success: true, data: data.custom_menu as CustomMenuFile };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}

// ============================================================
// Custom menu yükle
// ============================================================
export async function uploadCustomMenu(formData: FormData): Promise<{
  success: boolean;
  data?: CustomMenuFile;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const file = formData.get('file') as File | null;

    if (!file) return { success: false, error: 'Dosya gönderilmedi' };

    if (!ALLOWED_MIME.includes(file.type)) {
      return {
        success: false,
        error: 'Sadece PNG, JPG veya PDF kabul edilir',
      };
    }

    if (file.size > MAX_SIZE_BYTES) {
      return {
        success: false,
        error: 'Dosya 8MB\'dan büyük olamaz',
      };
    }

    const admin = createAdminClient();

    // Mevcut dosyayı sil (varsa)
    const { data: existing } = await admin
      .from('businesses')
      .select('custom_menu')
      .eq('id', businessId)
      .maybeSingle();

    if (existing?.custom_menu) {
      const oldPath = (existing.custom_menu as CustomMenuFile).path;
      if (oldPath) {
        await admin.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Yeni dosya yolu
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ['png', 'jpg', 'jpeg', 'pdf'].includes(ext) ? ext : 'png';
    const path = `custom-menus/${businessId}/${Date.now()}.${safeExt}`;

    // Supabase storage'a yükle
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Public URL al
    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(path);

    // Görsel boyutlarını öğren (PDF değilse)
    let width: number | undefined;
    let height: number | undefined;
    if (file.type.startsWith('image/')) {
      // server-side image dimensions için sharp veya basit bir image probe lazım
      // şimdilik atlıyoruz, client'ta hesaplanabilir
    }

    const customMenuData: CustomMenuFile = {
      url: publicUrl,
      path,
      uploaded_at: new Date().toISOString(),
      filename: file.name,
      mime: file.type,
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
    };

    // businesses.custom_menu jsonb alanına yaz
    const { error: updateError } = await admin
      .from('businesses')
      .update({ custom_menu: customMenuData })
      .eq('id', businessId);

    if (updateError) {
      // Yüklediğimiz dosyayı temizle
      await admin.storage.from(BUCKET).remove([path]);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/panel/menu-tasarim/ozel');
    return { success: true, data: customMenuData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Yükleme hatası',
    };
  }
}

// ============================================================
// Custom menu sil
// ============================================================
export async function deleteCustomMenu(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('businesses')
      .select('custom_menu')
      .eq('id', businessId)
      .maybeSingle();

    if (existing?.custom_menu) {
      const path = (existing.custom_menu as CustomMenuFile).path;
      if (path) {
        await admin.storage.from(BUCKET).remove([path]);
      }
    }

    const { error } = await admin
      .from('businesses')
      .update({ custom_menu: null })
      .eq('id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/menu-tasarim/ozel');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}

// ============================================================
// Custom menu için QR URL'i ve işletme bilgisini getir
// (client önizleme + indirme için)
// ============================================================
export async function getCustomMenuContext(): Promise<{
  success: boolean;
  data?: {
    qr_url: string;
    business_name: string;
    custom_menu: CustomMenuFile | null;
  };
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select('name, slug, custom_menu')
      .eq('id', businessId)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: error?.message || 'İşletme bulunamadı' };
    }

    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';
    const qrUrl = `https://${data.slug}.${rootDomain}`;

    return {
      success: true,
      data: {
        qr_url: qrUrl,
        business_name: data.name as string,
        custom_menu: (data.custom_menu as CustomMenuFile) || null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}
