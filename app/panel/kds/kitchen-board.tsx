'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  advanceKitchenOrder,
  getKitchenOrders,
  type KitchenOrder,
} from '@/lib/actions/kds';

interface KitchenBoardProps {
  initialOrders: KitchenOrder[];
  businessId: string;
  businessName: string;
}

export function KitchenBoard({ initialOrders, businessId, businessName }: KitchenBoardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevReceivedIds = useRef<Set<string>>(
    new Set(initialOrders.filter((o) => o.status === 'received').map((o) => o.id))
  );

  // Her dakikada bir zaman göstergesini güncelle
  useEffect(() => {
    setNow(Date.now()); // ilk değer client'ta set edilir (hydration mismatch yok)
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Ses çal (yeni sipariş)
  const playDing = useCallback(() => {
    if (!soundEnabled) return;
    if (!audioRef.current) {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT..');
      audioRef.current = audio;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 0.6;
    audioRef.current.play().catch(() => {});
  }, [soundEnabled]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('kds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        () => refreshOrders()
      )
      .subscribe();

    const interval = setInterval(refreshOrders, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function refreshOrders() {
    const result = await getKitchenOrders();
    if (result.success && result.orders) {
      // Yeni received sipariş var mı? Ses çal
      const currentReceivedIds = new Set(
        result.orders.filter((o) => o.status === 'received').map((o) => o.id)
      );
      const prevIds = prevReceivedIds.current;
      const hasNew = result.orders.some(
        (o) => o.status === 'received' && !prevIds.has(o.id)
      );
      if (hasNew) playDing();
      prevReceivedIds.current = currentReceivedIds;
      setOrders(result.orders);
    }
  }

  async function handleAdvance(orderId: string) {
    setBusyOrderId(orderId);
    const result = await advanceKitchenOrder(orderId);
    setBusyOrderId(null);

    if (!result.success) {
      alert(`Hata: ${result.error}`);
      return;
    }

    // Optimistic update
    if (result.newStatus === 'preparing') {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'preparing' } : o))
      );
    } else if (result.newStatus === 'ready') {
      // Hazır oldu → KDS'den kaldır (POS ekranında görünecek)
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  }

  // Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // Fullscreen olaylarını dinle (ESC ile çıkış dahil)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Sıralama: Bekleyenler önce, bekleyenler ve hazırlananlar ayrı grup
  const waiting = orders.filter((o) => o.status === 'received');
  const preparing = orders.filter((o) => o.status === 'preparing');

  return (
    <div
      data-theme="espresso"
      className="w-full h-full min-h-screen flex flex-col"
      style={{
        background: 'var(--paper)',
        color: 'var(--ink)',
      }}
    >
      {/* ============ TOPBAR ============ */}
      <header
        className="flex items-center justify-between px-5 md:px-8 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-[8px] grid place-items-center flex-shrink-0"
              style={{
                background: 'var(--accent)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                fontWeight: 500,
                color: '#FAF5EA',
                letterSpacing: '-0.04em',
              }}
            >
              a
            </div>
            <div className="flex flex-col leading-tight">
              <span
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
              >
                {businessName}
              </span>
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--accent)',
                }}
              >
                MUTFAK EKRANI
              </span>
            </div>
          </div>

          {/* Sayaç */}
          <div
            className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.1em',
              }}
            >
              {waiting.length}
            </span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                color: 'var(--ink-3)',
                letterSpacing: '0.14em',
                fontWeight: 700,
              }}
            >
              BEKLİYOR
            </span>
            <span style={{ color: 'var(--line)' }}>·</span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--gold)',
                letterSpacing: '0.1em',
              }}
            >
              {preparing.length}
            </span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                color: 'var(--ink-3)',
                letterSpacing: '0.14em',
                fontWeight: 700,
              }}
            >
              HAZIRLANIYOR
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ses switch */}
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-10 h-10 rounded-full grid place-items-center transition-colors"
            style={{
              background: soundEnabled ? 'color-mix(in srgb, var(--olive) 18%, transparent)' : 'var(--paper-2)',
              border: `1px solid ${soundEnabled ? 'var(--olive)' : 'var(--line)'}`,
              color: soundEnabled ? 'var(--olive)' : 'var(--ink-3)',
            }}
            title={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                <path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
                <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-full grid place-items-center transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
            title={isFullscreen ? 'Tam ekranı kapat' : 'Tam ekran'}
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Paneli gör */}
          <a
            href="/panel/pos"
            className="hidden md:flex items-center gap-1.5 px-3.5 h-10 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            PANELE DÖN
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </header>

      {/* ============ KARTLAR GRID ============ */}
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div
              className="text-6xl md:text-7xl mb-4 opacity-30"
              style={{ color: 'var(--ink-3)' }}
            >
              ○
            </div>
            <h2
              className="mb-2"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--ink-2)',
              }}
            >
              Sipariş bekleniyor
            </h2>
            <p
              className="text-sm"
              style={{ color: 'var(--ink-3)' }}
            >
              Yeni siparişler geldiğinde burada görünecek.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-3 md:gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            }}
          >
            {/* Bekleyenler önce */}
            {waiting.map((order) => (
              <TicketCard
                key={order.id}
                order={order}
                now={now}
                busy={busyOrderId === order.id}
                onAdvance={handleAdvance}
              />
            ))}
            {/* Hazırlananlar sonra */}
            {preparing.map((order) => (
              <TicketCard
                key={order.id}
                order={order}
                now={now}
                busy={busyOrderId === order.id}
                onAdvance={handleAdvance}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Ticket Card — Mutfak için büyük kart
// ============================================================

function TicketCard({
  order,
  now,
  busy,
  onAdvance,
}: {
  order: KitchenOrder;
  now: number;
  busy: boolean;
  onAdvance: (id: string) => void;
}) {
  const ageMin = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000));
  const urgent = ageMin > 10;
  const isWaiting = order.status === 'received';

  // Sipariş tipi etiketi
  const typeLabel =
    order.order_type === 'dine_in'
      ? order.table_label || 'MASA'
      : order.order_type === 'pickup'
      ? 'GEL-AL'
      : 'PAKET';

  // Durum rengi
  const statusAccent = isWaiting ? 'var(--accent)' : 'var(--gold)';

  return (
    <article
      className="rounded-[16px] flex flex-col overflow-hidden transition-all"
      style={{
        background: 'var(--card)',
        border: urgent
          ? '2px solid var(--danger)'
          : `1px solid var(--line)`,
        borderLeftWidth: 6,
        borderLeftColor: statusAccent,
        boxShadow: urgent
          ? '0 0 0 4px color-mix(in srgb, var(--danger) 12%, transparent)'
          : '0 4px 16px rgba(0,0,0,0.2)',
        opacity: busy ? 0.5 : 1,
      }}
    >
      {/* Card head */}
      <div
        className="px-4 py-3 flex items-start justify-between gap-3"
        style={{ borderBottom: '1px dashed var(--line)' }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="uppercase mb-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            {order.order_type === 'dine_in' ? 'MASA' : typeLabel}
            {order.order_type === 'dine_in' && order.table_label && ` · ${order.table_label}`}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--ink)',
            }}
          >
            #{order.order_no}
          </div>
          {order.customer_name && (
            <div
              className="text-xs mt-1"
              style={{ color: 'var(--ink-3)' }}
            >
              {order.customer_name}
            </div>
          )}
        </div>

        {/* Süre */}
        <div
          className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full"
          style={{
            background: urgent
              ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
              : 'transparent',
            color: urgent ? 'var(--danger)' : 'var(--ink-3)',
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            fontWeight: urgent ? 700 : 500,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{ageMin} dk</span>
        </div>
      </div>

      {/* Items — BÜYÜK FONT (mutfakta 3m'den okunabilsin) */}
      <div className="px-4 py-3 flex-1">
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id}>
              <div className="flex items-baseline gap-3">
                <span
                  className="flex-shrink-0"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: statusAccent,
                    minWidth: 36,
                  }}
                >
                  {item.quantity}×
                </span>
                <span
                  className="flex-1 leading-tight"
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: 'var(--ink)',
                  }}
                >
                  {item.product_name}
                </span>
              </div>
              {/* Varyasyon seçimleri - mutfak için kritik */}
              {item.options && item.options.length > 0 && (
                <div
                  className="mt-1 ml-[48px] flex flex-wrap gap-1"
                >
                  {item.options.map((opt, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[12px] font-semibold"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                        color: 'var(--accent)',
                        fontFamily: 'var(--f-mono)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {opt.value_name}
                    </span>
                  ))}
                </div>
              )}
              {item.note && (
                <div
                  className="mt-1 ml-[48px] px-2 py-1 rounded text-xs italic"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
                    color: 'var(--gold)',
                    borderLeft: '2px solid var(--gold)',
                  }}
                >
                  {item.note}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Sipariş notu (üst seviye, müşteri notu) */}
        {order.note && (
          <div
            className="mt-3 px-3 py-2 rounded-[10px] text-sm italic"
            style={{
              background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
              borderLeft: '3px solid var(--gold)',
              color: 'var(--ink-2)',
            }}
          >
            <span
              className="uppercase mr-1.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--gold)',
                fontStyle: 'normal',
              }}
            >
              NOT
            </span>
            {order.note}
          </div>
        )}
      </div>

      {/* Action button */}
      <div
        className="px-3 pb-3 pt-1"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <button
          onClick={() => onAdvance(order.id)}
          disabled={busy}
          className="w-full h-12 rounded-[12px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
          style={{
            background: isWaiting ? 'var(--accent)' : 'var(--olive)',
            color: '#FAF5EA',
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            letterSpacing: '0.08em',
          }}
        >
          {isWaiting ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              BAŞLA
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              HAZIR
            </>
          )}
        </button>
      </div>
    </article>
  );
}
