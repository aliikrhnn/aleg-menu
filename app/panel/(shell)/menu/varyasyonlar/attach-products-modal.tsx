'use client';

import { useState, useMemo } from 'react';
import type { LocalizedText } from '@/types/database';
import type { Preset } from '@/lib/actions/options';

type ProductOption = {
  id: string;
  name: LocalizedText;
  category_id: string | null;
  status: 'active' | 'soldout' | 'draft';
};

type CategoryOption = {
  id: string;
  name: LocalizedText;
};

interface Props {
  preset: Preset;
  products: ProductOption[];
  categories: CategoryOption[];
  onAttach: (productIds: string[]) => void;
  onClose: () => void;
  saving: boolean;
}

export function AttachProductsModal({
  preset,
  products,
  categories,
  onAttach,
  onClose,
  saving,
}: Props) {
  // İlk değer: zaten bağlı olan ürünleri seçili olarak başlat
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preset.product_ids || [])
  );
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
      if (search && !p.name.tr.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, filterCategory, search]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((p) => p.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function selectByCategory(categoryId: string) {
    const ids = products.filter((p) => p.category_id === categoryId).map((p) => p.id);
    setSelected((s) => {
      const next = new Set(s);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) {
      alert('En az bir ürün seç');
      return;
    }
    onAttach(Array.from(selected));
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        animation: 'attachFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[22px] w-full max-w-[620px] max-h-[92vh] flex flex-col overflow-hidden border border-line relative"
        style={{
          boxShadow: '0 30px 60px -20px rgba(42,31,24,0.35)',
          animation: 'attachSlideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-paper-2 border border-line grid place-items-center text-ink hover:bg-paper-3 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

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
            ÜRÜNLERE UYGULA
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            {preset.name.tr}
          </h2>
          <p className="text-ink-2 text-[13px] mt-2">
            İşaretli ürünlerde varyasyon aktif olur. İşareti kaldırırsan o üründen
            kaldırılır.
          </p>
        </div>

        {/* Filters */}
        <div
          className="p-4 flex items-center gap-2 flex-wrap flex-shrink-0"
          style={{
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="flex-1 min-w-[140px] h-9 px-3 rounded-[8px] text-sm focus:outline-none focus:border-accent"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-3 rounded-[8px] text-sm focus:outline-none focus:border-accent cursor-pointer"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <option value="all">Tüm kategoriler</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.tr}
              </option>
            ))}
          </select>
        </div>

        {/* Hızlı seç */}
        {categories.length > 0 && (
          <div
            className="px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0"
            style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}
          >
            <span
              className="uppercase text-ink-3 mr-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              HIZLI:
            </span>
            {categories.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectByCategory(c.id)}
                className="h-6 px-2 rounded-full text-[10px] font-semibold uppercase transition-colors hover:bg-card"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-2)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                }}
              >
                + {c.name.tr}
              </button>
            ))}
            <button
              type="button"
              onClick={selectAll}
              className="h-6 px-2 rounded-full text-[10px] font-semibold uppercase transition-colors hover:bg-card ml-auto"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              Tümünü Seç
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="h-6 px-2 rounded-full text-[10px] font-semibold uppercase transition-colors hover:bg-card"
              style={{
                background: 'transparent',
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              Temizle
            </button>
          </div>
        )}

        {/* Products list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-ink-3 text-sm">
              Ürün bulunamadı
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="flex items-center gap-3 p-2.5 rounded-[10px] transition-all text-left"
                    style={{
                      background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--paper-2)',
                      border: isSelected
                        ? '2px solid var(--accent)'
                        : '1px solid var(--line)',
                    }}
                  >
                    {/* Checkbox */}
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isSelected ? 'var(--accent)' : 'var(--card)',
                        border: isSelected ? 'none' : '1.5px solid var(--line-2)',
                      }}
                    >
                      {isSelected && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">
                        {p.name.tr}
                      </div>
                      {p.category_id && (
                        <div className="text-[10px] text-ink-3 truncate">
                          {categories.find((c) => c.id === p.category_id)?.name.tr}
                        </div>
                      )}
                    </div>

                    {p.status !== 'active' && (
                      <span
                        className="uppercase text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          fontFamily: 'var(--f-mono)',
                          letterSpacing: '0.1em',
                          fontWeight: 700,
                          background: 'var(--paper-3)',
                          color: 'var(--ink-3)',
                        }}
                      >
                        {p.status === 'draft' ? 'TASLAK' : 'TÜKENDİ'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 p-5 flex-shrink-0"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div className="text-sm text-ink-2 flex-1">
            <span
              className="font-bold text-ink"
              style={{ fontFamily: 'var(--f-mono)' }}
            >
              {selected.size}
            </span>{' '}
            ürün seçili
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 px-5 rounded-[10px] text-[13px] font-medium transition-colors hover:bg-paper-3 disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || selected.size === 0}
            className="h-11 px-5 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            {saving ? 'Kaydediliyor...' : `Kaydet (${selected.size})`}
          </button>
        </div>

        <style jsx>{`
          @keyframes attachFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes attachSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
