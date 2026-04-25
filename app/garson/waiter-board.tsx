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
  getReadyOrders,
  markOrderDelivered,
  type ReadyOrder,
} from '@/lib/actions/waiter';
import {
  getTablesWithStatus,
  type TableWithStatus,
  type TableZoneWithTables,
} from '@/lib/actions/tables-status';
import { getKasaSoundSettings } from '@/lib/actions/sound-settings';
import { type SoundSettings, DEFAULT_SOUND_SETTINGS } from '@/lib/sound-types';
import { playSound, type SoundId } from '@/lib/sounds';
import { createClient } from '@/lib/supabase/client';

type WaiterTab = 'calls' | 'ready' | 'active' | 'all';

type Props = {
  businessId: string;
};

export function WaiterBoard({ businessId }: Props) {
  const { cashier, businessName, lock, signOut } = useCashierSession();
  const [activeTab, setActiveTab] = useState<WaiterTab>('calls');

  // ============================================================
  // ÇAĞRILAR
  // ============================================================
  const [activeCalls, setActiveCalls] = useState<WaiterCall[]>([]);
  const [callsBump, setCallsBump] = useState(0);

  // ============================================================
  // HAZIR SİPARİŞLER
  // ============================================================
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [readyBump, setReadyBump] = useState(0);

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
  // POLLING - HAZIR SİPARİŞLER (5sn)
  // ============================================================
  useEffect(() => {
    let canceled = false;
    let lastIds = new Set<string>();
    const fetchReady = async () => {
      const r = await getReadyOrders();
      if (canceled) return;
      if (r.success) {
        const newOrders = r.orders || [];
        const fresh = newOrders.filter((o) => !lastIds.has(o.id));
        if (fresh.length > 0 && lastIds.size > 0) {
          playOrderSound();
          fresh.forEach((o) => {
            const tableLabel = o.table_name?.toUpperCase() || 'AL-GÖTÜR';
            toast.info(
              `🍽 ${tableLabel} · Sipariş hazır · ${o.item_count} ürün`,
              6000
            );
          });
          setReadyBump((n) => n + 1);
        }
        setReadyOrders(newOrders);
        lastIds = new Set(newOrders.map((o) => o.id));
      }
    };
    fetchReady();
    const interval = setInterval(fetchReady, 5000);
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

  const handleDeliverOrder = useCallback(async (orderId: string) => {
    setReadyOrders((prev) => prev.filter((o) => o.id !== orderId));
    const r = await markOrderDelivered(orderId);
    if (!r.success) {
      toast.error(r.error || 'İşlem başarısız');
      const refresh = await getReadyOrders();
      if (refresh.success) setReadyOrders(refresh.orders || []);
    } else {
      toast.success('Sipariş teslim edildi');
    }
  }, []);

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
            active={activeTab === 'ready'}
            onClick={() => setActiveTab('ready')}
            badge={readyOrders.length}
            badgeBump={readyBump}
            color="ok"
          >
            🍽 Hazır
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
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            color="super"
          >
            ◍ Tümü
          </TabButton>
        </div>
      </nav>

      {/* TAB İÇERİK */}
      <main className="flex-1 px-3 pt-3 pb-6 overflow-y-auto">
        {activeTab === 'calls' && (
          <CallsTab calls={activeCalls} onResolve={handleResolveCall} />
        )}
        {activeTab === 'ready' && (
          <ReadyTab orders={readyOrders} onDeliver={handleDeliverOrder} />
        )}
        {activeTab === 'active' && (
          <ActiveTablesTab
            tables={activeTables}
            callsByTable={callsByTable}
          />
        )}
        {activeTab === 'all' && (
          <AllTablesTab zones={zones} callsByTable={callsByTable} />
        )}
      </main>
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
              ✓ Çözüldüm
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB 2: HAZIR SİPARİŞLER
// ============================================================
function ReadyTab({
  orders,
  onDeliver,
}: {
  orders: ReadyOrder[];
  onDeliver: (id: string) => void;
}) {
  if (orders.length === 0) {
    return <EmptyState icon="🍽" title="Hazır sipariş yok" subtitle="Mutfaktan çıkanlar burada görünür." />;
  }
  return (
    <div className="space-y-2.5">
      {orders.map((order) => {
        const elapsed = order.ready_at
          ? Math.max(0, Math.floor((Date.now() - new Date(order.ready_at).getTime()) / 1000))
          : 0;
        const elapsedLabel =
          elapsed < 60 ? `${elapsed} sn` : `${Math.floor(elapsed / 60)} dk`;
        const isUrgent = elapsed > 180; // 3 dakikadan eski → kırmızı
        return (
          <div
            key={order.id}
            className="p-4 rounded-[14px] border"
            style={{
              background: 'var(--card)',
              borderColor: isUrgent
                ? 'color-mix(in srgb, var(--danger) 35%, var(--line))'
                : 'var(--line)',
              animation: 'callItemIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-[12px] grid place-items-center flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
                  color: 'var(--ok)',
                  fontSize: 22,
                }}
              >
                🍽
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-ink" style={{ fontWeight: 600, fontSize: 16 }}>
                  {order.table_name || 'Al-Götür'}
                </div>
                <div className="mt-0.5 flex items-center gap-2" style={{ fontSize: 13 }}>
                  <span className="text-ink-2">{order.item_count} ürün</span>
                  <span style={{ color: 'var(--ink-3)' }}>·</span>
                  <span
                    style={{
                      color: isUrgent ? 'var(--danger)' : 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                      fontWeight: isUrgent ? 700 : 400,
                    }}
                  >
                    {isUrgent ? '⚠ ' : ''}
                    {elapsedLabel} bekliyor
                  </span>
                </div>
              </div>
              <div
                className="text-ink-2 flex-shrink-0"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ₺{Math.round(order.total)}
              </div>
            </div>
            <button
              onClick={() => onDeliver(order.id)}
              className="w-full h-11 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              ✓ Teslim Ettim
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB 3: AÇIK MASALAR
// ============================================================
function ActiveTablesTab({
  tables,
  callsByTable,
}: {
  tables: TableWithStatus[];
  callsByTable: Map<string, number>;
}) {
  if (tables.length === 0) {
    return <EmptyState icon="📋" title="Açık masa yok" subtitle="Tüm masalar boş şu an." />;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {tables.map((t) => (
        <TableCard key={t.id} table={t} callCount={callsByTable.get(t.id) || 0} />
      ))}
    </div>
  );
}

// ============================================================
// TAB 4: TÜM MASALAR (zone'lara göre)
// ============================================================
function AllTablesTab({
  zones,
  callsByTable,
}: {
  zones: TableZoneWithTables[];
  callsByTable: Map<string, number>;
}) {
  if (zones.length === 0) {
    return <EmptyState icon="◍" title="Masa bulunamadı" subtitle="Henüz masa eklenmemiş." />;
  }
  return (
    <div className="space-y-5">
      {zones.map((zg, idx) => (
        <div key={zg.zone?.id || `zone-${idx}`}>
          <div
            className="px-1 mb-2 flex items-baseline gap-2"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            <span
              className="uppercase"
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: zg.zone?.color || 'var(--accent)',
              }}
            >
              {zg.zone?.name || 'Diğer'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
              · {zg.tables.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {zg.tables.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                callCount={callsByTable.get(t.id) || 0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TABLE CARD
// ============================================================
function TableCard({
  table,
  callCount,
}: {
  table: TableWithStatus;
  callCount: number;
}) {
  const statusConfig: Record<
    string,
    { color: string; label: string; bg: string }
  > = {
    empty: {
      color: 'var(--ok)',
      label: 'BOŞ',
      bg: 'color-mix(in srgb, var(--ok) 6%, var(--card))',
    },
    active: {
      color: 'var(--gold)',
      label: 'DOLU',
      bg: 'color-mix(in srgb, var(--gold) 6%, var(--card))',
    },
    new: {
      color: 'var(--accent)',
      label: 'YENİ',
      bg: 'color-mix(in srgb, var(--accent) 8%, var(--card))',
    },
    ready: {
      color: 'var(--ok)',
      label: 'HAZIR',
      bg: 'color-mix(in srgb, var(--ok) 8%, var(--card))',
    },
    unpaid: {
      color: 'var(--danger)',
      label: 'ÖDEME BEK.',
      bg: 'color-mix(in srgb, var(--danger) 6%, var(--card))',
    },
    reserved: {
      color: 'var(--olive)',
      label: 'REZERVE',
      bg: 'color-mix(in srgb, var(--olive) 6%, var(--card))',
    },
  };
  const effectiveStatus =
    table.has_unpaid && table.live_status === 'active'
      ? 'unpaid'
      : table.live_status;
  const cfg = statusConfig[effectiveStatus] || statusConfig.empty;

  return (
    <div
      className="relative rounded-[14px] p-3"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${effectiveStatus === 'empty' ? 'var(--line)' : `color-mix(in srgb, ${cfg.color} 30%, var(--line))`}`,
        minHeight: 90,
      }}
    >
      {/* Çağrı rozeti - sağ üst */}
      {callCount > 0 && (
        <div
          className="absolute z-10 flex items-center justify-center"
          style={{
            top: -6,
            right: -6,
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 11,
            background: 'var(--accent)',
            color: '#FAF5EA',
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
            boxShadow:
              '0 4px 10px -2px color-mix(in srgb, var(--accent) 55%, transparent), 0 0 0 2.5px var(--paper)',
            animation: 'callsBumpPulse 1.4s ease-in-out infinite',
          }}
        >
          🔔 {callCount > 1 ? callCount : ''}
        </div>
      )}

      <div
        className="uppercase mb-0.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: cfg.color,
        }}
      >
        {cfg.label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1.1,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
        }}
      >
        {table.name}
      </div>
      {table.total_amount > 0 && (
        <div
          className="mt-1 text-ink-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          ₺{Math.round(table.total_amount)}
        </div>
      )}
    </div>
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
