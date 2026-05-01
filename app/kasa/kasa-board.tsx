'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useCashierSession } from '@/lib/cashier-session';
import { OrdersBoard } from '@/app/panel/(shell)/pos/orders-board';
import { KasaTabs, type KasaTab } from './kasa-tabs';
import { TablesGrid } from './tables-grid';
import { RegisterPanel } from './register-panel';
import { OrderComposer } from './order-composer';
import { TableDetailModal } from './table-detail-modal';
import { HesapPanel } from '@/components/order/hesap-panel';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { PrinterStatusWidget } from '@/components/panel/printer-status-widget';
import { AgentStatusBadge } from '@/components/panel/agent-status-badge';
import {
  getOrderAsDetail,
  type TableOrderDetail,
} from '@/lib/actions/tables-status';
import { getActiveCashSession } from '@/lib/actions/payments';
import {
  getActiveWaiterCalls,
  resolveWaiterCall,
  resolveAllPendingCalls,
  type WaiterCall,
} from '@/lib/actions/call-buttons';
import {
  getRecentNewOrders,
  type NewOrderNotification,
} from '@/lib/actions/orders-notify';
import {
  getKasaSoundSettings,
} from '@/lib/actions/sound-settings';
import {
  type SoundSettings,
  DEFAULT_SOUND_SETTINGS,
} from '@/lib/sound-types';
import { playSound, type SoundId } from '@/lib/sounds';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toast';
import type { ActiveOrder } from '@/lib/actions/pos';
import type { TableWithStatus } from '@/lib/actions/tables-status';

type Props = {
  initialOrders: ActiveOrder[];
  businessId: string;
};

type ComposerMode =
  | { kind: 'table'; tableId: string; tableName: string }
  | { kind: 'quick' }
  | { kind: 'addToOrder'; orderId: string; tableName?: string };

export function KasaBoard({ initialOrders, businessId }: Props) {
  const { cashier, businessName, lock, signOut } = useCashierSession();
  const [activeTab, setActiveTab] = useState<KasaTab>('tables');
  const [composerState, setComposerState] = useState<{ mode: ComposerMode } | null>(null);
  const [tableDetail, setTableDetail] = useState<{
    tableId: string;
    tableName: string;
  } | null>(null);
  // Hızlı satış HesapPanel — kullanıcı "Yeni Satış" tıklayınca direkt açılır
  // Boş başlar, menüden ürün eklenince createManualOrder ile sipariş yaratılır
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [quickSaleOrders, setQuickSaleOrders] = useState<TableOrderDetail[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // Yeni sipariş flash bildirimi - timestamp ms (5 dk = 300000 ms)
  // Bu zamana kadar Siparişler tab'ında kırmızı bildirim yansın söner
  const [orderFlashUntil, setOrderFlashUntil] = useState<number>(0);
  const [, setFlashTick] = useState(0); // animasyon için re-render tick

  // ============================================================
  // GARSON ÇAĞRILARI (waiter_calls) - Tüm tab'larda aktif
  // ============================================================
  const [activeCalls, setActiveCalls] = useState<WaiterCall[]>([]);
  const [callsPanelOpen, setCallsPanelOpen] = useState(false);
  const [callsBump, setCallsBump] = useState(0);

  // Masaya göre aktif çağrı sayısı haritası — TableCard rozet için
  const callsByTable = useMemo(() => {
    const map = new Map<string, number>();
    activeCalls.forEach((call) => {
      if (call.table_id) {
        map.set(call.table_id, (map.get(call.table_id) || 0) + 1);
      }
    });
    return map;
  }, [activeCalls]);

  // ============================================================
  // SESSIZE ALMA (mute)
  // ============================================================
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('aleg-kasa-muted') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('aleg-kasa-muted', muted ? '1' : '0');
    } catch {
      // yoksay
    }
  }, [muted]);

  // ============================================================
  // TAM EKRAN
  // ============================================================
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // fullscreen API desteklenmiyor olabilir, sessizce yoksay
    }
  }, []);

  // Polling/realtime callbacks içinde stale closure olmasın diye ref
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // ============================================================
  // SES AYARLARI - işletmenin seçtiği bildirim sesleri
  // ============================================================
  const soundSettingsRef = useRef<SoundSettings>(DEFAULT_SOUND_SETTINGS);

  // Mount'ta ve her 60 saniyede bir ses ayarlarını çek (panel'den değiştirildiğinde yakalansın)
  useEffect(() => {
    if (!businessId) return;
    let canceled = false;

    const fetchSettings = async () => {
      const r = await getKasaSoundSettings(businessId);
      if (!canceled && r.success && r.settings) {
        soundSettingsRef.current = r.settings;
      }
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 60000);

    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [businessId]);

  // Helper - mute kontrolü ile ses çal
  const playCallSound = useCallback(() => {
    if (mutedRef.current) return;
    playSound(
      soundSettingsRef.current.call_sound as SoundId,
      soundSettingsRef.current.volume
    );
  }, []);

  const playOrderSound = useCallback(() => {
    if (mutedRef.current) return;
    playSound(
      soundSettingsRef.current.order_sound as SoundId,
      soundSettingsRef.current.volume
    );
  }, []);

  // ============================================================
  // YENİ SİPARİŞ BİLDİRİMLERİ (orders.source='qr')
  // ============================================================
  // Daha önce ses çaldığımız sipariş ID'leri — tekrar çalmasın
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  // Flash animasyonu için tick - her 700ms'de bir state değiştir
  useEffect(() => {
    if (Date.now() >= orderFlashUntil) return;
    const interval = setInterval(() => {
      setFlashTick((t) => t + 1);
      // Süresi geçtiyse durdur
      if (Date.now() >= orderFlashUntil) {
        // Componenent re-render olunca interval cleanup edilir
      }
    }, 700);
    return () => clearInterval(interval);
  }, [orderFlashUntil]);

  // Polling - 5 saniyede bir son 30 saniyenin yeni QR siparişleri
  useEffect(() => {
    let canceled = false;
    let initialized = false;

    const fetchOrders = async () => {
      const result = await getRecentNewOrders(30);
      if (canceled) return;
      if (!result.success || !result.orders) return;

      const orders = result.orders;

      if (!initialized) {
        // İlk çağrıda mevcut olanları "görüldü" işaretle (ses çalma)
        seenOrderIdsRef.current = new Set(orders.map((o) => o.id));
        initialized = true;
        return;
      }

      // Yeni gelenleri bul
      const seen = seenOrderIdsRef.current;
      const fresh = orders.filter((o) => !seen.has(o.id));
      if (fresh.length > 0) {
        playOrderSound();
        // 5 dakika boyunca kırmızı flash başlat
        setOrderFlashUntil(Date.now() + 5 * 60 * 1000);
        fresh.forEach((o) => {
          const tableLabel = o.table_name
            ? o.table_name.toUpperCase()
            : 'AL-GÖTÜR';
          const totalLabel = `₺${Math.round(o.total)}`;
          toast.info(`🍽 ${tableLabel} · Yeni sipariş · ${totalLabel}`, 6000);
        });
        // Browser notification (sayfa arka planda ise)
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          document.visibilityState === 'hidden'
        ) {
          try {
            const n = new Notification('Yeni sipariş', {
              body: `${fresh.length} yeni sipariş geldi`,
              icon: '/icon-192.png',
              tag: 'aleg-new-order',
            });
            setTimeout(() => n.close(), 4500);
          } catch {
            // yoksay
          }
        }
        // Refresh tetikle - masa/sipariş listesi güncellensin
        setRefreshKey((k) => k + 1);
      }
      // Set'i güncelle — yeni gelenleri ekle
      const next = new Set(seen);
      orders.forEach((o) => next.add(o.id));
      // 100'den fazla birikmesin (eski olanları temizle)
      if (next.size > 100) {
        const arr = Array.from(next);
        seenOrderIdsRef.current = new Set(arr.slice(-50));
      } else {
        seenOrderIdsRef.current = next;
      }
    };

    // İlk fetch
    fetchOrders();
    // Polling - 5 saniye
    const interval = setInterval(fetchOrders, 5000);

    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [playOrderSound]);

  // Realtime subscribe - INSERT yeni sipariş
  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('orders_new_kasa_board')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        async (payload) => {
          const newOrder = payload.new as NewOrderNotification;
          // Sadece QR kaynaklılar için bildirim
          if (newOrder.source !== 'qr') return;

          // Daha önce görüldüyse atla (polling de yakalamış olabilir)
          if (seenOrderIdsRef.current.has(newOrder.id)) return;
          seenOrderIdsRef.current.add(newOrder.id);

          // Masa adını çek
          if (newOrder.table_id) {
            try {
              const sb = createClient();
              const { data: tbl } = await sb
                .from('tables')
                .select('name')
                .eq('id', newOrder.table_id)
                .maybeSingle();
              if (tbl) {
                newOrder.table_name = (tbl as { name: string }).name;
              }
            } catch {
              // yoksay
            }
          }

          playOrderSound();
          const tableLabel = newOrder.table_name
            ? newOrder.table_name.toUpperCase()
            : 'AL-GÖTÜR';
          const totalLabel = `₺${Math.round(newOrder.total)}`;
          toast.info(
            `🍽 ${tableLabel} · Yeni sipariş · ${totalLabel}`,
            6000
          );
          setRefreshKey((k) => k + 1);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // yoksay
      }
    };
  }, [businessId, playOrderSound]);

  // Browser notification izni iste (kasa sayfası ilk açılışta)
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      // Kullanıcı bir tıklama yaptıktan sonra istemek daha güvenli
      // Ama sessiz iste — reddederse rahatsız etme
      Notification.requestPermission().catch(() => {
        // yoksay
      });
    }
  }, []);

  // Polling - 5 saniyede bir aktif çağrıları çek (realtime fallback)
  useEffect(() => {
    let canceled = false;
    let lastIds = new Set<string>();

    const fetchCalls = async () => {
      const result = await getActiveWaiterCalls();
      if (canceled) return;
      if (result.success) {
        const newCalls = result.calls || [];
        const newIds = new Set(newCalls.map((c) => c.id));
        // Yeni gelen çağrıları bul
        const fresh = newCalls.filter((c) => !lastIds.has(c.id));
        if (fresh.length > 0 && lastIds.size > 0) {
          // İlk fetch DEĞİL, gerçekten yeni çağrı geldi
          playCallSound();
          fresh.forEach((c) => {
            const tableLabel = c.table_name
              ? c.table_name.toUpperCase()
              : 'BİLİNMEYEN MASA';
            toast.info(
              `🔔 ${tableLabel} · ${c.button_name_snapshot || 'Çağrı'}`,
              6000
            );
          });
          setCallsBump((n) => n + 1);
        }
        setActiveCalls(newCalls);
        lastIds = newIds;
      }
    };

    // İlk fetch
    fetchCalls();
    // Polling - 5 saniye
    const interval = setInterval(fetchCalls, 5000);

    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [playCallSound]);

  // Realtime subscribe - varsa anlık (polling fallback olarak yedekler)
  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('waiter_calls_kasa_board')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waiter_calls',
          filter: `business_id=eq.${businessId}`,
        },
        async (payload) => {
          const newCall = payload.new as WaiterCall;
          // Masa adını çek
          if (newCall.table_id) {
            try {
              const sb = createClient();
              const { data: tbl } = await sb
                .from('tables')
                .select('name')
                .eq('id', newCall.table_id)
                .maybeSingle();
              if (tbl) {
                newCall.table_name = (tbl as { name: string }).name;
              }
            } catch {
              // yoksay
            }
          }
          setActiveCalls((prev) => {
            // Duplicate önle (polling de eklemiş olabilir)
            if (prev.some((c) => c.id === newCall.id)) return prev;
            return [newCall, ...prev];
          });
          setCallsBump((n) => n + 1);
          playCallSound();
          const tableLabel = newCall.table_name
            ? newCall.table_name.toUpperCase()
            : 'BİLİNMEYEN MASA';
          toast.info(
            `🔔 ${tableLabel} · ${newCall.button_name_snapshot || 'Çağrı'}`,
            6000
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waiter_calls',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const updated = payload.new as WaiterCall;
          if (updated.status === 'resolved') {
            setActiveCalls((prev) => prev.filter((c) => c.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // yoksay
      }
    };
  }, [businessId, playCallSound]);

  const handleResolveCall = useCallback(async (callId: string) => {
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId));
    const result = await resolveWaiterCall(callId);
    if (!result.success) {
      toast.error(result.error || 'İşlem başarısız');
      const refresh = await getActiveWaiterCalls();
      if (refresh.success) setActiveCalls(refresh.calls || []);
    }
  }, []);

  const handleResolveAllCalls = useCallback(async () => {
    if (activeCalls.length === 0) return;
    setActiveCalls([]);
    const result = await resolveAllPendingCalls();
    if (!result.success) {
      toast.error(result.error || 'İşlem başarısız');
      const refresh = await getActiveWaiterCalls();
      if (refresh.success) setActiveCalls(refresh.calls || []);
    } else {
      toast.success(`${result.count || 0} çağrı temizlendi`);
    }
  }, [activeCalls.length]);

  // Kasa açık mı? — kapalıysa sipariş/ödeme alımı engellenir
  // sessionStorage cache ile anında başlat
  const [kasaOpen, setKasaOpen] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem('aleg-kasa-session');
      if (cached && cached !== 'null') return true;
      if (cached === 'null') return false;
    } catch {
      // yoksay
    }
    return null;
  });

  // Kasa session durumunu takip et - tab değişiminde veya sipariş/kasa event'inde
  // (Polling YOK - kullanıcı action'ları ile senkron)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await getActiveCashSession();
        if (!mounted) return;
        const isOpen = r.success && r.session != null;
        setKasaOpen(isOpen);
        // Cache güncelle
        try {
          sessionStorage.setItem(
            'aleg-kasa-session',
            isOpen ? JSON.stringify(r.session) : 'null'
          );
        } catch {
          // yoksay
        }
      } catch {
        if (mounted) setKasaOpen(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshKey, activeTab]);

  const handleTableClick = useCallback(
    (table: TableWithStatus) => {
      // Kasa açık değilse (kapalı veya bilinmiyor) sipariş alma YOK
      if (kasaOpen !== true) {
        toast.error('Kasa kapalı - önce Kasa sekmesinden kasayı aç');
        return;
      }
      if (table.live_status === 'empty') {
        // Boş masa → direkt yeni sipariş aç
        setComposerState({
          mode: { kind: 'table', tableId: table.id, tableName: table.name },
        });
      } else {
        // Dolu masa → detay modali (sadece okuma, detay içinde zaten kontrol var)
        setTableDetail({ tableId: table.id, tableName: table.name });
      }
    },
    [kasaOpen]
  );

  const handleQuickSale = () => {
    if (kasaOpen !== true) {
      toast.error('Kasa kapalı - önce Kasa sekmesinden kasayı aç');
      return;
    }
    // Yeni akış: Direkt boş HesapPanel aç (orders=[])
    // Kullanıcı menüden ürün ekledikçe createManualOrder ile sipariş yaratılır
    setQuickSaleOpen(true);
  };

  const handleComposerClose = () => setComposerState(null);

  const handleComposerSuccess = async (_info: {
    queued?: boolean;
    online?: boolean;
    orderId?: string;
  }) => {
    // Yalnızca masa siparişleri composer üzerinden yapılır artık.
    // Hızlı satış doğrudan HesapPanel ile çalışıyor (handleQuickSale).
    setComposerState(null);
    setRefreshKey((k) => k + 1);
  };

  if (!cashier) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--paper)' }}
    >
      {/* Kasiyer üst bar */}
      <div
        className="sticky top-0 z-[60] flex items-center justify-between px-4 py-3 gap-3 flex-wrap"
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--line)',
          boxShadow: '0 1px 2px rgba(42,31,24,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background: `color-mix(in srgb, ${cashier.color} 16%, var(--card))`,
              border: `1px solid color-mix(in srgb, ${cashier.color} 30%, transparent)`,
              fontSize: 20,
            }}
          >
            {cashier.emoji}
          </div>
          <div>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: cashier.color,
              }}
            >
              AKTİF KASİYER
            </div>
            <div
              className="font-semibold"
              style={{
                color: 'var(--ink)',
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              {cashier.display_name}
              <span
                className="ml-2"
                style={{
                  color: 'var(--ink-3)',
                  fontSize: 12,
                  fontWeight: 400,
                  fontFamily: 'var(--f-mono)',
                }}
              >
                · {businessName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AgentStatusBadge businessId={businessId} context="kasa" />
          <PrinterStatusWidget />

          {/* Tam ekran toggle */}
          <button
            onClick={toggleFullscreen}
            className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all hover:scale-[1.05] active:scale-95"
            style={{
              background: isFullscreen
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'var(--paper-2)',
              border: `1px solid ${isFullscreen ? 'color-mix(in srgb, var(--accent) 35%, var(--line))' : 'var(--line)'}`,
              color: isFullscreen ? 'var(--accent)' : 'var(--ink-3)',
            }}
            title={isFullscreen ? 'Tam ekrandan çık (F11)' : 'Tam ekran (F11)'}
            aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
          >
            {isFullscreen ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              </svg>
            )}
          </button>

          {/* Sessize al toggle - tüm bildirim seslerini kapatır/açar */}
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all hover:scale-[1.05] active:scale-95"
            style={{
              background: muted
                ? 'color-mix(in srgb, var(--warn) 12%, transparent)'
                : 'var(--paper-2)',
              border: `1px solid ${muted ? 'color-mix(in srgb, var(--warn) 35%, var(--line))' : 'var(--line)'}`,
              color: muted ? 'var(--warn)' : 'var(--ink-3)',
            }}
            title={muted ? 'Sesi aç' : 'Sessize al'}
            aria-label={muted ? 'Sesi aç' : 'Sessize al'}
          >
            {muted ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          <button
            onClick={lock}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
            title="Ekranı kilitle (5dk sonra otomatik)"
          >
            🔒 KİLİTLE
          </button>

          {/* Aktif çağrı rozeti - tüm tab'larda görünür */}
          {activeCalls.length > 0 && (
            <button
              key={callsBump}
              onClick={() => setCallsPanelOpen(true)}
              className="relative h-9 px-3 rounded-[8px] flex items-center gap-2 transition-all active:scale-95 overflow-visible"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                boxShadow:
                  '0 4px 14px -2px color-mix(in srgb, var(--accent) 45%, transparent)',
                animation:
                  callsBump > 0
                    ? 'callsBumpPulse 600ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : undefined,
              }}
              aria-label={`${activeCalls.length} aktif çağrı`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {activeCalls.length}
              </span>
              <span
                className="absolute inset-0 rounded-[8px] pointer-events-none"
                style={{
                  background: 'var(--accent)',
                  animation: 'callsPing 2s ease-out infinite',
                }}
              />
            </button>
          )}

          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: 'Çıkış yap?',
                body: 'Kasa oturumundan çıkacaksın.',
                confirmLabel: 'Çıkış',
                cancelLabel: 'Vazgeç',
              });
              if (ok) signOut();
            }}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            ÇIKIŞ
          </button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="px-4 md:px-6 pt-4">
        <KasaTabs
          active={activeTab}
          onChange={setActiveTab}
          flashing={{
            orders: Date.now() < orderFlashUntil && activeTab !== 'orders',
          }}
        />
      </div>

      {/* TAB İÇERİK */}
      <div className="flex-1 flex flex-col px-4 md:px-6 py-4 min-h-0">
        {/* SERT VARDIYA MODU — Kasa kapalıyken büyük kırmızı uyarı bandı */}
        {kasaOpen !== true && activeTab !== 'register' && (
          <div
            className="mb-4 rounded-[12px] px-4 py-3.5 flex items-center gap-3 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--danger, #C4553A) 14%, var(--paper)) 0%, color-mix(in srgb, var(--danger, #C4553A) 8%, var(--paper)) 100%)',
              border: '2px solid var(--danger, #C4553A)',
              boxShadow:
                '0 2px 12px -4px color-mix(in srgb, var(--danger, #C4553A) 30%, transparent)',
            }}
          >
            {/* Diagonal stripe pattern (dikkat çekme) */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-[0.06]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, var(--danger, #C4553A) 0px, var(--danger, #C4553A) 8px, transparent 8px, transparent 16px)',
              }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--danger, #C4553A)',
                color: '#FAF5EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 18,
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
              }}
            >
              !
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  color: 'var(--danger, #C4553A)',
                  marginBottom: 3,
                }}
              >
                ⚠ VARDİYA KAPALI · SATIŞ ALINAMIYOR
              </div>
              <div
                className="text-sm font-medium"
                style={{ color: 'var(--ink)' }}
              >
                Sipariş veya ödeme almak için önce vardiyayı başlat. Tüm satışlar
                vardiyaya bağlanır, gün sonu sayım için kritik.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('register')}
              className="h-10 px-4 rounded-[10px] text-xs font-bold transition-all hover:opacity-95 active:scale-95 flex-shrink-0 relative z-10"
              style={{
                background: 'var(--danger, #C4553A)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.1em',
                boxShadow:
                  '0 2px 8px -2px color-mix(in srgb, var(--danger, #C4553A) 50%, transparent)',
              }}
            >
              VARDİYA AÇ →
            </button>
          </div>
        )}

        {activeTab === 'tables' && (
          <div key={refreshKey}>
            <TablesGrid onTableClick={handleTableClick} callsByTable={callsByTable} />
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <OrdersBoard initialOrders={initialOrders} businessId={businessId} />
          </div>
        )}
        {activeTab === 'quick' && (
          <div className="flex-1 flex items-center justify-center py-10">
            <QuickSaleLanding
              onStart={handleQuickSale}
              disabled={kasaOpen !== true}
            />
          </div>
        )}
        {activeTab === 'register' && (
          <div className="flex-1 min-h-0">
            <RegisterPanel businessId={businessId} />
          </div>
        )}
      </div>

      {/* Order Composer Modal */}
      {composerState && (
        <OrderComposer
          open={true}
          mode={composerState.mode}
          onClose={handleComposerClose}
          onSuccess={handleComposerSuccess}
        />
      )}

      {/* Dolu Masa Detay Modal */}
      {tableDetail && (
        <TableDetailModal
          tableId={tableDetail.tableId}
          tableName={tableDetail.tableName}
          onClose={() => setTableDetail(null)}
        />
      )}

      {/* Hızlı Satış HesapPanel - boş başlar, menüden ürün eklenince doldurulur */}
      {quickSaleOpen && cashier && (
        <HesapPanel
          tableId="__quick__"
          tableName="Hızlı Satış"
          orders={quickSaleOrders}
          cashierId={cashier.id}
          onClose={() => {
            setQuickSaleOpen(false);
            setQuickSaleOrders([]);
            setRefreshKey((k) => k + 1);
          }}
          onChanged={async (newOrderId) => {
            // Yeni sipariş yaratıldıysa onu listeye ekle
            if (newOrderId) {
              const r = await getOrderAsDetail(newOrderId);
              if (r.success && r.order) {
                setQuickSaleOrders((prev) => {
                  // Aynı id varsa güncelle, yoksa ekle
                  const idx = prev.findIndex((o) => o.id === newOrderId);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = r.order!;
                    return next;
                  }
                  return [...prev, r.order!];
                });
              }
            } else {
              // Mevcut siparişler güncellendi (ikram/indirim/ödeme) - tazele
              const updated: TableOrderDetail[] = [];
              for (const o of quickSaleOrders) {
                const r = await getOrderAsDetail(o.id);
                if (r.success && r.order) updated.push(r.order);
              }
              setQuickSaleOrders(updated);
            }
            setRefreshKey((k) => k + 1);
          }}
          quickSale
        />
      )}

      {/* ============================================================
          ÇAĞRI PANELİ - Yan açılır liste (tüm tab'larda erişilir)
          ============================================================ */}
      {callsPanelOpen && (
        <div
          className="fixed inset-0 z-[900] flex justify-end"
          style={{
            background: 'color-mix(in srgb, var(--ink) 35%, transparent)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'cdFadeIn 0.18s ease',
          }}
          onClick={() => setCallsPanelOpen(false)}
        >
          <div
            className="bg-paper h-full w-full max-w-[420px] flex flex-col border-l border-line"
            style={{
              boxShadow: '-12px 0 32px -8px rgba(42,31,24,0.18)',
              animation: 'callsPanelSlide 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-line">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div
                    className="uppercase mb-1.5"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      color: 'var(--accent)',
                    }}
                  >
                    AKTİF ÇAĞRILAR · {activeCalls.length}
                  </div>
                  <h2
                    className="text-ink"
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 28,
                      lineHeight: 1.1,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Müşteri çağrıları
                  </h2>
                </div>
                <button
                  onClick={() => setCallsPanelOpen(false)}
                  className="w-8 h-8 rounded-full grid place-items-center bg-paper-2 border border-line text-ink hover:bg-paper-3 transition-colors flex-shrink-0"
                  aria-label="Kapat"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {activeCalls.length > 1 && (
                <button
                  onClick={handleResolveAllCalls}
                  className="text-xs font-semibold transition-all"
                  style={{
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  ⊘ Tümünü Çözüldü İşaretle
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {activeCalls.length === 0 ? (
                <div className="py-12 text-center">
                  <div
                    className="mx-auto mb-3 w-12 h-12 rounded-full grid place-items-center"
                    style={{ background: 'var(--paper-2)', color: 'var(--ok)' }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 18,
                      color: 'var(--ink-2)',
                    }}
                  >
                    Hepsi tamam
                  </div>
                  <div className="text-ink-3 mt-1" style={{ fontSize: 13 }}>
                    Bekleyen çağrı yok
                  </div>
                </div>
              ) : (
                activeCalls.map((call) => {
                  const elapsed = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(call.created_at).getTime()) / 1000
                    )
                  );
                  const elapsedLabel =
                    elapsed < 60
                      ? `${elapsed} sn önce`
                      : `${Math.floor(elapsed / 60)} dk önce`;

                  return (
                    <div
                      key={call.id}
                      className="p-4 rounded-[14px] border border-line bg-card"
                      style={{
                        animation:
                          'callItemIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-11 h-11 rounded-[12px] grid place-items-center flex-shrink-0"
                          style={{
                            background:
                              'color-mix(in srgb, var(--accent) 14%, transparent)',
                            color: 'var(--accent)',
                            fontSize: 20,
                          }}
                        >
                          {call.button_emoji_snapshot || (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div
                            className="text-ink truncate"
                            style={{ fontWeight: 600, fontSize: 15 }}
                          >
                            {call.button_name_snapshot || 'Çağrı'}
                          </div>
                          <div
                            className="mt-0.5 flex items-center gap-2"
                            style={{ fontSize: 12 }}
                          >
                            <span
                              className="text-ink-2"
                              style={{ fontWeight: 600 }}
                            >
                              {call.table_name || 'Bilinmeyen masa'}
                            </span>
                            <span style={{ color: 'var(--ink-3)' }}>·</span>
                            <span
                              style={{
                                color: 'var(--ink-3)',
                                fontFamily: 'var(--f-mono)',
                              }}
                            >
                              {elapsedLabel}
                            </span>
                          </div>
                          {call.note && (
                            <div
                              className="mt-2 text-ink-2"
                              style={{
                                fontSize: 12,
                                fontStyle: 'italic',
                                lineHeight: 1.4,
                              }}
                            >
                              &ldquo;{call.note}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolveCall(call.id)}
                        className="mt-3 w-full h-9 rounded-[8px] text-xs font-semibold transition-all active:scale-95"
                        style={{
                          background:
                            'color-mix(in srgb, var(--ok) 14%, transparent)',
                          color: 'var(--ok)',
                          fontFamily: 'var(--f-mono)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        ✓ Çözüldü
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div
              className="px-6 py-3 border-t border-line text-center"
              style={{
                background: 'var(--paper-2)',
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              Anlık · Yeni çağrılar otomatik gelir
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// QUICK SALE LANDING
// ============================================================

function QuickSaleLanding({
  onStart,
  disabled,
}: {
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-10 md:p-14 text-center max-w-[540px] mx-auto"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: '0 4px 16px -8px rgba(42,31,24,0.08)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          color: 'var(--accent)',
          fontSize: 28,
        }}
      >
        ⚡
      </div>
      <div
        className="uppercase mb-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--accent)',
        }}
      >
        MASASIZ SATIŞ
      </div>
      <h2
        className="mb-3"
        style={{
          fontFamily: 'var(--f-serif)',
          fontSize: 'clamp(32px, 4vw, 42px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.02,
          color: 'var(--ink)',
        }}
      >
        Hızlı{' '}
        <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>
          satış.
        </span>
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--ink-2)', maxWidth: 400, margin: '0 auto 24px' }}
      >
        {disabled
          ? 'Kasa kapalı olduğu için hızlı satış yapılamaz. Kasayı aç, satışa başla.'
          : 'Ayaküstü bir kahve, paket bir sandviç — masası olmayan satışlar için. Ödeme direkt alınır, sipariş mutfağa gider.'}
      </p>
      <button
        onClick={onStart}
        disabled={disabled}
        className="group h-12 px-6 rounded-[10px] font-semibold text-sm flex items-center gap-2 mx-auto transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:hover:opacity-100 disabled:active:scale-100"
        style={{
          background: disabled ? 'var(--ink-3)' : 'var(--accent)',
          color: '#FAF5EA',
          boxShadow: disabled
            ? 'none'
            : '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
        }}
      >
        <span>{disabled ? 'Kasa kapalı' : 'Yeni hızlı satış başlat'}</span>
        {!disabled && (
          <span
            className="transition-transform group-hover:translate-x-1"
            style={{ fontSize: 16 }}
          >
            →
          </span>
        )}
      </button>
    </div>
  );
}
