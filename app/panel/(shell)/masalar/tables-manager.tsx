'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTable,
  updateTable,
  deleteTable,
  createZone,
  updateZone,
  deleteZone,
  bulkCreateTables,
  setTableStatus,
  type TableItem,
  type TableZone,
} from '@/lib/actions/tables';
import { QrPickerModal } from '@/components/panel/qr-picker-modal';
import type { QrPdfItem } from '@/lib/utils/qr-pdf';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

interface TablesManagerProps {
  initialTables: TableItem[];
  initialZones: TableZone[];
  businessName: string;
  qrByTableId: Record<string, { slug: string; url: string }>;
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'table-new' }
  | { kind: 'table-edit'; table: TableItem }
  | { kind: 'zone-new' }
  | { kind: 'zone-edit'; zone: TableZone }
  | { kind: 'bulk-add' }
  | { kind: 'qr-single'; table: TableItem }
  | { kind: 'qr-bulk' };

const ZONE_COLORS = [
  '#C4553A', // accent kırmızı
  '#B08A3E', // gold
  '#6B7A4B', // olive
  '#5A6B7E', // super mavi
  '#8C7A69', // kahverengi
  '#E08060', // açık accent
  '#7E5B3A', // koyu kahve
  '#4F7C4C', // ok yeşili
];

// Status renk paleti — referansla aynı
const STATUS_COLORS: Record<
  TableItem['status'],
  { bg: string; fg: string; dot: string; label: string }
> = {
  available: {
    bg: '#E9EFE0',
    fg: '#3F5B36',
    dot: '#6B7A4B',
    label: 'Boş',
  },
  occupied: {
    bg: '#F7E2D8',
    fg: '#8B3B24',
    dot: '#C4553A',
    label: 'Dolu',
  },
  reserved: {
    bg: '#E1EAF4',
    fg: '#274C72',
    dot: '#2E5B7A',
    label: 'Rezerve',
  },
  inactive: {
    bg: 'var(--paper-2)',
    fg: 'var(--ink-3)',
    dot: '#AAA',
    label: 'Pasif',
  },
};

export function TablesManager({
  initialTables,
  initialZones,
  businessName,
  qrByTableId,
}: TablesManagerProps) {
  const router = useRouter();

  // State'i props'tan başlat, ama props değişince güncelle
  // (router.refresh sonrası yeni veri gelsin)
  const [tables, setTables] = useState(initialTables);
  const [zones, setZones] = useState(initialZones);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  useEffect(() => {
    setZones(initialZones);
  }, [initialZones]);

  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [, startTransition] = useTransition();

  const refreshData = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Aktif siparişi olan masa "dolu" gösterilir (manuel status > otomatik)
  const displayStatus = (t: TableItem): TableItem['status'] => {
    if (t.active_orders_count > 0) return 'occupied';
    return t.status;
  };

  const filteredTables =
    zoneFilter === 'all'
      ? tables
      : zoneFilter === 'nozone'
      ? tables.filter((t) => !t.zone_id)
      : tables.filter((t) => t.zone_id === zoneFilter);

  // Stats hesapla (aktif siparişi olanları da dolu say)
  const stats = {
    available: tables.filter((t) => displayStatus(t) === 'available').length,
    occupied: tables.filter((t) => displayStatus(t) === 'occupied').length,
    reserved: tables.filter((t) => displayStatus(t) === 'reserved').length,
    totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
  };

  // Zone bazlı gruplama
  const zonesToShow =
    zoneFilter === 'all'
      ? zones
      : zoneFilter === 'nozone'
      ? []
      : zones.filter((z) => z.id === zoneFilter);

  const nozoneTables = filteredTables.filter((t) => !t.zone_id);

  // Optimistic helpers
  const addTableOptimistic = (newTable: TableItem) => {
    setTables((prev) => [...prev, newTable]);
  };

  const updateTableOptimistic = (id: string, changes: Partial<TableItem>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  };

  const removeTableOptimistic = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  const addZoneOptimistic = (newZone: TableZone) => {
    setZones((prev) => [...prev, newZone]);
  };

  const updateZoneOptimistic = (id: string, changes: Partial<TableZone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...changes } : z)));
  };

  const removeZoneOptimistic = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    // Silinen bölgeye bağlı masaları zonesuz yap
    setTables((prev) =>
      prev.map((t) =>
        t.zone_id === id
          ? { ...t, zone_id: null, zone_name: null, zone_color: null }
          : t
      )
    );
  };

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1200px] mx-auto">
      {/* ============ HERO ============ */}
      <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div
            className="text-accent uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            OPERASYON
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 42,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--ink)',
            }}
          >
            Masalar
          </h1>
          <p className="text-ink-2 text-sm mt-2 max-w-[480px]">
            Masaları düzenle, bölgelere ata. QR kodları yakında buradan yazdırabilirsin.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tables.length > 0 && (
            <button
              onClick={() => setModal({ kind: 'qr-bulk' })}
              className="h-11 px-4 rounded-full font-semibold text-sm flex items-center gap-2 transition-colors"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
              title="Tüm masaların QR kodlarını PDF olarak indir"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="0" />
                <rect x="14" y="3" width="7" height="7" rx="0" />
                <rect x="3" y="14" width="7" height="7" rx="0" />
                <path d="M14 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM14 16h1v1h-1zM16 16h1v1h-1zM14 18h1v1h-1zM18 18h1v1h-1zM16 18h1v1h-1zM18 16h1v1h-1z" />
              </svg>
              QR İndir
            </button>
          )}
          <button
            onClick={() => setModal({ kind: 'bulk-add' })}
            className="h-11 px-4 rounded-full font-semibold text-sm flex items-center gap-2 transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Hızlı Ekle
          </button>
          <button
            onClick={() => setModal({ kind: 'table-new' })}
            className="h-11 px-5 rounded-full font-semibold text-sm flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Masa Ekle
          </button>
        </div>
      </div>

      {/* ============ ZONE FILTER PILLS ============ */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <FilterPill
          active={zoneFilter === 'all'}
          onClick={() => setZoneFilter('all')}
          label="Tümü"
          count={tables.length}
        />

        {zones.map((zone) => (
          <FilterPill
            key={zone.id}
            active={zoneFilter === zone.id}
            onClick={() => setZoneFilter(zone.id)}
            label={zone.name}
            count={zone.table_count}
            color={zone.color}
            onEdit={() => setModal({ kind: 'zone-edit', zone })}
          />
        ))}

        {tables.some((t) => !t.zone_id) && (
          <FilterPill
            active={zoneFilter === 'nozone'}
            onClick={() => setZoneFilter('nozone')}
            label="Bölgesiz"
            count={tables.filter((t) => !t.zone_id).length}
          />
        )}

        {/* Bölge Ekle (dashed) */}
        <button
          onClick={() => setModal({ kind: 'zone-new' })}
          className="h-9 pl-3 pr-3.5 rounded-full font-medium text-xs flex items-center gap-1.5 transition-colors hover:bg-card"
          style={{
            background: 'transparent',
            border: '1.5px dashed var(--line-2)',
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-sans)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Bölge Ekle
        </button>
      </div>

      {/* ============ STATS ROW ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="BOŞ MASA"
          value={stats.available}
          dotColor={STATUS_COLORS.available.dot}
        />
        <StatCard
          label="DOLU MASA"
          value={stats.occupied}
          dotColor={STATUS_COLORS.occupied.dot}
        />
        <StatCard
          label="REZERVE"
          value={stats.reserved}
          dotColor={STATUS_COLORS.reserved.dot}
        />
        <StatCard
          label="TOPLAM KAPASİTE"
          value={stats.totalCapacity}
          suffix="kişi"
          dotColor="var(--ink-3)"
        />
      </div>

      {/* ============ MAIN ============ */}
      {tables.length === 0 ? (
        <EmptyState
          onAddSingle={() => setModal({ kind: 'table-new' })}
          onAddBulk={() => setModal({ kind: 'bulk-add' })}
          hasFilter={false}
        />
      ) : filteredTables.length === 0 ? (
        <EmptyState
          onAddSingle={() => setModal({ kind: 'table-new' })}
          onAddBulk={() => setModal({ kind: 'bulk-add' })}
          hasFilter={true}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {/* Her bölge için grup */}
          {zonesToShow.map((zone) => {
            const items = filteredTables.filter((t) => t.zone_id === zone.id);
            if (items.length === 0) return null;
            return (
              <ZoneGroup
                key={zone.id}
                zone={zone}
                tables={items}
                onTableEdit={(table) => setModal({ kind: 'table-edit', table })}
                onZoneEdit={() => setModal({ kind: 'zone-edit', zone })}
                onStatusToggle={async (tableId, currentStatus) => {
                  const next =
                    currentStatus === 'available' ? 'reserved' : 'available';
                  updateTableOptimistic(tableId, { status: next });
                  const result = await setTableStatus(tableId, next);
                  if (!result.success) {
                    toast.error(result.error);
                    updateTableOptimistic(tableId, { status: currentStatus });
                  }
                }}
                onQrClick={(t) =>
                  qrByTableId[t.id] && setModal({ kind: 'qr-single', table: t })
                }
                displayStatus={displayStatus}
              />
            );
          })}

          {/* Bölgesiz masalar */}
          {nozoneTables.length > 0 && zoneFilter !== 'nozone' && (
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="w-1.5 h-1.5 rounded-[1px] bg-ink-3 flex-shrink-0" />
                <h3
                  className="uppercase text-ink-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  BÖLGESİZ
                </h3>
                <span
                  className="text-ink-3 text-xs"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {nozoneTables.length} masa
                </span>
              </div>
              <TableGrid
                tables={nozoneTables}
                onEdit={(table) => setModal({ kind: 'table-edit', table })}
                displayStatus={displayStatus}
                onStatusToggle={async (tableId, currentStatus) => {
                  const next =
                    currentStatus === 'available' ? 'reserved' : 'available';
                  updateTableOptimistic(tableId, { status: next });
                  const result = await setTableStatus(tableId, next);
                  if (!result.success) {
                    toast.error(result.error);
                    updateTableOptimistic(tableId, { status: currentStatus });
                  }
                }}
                onQrClick={(t) =>
                  qrByTableId[t.id] && setModal({ kind: 'qr-single', table: t })
                }
              />
            </div>
          )}

          {zoneFilter === 'nozone' && (
            <TableGrid
              tables={nozoneTables}
              onEdit={(table) => setModal({ kind: 'table-edit', table })}
              displayStatus={displayStatus}
              onStatusToggle={async (tableId, currentStatus) => {
                const next =
                  currentStatus === 'available' ? 'reserved' : 'available';
                updateTableOptimistic(tableId, { status: next });
                const result = await setTableStatus(tableId, next);
                if (!result.success) {
                  toast.error(result.error);
                  updateTableOptimistic(tableId, { status: currentStatus });
                }
              }}
              onQrClick={(t) =>
                qrByTableId[t.id] && setModal({ kind: 'qr-single', table: t })
              }
            />
          )}
        </div>
      )}

      {/* ============ MODALS ============ */}
      {modal.kind === 'qr-single' && qrByTableId[modal.table.id] && (
        <QrPickerModal
          mode={{
            kind: 'single',
            item: {
              tableName: modal.table.name,
              businessName,
              qrUrl: qrByTableId[modal.table.id].url,
            },
          }}
          onClose={() => setModal({ kind: 'closed' })}
        />
      )}

      {modal.kind === 'qr-bulk' && (
        <QrPickerModal
          mode={{
            kind: 'bulk',
            items: tables
              .filter((t) => qrByTableId[t.id])
              .map(
                (t): QrPdfItem => ({
                  tableName: t.name,
                  businessName,
                  qrUrl: qrByTableId[t.id].url,
                })
              ),
          }}
          onClose={() => setModal({ kind: 'closed' })}
        />
      )}

      {modal.kind !== 'closed' && modal.kind !== 'qr-single' && modal.kind !== 'qr-bulk' && (
        <Modal onClose={() => setModal({ kind: 'closed' })}>
          {(modal.kind === 'table-new' || modal.kind === 'table-edit') && (
            <TableForm
              initial={modal.kind === 'table-edit' ? modal.table : null}
              zones={zones}
              onClose={() => setModal({ kind: 'closed' })}
              onOptimisticCreate={(newTable) => {
                addTableOptimistic(newTable);
                setModal({ kind: 'closed' });
                // DB confirm için refresh
                refreshData();
              }}
              onOptimisticUpdate={(id, changes) => {
                updateTableOptimistic(id, changes);
                setModal({ kind: 'closed' });
                refreshData();
              }}
              onDelete={async (tableId) => {
                const ok = await confirmDialog({
                  title: 'Masayı sil?',
                  body: 'Bu masa kalıcı olarak silinecek.',
                  tone: 'danger',
                  confirmLabel: 'Sil',
                });
                if (!ok) return;
                // Optimistic sil
                const backup = tables.find((t) => t.id === tableId);
                removeTableOptimistic(tableId);
                setModal({ kind: 'closed' });
                const result = await deleteTable(tableId);
                if (!result.success) {
                  toast.error(result.error);
                  if (backup) addTableOptimistic(backup); // geri koy
                } else {
                  refreshData();
                }
              }}
              onQrDownload={
                modal.kind === 'table-edit' && qrByTableId[modal.table.id]
                  ? () => setModal({ kind: 'qr-single', table: modal.table })
                  : undefined
              }
            />
          )}

          {modal.kind === 'bulk-add' && (
            <BulkAddForm
              zones={zones}
              onClose={() => setModal({ kind: 'closed' })}
              onSuccess={() => {
                setModal({ kind: 'closed' });
                refreshData();
              }}
            />
          )}

          {(modal.kind === 'zone-new' || modal.kind === 'zone-edit') && (
            <ZoneForm
              initial={modal.kind === 'zone-edit' ? modal.zone : null}
              onClose={() => setModal({ kind: 'closed' })}
              onOptimisticCreate={(newZone) => {
                addZoneOptimistic(newZone);
                setModal({ kind: 'closed' });
                refreshData();
              }}
              onOptimisticUpdate={(id, changes) => {
                updateZoneOptimistic(id, changes);
                setModal({ kind: 'closed' });
                refreshData();
              }}
              onDelete={async (zoneId) => {
                const ok = await confirmDialog({
                  title: 'Bölgeyi sil?',
                  body: 'Bu bölgedeki masalar bölgesiz kalacak.',
                  tone: 'danger',
                  confirmLabel: 'Sil',
                });
                if (!ok) return;
                const backup = zones.find((z) => z.id === zoneId);
                removeZoneOptimistic(zoneId);
                setModal({ kind: 'closed' });
                const result = await deleteZone(zoneId);
                if (!result.success) {
                  toast.error(result.error);
                  if (backup) addZoneOptimistic(backup);
                } else {
                  refreshData();
                }
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Zone Group
// ============================================================

function ZoneGroup({
  zone,
  tables,
  onTableEdit,
  onZoneEdit,
  onStatusToggle,
  onQrClick,
  displayStatus,
}: {
  zone: TableZone;
  tables: TableItem[];
  onTableEdit: (t: TableItem) => void;
  onZoneEdit: () => void;
  onStatusToggle: (id: string, current: TableItem['status']) => void;
  onQrClick?: (t: TableItem) => void;
  displayStatus: (t: TableItem) => TableItem['status'];
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-[1px] flex-shrink-0"
          style={{ background: zone.color || 'var(--ink-3)' }}
        />
        <h3
          className="uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: zone.color || 'var(--ink-2)',
          }}
        >
          {zone.name}
        </h3>
        <span
          className="text-ink-3 text-xs"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {tables.length} masa
        </span>
        <button
          onClick={onZoneEdit}
          className="ml-auto text-ink-3 hover:text-ink-2 transition-colors p-1.5 rounded opacity-60 hover:opacity-100"
          title="Bölge düzenle"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <TableGrid
        tables={tables}
        onEdit={onTableEdit}
        displayStatus={displayStatus}
        onStatusToggle={onStatusToggle}
        onQrClick={onQrClick}
      />
    </div>
  );
}

// ============================================================
// Table Grid
// ============================================================

function TableGrid({
  tables,
  onEdit,
  displayStatus,
  onStatusToggle,
  onQrClick,
}: {
  tables: TableItem[];
  onEdit: (t: TableItem) => void;
  displayStatus: (t: TableItem) => TableItem['status'];
  onStatusToggle: (id: string, current: TableItem['status']) => void;
  onQrClick?: (t: TableItem) => void;
}) {
  return (
    <div
      className="grid gap-2.5"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      }}
    >
      {tables.map((t) => (
        <TableCard
          key={t.id}
          table={t}
          onEdit={() => onEdit(t)}
          onStatusToggle={() => onStatusToggle(t.id, t.status)}
          onQrClick={onQrClick ? () => onQrClick(t) : undefined}
          status={displayStatus(t)}
        />
      ))}
    </div>
  );
}

// ============================================================
// Table Card — Referans tasarımla
// ============================================================

function TableCard({
  table,
  onEdit,
  onStatusToggle,
  onQrClick,
  status,
}: {
  table: TableItem;
  onEdit: () => void;
  onStatusToggle: () => void;
  onQrClick?: () => void;
  status: TableItem['status'];
}) {
  const sc = STATUS_COLORS[status];
  const canToggleStatus = table.active_orders_count === 0;

  return (
    <div
      onClick={onEdit}
      className="group text-left bg-card border border-line rounded-[12px] p-3.5 flex flex-col gap-1.5 cursor-pointer transition-all hover:border-line-2 hover:-translate-y-0.5 relative"
      style={{
        borderTopWidth: 3,
        borderTopColor: sc.dot,
        minHeight: 96,
      }}
    >
      {/* Hover QR button - sağ alt köşede belirir */}
      {onQrClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQrClick();
          }}
          className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-md grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: 'var(--ink)',
            color: '#FAF5EA',
          }}
          title="QR Kodu İndir"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="0" />
            <rect x="14" y="3" width="7" height="7" rx="0" />
            <rect x="3" y="14" width="7" height="7" rx="0" />
            <path d="M14 14h1v1h-1zM18 14h1v1h-1zM14 18h1v1h-1zM18 18h1v1h-1z" fill="currentColor" />
          </svg>
        </button>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div
            className="uppercase mb-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10.5,
              letterSpacing: '0.12em',
              color: 'var(--ink-3)',
              fontWeight: 500,
            }}
          >
            MASA
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--ink)',
            }}
            className="truncate"
          >
            {table.name}
          </div>
        </div>

        <StatusPill
          status={status}
          canToggle={canToggleStatus}
          onToggle={onStatusToggle}
        />
      </div>

      <div
        className="mt-auto flex items-center gap-2 text-[11px] text-ink-3"
        style={{ fontFamily: 'var(--f-mono)' }}
      >
        <span className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          {table.capacity}
        </span>
        {table.active_orders_count > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
              {table.active_orders_count} sipariş
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Status Pill — Dairecik + hover ok + tooltip
// ============================================================

function StatusPill({
  status,
  canToggle,
  onToggle,
}: {
  status: TableItem['status'];
  canToggle: boolean;
  onToggle: () => void;
}) {
  const sc = STATUS_COLORS[status];
  const [animating, setAnimating] = useState(false);

  // Dairecik stili: boş = outline, rezerve = dolu
  const isDot =
    status === 'reserved' || status === 'occupied'; // Dolu dairecik
  const isRing = status === 'available'; // Boş halka

  // Tooltip yazısı: sonraki durum ne?
  let nextLabel = '';
  if (canToggle) {
    if (status === 'available') nextLabel = 'Rezerve yap';
    else if (status === 'reserved') nextLabel = 'Boşa al';
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canToggle) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 280);
    onToggle();
  };

  return (
    <div className="relative group/pill flex-shrink-0">
      <button
        onClick={handleClick}
        disabled={!canToggle}
        className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap transition-all"
        style={{
          background: sc.bg,
          color: sc.fg,
          cursor: canToggle ? 'pointer' : 'default',
          border: `1px solid ${canToggle ? 'transparent' : 'transparent'}`,
        }}
        title={canToggle ? '' : 'Sipariş aktif'}
      >
        {/* Dairecik/Halka */}
        <span
          className="relative inline-flex items-center justify-center transition-transform"
          style={{
            width: 14,
            height: 14,
            transform: animating ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          {/* Outer ring */}
          <span
            className="absolute inset-0 rounded-full transition-all"
            style={{
              border: `2px solid ${sc.dot}`,
              background: isDot ? sc.dot : 'transparent',
            }}
          />
          {/* Inner check (dolu durum için) */}
          {isDot && (
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke={sc.bg}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative z-10"
              style={{ opacity: isRing ? 0 : 1, transition: 'opacity 0.2s' }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>

        {/* Label */}
        <span>{sc.label}</span>

        {/* Hover ok — sadece toggle edilebilirse ve hover'da */}
        {canToggle && (
          <svg
            className="transition-all opacity-0 group-hover/pill:opacity-70"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginRight: -4,
              marginLeft: 0,
            }}
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        )}
      </button>

      {/* Tooltip - hover'da üstte beliren ipucu */}
      {canToggle && (
        <div
          className="absolute bottom-full right-0 mb-1.5 pointer-events-none opacity-0 group-hover/pill:opacity-100 transition-opacity z-20"
          style={{ transitionDelay: '0.2s' }}
        >
          <div
            className="px-2 py-1 rounded-md text-[10px] whitespace-nowrap shadow-md"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
              fontWeight: 500,
            }}
          >
            {nextLabel}
          </div>
          {/* Arrow */}
          <div
            className="absolute right-3 top-full"
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid var(--ink)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Filter Pill
// ============================================================

function FilterPill({
  active,
  onClick,
  label,
  count,
  color,
  onEdit,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string | null;
  onEdit?: () => void;
}) {
  const bg = active && color ? `${color}1F` : active ? 'var(--ink)' : 'var(--card)';
  const borderColor = active && color ? color : active ? 'var(--ink)' : 'var(--line)';
  const fg = active && color ? color : active ? 'var(--paper)' : 'var(--ink)';

  return (
    <div
      className="inline-flex items-center gap-1.5 h-9 pl-3.5 pr-3 rounded-full transition-colors"
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
      }}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-[1px] flex-shrink-0"
          style={{ background: color }}
        />
      )}
      <button
        onClick={onClick}
        className="text-[12.5px] font-semibold"
        style={{ color: fg }}
      >
        {label}
      </button>
      <span
        className="text-[11px]"
        style={{
          fontFamily: 'var(--f-mono)',
          color: fg,
          opacity: 0.7,
        }}
      >
        {count}
      </span>
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="ml-0.5 transition-opacity"
          style={{ color: fg, opacity: 0.55 }}
          title="Düzenle"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  label,
  value,
  dotColor,
  suffix,
}: {
  label: string;
  value: number;
  dotColor: string;
  suffix?: string;
}) {
  return (
    <div
      className="bg-card border border-line rounded-[12px] px-4 py-3"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: dotColor,
      }}
    >
      <div
        className="uppercase text-ink-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10.5,
          letterSpacing: '0.1em',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginTop: 2,
            color: 'var(--ink)',
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="text-ink-3 text-[11px]"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({
  onAddSingle,
  onAddBulk,
  hasFilter,
}: {
  onAddSingle: () => void;
  onAddBulk: () => void;
  hasFilter: boolean;
}) {
  return (
    <div className="bg-card border border-line rounded-[var(--r)] py-14 text-center">
      <div className="text-5xl mb-3 opacity-30 text-ink-3">◍</div>
      <h3
        className="mb-1.5"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          color: 'var(--ink)',
        }}
      >
        {hasFilter ? 'Bu bölgede masa yok' : 'Henüz masa eklenmemiş'}
      </h3>
      <p className="text-ink-3 text-sm mb-5 max-w-[400px] mx-auto">
        {hasFilter
          ? 'Farklı bir bölge seç veya masa ekle.'
          : 'Hızlı ekle ile tek seferde tüm masaları oluşturabilirsin.'}
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onAddBulk}
          className="h-10 px-5 rounded-full font-semibold text-sm transition-colors"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
          }}
        >
          Hızlı Ekle
        </button>
        <button
          onClick={onAddSingle}
          className="h-10 px-5 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#FAF5EA' }}
        >
          {hasFilter ? 'Masa Ekle' : 'İlk masayı ekle'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Modal wrapper
// ============================================================

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'tmFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] max-w-[460px] w-full p-7 max-h-[90vh] overflow-y-auto border border-line relative"
        style={{
          boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          animation: 'tmSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] w-[32px] h-[32px] rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {children}

        <style jsx>{`
          @keyframes tmFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes tmSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ============================================================
// Table Form - optimistic create
// ============================================================

function TableForm({
  initial,
  zones,
  onClose,
  onOptimisticCreate,
  onOptimisticUpdate,
  onDelete,
  onQrDownload,
}: {
  initial: TableItem | null;
  zones: TableZone[];
  onClose: () => void;
  onOptimisticCreate: (t: TableItem) => void;
  onOptimisticUpdate: (id: string, changes: Partial<TableItem>) => void;
  onDelete?: (id: string) => void;
  onQrDownload?: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || '');
  const [capacity, setCapacity] = useState(initial?.capacity || 2);
  const [zoneId, setZoneId] = useState(initial?.zone_id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (isEdit) {
      const selectedZone = zones.find((z) => z.id === zoneId);
      const result = await updateTable(initial!.id, {
        name,
        capacity,
        zone_id: zoneId || null,
      });
      setSubmitting(false);
      if (!result.success) {
        setError(result.error || 'Hata');
        return;
      }
      onOptimisticUpdate(initial!.id, {
        name: name.trim(),
        capacity,
        zone_id: zoneId || null,
        zone_name: selectedZone?.name || null,
        zone_color: selectedZone?.color || null,
      });
    } else {
      const result = await createTable({
        name,
        capacity,
        zone_id: zoneId || null,
      });
      setSubmitting(false);
      if (!result.success || !result.table_id) {
        setError(result.error || 'Hata');
        return;
      }
      const selectedZone = zones.find((z) => z.id === zoneId);
      onOptimisticCreate({
        id: result.table_id,
        name: name.trim(),
        capacity,
        zone_id: zoneId || null,
        zone_name: selectedZone?.name || null,
        zone_color: selectedZone?.color || null,
        status: 'available',
        active_orders_count: 0,
      });
    }
  };

  return (
    <>
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--accent)',
          fontWeight: 700,
        }}
      >
        {isEdit ? 'MASA DÜZENLE' : 'YENİ MASA'}
      </div>
      <h2
        className="mb-5"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 30,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {isEdit ? initial!.name : 'Yeni masa ekle'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isEdit && onQrDownload && (
          <button
            type="button"
            onClick={onQrDownload}
            className="flex items-center gap-3 px-3.5 py-3 rounded-[12px] transition-colors hover:bg-paper-3 text-left w-full"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            <div
              className="w-9 h-9 rounded-[8px] grid place-items-center flex-shrink-0"
              style={{ background: 'var(--ink)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="0" />
                <rect x="14" y="3" width="7" height="7" rx="0" />
                <rect x="3" y="14" width="7" height="7" rx="0" />
                <path d="M14 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM14 16h1v1h-1zM16 16h1v1h-1zM14 18h1v1h-1zM18 18h1v1h-1zM16 18h1v1h-1zM18 16h1v1h-1z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">QR Kodu İndir</div>
              <div className="text-[11px] text-ink-3">PNG veya PDF — 4 farklı tasarım</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3">
              <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <Field label="Masa adı">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masa 1, Teras B2..."
            required
            maxLength={50}
            className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors"
            autoFocus
          />
        </Field>

        <Field label={`Kapasite · ${capacity} kişi`}>
          <input
            type="range"
            min={1}
            max={20}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[10px] text-ink-3 mt-1" style={{ fontFamily: 'var(--f-mono)' }}>
            <span>1</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
          </div>
        </Field>

        {zones.length > 0 && (
          <Field label="Bölge">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setZoneId('')}
                className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                  !zoneId ? 'bg-ink text-card' : 'bg-paper-2 text-ink-2 hover:bg-paper-3'
                }`}
              >
                Yok
              </button>
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZoneId(z.id)}
                  className="h-8 pl-2.5 pr-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                  style={{
                    background:
                      zoneId === z.id ? z.color || 'var(--ink)' : 'var(--paper-2)',
                    color: zoneId === z.id ? '#FAF5EA' : 'var(--ink-2)',
                    border:
                      zoneId === z.id
                        ? `1px solid ${z.color || 'var(--ink)'}`
                        : '1px solid transparent',
                  }}
                >
                  {z.color && (
                    <span
                      className="w-2 h-2 rounded-[1px]"
                      style={{
                        background:
                          zoneId === z.id ? 'rgba(255,248,236,0.85)' : z.color,
                      }}
                    />
                  )}
                  {z.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        {error && (
          <div
            className="px-3 py-2 rounded-[10px] text-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(initial!.id)}
              className="h-11 px-4 rounded-[12px] text-sm text-accent hover:opacity-70 transition-opacity"
              style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
            >
              SİL
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-[12px] text-sm text-ink-2 hover:text-ink transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-11 px-6 rounded-[12px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            {submitting ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Ekle'}
          </button>
        </div>
      </form>
    </>
  );
}

// ============================================================
// Bulk Add Form
// ============================================================

function BulkAddForm({
  zones,
  onClose,
  onSuccess,
}: {
  zones: TableZone[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [prefix, setPrefix] = useState('Masa ');
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(10);
  const [capacity, setCapacity] = useState(4);
  const [zoneId, setZoneId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await bulkCreateTables({
      prefix,
      startNo,
      endNo,
      capacity,
      zone_id: zoneId || null,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Hata oluştu');
      return;
    }

    onSuccess();
  };

  const count = Math.max(0, endNo - startNo + 1);
  const preview = count > 0 ? `${prefix}${startNo}, ${prefix}${startNo + 1}, ..., ${prefix}${endNo}` : '—';

  return (
    <>
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--accent)',
          fontWeight: 700,
        }}
      >
        HIZLI EKLE
      </div>
      <h2
        className="mb-2"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 30,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1,
        }}
      >
        Toplu masa ekle
      </h2>
      <p className="text-ink-2 text-sm mb-5">
        Ardışık numaralı masaları tek seferde oluştur.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Ön-ek (prefix)">
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Masa , T, Teras "
            maxLength={20}
            className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Başlangıç">
            <input
              type="number"
              min={1}
              max={999}
              value={startNo}
              onChange={(e) => setStartNo(Math.max(1, Number(e.target.value)))}
              className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink focus:outline-none focus:border-accent focus:bg-card transition-colors"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
          <Field label="Bitiş">
            <input
              type="number"
              min={startNo}
              max={999}
              value={endNo}
              onChange={(e) => setEndNo(Math.max(startNo, Number(e.target.value)))}
              className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink focus:outline-none focus:border-accent focus:bg-card transition-colors"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
        </div>

        <Field label={`Kapasite · ${capacity} kişi (hepsi için)`}>
          <input
            type="range"
            min={1}
            max={20}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </Field>

        {zones.length > 0 && (
          <Field label="Bölge">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setZoneId('')}
                className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                  !zoneId ? 'bg-ink text-card' : 'bg-paper-2 text-ink-2 hover:bg-paper-3'
                }`}
              >
                Yok
              </button>
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZoneId(z.id)}
                  className="h-8 pl-2.5 pr-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                  style={{
                    background:
                      zoneId === z.id ? z.color || 'var(--ink)' : 'var(--paper-2)',
                    color: zoneId === z.id ? '#FAF5EA' : 'var(--ink-2)',
                  }}
                >
                  {z.color && (
                    <span
                      className="w-2 h-2 rounded-[1px]"
                      style={{
                        background:
                          zoneId === z.id ? 'rgba(255,248,236,0.85)' : z.color,
                      }}
                    />
                  )}
                  {z.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* Önizleme */}
        <div
          className="px-4 py-3 rounded-[10px]"
          style={{
            background: 'var(--paper-2)',
            border: '1px dashed var(--line)',
          }}
        >
          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            ÖNİZLEME · {count} MASA
          </div>
          <div
            className="text-sm text-ink-2 truncate"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            {preview}
          </div>
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-[10px] text-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-[12px] text-sm text-ink-2 hover:text-ink transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting || count === 0 || count > 100}
            className="h-11 px-6 rounded-[12px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            {submitting ? 'Oluşturuluyor...' : `${count} Masa Ekle`}
          </button>
        </div>
      </form>
    </>
  );
}

// ============================================================
// Zone Form - optimistic
// ============================================================

function ZoneForm({
  initial,
  onClose,
  onOptimisticCreate,
  onOptimisticUpdate,
  onDelete,
}: {
  initial: TableZone | null;
  onClose: () => void;
  onOptimisticCreate: (z: TableZone) => void;
  onOptimisticUpdate: (id: string, changes: Partial<TableZone>) => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || ZONE_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (isEdit) {
      const result = await updateZone(initial!.id, { name, color });
      setSubmitting(false);
      if (!result.success) {
        setError(result.error || 'Hata');
        return;
      }
      onOptimisticUpdate(initial!.id, { name: name.trim(), color });
    } else {
      const result = await createZone({ name, color });
      setSubmitting(false);
      if (!result.success || !result.zone_id) {
        setError(result.error || 'Hata');
        return;
      }
      onOptimisticCreate({
        id: result.zone_id,
        name: name.trim(),
        color,
        sort_order: 9999,
        table_count: 0,
      });
    }
  };

  return (
    <>
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--accent)',
          fontWeight: 700,
        }}
      >
        {isEdit ? 'BÖLGE DÜZENLE' : 'YENİ BÖLGE'}
      </div>
      <h2
        className="mb-5"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {isEdit ? initial!.name : 'Yeni bölge oluştur'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Bölge adı">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Salon, Teras, Bahçe..."
            required
            maxLength={50}
            autoFocus
            className="w-full h-11 px-3.5 rounded-[10px] bg-paper-2 border border-line text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors"
          />
        </Field>

        <Field label="Renk">
          <div className="flex flex-wrap gap-2">
            {ZONE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full transition-transform"
                style={{
                  background: c,
                  border: color === c ? '3px solid var(--ink)' : '3px solid transparent',
                  transform: color === c ? 'scale(1.08)' : 'scale(1)',
                }}
                aria-label={`Renk ${c}`}
              />
            ))}
          </div>
        </Field>

        {error && (
          <div
            className="px-3 py-2 rounded-[10px] text-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(initial!.id)}
              className="h-11 px-4 rounded-[12px] text-sm text-accent hover:opacity-70 transition-opacity"
              style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
            >
              SİL
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-[12px] text-sm text-ink-2 hover:text-ink transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-11 px-6 rounded-[12px] font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            {submitting ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Ekle'}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          fontWeight: 700,
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
