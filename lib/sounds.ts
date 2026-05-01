'use client';

/**
 * ════════════════════════════════════════════════════════════════════
 * PAYLAŞILAN AUDIO CONTEXT (autoplay policy fix)
 * ════════════════════════════════════════════════════════════════════
 *
 * Modern tarayıcılar (Chrome, Edge, Safari) AudioContext'in kullanıcı
 * etkileşimi olmadan ses çalmasını engeller. Yeni context her zaman
 * 'suspended' state'te başlar.
 *
 * Çözüm:
 *   1. TEK bir paylaşılan context yarat (her ses çağrısında yeni değil)
 *   2. İlk kullanıcı tıklamasında context'i resume() et
 *   3. Sonraki tüm sesler bu context'i kullansın
 *
 * Bu modül load olduğunda document'a 'click' / 'touchstart' / 'keydown'
 * listener'ı eklenir (passive). İlk etkileşimde context resume edilir
 * ve listener'lar kaldırılır.
 * ════════════════════════════════════════════════════════════════════
 */

let sharedCtx: AudioContext | null = null;
let unlockAttempted = false;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!sharedCtx) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      sharedCtx = new AudioCtx();
    } catch {
      return null;
    }
  }

  // Suspended ise resume dene (kullanıcı zaten etkileşime girdiyse başarılı olur)
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {
      /* sessizce başarısız - tarayıcı henüz izin vermiyor */
    });
  }

  return sharedCtx;
}

// Sayfa yüklenince ilk kullanıcı etkileşimini bekle, context'i unlock et
if (typeof window !== 'undefined' && !unlockAttempted) {
  unlockAttempted = true;
  const unlock = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* ignore */ });
    }
    // Tek seferlik unlock yeter
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock, { passive: true });
  document.addEventListener('touchstart', unlock, { passive: true });
  document.addEventListener('keydown', unlock, { passive: true });
}

/**
 * Yeni sipariş/ödeme için dikkat çeken kısa bir "ding" sesi çalar.
 * WebAudio API kullanır - harici dosya gerekmez.
 */
export function playDing(volume = 0.3) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    // İki nota ile kısa bir "ding-dong" - hoş, dikkat çekici ama rahatsız değil
    const notes = [
      { freq: 880, start: 0, duration: 0.15 },   // A5
      { freq: 659.25, start: 0.12, duration: 0.2 }, // E5
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Zarf (envelope) - smooth attack/release
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
      gain.gain.setValueAtTime(volume, t0 + duration - 0.08);
      gain.gain.linearRampToValueAtTime(0, t0 + duration);

      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    });

    // NOT: Paylaşılan context, close() ETMİYORUZ. Reuse edilir.
  } catch {
    // Ses çalamazsa sessiz geç
  }
}

/**
 * Başarılı ödeme için kısa "cha-ching" benzeri ses
 */
export function playSuccess(volume = 0.25) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // Yükselen üçlü arpej - başarı hissi
    const notes = [
      { freq: 523.25, start: 0, duration: 0.1 },    // C5
      { freq: 659.25, start: 0.08, duration: 0.1 }, // E5
      { freq: 783.99, start: 0.16, duration: 0.25 }, // G5
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
      gain.gain.setValueAtTime(volume, t0 + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, t0 + duration);

      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    });

  } catch {
    // Sessiz geç
  }
}

/**
 * Garson çağrı sesi - 3'lü ding (dikkat çekici, telaş hissi)
 * Müşteri ihtiyacı olduğunda çalar.
 */
export function playCall(volume = 0.35) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // 3 ding - tiz ve hızlı, müşteri ihtiyacı için dikkat çekici
    const notes = [
      { freq: 1046.5, start: 0, duration: 0.13 },     // C6
      { freq: 1046.5, start: 0.18, duration: 0.13 },  // C6 tekrar
      { freq: 1318.51, start: 0.36, duration: 0.22 }, // E6 (kapanış)
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
      gain.gain.setValueAtTime(volume, t0 + duration - 0.06);
      gain.gain.linearRampToValueAtTime(0, t0 + duration);

      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    });

  } catch {
    // Sessiz geç
  }
}

/**
 * Yeni sipariş sesi - 2'li melodik ding (E6 → A6)
 * Çağrı sesinden farklı, daha tatlı/davetkar.
 */
export function playOrderDing(volume = 0.32) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // E6 → A6 yumuşak iniş (yeni sipariş, bilgi verici)
    const notes = [
      { freq: 1318.51, start: 0, duration: 0.18 },     // E6
      { freq: 1760.0, start: 0.14, duration: 0.28 },   // A6 (üstüne biner)
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // sıcak, melodik
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.025);
      gain.gain.setValueAtTime(volume * 0.6, t0 + duration - 0.1);
      gain.gain.linearRampToValueAtTime(0, t0 + duration);

      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    });

  } catch {
    // Sessiz geç
  }
}

// ============================================================
// SES KÜTÜPHANESİ — İşletme seçimine göre dispatch
// ============================================================

export type SoundId = 'bell' | 'chime' | 'pulse' | 'soft' | 'marimba' | 'classic';

export const SOUND_OPTIONS: Array<{
  id: SoundId;
  name: string;
  description: string;
}> = [
  {
    id: 'bell',
    name: 'Zil',
    description: '3\'lü tiz ding — acil, dikkat çekici',
  },
  {
    id: 'chime',
    name: 'Tını',
    description: '2\'li melodik (E6→A6) — sıcak, davetkar',
  },
  {
    id: 'pulse',
    name: 'Nabız',
    description: 'Hızlı 4\'lü atım — alarm hissi',
  },
  {
    id: 'soft',
    name: 'Yumuşak',
    description: 'Tek nota fade — sakin',
  },
  {
    id: 'marimba',
    name: 'Marimba',
    description: 'Üçlü akor (C-E-G) — ahşap, sıcak',
  },
  {
    id: 'classic',
    name: 'Klasik',
    description: 'Tek "ding" — geleneksel',
  },
];

/**
 * Pulse - 4'lü hızlı atım, alarm hissi
 */
export function playPulse(volume = 0.32) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    [0, 0.1, 0.2, 0.3].forEach((start) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume * 0.5, t0 + 0.01);
      gain.gain.linearRampToValueAtTime(0, t0 + 0.07);
      osc.start(t0);
      osc.stop(t0 + 0.08);
    });

  } catch {
    // sessiz
  }
}

/**
 * Soft - tek yumuşak nota, fade
 */
export function playSoft(volume = 0.3) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880; // A5
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.06);
    gain.gain.linearRampToValueAtTime(volume * 0.5, t0 + 0.3);
    gain.gain.linearRampToValueAtTime(0, t0 + 0.6);
    osc.start(t0);
    osc.stop(t0 + 0.65);

  } catch {
    // sessiz
  }
}

/**
 * Marimba - C-E-G akor, ahşap sıcak
 */
export function playMarimba(volume = 0.3) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // C5 (523.25), E5 (659.25), G5 (783.99) - majör akor
    const notes = [
      { freq: 523.25, start: 0 },
      { freq: 659.25, start: 0.05 },
      { freq: 783.99, start: 0.1 },
    ];

    notes.forEach(({ freq, start }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });

  } catch {
    // sessiz
  }
}

/**
 * Classic - tek geleneksel ding (otel reception zili)
 */
export function playClassic(volume = 0.35) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1568; // G6
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
    osc.start(t0);
    osc.stop(t0 + 0.75);

  } catch {
    // sessiz
  }
}

/**
 * Dispatch — id'ye göre uygun sesi çalar
 */
export function playSound(id: SoundId, volume?: number) {
  switch (id) {
    case 'bell':
      return playCall(volume);
    case 'chime':
      return playOrderDing(volume);
    case 'pulse':
      return playPulse(volume);
    case 'soft':
      return playSoft(volume);
    case 'marimba':
      return playMarimba(volume);
    case 'classic':
      return playClassic(volume);
  }
}
