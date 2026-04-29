'use client';

import { useEffect, useState } from 'react';
import { LiveClock } from './live-clock';

function getGreeting(hour: number): {
  text: string;
  tone: 'morning' | 'day' | 'evening' | 'night';
  emoji: string;
} {
  if (hour < 6) return { text: 'İyi geceler', tone: 'night', emoji: '🌙' };
  if (hour < 12) return { text: 'Günaydın', tone: 'morning', emoji: '☀️' };
  if (hour < 18) return { text: 'İyi günler', tone: 'day', emoji: '☕' };
  return { text: 'İyi akşamlar', tone: 'evening', emoji: '🌅' };
}

// Saat + aktiviteye göre akıllı mesaj
function getSmartSubtext(params: {
  hour: number;
  weekday: number; // 0=Paz, 1=Pzt...
  todayOrderCount: number;
  activeOrders: number;
}): string {
  const { hour, weekday, todayOrderCount, activeOrders } = params;
  const isSunday = weekday === 0;
  const isEarlyMorning = hour >= 5 && hour < 10;
  const isLunch = hour >= 11 && hour < 15;
  const isAfternoon = hour >= 15 && hour < 18;
  const isEvening = hour >= 18 && hour < 22;
  const isLate = hour >= 22 || hour < 5;

  // Aktif yoğunluk varsa
  if (activeOrders >= 5) return 'Yoğun bir an — ocak harıl harıl.';
  if (activeOrders >= 3) return 'İyi bir tempo yakaladın.';

  // Öğle yoğunluğu
  if (isLunch && todayOrderCount >= 10) return 'Öğle yoğunluğu kendini gösteriyor.';
  if (isLunch && todayOrderCount >= 3) return 'Öğle temposu normal seyirde.';
  if (isLunch && todayOrderCount === 0) return 'Öğle saati ama henüz sessiz. Menü hazır mı?';

  // Sabah
  if (isEarlyMorning && todayOrderCount === 0) return 'Sakin bir sabah. Güne hazır mısın?';
  if (isEarlyMorning && todayOrderCount >= 3) return 'Güne erken başladın, işler kıpırdadı.';
  if (isEarlyMorning) return 'Güne yavaş yavaş başlıyoruz.';

  // Öğleden sonra
  if (isAfternoon && todayOrderCount === 0) return 'Bugün sakin. Bir kahve de sana iyi gelir.';
  if (isAfternoon) return 'Öğleden sonra temposu.';

  // Akşam
  if (isEvening && todayOrderCount >= 15) return 'Bugün kalabalıktı. Dinlenmeyi unutma.';
  if (isEvening && todayOrderCount >= 5) return 'Akşamın tadını çıkarıyorsunuz.';
  if (isEvening) return 'Sessiz bir akşam. Belki bir çay?';

  // Geç saat
  if (isLate) return 'Gece geç oldu. İyi ki hâlâ buradasın.';

  // Pazar
  if (isSunday && todayOrderCount === 0) return 'Pazar — sakin günlerden.';
  if (isSunday) return 'Pazar keyfi.';

  return 'Günün ortasındayız.';
}

export function DynamicGreeting({
  firstName,
  todayOrderCount,
  activeOrders,
  todayRevenue,
}: {
  firstName: string;
  todayOrderCount: number;
  activeOrders: number;
  todayRevenue: number;
}) {
  // İlk render: server ile aynı olsun diye sabit değer
  const [hour, setHour] = useState(() => new Date().getHours());
  const [weekday, setWeekday] = useState(() => new Date().getDay());

  useEffect(() => {
    // Mount sonrası gerçek saati güncelle
    setHour(new Date().getHours());
    setWeekday(new Date().getDay());

    // Her 5 dakikada bir yenile
    const interval = setInterval(() => {
      setHour(new Date().getHours());
      setWeekday(new Date().getDay());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const { text: greeting, tone, emoji } = getGreeting(hour);
  const subtext = getSmartSubtext({
    hour,
    weekday,
    todayOrderCount,
    activeOrders,
  });

  // Saat dilimine göre minik ton farkı
  const toneColor =
    tone === 'morning'
      ? 'var(--gold)'
      : tone === 'day'
        ? 'var(--accent)'
        : tone === 'evening'
          ? 'var(--accent-ink)'
          : 'var(--super)';

  const dateLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Canlı özet
  const liveSummary =
    todayOrderCount > 0
      ? `Bugün ${todayOrderCount} sipariş · ₺${Math.round(todayRevenue).toLocaleString('tr-TR')}`
      : 'Bugün henüz sipariş yok';

  return (
    <div className="mb-10" style={{ animation: 'grFadeIn 0.6s ease-out' }}>
      <div
        className="uppercase mb-3 flex items-center gap-2 flex-wrap"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: toneColor,
        }}
      >
        <span>ANA SAYFA · {dateLabel.toUpperCase()}</span>
        <span style={{ color: 'var(--ink-3)' }}>·</span>
        <LiveClock
          showSeconds
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--ink-2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
      <h1
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span>
          {greeting}, {firstName}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 36,
            display: 'inline-block',
            animation: 'grEmojiBob 4s ease-in-out infinite',
          }}
        >
          {emoji}
        </span>
      </h1>
      <p
        className="text-ink-2 text-base mt-3 flex items-center gap-2 flex-wrap"
        style={{ animation: 'grSubFade 0.7s ease-out 0.2s both' }}
      >
        <span>{subtext}</span>
        <span className="text-ink-3">·</span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            color: 'var(--ink-3)',
          }}
        >
          {liveSummary}
        </span>
      </p>
      <style jsx>{`
        @keyframes grFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes grSubFade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes grEmojiBob {
          0%, 100% {
            transform: translateY(0) rotate(-2deg);
          }
          50% {
            transform: translateY(-4px) rotate(3deg);
          }
        }
      `}</style>
    </div>
  );
}
