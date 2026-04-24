'use client';

import { useState, useMemo } from 'react';
import {
  createStation,
  updateStation,
  deleteStation,
  bulkAssignStation,
  type Station,
} from '@/lib/actions/stations';
import { StationFormModal } from './station-form-modal';
import { AssignProductsModal } from './assign-products-modal';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

type ProductLite = {
  id: string;
  name: string;
  station_id: string | null;
  category_id: string | null;
};

type CategoryLite = {
  id: string;
  name: string;
};

export function StationsManager({
  initialStations,
  allProducts,
  categories,
}: {
  initialStations: Station[];
  allProducts: ProductLite[];
  categories: CategoryLite[];
}) {
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [products, setProducts] = useState<ProductLite[]>(allProducts);
  const [saving, setSaving] = useState(false);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    station: Station | null;
  }>({ open: false, station: null });

  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    station: Station | null;
  }>({ open: false, station: null });

  // Atanmamış ürünler
  const unassignedProducts = useMemo(
    () => products.filter((p) => !p.station_id),
    [products]
  );

  // ====== HANDLERS ======

  async function handleCreate(input: {
    name: string;
    icon: string;
    color: string;
  }) {
    setSaving(true);
    const result = await createStation(input);
    setSaving(false);
    if (!result.success || !result.station) {
      toast.error(result.error || 'Oluşturulamadı');
      return;
    }
    // Optimistic: state'e ekle, sayfa yenilenmesin
    setStations((prev) => [
      ...prev,
      { ...result.station!, product_count: 0 },
    ]);
    setFormModal({ open: false, station: null });
  }

  async function handleUpdate(
    stationId: string,
    input: { name?: string; icon?: string; color?: string; is_active?: boolean }
  ) {
    setSaving(true);
    const result = await updateStation(stationId, input);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || 'Güncellenemedi');
      return;
    }
    // Optimistic: state'i güncelle
    setStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, ...input } : s))
    );
    setFormModal({ open: false, station: null });
  }

  async function handleDelete(stationId: string, name: string) {
    const ok = await confirmDialog({
      title: `"${name}" istasyonunu sil?`,
      body: 'Bu istasyondaki ürünler istasyonsuz kalır.',
      tone: 'danger',
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    setSaving(true);
    const result = await deleteStation(stationId);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || 'Silinemedi');
      return;
    }
    // Optimistic: state'ten çıkar, o istasyondaki ürünleri istasyonsuz yap
    setStations((prev) => prev.filter((s) => s.id !== stationId));
    setProducts((prev) =>
      prev.map((p) =>
        p.station_id === stationId ? { ...p, station_id: null } : p
      )
    );
  }

  async function handleAssign(stationId: string, productIds: string[]) {
    setSaving(true);
    const currentProductIds = products
      .filter((p) => p.station_id === stationId)
      .map((p) => p.id);
    const toRemove = currentProductIds.filter((id) => !productIds.includes(id));
    const toAdd = productIds.filter((id) => !currentProductIds.includes(id));

    if (toRemove.length > 0) {
      await bulkAssignStation(toRemove, null);
    }
    if (toAdd.length > 0) {
      await bulkAssignStation(toAdd, stationId);
    }

    setSaving(false);

    // Optimistic: ürünleri local state'te güncelle
    setProducts((prev) =>
      prev.map((p) => {
        if (productIds.includes(p.id)) return { ...p, station_id: stationId };
        if (currentProductIds.includes(p.id) && !productIds.includes(p.id))
          return { ...p, station_id: null };
        return p;
      })
    );

    // İstasyon product_count güncelle
    setStations((prev) =>
      prev.map((s) => {
        if (s.id === stationId) {
          return { ...s, product_count: productIds.length };
        }
        return s;
      })
    );

    let msg = '';
    if (toAdd.length === 0 && toRemove.length === 0) {
      msg = 'Değişiklik yok';
    } else if (toAdd.length > 0 && toRemove.length > 0) {
      msg = `${toAdd.length} ürüne atandı, ${toRemove.length} ürün kaldırıldı`;
    } else if (toAdd.length > 0) {
      msg = `${toAdd.length} ürüne atandı`;
    } else {
      msg = `${toRemove.length} ürün kaldırıldı`;
    }

    // Mini toast-ish alert yerine silent - sadece önemli değişiklikte göster
    if (toAdd.length > 0 || toRemove.length > 0) {
      toast.error(msg);
    }
    setAssignModal({ open: false, station: null });
  }

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.16em',
              color: 'var(--ink-3)',
              fontWeight: 700,
            }}
          >
            MUTFAK AKIŞI
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 42,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
            className="mb-2"
          >
            İstasyonlar
          </h1>
          <p className="text-ink-2 text-[15px]">
            Siparişleri Bar, Mutfak, Pastane gibi istasyonlara ayır. KDS&apos;de her
            istasyon sadece kendi işini görür.
          </p>
        </div>

        <button
          onClick={() => setFormModal({ open: true, station: null })}
          disabled={saving}
          className="h-11 px-5 rounded-[12px] text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Yeni istasyon
        </button>
      </div>

      {/* Atanmamış Ürün Uyarısı */}
      {unassignedProducts.length > 0 && stations.length > 0 && (
        <div
          className="rounded-[var(--r)] p-4 mb-6 flex items-start gap-3"
          style={{
            background: 'color-mix(in srgb, var(--gold) 10%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--line))',
          }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--gold) 18%, transparent)',
              color: 'var(--gold)',
            }}
          >
            !
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold mb-0.5">
              {unassignedProducts.length} ürün atanmamış
            </div>
            <div className="text-[12px] text-ink-2">
              {unassignedProducts
                .slice(0, 5)
                .map((p) => p.name)
                .join(', ')}
              {unassignedProducts.length > 5 &&
                ` +${unassignedProducts.length - 5} daha`}
              <br />
              Bu ürünler siparişte hiçbir istasyona düşmez. Bir istasyona ata
              veya kartta &quot;Ürünleri ata&quot; butonunu kullan.
            </div>
          </div>
        </div>
      )}

      {/* İstasyon Listesi */}
      {stations.length === 0 ? (
        <div
          className="rounded-[var(--r)] p-10 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          <div className="text-accent text-4xl mb-3">⊙</div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
            }}
            className="mb-2"
          >
            Henüz istasyonun yok
          </h2>
          <p className="text-ink-2 text-sm mb-5 max-w-md mx-auto">
            İstasyonlar sayesinde bar sipariş barista&apos;ya, yemek mutfağa ayrı
            düşer. İlk istasyonunu oluştur.
          </p>
          <button
            onClick={() => setFormModal({ open: true, station: null })}
            className="h-11 px-6 rounded-[12px] text-[14px] font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--paper)' }}
          >
            + Yeni istasyon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((s) => (
            <StationCard
              key={s.id}
              station={s}
              products={products.filter((p) => p.station_id === s.id)}
              onEdit={() => setFormModal({ open: true, station: s })}
              onAssign={() => setAssignModal({ open: true, station: s })}
              onDelete={() => handleDelete(s.id, s.name)}
              onToggleActive={(active) =>
                handleUpdate(s.id, { is_active: active })
              }
              disabled={saving}
            />
          ))}
        </div>
      )}

      {/* Modallar */}
      {formModal.open && (
        <StationFormModal
          station={formModal.station}
          saving={saving}
          onClose={() => setFormModal({ open: false, station: null })}
          onCreate={handleCreate}
          onUpdate={(input) => {
            if (formModal.station) {
              handleUpdate(formModal.station.id, input);
            }
          }}
        />
      )}

      {assignModal.open && assignModal.station && (
        <AssignProductsModal
          station={assignModal.station}
          allProducts={products}
          categories={categories}
          saving={saving}
          onClose={() => setAssignModal({ open: false, station: null })}
          onSave={(productIds) =>
            handleAssign(assignModal.station!.id, productIds)
          }
        />
      )}
    </div>
  );
}

// ====== KART ======

function StationCard({
  station,
  products,
  onEdit,
  onAssign,
  onDelete,
  onToggleActive,
  disabled,
}: {
  station: Station;
  products: ProductLite[];
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-5 flex flex-col"
      style={{
        background: 'var(--card)',
        border: `1px solid ${station.is_active ? 'var(--line)' : 'transparent'}`,
        opacity: station.is_active ? 1 : 0.6,
        borderTop: `4px solid ${station.color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${station.color} 18%, transparent)`,
              color: station.color,
              fontSize: 22,
            }}
          >
            {station.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="truncate"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              {station.name}
            </h3>
            <div
              className="text-[11px] mt-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                fontWeight: 700,
              }}
            >
              {products.length} ÜRÜN
              {!station.is_active && ' · PASİF'}
            </div>
          </div>
        </div>

        {/* Aktif toggle */}
        <button
          onClick={() => onToggleActive(!station.is_active)}
          disabled={disabled}
          className="flex-shrink-0 w-10 h-6 rounded-full relative transition-colors"
          style={{
            background: station.is_active ? 'var(--ok)' : 'var(--line)',
          }}
          title={station.is_active ? 'Pasif yap' : 'Aktif yap'}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{
              left: station.is_active ? 18 : 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </button>
      </div>

      {/* Ürün önizleme */}
      {products.length > 0 ? (
        <div className="mb-4 flex-1">
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            ÜRÜNLER
          </div>
          <div className="flex flex-wrap gap-1">
            {products.slice(0, 6).map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-2)',
                }}
              >
                {p.name}
              </span>
            ))}
            {products.length > 6 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-ink-3"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 700,
                }}
              >
                +{products.length - 6} daha
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className="mb-4 px-3 py-3 rounded-[10px] text-center text-[12px] text-ink-3 flex-1"
          style={{ background: 'var(--paper-2)' }}
        >
          Henüz ürün atanmamış
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAssign}
          disabled={disabled}
          className="flex-1 h-9 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          Ürünleri ata
        </button>
        <button
          onClick={onEdit}
          disabled={disabled}
          className="h-9 px-3 rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[var(--paper-2)] disabled:opacity-50"
          style={{ color: 'var(--ink-2)' }}
          title="Düzenle"
        >
          Düzenle
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="h-9 w-9 rounded-[10px] text-[16px] flex items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] disabled:opacity-50"
          style={{ color: 'var(--accent)' }}
          title="Sil"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
