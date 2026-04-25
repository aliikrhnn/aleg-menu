'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type SoundSettings = {
  call_sound: string;
  order_sound: string;
  volume: number;
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
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { businessId: membership.business_id };
}

function parseSoundSettings(raw: unknown): SoundSettings {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const sound = (obj.kasa_sounds as Partial<SoundSettings> | undefined) || {};
  return {
    call_sound:
      typeof sound.call_sound === 'string'
        ? sound.call_sound
        : DEFAULT_SOUND_SETTINGS.call_sound,
    order_sound:
      typeof sound.order_sound === 'string'
        ? sound.order_sound
        : DEFAULT_SOUND_SETTINGS.order_sound,
    volume:
      typeof sound.volume === 'number' && sound.volume >= 0 && sound.volume <= 1
        ? sound.volume
        : DEFAULT_SOUND_SETTINGS.volume,
  };
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
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      settings: parseSoundSettings(data?.settings),
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
    const admin = createAdminClient();

    // Mevcut settings JSONB'sini al
    const { data: current, error: getErr } = await admin
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .maybeSingle();

    if (getErr) return { success: false, error: getErr.message };

    const currentSettings =
      ((current?.settings as Record<string, unknown> | null) || {}) ?? {};
    const currentSound =
      (currentSettings.kasa_sounds as Partial<SoundSettings> | undefined) || {};

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

    const { error } = await admin
      .from('businesses')
      .update({ settings: newSettings })
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

// ============================================================
// KASA: Ses ayarlarını çek (admin client)
// ============================================================
export async function getKasaSoundSettings(
  businessId: string
): Promise<{ success: boolean; settings?: SoundSettings; error?: string }> {
  try {
    if (!businessId) {
      return { success: true, settings: DEFAULT_SOUND_SETTINGS };
    }
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      settings: parseSoundSettings(data?.settings),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
