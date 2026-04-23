'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DashboardRealtime({
  businessId,
  initialTodayOrderCount,
}: {
  businessId: string;
  initialTodayOrderCount: number;
}) {
  const router = useRouter();
  const lastOrderCountRef = useRef(initialTodayOrderCount);
  const [confettiFired, setConfettiFired] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Orders kanalı — insert/update dinle
    const ordersChannel = supabase
      .channel(`dashboard-orders-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          // Yeni bir sipariş geldi mi?
          const isInsert = payload.eventType === 'INSERT';

          // İlk satış konfetisi — gün başlangıcında 0'dan 1'e çıkmışsa
          if (
            isInsert &&
            lastOrderCountRef.current === 0 &&
            !confettiFired
          ) {
            // Bugünün ilk siparişi mi? Sadece gün bazlı kontrol.
            const orderDate = new Date(
              (payload.new as { created_at: string }).created_at
            );
            const now = new Date();
            const isToday =
              orderDate.getDate() === now.getDate() &&
              orderDate.getMonth() === now.getMonth() &&
              orderDate.getFullYear() === now.getFullYear();

            if (isToday) {
              // localStorage'da bugünün konfetisi atıldı mı kontrol et
              const todayKey = `aleg-confetti-${now.toISOString().slice(0, 10)}`;
              if (typeof window !== 'undefined' && !window.localStorage.getItem(todayKey)) {
                fireConfetti();
                window.localStorage.setItem(todayKey, '1');
                setConfettiFired(true);
              }
            }
            lastOrderCountRef.current = 1;
          }

          // Router refresh — yeni veriyi getir (debounced)
          debouncedRefresh(() => router.refresh());
        }
      )
      .subscribe();

    // Waiter calls kanalı
    const waiterChannel = supabase
      .channel(`dashboard-waiter-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_calls',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          debouncedRefresh(() => router.refresh());
        }
      )
      .subscribe();

    // Reviews kanalı (yeni değerlendirmeler için)
    const reviewsChannel = supabase
      .channel(`dashboard-reviews-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          debouncedRefresh(() => router.refresh());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(waiterChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [businessId, router, confettiFired]);

  return null;
}

// Debounce — hızlı gelen olayları birleştir
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedRefresh(fn: () => void) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(fn, 500);
}

// Konfeti — canvas-confetti dinamik import
async function fireConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default;
    const count = 160;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#C4553A', '#B08A3E', '#6B7A4B', '#E8C9BD', '#F4EEE2'],
    };

    // Patlama dizisi
    confetti({
      ...defaults,
      particleCount: count * 0.25,
      spread: 26,
      startVelocity: 55,
    });
    confetti({
      ...defaults,
      particleCount: count * 0.2,
      spread: 60,
    });
    confetti({
      ...defaults,
      particleCount: count * 0.35,
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    confetti({
      ...defaults,
      particleCount: count * 0.1,
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    confetti({
      ...defaults,
      particleCount: count * 0.1,
      spread: 120,
      startVelocity: 45,
    });
  } catch (err) {
    // Kitaplık yoksa sessizce geç
    console.warn('Konfeti yüklenemedi:', err);
  }
}
