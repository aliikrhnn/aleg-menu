'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTablesWithStatus, type TableWithStatus, type TableZoneWithTables } from '@/lib/actions/tables-status';
import { cn } from '@/lib/utils';

type Props = {
  onTableClick: (table: TableWithStatus) => void;
  callsByTable?: Map<string, number>;
};

export function TablesGrid({ onTableClick, callsByTable }: Props) {
  const [zones, setZones] = useState<TableZoneWithTables[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'empty' | 'active' | 'unpaid'>('all');

  const load = useCallback(async () => {
    const r = await getTablesWithStatus();
    if (!r.success) {
      setError(r.error || 'Masalar alınamadı');
      setZones([]);
    } else {
      setZones(r.zones || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Her 5 saniyede yenile (hızlı feedback için)
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const handleManualRefresh = () => {
    setLoading(true);
    load();
  };

  const allTables = zones.flatMap((z) => z.tables);
  const stats = {
    total: allTables.length,
    empty: allTables.filter((t) => t.live_status === 'empty').length,
    active: allTables.filter((t) => ['active', 'new', 'ready'].includes(t.live_status)).length,
    unpaid: allTables.filter((t) => t.has_unpaid).length,
  };

  const filteredZones = zones
    .map((z) => ({
      ...z,
      tables: z.tables.filter((t) => {
        if (filter === 'all') return true;
        if (filter === 'empty') return t.live_status === 'empty';
        if (filter === 'unpaid') return t.has_unpaid;
        if (filter === 'active')
          return ['active', 'new', 'ready'].includes(t.live_status);
        return true;
      }),
    }))
    .filter((z) => z.tables.length > 0);

  if (loading && zones.length === 0) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--ink-3)' }}>
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
          }}
        >
          Masalar yükleniyor…
        </div>
      </div>
    );
  }

  if (error && zones.length === 0) {
    return (
      <div
        className="py-10 px-6 rounded-[var(--r)] text-center"
        style={{
          background: 'color-mix(in srgb, var(--danger) 6%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--danger) 20%, var(--line))',
          color: 'var(--danger)',
        }}
      >
        ⚠ {error}
      </div>
    );
  }

  if (allTables.length === 0) {
    return (
      <div
        className="rounded-[var(--r)] py-16 text-center"
        style={{
          background: 'var(--card)',
          border: '1px dashed var(--line-2)',
        }}
      >
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)',
            fontSize: 24,
          }}
        >
          ◍
        </div>
        <h3
          className="mb-2"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            color: 'var(--ink)',
          }}
        >
          Henüz masa tanımlı değil
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--ink-2)', maxWidth: 380, margin: '0 auto 20px' }}>
          Panelde masalarını tanımla, bu sayfada görsel olarak yönetirsin.
        </p>
        <a
          href="/panel/masalar"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:opacity-95"
          style={{ background: 'var(--accent)', color: '#FAF5EA' }}
        >
          Masa ayarlarına git ↗
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtre + istatistik çubuğu */}
      <div
        className="flex items-center justify-between gap-3 flex-wrap rounded-[var(--r)] p-3"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPill
            label="TÜMÜ"
            count={stats.total}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color="var(--ink)"
          />
          <FilterPill
            label="BOŞ"
            count={stats.empty}
            active={filter === 'empty'}
            onClick={() => setFilter('empty')}
            color="var(--ok)"
          />
          <FilterPill
            label="DOLU"
            count={stats.active}
            active={filter === 'active'}
            onClick={() => setFilter('active')}
            color="var(--gold)"
          />
          <FilterPill
            label="ÖDEME BEKLİYOR"
            count={stats.unpaid}
            active={filter === 'unpaid'}
            onClick={() => setFilter('unpaid')}
            color="var(--danger)"
          />
        </div>

        <div className="flex items-center gap-2">
          <LegendHint />
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.03] disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            title="Masaları yenile"
          >
            <span className={loading ? 'animate-spin inline-block' : 'inline-block'}>
              ↻
            </span>
            <span>YENİLE</span>
          </button>
        </div>
      </div>

      {/* Bölgelere göre masalar */}
      <div className="space-y-5">
        {filteredZones.map((zg, i) => (
          <div key={zg.zone?.id || `orphan-${i}`}>
            <ZoneHeader
              name={zg.zone?.name || 'Diğer'}
              count={zg.tables.length}
              color={zg.zone?.color}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {zg.tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  activeCallCount={callsByTable?.get(table.id) || 0}
                  onClick={() => onTableClick(table)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredZones.length === 0 && (
          <div className="text-center py-10" style={{ color: 'var(--ink-3)' }}>
            <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18 }}>
              Bu filtre için masa yok
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function TableCard({
  table,
  activeCallCount,
  onClick,
}: {
  table: TableWithStatus;
  activeCallCount: number;
  onClick: () => void;
}) {
  const statusConfig = {
    empty: {
      color: 'var(--ok)',
      label: 'BOŞ',
      bg: 'color-mix(in srgb, var(--ok) 6%, var(--card))',
      pulse: false,
    },
    active: {
      color: 'var(--gold)',
      label: 'DOLU',
      bg: 'color-mix(in srgb, var(--gold) 6%, var(--card))',
      pulse: false,
    },
    new: {
      color: 'var(--accent)',
      label: 'YENİ',
      bg: 'color-mix(in srgb, var(--accent) 8%, var(--card))',
      pulse: true,
    },
    ready: {
      color: 'var(--super)',
      label: 'HAZIR',
      bg: 'color-mix(in srgb, var(--super) 8%, var(--card))',
      pulse: true,
    },
    unpaid: {
      color: 'var(--danger)',
      label: 'ÖDEME',
      bg: 'color-mix(in srgb, var(--danger) 6%, var(--card))',
      pulse: false,
    },
    reserved: {
      color: 'var(--olive)',
      label: 'REZERVE',
      bg: 'color-mix(in srgb, var(--olive) 6%, var(--card))',
      pulse: false,
    },
  };

  const effectiveStatus = table.has_unpaid && table.live_status === 'active'
    ? 'unpaid'
    : table.live_status;
  const cfg = statusConfig[effectiveStatus] || statusConfig.empty;

  const elapsed = table.oldest_order_at ? formatElapsed(table.oldest_order_at) : null;

  return (
    <button
      onClick={onClick}
      className="group relative rounded-[var(--r)] p-3 text-left transition-all hover:scale-[1.03] active:scale-[0.98]"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${
          effectiveStatus === 'empty' ? 'var(--line)' : `color-mix(in srgb, ${cfg.color} 35%, var(--line))`
        }`,
        minHeight: 110,
      }}
    >
      {/* Aktif çağrı rozeti - sağ üst köşede, dikkat çekici */}
      {activeCallCount > 0 && (
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
            letterSpacing: '-0.01em',
            boxShadow:
              '0 4px 10px -2px color-mix(in srgb, var(--accent) 55%, transparent), 0 0 0 2.5px var(--paper)',
            animation: 'callsBumpPulse 1.4s ease-in-out infinite',
          }}
        >
          {/* Zil ikon (1 çağrı) veya sayı (2+) */}
          {activeCallCount === 1 ? (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          ) : (
            activeCallCount
          )}
          {/* Sürekli ping efekti */}
          <span
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: 'var(--accent)',
              animation: 'callsPing 1.8s ease-out infinite',
            }}
          />
        </div>
      )}

      {/* Üst satır: masa no + pulse dot */}
      <div className="flex items-start justify-between gap-2">
        <div>
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
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {table.name}
          </div>
        </div>
        {cfg.pulse && (
          <span
            className="inline-block rounded-full flex-shrink-0 mt-1"
            style={{
              width: 8,
              height: 8,
              background: cfg.color,
              animation: 'aleg-table-pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Alt bilgi */}
      <div className="mt-2 flex items-end justify-between">
        <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}>
          <span>◉ {table.capacity}</span>
        </div>

        {table.active_order_count > 0 && (
          <div className="text-right">
            <div
              className="font-semibold"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 13,
                color: 'var(--ink)',
              }}
            >
              ₺{table.total_amount.toFixed(0)}
            </div>
            {elapsed && (
              <div
                className="text-[10px]"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                {elapsed}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes aleg-table-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.35); }
        }
      `}</style>
    </button>
  );
}

function ZoneHeader({
  name,
  count,
  color,
}: {
  name: string;
  count: number;
  color?: string | null;
}) {
  const c = color || 'var(--ink-2)';
  return (
    <div className="flex items-center gap-3 mb-2.5">
      {color && (
        <span
          className="inline-block rounded-full"
          style={{ width: 8, height: 8, background: c }}
        />
      )}
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink)',
        }}
      >
        {name}
      </span>
      <span
        className="text-xs"
        style={{
          fontFamily: 'var(--f-mono)',
          color: 'var(--ink-3)',
          letterSpacing: '0.06em',
        }}
      >
        {count} masa
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 h-8 rounded-full transition-all',
        active ? 'scale-[1.02]' : 'hover:opacity-80'
      )}
      style={{
        background: active
          ? `color-mix(in srgb, ${color} 14%, var(--card))`
          : 'var(--paper-2)',
        border: `1px solid ${active ? color : 'var(--line)'}`,
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: color,
        }}
      />
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: active ? color : 'var(--ink-2)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: active ? color : 'var(--ink-3)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function LegendHint() {
  return (
    <div
      className="hidden md:flex items-center gap-3 text-xs"
      style={{ color: 'var(--ink-3)' }}
    >
      <LegendDot color="var(--ok)" label="boş" />
      <LegendDot color="var(--gold)" label="dolu" />
      <LegendDot color="var(--accent)" label="yeni sipariş" pulse />
      <LegendDot color="var(--super)" label="hazır" pulse />
      <LegendDot color="var(--danger)" label="ödeme bekliyor" />
    </div>
  );
}

function LegendDot({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: color,
          animation: pulse ? 'aleg-table-pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <span style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );
}

function formatElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'şimdi';
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}sa`;
}
