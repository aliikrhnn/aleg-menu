'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type SoundSettings = {
  call_sound: string; // SoundId — çağrı sesi
  order_sound: string; // SoundId — yeni sipariş sesi
  volume: number; // 0..1 (default 0.35)
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  call_sound: 'bell',
  order_sound: 'chime',
  volume: 0.35,
};

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
  return { user, businessId: membership.business_id };
}

// ============================================================
// PANEL: Ayarları getir
// ============================================================
export async function getSoundSettings(): Promise<{
  success: boolean;
  settings?: SoundSettings;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    const settingsObj =
      ((data?.settings as Record<string, unknown> | null) || {}) ?? {};
    const sound = (settingsObj.kasa_sounds as Partial<SoundSettings>) || {};

    return {
      success: true,
      settings: {
        call_sound: sound.call_sound || DEFAULT_SOUND_SETTINGS.call_sound,
        order_sound: sound.order_sound || DEFAULT_SOUND_SETTINGS.order_sound,
        volume:
          typeof sound.volume === 'number' && sound.volume >= 0 && sound.volume <= 1
            ? sound.volume
            : DEFAULT_SOUND_SETTINGS.volume,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// PANEL: Ayarları kaydet
// ============================================================
export async function updateSoundSettings(
  patch: Partial<SoundSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();

    // Mevcut settings'i al, kasa_sounds bölümünü güncelle
    const { data: current } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .maybeSingle();

    const currentSettings =
      ((current?.settings as Record<string, unknown> | null) || {}) ?? {};
    const currentSound =
      (currentSettings.kasa_sounds as Partial<SoundSettings>) || {};

    const merged: SoundSettings = {
      call_sound:
        patch.call_sound ||
        currentSound.call_sound ||
        DEFAULT_SOUND_SETTINGS.call_sound,
      order_sound:
        patch.order_sound ||
        currentSound.order_sound ||
        DEFAULT_SOUND_SETTINGS.order_sound,
      volume:
        typeof patch.volume === 'number'
          ? Math.max(0, Math.min(1, patch.volume))
          : typeof currentSound.volume === 'number'
            ? currentSound.volume
            : DEFAULT_SOUND_SETTINGS.volume,
    };

    const newSettings = {
      ...currentSettings,
      kasa_sounds: merged,
    };

    const { error } = await supabase
      .from('businesses')
      .update({ settings: newSettings })
      .eq('id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/ayarlar/sesler');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// KASA: Anonim olmayan kasa için ses ayarlarını çek
// (kasa client component, server action ile çağırır)
// ============================================================
export async function getKasaSoundSettings(
  businessId: string
): Promise<{ success: boolean; settings?: SoundSettings; error?: string }> {
  try {
    // Admin client - kasa businessId'si zaten orderresult'tan geliyor
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    const settingsObj =
      ((data?.settings as Record<string, unknown> | null) || {}) ?? {};
    const sound = (settingsObj.kasa_sounds as Partial<SoundSettings>) || {};

    return {
      success: true,
      settings: {
        call_sound: sound.call_sound || DEFAULT_SOUND_SETTINGS.call_sound,
        order_sound: sound.order_sound || DEFAULT_SOUND_SETTINGS.order_sound,
        volume:
          typeof sound.volume === 'number' && sound.volume >= 0 && sound.volume <= 1
            ? sound.volume
            : DEFAULT_SOUND_SETTINGS.volume,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
