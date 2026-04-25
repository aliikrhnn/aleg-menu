// ============================================================
// Ses ayarları - paylaşılan types/constants
// (server actions hem client'tan kullanmak için ayrı dosya)
// ============================================================

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
