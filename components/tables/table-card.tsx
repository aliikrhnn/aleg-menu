'use client';

/**
 * Aleg — Paylaşılan Masa Bileşenleri
 *
 * Editorial, yoğun bilgi, status-aware tasarım.
 * Hem garson hem kasa uygulamasında ortak kullanılır.
 */

import { useMemo } from 'react';
import type {
  TableWithStatus,
  TableZoneWithTables,
} from '@/lib/actions/tables-status';

// ============================================================
// STATUS CONFIG
// ============================================================

export type TableLiveStatus = TableWithStatus['live_status'] | 'unpaid' | 'cleaning';

type StatusVisual = {
  label: string;
  color: string; // var(--xxx)
  bg: string; // tinted bg
};

const STATUS: Record<string, StatusVisual> = {
  empty: {
    label: 'BOŞ',
    color: 'var(--ink-3)',
    bg: 'transparent',
  },
  active: {
    label: 'DOLU',
    color: 'var(--gold)',
    bg: 'color-mix(in srgb, var(--gold) 5%, var(--card))',
  },
  new: {
    label: 'YENİ',
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 7%, var(--card))',
  },
  ready: {
    label: 'HAZIR',
    color: 'var(--ok)',
    bg: 'color-mix(in srgb, var(--ok) 7%, var(--card))',
  },
  unpaid: {
    label: 'HESAP',
    color: 'var(--super)',
    bg: 'color-mix(in srgb, var(--super) 7%, var(--card))',
  },
  reserved: {
    label: 'REZERVE',
    color: 'var(--olive)',
    bg: 'color-mix(in srgb, var(--olive) 6%, var(--card))',
  },
  cleaning: {
    label: 'TEMİZLİK',
    color: 'var(--ink-3)',
    bg: 'color-mix(in srgb, var(--ink-3) 5%, var(--card))',
  },
};

function effectiveStatus(t: TableWithStatus): keyof typeof STATUS {
  if (t.has_unpaid && (t.live_status === 'active' || t.live_status === 'unpaid'))
    return 'unpaid';
  if (t.live_status === 'unpaid') return 'unpaid';
  return t.live_status;
}

// ============================================================
// HELPERS
// ============================================================

function formatElapsed(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return null;
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return 'şimdi';
  if (totalMin < 60) return `${totalMin} dk`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}s ${m}dk`;
}

function formatMoney(n: number): string {
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

// ============================================================
// TABLE CARD — paylaşılan tek kart bileşeni
// ============================================================

export type TableCardProps = {
  table: TableWithStatus;
  callCount?: number; // çağrı rozeti
  onClick?: (t: TableWithStatus) => void;
  // Opsiyonel zenginleştirilmiş veriler (ileride backend'den)
  waiterName?: string | null; // siparişi alan kişi
  lastCategory?: string | null; // son sipariş kalemi kategorisi
};

export function TableCard({
  table,
  callCount = 0,
  onClick,
  waiterName,
  lastCategory,
}: TableCardProps) {
  const statusKey = effectiveStatus(table);
  const cfg = STATUS[statusKey];
  const isEmpty = statusKey === 'empty';
  const elapsed = !isEmpty ? formatElapsed(table.oldest_order_at) : null;

  const clickable = !!onClick;

  const Comp = clickable ? 'button' : 'div';
  const compProps = clickable
    ? ({
        type: 'button' as const,
        onClick: () => onClick!(table),
      })
    : {};

  return (
    <Comp
      {...compProps}
      className="relative rounded-[12px] text-left transition-all"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${
          isEmpty
            ? 'var(--line)'
            : `color-mix(in srgb, ${cfg.color} 28%, var(--line))`
        }`,
        padding: '10px 12px 11px',
        width: '100%',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseDown={
        clickable
          ? (e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
            }
          : undefined
      }
      onMouseUp={
        clickable
          ? (e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }
          : undefined
      }
      onMouseLeave={
        clickable
          ? (e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }
          : undefined
      }
    >
      {/* Çağrı rozeti */}
      {callCount > 0 && (
        <div
          className="absolute z-10 flex items-center justify-center"
          style={{
            top: -7,
            right: -7,
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
          🔔{callCount > 1 ? ` ${callCount}` : ''}
        </div>
      )}

      {/* TOP ROW — status + adet/kapasite + süre */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span
          className="uppercase truncate"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: cfg.color,
          }}
        >
          {cfg.label}
        </span>

        <div
          className="flex items-center gap-1.5 flex-shrink-0"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {!isEmpty && table.active_order_count > 0 ? (
            <span style={{ fontWeight: 600 }}>
              {table.active_order_count}×
            </span>
          ) : table.capacity > 0 ? (
            <span>{table.capacity}p</span>
          ) : null}
          {elapsed && (
            <>
              <span style={{ color: 'var(--ink-3)', opacity: 0.5 }}>·</span>
              <span style={{ fontWeight: 500 }}>{elapsed}</span>
            </>
          )}
        </div>
      </div>

      {/* MAIN ROW — masa adı + tutar */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span
          className="text-ink truncate"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {table.name}
        </span>
        {!isEmpty && table.total_amount > 0 && (
          <span
            className="text-ink flex-shrink-0"
            style={{
              fontFamily: 'var(--f-mono)',
              fontStyle: 'italic',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {formatMoney(table.total_amount)}
          </span>
        )}
      </div>

      {/* BOTTOM ROW — garson adı + son kategori (varsa) */}
      {!isEmpty && (waiterName || lastCategory) && (
        <div
          className="flex items-baseline justify-between gap-2"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
          }}
        >
          {waiterName && (
            <span className="truncate" style={{ fontWeight: 500 }}>
              {waiterName}
            </span>
          )}
          {lastCategory && (
            <span
              className="truncate flex-shrink-0"
              style={{
                fontStyle: 'italic',
              }}
            >
              {lastCategory}
            </span>
          )}
        </div>
      )}
    </Comp>
  );
}

// ============================================================
// FILTER BAR — Tümü + zone chip'leri
// ============================================================

export type ZoneFilterId = string | 'all';

export function TableFilterBar({
  zones,
  activeId,
  onChange,
  totalCount,
}: {
  zones: TableZoneWithTables[];
  activeId: ZoneFilterId;
  onChange: (id: ZoneFilterId) => void;
  totalCount: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      <FilterChip
        active={activeId === 'all'}
        onClick={() => onChange('all')}
        label="Tümü"
        count={totalCount}
        color="var(--ink)"
      />
      {zones
        .filter((zg) => zg.zone)
        .map((zg) => (
          <FilterChip
            key={zg.zone!.id}
            active={activeId === zg.zone!.id}
            onClick={() => onChange(zg.zone!.id)}
            label={zg.zone!.name}
            count={zg.tables.length}
            color={zg.zone!.color || 'var(--accent)'}
          />
        ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 h-9 px-3 rounded-full flex items-center gap-1.5 transition-all active:scale-95"
      style={{
        background: active ? 'var(--ink)' : 'var(--card)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {!active && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 13,
          fontWeight: active ? 600 : 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          opacity: active ? 0.85 : 0.6,
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================
// LEGEND — sağ üst statüs efsanesi
// ============================================================

export function TableLegend() {
  const items = [
    { key: 'new', label: 'Yeni', color: 'var(--accent)' },
    { key: 'active', label: 'Dolu', color: 'var(--gold)' },
    { key: 'unpaid', label: 'Hesap', color: 'var(--super)' },
    { key: 'reserved', label: 'Rezerve', color: 'var(--olive)' },
    { key: 'cleaning', label: 'Temizlik', color: 'var(--ink-3)' },
  ];
  return (
    <div
      className="flex items-center gap-2.5 flex-wrap"
      style={{
        fontSize: 10,
        color: 'var(--ink-3)',
      }}
    >
      {items.map((it) => (
        <span
          key={it.key}
          className="inline-flex items-center gap-1"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: it.color,
              display: 'inline-block',
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ============================================================
// ZONE SECTION — başlık + özet + alt bar
// ============================================================

export function TableZoneSection({
  zone,
  tables,
  callsByTable,
  onSelectTable,
  waiterByTable,
  categoryByTable,
}: {
  zone: TableZoneWithTables['zone'];
  tables: TableWithStatus[];
  callsByTable?: Map<string, number>;
  onSelectTable?: (t: TableWithStatus) => void;
  waiterByTable?: Map<string, string>;
  categoryByTable?: Map<string, string>;
}) {
  const stats = useMemo(() => {
    const occupied = tables.filter(
      (t) => t.live_status !== 'empty' && t.live_status !== 'reserved'
    );
    const total = tables.length;
    const sum = tables.reduce((s, t) => s + (t.total_amount || 0), 0);
    return { occupied: occupied.length, total, totalAmount: sum };
  }, [tables]);

  if (tables.length === 0) return null;

  const zoneColor = zone?.color || 'var(--accent)';

  return (
    <div className="mb-6">
      {/* Zone header */}
      <div className="mb-2.5">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: zoneColor,
              display: 'inline-block',
              flexShrink: 0,
              transform: 'translateY(2px)',
            }}
          />
          <h3
            className="text-ink"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            {zone?.name || 'Diğer'}
          </h3>
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--ink-3)',
            }}
          >
            {stats.occupied}/{stats.total} DOLU
            {stats.totalAmount > 0 && (
              <>
                {' '}
                · {formatMoney(stats.totalAmount)} AÇIK
              </>
            )}
          </span>
        </div>

        {/* Alt bar - zone color rengiyle */}
        <div
          style={{
            height: 2,
            borderRadius: 1,
            background: `linear-gradient(to right, ${zoneColor} ${
              stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0
            }%, var(--line) 0%)`,
            opacity: 0.7,
          }}
        />
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {tables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            callCount={callsByTable?.get(t.id) || 0}
            onClick={onSelectTable}
            waiterName={waiterByTable?.get(t.id)}
            lastCategory={categoryByTable?.get(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FULL VIEW — filter + legend + zone sections
// Tek atışta full-grid render
// ============================================================

export function TablesFullView({
  zones,
  activeFilter,
  onFilterChange,
  callsByTable,
  onSelectTable,
  waiterByTable,
  categoryByTable,
}: {
  zones: TableZoneWithTables[];
  activeFilter: ZoneFilterId;
  onFilterChange: (id: ZoneFilterId) => void;
  callsByTable?: Map<string, number>;
  onSelectTable?: (t: TableWithStatus) => void;
  waiterByTable?: Map<string, string>;
  categoryByTable?: Map<string, string>;
}) {
  const totalCount = useMemo(
    () => zones.reduce((s, zg) => s + zg.tables.length, 0),
    [zones]
  );

  const visibleZones = useMemo(() => {
    if (activeFilter === 'all') return zones;
    return zones.filter((zg) => zg.zone?.id === activeFilter);
  }, [zones, activeFilter]);

  return (
    <div className="space-y-1">
      {/* Top bar - filter + legend */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <TableFilterBar
          zones={zones}
          activeId={activeFilter}
          onChange={onFilterChange}
          totalCount={totalCount}
        />
        <TableLegend />
      </div>

      {/* Zone sections */}
      {visibleZones.map((zg, idx) => (
        <TableZoneSection
          key={zg.zone?.id || `zone-${idx}`}
          zone={zg.zone}
          tables={zg.tables}
          callsByTable={callsByTable}
          onSelectTable={onSelectTable}
          waiterByTable={waiterByTable}
          categoryByTable={categoryByTable}
        />
      ))}

      {visibleZones.length === 0 && (
        <div
          className="py-16 text-center"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink-3)',
          }}
        >
          Bu bölgede masa yok
        </div>
      )}
    </div>
  );
}
