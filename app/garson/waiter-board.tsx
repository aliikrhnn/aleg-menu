'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCashierSession } from '@/lib/cashier-session';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  getActiveWaiterCalls,
  resolveWaiterCall,
  type WaiterCall,
} from '@/lib/actions/call-buttons';
import {
  getAllActiveOrders,
  markOrderDelivered,
  type WaiterOrder,
} from '@/lib/actions/waiter';
import {
  getTablesWithStatus,
  type TableWithStatus,
  type TableZoneWithTables,
} from '@/lib/actions/tables-status';
import { OrderTakingModal } from '@/components/order/order-taking-modal';
import {
  TablesFullView,
  type ZoneFilterId,
} from '@/components/tables/table-card';
import { getKasaSoundSettings } from '@/lib/actions/sound-settings';
import { type SoundSettings, DEFAULT_SOUND_SETTINGS } from '@/lib/sound-types';
import { playSound, type SoundId } from '@/lib/sounds';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/notifications/notification-bell';

type WaiterTab = 'calls' | 'orders' | 'active' | 'tables';

type Props = {
  businessId: string;
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Sipariş başlığı - masa adı veya order_type'a göre etiket
 * dinein → masa adı (örn "MASA 5") veya yoksa "MASA"
 * pickup → "PAKET"
 * delivery → "KAPIYA"
 */
function getOrderDestination(o: {
  order_type?: string;
  table_name?: string | null;
}): string {
  if (o.order_type === 'pickup') return 'PAKET';
  if (o.order_type === 'delivery') return 'KAPIYA';
  // dinein veya tanımsız → masa
  return o.table_name?.toUpperCase() || 'MASA';
}

function getOrderDestinationDisplay(o: {
  order_type?: string;
  table_name?: string | null;
}): string {
  if (o.order_type === 'pickup') return 'Paket';
  if (o.order_type === 'delivery') return 'Kapıya';
  return o.table_name || 'Masa';
}

export function WaiterBoard({ businessId }: Props) {
  const { cashier, businessName, lock, signOut } = useCashierSession();
  const [activeTab, setActiveTab] = useState<WaiterTab>('calls');

  // ============================================================
  // ÇAĞRILAR
  // ============================================================
  const [activeCalls, setActiveCalls] = useState<WaiterCall[]>([]);
  const [callsBump, setCallsBump] = useState(0);

  // ============================================================
  // SİPARİŞLER (tüm aktif - received/confirmed/preparing/ready)
  // ============================================================
  const [activeOrders, setActiveOrders] = useState<WaiterOrder[]>([]);
  const [ordersBump, setOrdersBump] = useState(0);

  // ============================================================
  // MASALAR
  // ============================================================
  const [zones, setZones] = useState<TableZoneWithTables[]>([]);

  // ============================================================
  // SES + MUTE
  // ============================================================
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('aleg-garson-muted') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('aleg-garson-muted', muted ? '1' : '0');
    } catch {
      // yoksay
    }
  }, [muted]);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Ses ayarları
  const soundSettingsRef = useRef<SoundSettings>(DEFAULT_SOUND_SETTINGS);
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
  // POLLING - ÇAĞRILAR (5sn)
  // ============================================================
  useEffect(() => {
    let canceled = false;
    let lastIds = new Set<string>();
    const fetchCalls = async () => {
      const r = await getActiveWaiterCalls();
      if (canceled) return;
      if (r.success) {
        const newCalls = r.calls || [];
        const fresh = newCalls.filter((c) => !lastIds.has(c.id));
        if (fresh.length > 0 && lastIds.size > 0) {
          playCallSound();
          fresh.forEach((c) => {
            const tableLabel = c.table_name?.toUpperCase() || 'BİLİNMEYEN';
            toast.info(
              `🔔 ${tableLabel} · ${c.button_name_snapshot || 'Çağrı'}`,
              6000
            );
          });
          setCallsBump((n) => n + 1);
        }
        setActiveCalls(newCalls);
        lastIds = new Set(newCalls.map((c) => c.id));
      }
    };
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [playCallSound]);

  // ============================================================
  // POLLING - TÜM AKTİF SİPARİŞLER (5sn)
  // received/confirmed/preparing/ready hepsi
  // Sadece YENİ ready geldiğinde ses çalar (transition tracking)
  // ============================================================
  useEffect(() => {
    let canceled = false;
    let lastReadyIds = new Set<string>();
    let firstFetch = true;
    const fetchOrders = async () => {
      const r = await getAllActiveOrders();
      if (canceled) return;
      if (r.success) {
        const newOrders = r.orders || [];
        const newReadyIds = new Set(
          newOrders.filter((o) => o.status === 'ready').map((o) => o.id)
        );
        // Yeni ready'ye geçen siparişler
        const freshlyReady = newOrders.filter(
          (o) => o.status === 'ready' && !lastReadyIds.has(o.id)
        );
        if (!firstFetch && freshlyReady.length > 0) {
          playOrderSound();
          freshlyReady.forEach((o) => {
            const tableLabel = getOrderDestination(o);
            const itemCount = o.items.reduce((sum, it) => sum + it.quantity, 0);
            toast.info(
              `🍽 ${tableLabel} · Sipariş hazır · ${itemCount} ürün`,
              6000
            );
          });
          setOrdersBump((n) => n + 1);
        }
        setActiveOrders(newOrders);
        lastReadyIds = newReadyIds;
        firstFetch = false;
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [playOrderSound]);

  // ============================================================
  // POLLING - MASALAR (10sn - daha az kritik)
  // ============================================================
  useEffect(() => {
    let canceled = false;
    const fetchTables = async () => {
      const r = await getTablesWithStatus();
      if (!canceled && r.success) {
        setZones(r.zones || []);
      }
    };
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // REALTIME - waiter_calls
  // ============================================================
  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('garson_waiter_calls')
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
            if (prev.some((c) => c.id === newCall.id)) return prev;
            return [newCall, ...prev];
          });
          setCallsBump((n) => n + 1);
          playCallSound();
          toast.info(
            `🔔 ${newCall.table_name?.toUpperCase() || 'BİLİNMEYEN'} · ${newCall.button_name_snapshot || 'Çağrı'}`,
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

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleResolveCall = useCallback(async (callId: string) => {
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId));
    const r = await resolveWaiterCall(callId);
    if (!r.success) {
      toast.error(r.error || 'İşlem başarısız');
      const refresh = await getActiveWaiterCalls();
      if (refresh.success) setActiveCalls(refresh.calls || []);
    } else {
      toast.success('Çağrı çözüldü');
    }
  }, []);

  const handleDeliverOrder = useCallback(
    async (orderId: string) => {
      // Sipariş hazır değilse (preparing/confirmed) garsonu uyar — yanlışlık olabilir
      const order = activeOrders.find((o) => o.id === orderId);
      if (order && order.status !== 'ready') {
        const ok = await confirmDialog({
          title: 'Hazır olmadan teslim et?',
          body: `Bu sipariş henüz "${
            order.status === 'preparing' ? 'Hazırlanıyor' : 'Alındı'
          }" durumda. Mutfak hazır demeden teslim ettiğine emin misin?`,
          confirmLabel: 'Evet, teslim ettim',
          cancelLabel: 'Vazgeç',
        });
        if (!ok) return;
      }

      setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      const r = await markOrderDelivered(orderId);
      if (!r.success) {
        toast.error(r.error || 'İşlem başarısız');
        const refresh = await getAllActiveOrders();
        if (refresh.success) setActiveOrders(refresh.orders || []);
      } else {
        toast.success('Sipariş teslim edildi');
      }
    },
    [activeOrders]
  );

  // Açık masalar (active/new/ready durumları)
  const activeTables = useMemo(() => {
    const all = zones.flatMap((z) => z.tables);
    return all.filter((t) =>
      ['active', 'new', 'ready'].includes(t.live_status)
    );
  }, [zones]);

  // Çağrılı masalar map
  const callsByTable = useMemo(() => {
    const map = new Map<string, number>();
    activeCalls.forEach((c) => {
      if (c.table_id) {
        map.set(c.table_id, (map.get(c.table_id) || 0) + 1);
      }
    });
    return map;
  }, [activeCalls]);

  // ============================================================
  // SİPARİŞ ALMA MODAL
  // ============================================================
  const [orderModalTable, setOrderModalTable] = useState<TableWithStatus | null>(
    null
  );

  // Zone filter (Tümü/zone-id)
  const [tableFilter, setTableFilter] = useState<ZoneFilterId>('all');

  const handleSelectTable = useCallback((t: TableWithStatus) => {
    setOrderModalTable(t);
  }, []);

  const handleOrderSuccess = useCallback(async () => {
    // Masaları + siparişleri tazele
    const [tRes, oRes] = await Promise.all([
      getTablesWithStatus(),
      getAllActiveOrders(),
    ]);
    if (tRes.success) setZones(tRes.zones || []);
    if (oRes.success) setActiveOrders(oRes.orders || []);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* HEADER */}
      <header
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-2 border-b"
        style={{
          background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderColor: 'var(--line)',
        }}
      >
        <div className="min-w-0 flex-1">
          <div
            className="uppercase mb-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--ink-3)',
            }}
          >
            GARSON
          </div>
          <div className="flex items-baseline gap-2 truncate">
            <span
              className="text-ink truncate"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              {cashier?.display_name || 'Garson'}
            </span>
            <span
              className="text-ink-3 truncate"
              style={{ fontSize: 11, fontFamily: 'var(--f-mono)' }}
            >
              · {businessName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Bildirim - push notification toggle */}
          <NotificationBell />

          {/* Mute */}
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95"
            style={{
              background: muted
                ? 'color-mix(in srgb, var(--warn) 12%, transparent)'
                : 'var(--paper-2)',
              border: `1px solid ${muted ? 'color-mix(in srgb, var(--warn) 35%, var(--line))' : 'var(--line)'}`,
              color: muted ? 'var(--warn)' : 'var(--ink-3)',
            }}
            aria-label={muted ? 'Sesi aç' : 'Sessize al'}
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          {/* Kilitle */}
          <button
            onClick={lock}
            className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
            aria-label="Kilitle"
          >
            🔒
          </button>
          {/* Çıkış */}
          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: 'Çıkış yap?',
                body: 'Garson oturumundan çıkacaksın.',
                confirmLabel: 'Çıkış',
                cancelLabel: 'Vazgeç',
              });
              if (ok) signOut();
            }}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all active:scale-95"
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
      </header>

      {/* TAB BAR - mobile-first, 4 sekme */}
      <nav className="px-2 pt-3 pb-1">
        <div
          className="flex items-center gap-1 p-1 rounded-[12px] overflow-x-auto"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <TabButton
            active={activeTab === 'calls'}
            onClick={() => setActiveTab('calls')}
            badge={activeCalls.length}
            badgeBump={callsBump}
            color="accent"
          >
            🔔 Çağrılar
          </TabButton>
          <TabButton
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            badge={activeOrders.length}
            badgeBump={ordersBump}
            color="ok"
          >
            🍽 Siparişler
          </TabButton>
          <TabButton
            active={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            badge={activeTables.length}
            color="gold"
          >
            📋 Açık Masa
          </TabButton>
          <TabButton
            active={activeTab === 'tables'}
            onClick={() => setActiveTab('tables')}
            color="super"
          >
            ◍ Tüm Masalar
          </TabButton>
        </div>
      </nav>

      {/* TAB İÇERİK */}
      <main className="flex-1 px-3 pt-3 pb-6 overflow-y-auto">
        {activeTab === 'calls' && (
          <CallsTab calls={activeCalls} onResolve={handleResolveCall} />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={activeOrders} onDeliver={handleDeliverOrder} />
        )}
        {activeTab === 'active' && (
          <ActiveTablesView
            zones={zones}
            activeFilter={tableFilter}
            onFilterChange={setTableFilter}
            callsByTable={callsByTable}
            onSelectTable={handleSelectTable}
          />
        )}
        {activeTab === 'tables' && (
          <TablesFullView
            zones={zones}
            activeFilter={tableFilter}
            onFilterChange={setTableFilter}
            callsByTable={callsByTable}
            onSelectTable={handleSelectTable}
          />
        )}
      </main>

      {/* SİPARİŞ ALMA MODAL */}
      {orderModalTable && cashier && (
        <OrderTakingModal
          table={orderModalTable}
          cashierId={cashier.id}
          onClose={() => setOrderModalTable(null)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}

// ============================================================
// TAB BUTTON
// ============================================================
function TabButton({
  active,
  onClick,
  badge,
  badgeBump,
  color = 'accent',
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  badgeBump?: number;
  color?: 'accent' | 'ok' | 'gold' | 'super';
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 min-w-[80px] h-10 px-2.5 rounded-[8px] text-[13px] font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
      style={{
        background: active ? 'var(--paper)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        boxShadow: active ? '0 1px 3px rgba(42,31,24,0.08)' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          key={badgeBump}
          className="inline-flex items-center justify-center"
          style={{
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9,
            background: `var(--${color})`,
            color: '#FAF5EA',
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            animation:
              badgeBump && badgeBump > 0
                ? 'callsBumpPulse 600ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                : undefined,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================
// TAB 1: ÇAĞRILAR
// ============================================================
function CallsTab({
  calls,
  onResolve,
}: {
  calls: WaiterCall[];
  onResolve: (id: string) => void;
}) {
  if (calls.length === 0) {
    return <EmptyState icon="✓" title="Bekleyen çağrı yok" subtitle="Hepsi tamam, müşteri memnun." />;
  }
  return (
    <div className="space-y-2.5">
      {calls.map((call) => {
        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(call.created_at).getTime()) / 1000)
        );
        const elapsedLabel =
          elapsed < 60 ? `${elapsed} sn önce` : `${Math.floor(elapsed / 60)} dk önce`;
        return (
          <div
            key={call.id}
            className="p-4 rounded-[14px] border"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--line)',
              animation: 'callItemIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-[12px] grid place-items-center flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                  color: 'var(--accent)',
                  fontSize: 22,
                }}
              >
                {call.button_emoji_snapshot || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-ink" style={{ fontWeight: 600, fontSize: 16 }}>
                  {call.button_name_snapshot || 'Çağrı'}
                </div>
                <div className="mt-0.5 flex items-center gap-2" style={{ fontSize: 13 }}>
                  <span className="text-ink-2" style={{ fontWeight: 600 }}>
                    {call.table_name || 'Bilinmeyen masa'}
                  </span>
                  <span style={{ color: 'var(--ink-3)' }}>·</span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
                    {elapsedLabel}
                  </span>
                </div>
                {call.note && (
                  <div className="mt-1.5 text-ink-2" style={{ fontSize: 12, fontStyle: 'italic' }}>
                    &ldquo;{call.note}&rdquo;
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onResolve(call.id)}
              className="w-full h-11 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: 'var(--ok)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              ✓ Çözüldü
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB 2: SİPARİŞLER (tüm aktif - received/confirmed/preparing/ready)
// ============================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  received: {
    label: 'YENİ',
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    icon: '◉',
  },
  confirmed: {
    label: 'ONAYLANDI',
    color: 'var(--gold)',
    bg: 'color-mix(in srgb, var(--gold) 10%, transparent)',
    icon: '◈',
  },
  preparing: {
    label: 'HAZIRLANIYOR',
    color: 'var(--warn)',
    bg: 'color-mix(in srgb, var(--warn) 10%, transparent)',
    icon: '◐',
  },
  ready: {
    label: 'HAZIR',
    color: 'var(--ok)',
    bg: 'color-mix(in srgb, var(--ok) 12%, transparent)',
    icon: '✓',
  },
};

function OrdersTab({
  orders,
  onDeliver,
}: {
  orders: WaiterOrder[];
  onDeliver: (id: string) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon="🍽"
        title="Aktif sipariş yok"
        subtitle="Yeni sipariş geldiğinde burada görünür."
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {orders.map((order) => {
        const expanded = expandedIds.has(order.id);
        const isReady = order.status === 'ready';
        // Teslim edilebilir mi? ready VEYA hazırlanıyor/alındı (yoğun saat fallback)
        const canDeliver =
          isReady ||
          order.status === 'preparing' ||
          order.status === 'confirmed';
        const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;

        // Bekleme süresi - ready'de ready_at, diğerlerinde created_at
        const refTime = isReady && order.ready_at ? order.ready_at : order.created_at;
        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(refTime).getTime()) / 1000)
        );
        const elapsedLabel =
          elapsed < 60 ? `${elapsed} sn` : `${Math.floor(elapsed / 60)} dk`;
        const isUrgent = isReady && elapsed > 180;

        const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

        return (
          <div
            key={order.id}
            className="rounded-[14px] border overflow-hidden"
            style={{
              background: 'var(--card)',
              borderColor: isUrgent
                ? 'color-mix(in srgb, var(--danger) 35%, var(--line))'
                : isReady
                  ? 'color-mix(in srgb, var(--ok) 25%, var(--line))'
                  : 'var(--line)',
              animation: 'callItemIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* COLLAPSED HEAD - tıklanabilir */}
            <button
              type="button"
              onClick={() => toggle(order.id)}
              className="w-full p-4 flex items-start gap-3 text-left transition-colors active:bg-paper-2"
            >
              {/* Status indicator */}
              <div
                className="w-11 h-11 rounded-[10px] grid place-items-center flex-shrink-0"
                style={{
                  background: statusCfg.bg,
                  color: statusCfg.color,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {statusCfg.icon}
              </div>

              <div className="flex-1 min-w-0">
                {/* Status badge mini */}
                <div
                  className="inline-flex items-center mb-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: statusCfg.color,
                  }}
                >
                  {statusCfg.label}
                </div>

                {/* MASA ADI - serif italic, vurgulu */}
                <div
                  className="text-ink"
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.05,
                  }}
                >
                  {getOrderDestinationDisplay(order)}
                </div>

                <div
                  className="mt-1 flex items-center gap-2 flex-wrap"
                  style={{ fontSize: 12 }}
                >
                  <span className="text-ink-2">{itemCount} ürün</span>
                  <span style={{ color: 'var(--ink-3)' }}>·</span>
                  <span
                    style={{
                      color: isUrgent ? 'var(--danger)' : 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                      fontWeight: isUrgent ? 700 : 400,
                    }}
                  >
                    {isUrgent ? '⚠ ' : ''}
                    {elapsedLabel}
                    {isReady ? ' bekliyor' : ''}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div
                  className="text-ink"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  ₺{Math.round(order.total)}
                </div>
                {/* Genişle/daralt ikonu */}
                <div
                  className="grid place-items-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: 'var(--paper-2)',
                    color: 'var(--ink-3)',
                    fontSize: 11,
                    transition: 'transform 0.2s ease',
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▾
                </div>
              </div>
            </button>

            {/* EXPANDED - kalem detayları */}
            {expanded && (
              <div
                className="px-4 pb-4 border-t"
                style={{ borderColor: 'var(--line)' }}
              >
                {order.items.length === 0 ? (
                  <div
                    className="py-3 text-ink-3 text-sm text-center"
                    style={{ fontStyle: 'italic' }}
                  >
                    Kalem yok
                  </div>
                ) : (
                  <div className="space-y-2 pt-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-[10px]"
                        style={{
                          background: 'var(--paper-2)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {/* Adet */}
                          <div
                            className="flex-shrink-0 grid place-items-center rounded-[6px]"
                            style={{
                              width: 28,
                              height: 28,
                              background:
                                'color-mix(in srgb, var(--accent) 14%, transparent)',
                              color: 'var(--accent)',
                              fontFamily: 'var(--f-mono)',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {item.quantity}×
                          </div>

                          {/* Ürün + istasyon + not */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-1.5 flex-wrap">
                              <span
                                className="text-ink"
                                style={{
                                  fontWeight: 600,
                                  fontSize: 14,
                                  lineHeight: 1.3,
                                }}
                              >
                                {item.product_name}
                              </span>

                              {/* İstasyon rozet */}
                              {item.station_name && (
                                <span
                                  className="inline-flex items-center gap-0.5"
                                  style={{
                                    fontFamily: 'var(--f-mono)',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    padding: '2px 6px',
                                    borderRadius: 5,
                                    background: `color-mix(in srgb, ${item.station_color || 'var(--accent)'} 14%, transparent)`,
                                    color: item.station_color || 'var(--accent)',
                                    border: `1px solid color-mix(in srgb, ${item.station_color || 'var(--accent)'} 30%, transparent)`,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {item.station_icon && (
                                    <span style={{ fontSize: 10 }}>
                                      {item.station_icon}
                                    </span>
                                  )}
                                  <span>{item.station_name}</span>
                                </span>
                              )}
                            </div>

                            {/* Müşteri notu */}
                            {item.note && (
                              <div
                                className="mt-1 text-ink-2"
                                style={{
                                  fontSize: 12,
                                  fontStyle: 'italic',
                                  lineHeight: 1.4,
                                }}
                              >
                                &ldquo;{item.note}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Teslim ettim butonu — ready güçlü, preparing/confirmed ikincil */}
                {canDeliver && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeliver(order.id);
                    }}
                    className="mt-3 w-full h-11 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: isReady
                        ? 'var(--accent)'
                        : 'color-mix(in srgb, var(--accent) 12%, var(--card))',
                      color: isReady
                        ? '#FAF5EA'
                        : 'var(--accent)',
                      border: isReady
                        ? 'none'
                        : '1px solid color-mix(in srgb, var(--accent) 30%, var(--line))',
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isReady
                      ? '✓ Teslim Ettim'
                      : '⤴ Hazır olmadan teslim et'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB 3: AÇIK MASALAR (sadece dolu/aktif olanlar) - yeni tasarım
// ============================================================
function ActiveTablesView({
  zones,
  activeFilter,
  onFilterChange,
  callsByTable,
  onSelectTable,
}: {
  zones: TableZoneWithTables[];
  activeFilter: ZoneFilterId;
  onFilterChange: (id: ZoneFilterId) => void;
  callsByTable: Map<string, number>;
  onSelectTable: (t: TableWithStatus) => void;
}) {
  // Sadece aktif/dolu/yeni/hazir/unpaid masalar
  const activeZones = useMemo(() => {
    return zones
      .map((zg) => ({
        ...zg,
        tables: zg.tables.filter((t) =>
          ['active', 'new', 'ready', 'unpaid'].includes(t.live_status)
        ),
      }))
      .filter((zg) => zg.tables.length > 0);
  }, [zones]);

  if (activeZones.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="Açık masa yok"
        subtitle="Tüm masalar boş şu an."
      />
    );
  }

  return (
    <TablesFullView
      zones={activeZones}
      activeFilter={activeFilter}
      onFilterChange={onFilterChange}
      callsByTable={callsByTable}
      onSelectTable={onSelectTable}
    />
  );
}


// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="py-16 text-center">
      <div
        className="mx-auto mb-3 w-14 h-14 rounded-full grid place-items-center"
        style={{
          background: 'var(--paper-2)',
          color: 'var(--ink-3)',
          fontSize: 24,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink-2)',
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      <div
        className="text-ink-3 mt-1"
        style={{ fontSize: 13, lineHeight: 1.5 }}
      >
        {subtitle}
      </div>
    </div>
  );
}
