'use client';

import { useState, useMemo } from 'react';
import type { Station } from '@/lib/actions/stations';

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

export function AssignProductsModal({
  station,
  allProducts,
  categories,
  saving,
  onClose,
  onSave,
}: {
  station: Station;
  allProducts: ProductLite[];
  categories: CategoryLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (productIds: string[]) => void;
}) {
  // Başlangıç: bu istasyona atanmış ürünler + başka hiçbir istasyonu olmayanlar seçilebilir
  // Ama seçili olanlar SADECE bu istasyondakiler
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        allProducts.filter((p) => p.station_id === station.id).map((p) => p.id)
      )
  );
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Filtreli ürünler
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];
    if (filterCategory !== 'all') {
      list = list.filter((p) => p.category_id === filterCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, filterCategory, search]);

  // Kategori bazında grupla
  const byCategory = useMemo(() => {
    const map = new Map<string, ProductLite[]>();
    filteredProducts.forEach((p) => {
      const key = p.category_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [filteredProducts]);

  function toggle(productId: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function selectAllInCategory(productIds: string[]) {
    setSelected((s) => {
      const next = new Set(s);
      productIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function deselectAllInCategory(productIds: string[]) {
    setSelected((s) => {
      const next = new Set(s);
      productIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[700px] max-h-[90vh] rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{ background: 'var(--paper)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between gap-4 flex-shrink-0"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${station.color} 18%, transparent)`,
                color: station.color,
                fontSize: 18,
              }}
            >
              {station.icon}
            </div>
            <div className="min-w-0">
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
                ÜRÜN ATAMA
              </div>
              <h2
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 400,
                }}
              >
                {station.name}
              </h2>
              <p className="text-[13px] text-ink-2 mt-1">
                İşaretli ürünler bu istasyonda olacak. İşaret kaldırırsan
                üründen çıkar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full hover:bg-[var(--paper-2)] text-ink-3 flex items-center justify-center flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Filtre */}
        <div
          className="px-6 py-3 flex gap-2 flex-shrink-0 flex-wrap items-center"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <input
            type="text"
            placeholder="Ürün ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] h-9 px-3 rounded-[10px] text-[13px]"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-3 rounded-[10px] text-[13px]"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          >
            <option value="all">Tüm kategoriler</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ürün Listesi */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-ink-3 text-sm">
              Arama kriterine uyan ürün yok
            </div>
          ) : (
            Array.from(byCategory.entries()).map(([catId, products]) => {
              const catName =
                catId === 'none' ? 'Kategorisiz' : categoryMap.get(catId) || 'Kategori';
              const allSelected = products.every((p) => selected.has(p.id));
              const productIds = products.map((p) => p.id);
              return (
                <div key={catId} className="mb-5 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3
                      className="uppercase"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        fontWeight: 700,
                        color: 'var(--ink-3)',
                      }}
                    >
                      {catName} · {products.length}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        allSelected
                          ? deselectAllInCategory(productIds)
                          : selectAllInCategory(productIds)
                      }
                      className="text-[11px] text-accent hover:underline"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {allSelected ? 'Tümünü kaldır' : 'Tümünü seç'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {products.map((p) => {
                      const isSelected = selected.has(p.id);
                      const otherStation =
                        p.station_id &&
                        p.station_id !== station.id &&
                        !isSelected;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggle(p.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors text-left hover:bg-[var(--paper-2)]"
                          style={{
                            background: isSelected
                              ? `color-mix(in srgb, ${station.color} 10%, transparent)`
                              : 'var(--card)',
                            border: `1px solid ${
                              isSelected ? station.color : 'var(--line)'
                            }`,
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-[6px] flex-shrink-0 flex items-center justify-center"
                            style={{
                              background: isSelected
                                ? station.color
                                : 'transparent',
                              border: `2px solid ${
                                isSelected ? station.color : 'var(--line)'
                              }`,
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {isSelected && '✓'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-medium text-ink truncate">
                              {p.name}
                            </div>
                            {otherStation && (
                              <div
                                className="text-[10px] mt-0.5"
                                style={{
                                  fontFamily: 'var(--f-mono)',
                                  color: 'var(--gold)',
                                  letterSpacing: '0.06em',
                                  fontWeight: 700,
                                }}
                              >
                                BAŞKA BİR İSTASYONDA
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div
            className="text-[12px]"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}
          >
            {selected.size} ÜRÜN SEÇİLİ
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 rounded-[12px] text-[13px] font-semibold text-ink-3 hover:bg-[var(--paper-2)]"
            >
              İptal
            </button>
            <button
              onClick={() => onSave(Array.from(selected))}
              disabled={saving}
              className="h-10 px-5 rounded-[12px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--paper)' }}
            >
              {saving ? 'Kaydediliyor...' : `Kaydet (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
