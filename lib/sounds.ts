'use client';

/**
 * Yeni sipariş/ödeme için dikkat çeken kısa bir "ding" sesi çalar.
 * WebAudio API kullanır - harici dosya gerekmez.
 * Tarayıcı autoplay politikaları: kullanıcı bir kez etkileşime girmeden
 * ses çalmayabilir. İlk tıklamadan sonra çalmaya başlar.
 */
export function playDing(volume = 0.3) {
  if (typeof window === 'undefined') return;

  try {
    // Bazı eski tarayıcılar için fallback
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();

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

    // Context'i temizle
    setTimeout(() => {
      ctx.close().catch(() => {
        /* ignore */
      });
    }, 1000);
  } catch {
    // Ses çalamazsa sessiz geç
  }
}

/**
 * Başarılı ödeme için kısa "cha-ching" benzeri ses
 */
export function playSuccess(volume = 0.25) {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

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

    setTimeout(() => {
      ctx.close().catch(() => {
        /* ignore */
      });
    }, 1500);
  } catch {
    // Sessiz geç
  }
}

/**
 * Garson çağrı sesi - 3'lü ding (dikkat çekici, telaş hissi)
 * Müşteri ihtiyacı olduğunda çalar.
 */
export function playCall(volume = 0.35) {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

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

    setTimeout(() => {
      ctx.close().catch(() => {
        /* ignore */
      });
    }, 1500);
  } catch {
    // Sessiz geç
  }
}
