'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getTablesWithStatus,
  type TableWithStatus,
  type TableZoneWithTables,
} from '@/lib/actions/tables-status';
import {
  TablesFullView,
  type ZoneFilterId,
} from '@/components/tables/table-card';

type Props = {
  onTableClick: (table: TableWithStatus) => void;
  callsByTable?: Map<string, number>;
};

export function TablesGrid({ onTableClick, callsByTable }: Props) {
  const [zones, setZones] = useState<TableZoneWithTables[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ZoneFilterId>('all');

  const load = useCallback(async () => {
    try {
      const r = await getTablesWithStatus();
      if (!r.success) {
        // Server hatası: error göster ama mevcut masaları SİLME
        // (network kopuşunda boş ekran daha kötü; eski masalar dursun)
        setError(r.error || 'Masalar alınamadı');
      } else {
        setZones(r.zones || []);
        setError(null);
      }
    } catch (err) {
      // Network/fetch hatası: sessizce yutalım, eski state korunur.
      // Sonraki polling iterasyonunda tekrar denenecek.
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[tables-grid] load network error', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Her 5 saniyede yenile (hızlı feedback için)
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const allTables = zones.flatMap((z) => z.tables);

  if (loading && zones.length === 0) {
    return (
      <div className="space-y-4">
        {/* Bölge başlıkları + masa grid iskeleti */}
        {Array.from({ length: 2 }).map((_, zi) => (
          <div key={zi}>
            <Skeleton.Box width={140} height={14} className="mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton.Box key={i} height={84} rounded="lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && zones.length === 0) {
    return (
      <div
        className="rounded-[12px] p-6 text-center"
        style={{
          background: 'color-mix(in srgb, var(--danger) 6%, var(--card))',
          border:
            '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
          color: 'var(--danger)',
          fontSize: 14,
        }}
      >
        ⚠ {error}
      </div>
    );
  }

  if (allTables.length === 0) {
    return (
      <div
        className="rounded-[14px] py-16 text-center"
        style={{
          background: 'var(--card)',
          border: '1px dashed var(--line)',
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
        <p
          className="text-sm mb-5"
          style={{
            color: 'var(--ink-2)',
            maxWidth: 380,
            margin: '0 auto 20px',
          }}
        >
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
    <TablesFullView
      zones={zones}
      activeFilter={filter}
      onFilterChange={setFilter}
      callsByTable={callsByTable}
      onSelectTable={onTableClick}
    />
  );
}
