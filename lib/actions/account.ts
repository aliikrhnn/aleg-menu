'use server';

/**
 * lib/actions/account.ts
 * --------------------------------------------------------------
 * Kullanıcının kendi hesabıyla ilgili işlemler.
 *
 * - changeOwnPassword: yeni şifre belirler, must_change_password
 *   metadata flag'ini kaldırır.
 *
 * NOT: Geçici şifreyle ilk login sonrası panel layout kullanıcıyı
 * /panel/sifre-degistir sayfasına yönlendirir. O sayfa bu action'ı
 * çağırır.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ChangePasswordInput = {
  newPassword: string;
  /** Opsiyonel: ayarlar tab'ından çağrılırken mevcut şifre doğrulaması.
   *  Geçici şifre zorla değişimi sırasında HİÇBİR kontrol yapılmaz çünkü
   *  kullanıcı az önce bu şifreyle giriş yaptı (sahip olduğu kanıt). */
  currentPassword?: string;
};

export type ChangePasswordResult = {
  success: boolean;
  error?: string;
};

const MIN_PASSWORD_LENGTH = 8;

export async function changeOwnPassword(
  input: ChangePasswordInput
): Promise<ChangePasswordResult> {
  try {
    const supabase = createClient();

    // 1. Auth kontrolü — kullanıcı login mi
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Oturumun yok ya da süresi doldu' };
    }

    // 2. Validation
    if (
      !input.newPassword ||
      input.newPassword.length < MIN_PASSWORD_LENGTH
    ) {
      return {
        success: false,
        error: `Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı`,
      };
    }

    // 3. Mevcut şifre doğrulama (opsiyonel — sadece ayarlardan değişimde)
    if (input.currentPassword) {
      // Reauthenticate via password sign-in (mevcut şifre doğru mu)
      const email = user.email;
      if (!email) {
        return { success: false, error: 'Hesap e-postası bulunamadı' };
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: input.currentPassword,
      });
      if (signInError) {
        return { success: false, error: 'Mevcut şifre hatalı' };
      }
    }

    // 4. Yeni şifreyi kaydet + must_change_password flag'ini kaldır
    const { error: updateError } = await supabase.auth.updateUser({
      password: input.newPassword,
      data: {
        // Mevcut metadata'yı koru, sadece flag'i kapat
        ...user.user_metadata,
        must_change_password: false,
      },
    });

    if (updateError) {
      return {
        success: false,
        error: `Şifre güncelleme hatası: ${updateError.message}`,
      };
    }

    // 5. Audit log (varsa) — kritik değil, ignore on error
    try {
      const admin = createAdminClient();
      await admin.from('audit_log').insert({
        user_id: user.id,
        action: 'password_changed',
        resource_type: 'user',
        resource_id: user.id,
        details: {
          forced: !input.currentPassword,
        },
      });
    } catch {
      // Audit log opsiyonel, hata olursa ignore et
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
    return { success: false, error: message };
  }
}
