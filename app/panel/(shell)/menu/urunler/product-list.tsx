'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  uploadProductImage,
  removeProductImage,
  bulkAssignStation,
  toggleSoldOut,
  bulkSetStatus,
  type ProductInput,
} from '@/lib/actions/menu';
import { aiGenerateProductDescription, aiTranslateText } from '@/lib/actions/ai';
import type { LocalizedText } from '@/types/database';
import { ProductImageCropModal } from '@/components/panel/product-image-crop-modal';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

type CategoryOption = {
  id: string;
  name: LocalizedText;
  sort_order: number;
};

type Product = {
  id: string;
  category_id: string | null;
  name: LocalizedText;
  description: LocalizedText | null;
  price: number;
  status: 'active' | 'soldout' | 'draft' | 'archived';
  is_featured: boolean;
  is_chef_recommend: boolean;
  dietary_tags: string[];
  spicy_level: number;
  print_station: string | null;
  station_id: string | null;
  hero_icon: string | null;
  hero_image_url: string | null;
  sort_order: number;
  preset_count?: number;
};

type StationOption = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

interface Props {
  products: Product[];
  categories: CategoryOption[];
  stations: StationOption[];
}

export function ProductList({ products, categories, stations }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filtreleme
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    const urlFilter = searchParams?.get('filter');
    return urlFilter === 'soldout' ? 'soldout' : 'all';
  });
  const [filterStation, setFilterStation] = useState<string>('all'); // 'all' | stationId | 'none'
  const [search, setSearch] = useState('');

  // URL query değişirse filtreyi güncelle (dashboard'dan gelindi)
  useEffect(() => {
    const urlFilter = searchParams?.get('filter');
    if (urlFilter === 'soldout') {
      setFilterStatus('soldout');
    }
  }, [searchParams]);

  // Toplu seçim
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStationPickerOpen, setBulkStationPickerOpen] = useState(false);

  // Resim yükleme
  const [cropModalProduct, setCropModalProduct] = useState<{
    productId: string;
    file: File;
  } | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  function handleImageSelect(productId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Resim en fazla 10MB olabilir');
      return;
    }
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      toast.error('Sadece PNG, JPG ve WebP desteklenir');
      return;
    }
    setCropModalProduct({ productId, file });
  }

  async function handleCropped(dataUrl: string, mimeType: string) {
    if (!cropModalProduct) return;
    const productId = cropModalProduct.productId;
    setCropModalProduct(null);
    setUploadingProductId(productId);

    try {
      const result = await uploadProductImage(productId, dataUrl, mimeType);
      if (!result.success) {
        toast.error(result.error || 'Resim yüklenemedi');
      } else {
        router.refresh();
      }
    } finally {
      setUploadingProductId(null);
    }
  }

  async function handleRemoveImage(productId: string) {
    const ok = await confirmDialog({
      title: 'Ürün resmini kaldır?',
      tone: 'warn',
      confirmLabel: 'Kaldır',
    });
    if (!ok) return;
    setUploadingProductId(productId);
    try {
      const result = await removeProductImage(productId);
      if (!result.success) {
        toast.error(result.error || 'Resim kaldırılamadı');
      } else {
        router.refresh();
      }
    } finally {
      setUploadingProductId(null);
    }
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterStation !== 'all') {
        if (filterStation === 'none') {
          if (p.station_id) return false;
        } else {
          if (p.station_id !== filterStation) return false;
        }
      }
      if (search) {
        const s = search.toLowerCase();
        if (!p.name.tr.toLowerCase().includes(s) && !p.name.en?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [products, filterCategory, filterStatus, filterStation, search]);

  const handleAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setError(null);
  };

  const handleSubmit = async (input: ProductInput) => {
    setError(null);
    startTransition(async () => {
      const res = editingProduct
        ? await updateProduct(editingProduct.id, input)
        : await createProduct(input);
      if (res.success) {
        setShowForm(false);
        setEditingProduct(null);
        router.refresh();
      } else {
        setError(res.error || 'Hata');
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: `"${name}" ürününü sil?`,
      body: 'Ürün kalıcı olarak silinecek.',
      tone: 'danger',
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || 'Hata');
      }
    });
  };

  const handleStatusCycle = async (p: Product) => {
    const next: Record<Product['status'], Product['status']> = {
      active: 'soldout',
      soldout: 'draft',
      draft: 'active',
      archived: 'active',
    };
    startTransition(async () => {
      await updateProductStatus(p.id, next[p.status]);
      router.refresh();
    });
  };

  const categoryMap = new Map(categories.map((c) => [c.id, c.name.tr]));
  const stationMap = useMemo(
    () => new Map(stations.map((s) => [s.id, s])),
    [stations]
  );

  // Toplu seçim helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkStationPickerOpen(false);
  };

  const handleBulkAssign = (stationId: string | null) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkAssignStation(ids, stationId);
      if (!res.success) {
        setError(res.error || 'Toplu atama başarısız');
        return;
      }
      clearSelection();
      router.refresh();
    });
  };

  // Tek tıkla stok toggle (active <-> soldout)
  const handleToggleSoldOut = (p: Product) => {
    if (p.status !== 'active' && p.status !== 'soldout') return;
    startTransition(async () => {
      const res = await toggleSoldOut(p.id);
      if (!res.success) {
        setError(res.error || 'Stok durumu değiştirilemedi');
        return;
      }
      router.refresh();
    });
  };

  // Toplu stok durumu
  const handleBulkSetStatus = (status: 'active' | 'soldout') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkSetStatus(ids, status);
      if (!res.success) {
        setError(res.error || 'Toplu stok değişimi başarısız');
        return;
      }
      clearSelection();
      router.refresh();
    });
  };

  return (
    <div>
      {/* Üst bar: ekleme + filtreler */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={handleAdd}
          className="h-10 px-4 rounded-[var(--r-sm)] bg-accent text-card font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ color: '#FAF5EA' }}
        >
          <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
          Yeni Ürün
        </button>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-card border border-line text-sm focus:outline-none focus:border-accent"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 px-3 rounded-[var(--r-sm)] bg-card border border-line text-sm focus:outline-none focus:border-accent cursor-pointer"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          <option value="all">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.tr}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-[var(--r-sm)] bg-card border border-line text-sm focus:outline-none focus:border-accent cursor-pointer"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          <option value="all">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="soldout">Tükendi</option>
          <option value="draft">Taslak</option>
        </select>

        {stations.length > 0 && (
          <select
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            className="h-10 px-3 rounded-[var(--r-sm)] bg-card border border-line text-sm focus:outline-none focus:border-accent cursor-pointer"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm istasyonlar</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
            <option value="none">— Atanmamış</option>
          </select>
        )}
      </div>

      {/* Hızlı stok kısayolları */}
      {(() => {
        const soldoutCount = products.filter((p) => p.status === 'soldout').length;
        if (soldoutCount === 0 && filterStatus === 'all') return null;
        return (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className="text-ink-3 text-xs"
              style={{
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              HIZLI:
            </span>
            <ChipFilter
              active={filterStatus === 'all'}
              onClick={() => setFilterStatus('all')}
              label="Tümü"
              count={products.length}
            />
            <ChipFilter
              active={filterStatus === 'active'}
              onClick={() => setFilterStatus('active')}
              label="Stokta"
              count={products.filter((p) => p.status === 'active').length}
              dotColor="var(--ok)"
            />
            <ChipFilter
              active={filterStatus === 'soldout'}
              onClick={() => setFilterStatus('soldout')}
              label="Tükendi"
              count={soldoutCount}
              dotColor="var(--warn)"
            />
          </div>
        );
      })()}

      {/* Boş istasyon uyarısı — hiç istasyon yoksa */}
      {stations.length === 0 && (
        <div
          className="mb-4 p-3 rounded-[var(--r-sm)] flex items-center gap-3 flex-wrap"
          style={{
            background: 'color-mix(in srgb, var(--gold) 10%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--gold) 25%, var(--line))',
          }}
        >
          <div style={{ color: 'var(--gold)', fontSize: 16 }}>⚠</div>
          <div className="flex-1 text-sm text-ink-2">
            Henüz istasyon oluşturmamışsın. Ürünlerinin hangi yazıcıya
            düşeceğini belirtmek için önce istasyon eklemen gerek.
          </div>
          <a
            href="/panel/istasyonlar"
            className="text-accent font-semibold text-sm hover:underline flex items-center gap-1"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
          >
            İstasyon oluştur ↗
          </a>
        </div>
      )}

      {/* Toplu aksiyon bar — seçili ürün varsa */}
      {selectedIds.size > 0 && (
        <div
          className="mb-4 p-3 rounded-[var(--r-sm)] flex items-center gap-3 flex-wrap sticky top-0 z-10"
          style={{
            background: 'var(--ink)',
            border: '1px solid var(--ink)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <span
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--paper)' }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{
                width: 22,
                height: 22,
                background: 'var(--accent)',
                color: 'var(--paper)',
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {selectedIds.size}
            </span>
            ürün seçili
          </span>

          <div className="flex-1" />

          {/* Toplu stok aksiyonları */}
          <button
            onClick={() => handleBulkSetStatus('soldout')}
            disabled={isPending}
            className="h-9 px-3 rounded-[var(--r-sm)] text-sm font-semibold flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'color-mix(in srgb, var(--warn) 20%, transparent)',
              color: 'var(--paper)',
              border: '1px solid color-mix(in srgb, var(--warn) 40%, transparent)',
            }}
            title="Seçili ürünleri tükendi yap (menüden çeker)"
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: 'var(--warn)' }}
            />
            Tükendi yap
          </button>
          <button
            onClick={() => handleBulkSetStatus('active')}
            disabled={isPending}
            className="h-9 px-3 rounded-[var(--r-sm)] text-sm font-semibold flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'color-mix(in srgb, var(--ok) 20%, transparent)',
              color: 'var(--paper)',
              border: '1px solid color-mix(in srgb, var(--ok) 40%, transparent)',
            }}
            title="Seçili ürünleri stokta yap (menüye geri koyar)"
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: 'var(--ok)' }}
            />
            Stokta yap
          </button>

          {stations.length > 0 ? (
            <div className="relative">
              <button
                onClick={() => setBulkStationPickerOpen((v) => !v)}
                disabled={isPending}
                className="h-9 px-4 rounded-[var(--r-sm)] text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--paper)',
                }}
              >
                İstasyona ata ▾
              </button>
              {bulkStationPickerOpen && (
                <div
                  className="absolute right-0 top-11 rounded-[var(--r-sm)] py-1.5 min-w-[220px] z-20"
                  style={{
                    background: 'var(--card-2)',
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {stations.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleBulkAssign(s.id)}
                      disabled={isPending}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-paper-2 flex items-center gap-2.5 disabled:opacity-50"
                    >
                      <span
                        className="inline-flex items-center justify-center rounded"
                        style={{
                          width: 22,
                          height: 22,
                          background: `color-mix(in srgb, ${s.color} 15%, transparent)`,
                          color: s.color,
                          fontSize: 12,
                        }}
                      >
                        {s.icon}
                      </span>
                      <span className="text-ink">{s.name}</span>
                    </button>
                  ))}
                  <div
                    className="my-1 mx-2"
                    style={{ borderTop: '1px solid var(--line)' }}
                  />
                  <button
                    onClick={() => handleBulkAssign(null)}
                    disabled={isPending}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-paper-2 text-ink-3 disabled:opacity-50"
                  >
                    — İstasyondan çıkar
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <button
            onClick={clearSelection}
            disabled={isPending}
            className="h-9 px-3 rounded-[var(--r-sm)] text-sm transition-colors hover:bg-white/10 disabled:opacity-50"
            style={{ color: 'var(--paper)' }}
          >
            İptal
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-[var(--r-sm)] bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Ürün listesi */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-line rounded-[var(--r)]">
          <div className="text-4xl mb-3">○</div>
          <div className="font-medium text-ink-2 mb-1">
            {products.length === 0 ? 'Henüz ürün yok' : 'Bu filtrelerle ürün bulunamadı'}
          </div>
          <div className="text-sm text-ink-3">
            {products.length === 0
              ? 'Başlamak için "Yeni Ürün" ekle'
              : 'Filtreleri değiştir veya temizle'}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-[var(--r)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-paper-2">
                <th className="text-left py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      selectedIds.size === filtered.length
                    }
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedIds.size > 0 &&
                          selectedIds.size < filtered.length;
                      }
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-line accent-accent cursor-pointer"
                  />
                </th>
                <Th>ÜRÜN</Th>
                <Th>KATEGORİ</Th>
                <Th>FİYAT</Th>
                <Th>İSTASYON</Th>
                <Th>DURUM</Th>
                <Th>&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`group/row border-b border-line last:border-0 transition-colors ${
                    selectedIds.has(p.id)
                      ? 'bg-accent/5'
                      : 'hover:bg-paper-2/50'
                  }`}
                >
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-line accent-accent cursor-pointer"
                    />
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail - resim yüklenebilir */}
                      <ProductThumbnail
                        product={p}
                        uploading={uploadingProductId === p.id}
                        onUpload={() => fileInputsRef.current[p.id]?.click()}
                        onRemove={() => handleRemoveImage(p.id)}
                      />
                      <input
                        ref={(el) => {
                          fileInputsRef.current[p.id] = el;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(p.id, file);
                          e.target.value = '';
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-ink flex items-center gap-2 flex-wrap">
                          <span className="truncate">{p.name.tr}</span>
                          {p.is_featured && (
                            <span
                              className="text-[9px] bg-gold/15 text-gold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                              style={{
                                fontFamily: 'var(--f-mono)',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                              }}
                            >
                              ÖNE ÇIKAN
                            </span>
                          )}
                          {p.preset_count !== undefined && p.preset_count > 0 && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded uppercase flex-shrink-0 inline-flex items-center gap-1"
                              style={{
                                fontFamily: 'var(--f-mono)',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                                color: 'var(--accent)',
                              }}
                            >
                              ◇ {p.preset_count} VARYASYON
                            </span>
                          )}
                        </div>
                        {p.description?.tr && (
                          <div className="text-xs text-ink-3 truncate max-w-[400px] mt-0.5">
                            {p.description.tr}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-sm text-ink-2">
                    {p.category_id ? categoryMap.get(p.category_id) || '—' : '—'}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className="text-ink"
                      style={{
                        fontFamily: 'var(--f-serif)',
                        fontStyle: 'italic',
                        fontSize: 18,
                        fontWeight: 400,
                      }}
                    >
                      ₺{p.price}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <StationBadge
                      product={p}
                      station={p.station_id ? stationMap.get(p.station_id) : undefined}
                    />
                  </td>
                  <td className="py-4 px-5">
                    <button
                      onClick={() => handleStatusCycle(p)}
                      disabled={isPending}
                      className="transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      <StatusBadge status={p.status} />
                    </button>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {/* Hızlı stok toggle - hover'da belirir */}
                      {(p.status === 'active' || p.status === 'soldout') && (
                        <button
                          onClick={() => handleToggleSoldOut(p)}
                          disabled={isPending}
                          className="h-8 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-[1.05] active:scale-[0.97] disabled:opacity-30"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            letterSpacing: '0.04em',
                            background:
                              p.status === 'active'
                                ? 'color-mix(in srgb, var(--warn) 12%, var(--card))'
                                : 'color-mix(in srgb, var(--ok) 12%, var(--card))',
                            color:
                              p.status === 'active'
                                ? 'var(--warn)'
                                : 'var(--ok)',
                            border: `1px solid ${
                              p.status === 'active'
                                ? 'color-mix(in srgb, var(--warn) 25%, var(--line))'
                                : 'color-mix(in srgb, var(--ok) 25%, var(--line))'
                            }`,
                          }}
                          title={
                            p.status === 'active'
                              ? 'Tükendi yap — müşteri menüden çekilir'
                              : 'Stokta yap — müşteri menüye geri döner'
                          }
                        >
                          <span
                            className="inline-block rounded-full"
                            style={{
                              width: 5,
                              height: 5,
                              background:
                                p.status === 'active'
                                  ? 'var(--warn)'
                                  : 'var(--ok)',
                            }}
                          />
                          {p.status === 'active' ? 'Tükendi' : 'Stokta'}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(p)}
                        disabled={isPending}
                        className="h-8 px-3 rounded text-ink-2 hover:bg-paper-2 text-xs font-medium disabled:opacity-50"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name.tr)}
                        disabled={isPending}
                        className="h-8 px-2 rounded text-danger hover:bg-danger/10 text-xs disabled:opacity-50"
                        title="Sil"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ProductFormModal
          initial={editingProduct}
          categories={categories}
          stations={stations}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isPending}
        />
      )}

      {/* Image crop modal */}
      {cropModalProduct && (
        <ProductImageCropModal
          imageFile={cropModalProduct.file}
          onCropped={handleCropped}
          onClose={() => setCropModalProduct(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Ürün Thumbnail - resimli / resimsiz
// ============================================================
function ProductThumbnail({
  product,
  uploading,
  onUpload,
  onRemove,
}: {
  product: Product;
  uploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
}) {
  if (uploading) {
    return (
      <div
        className="w-12 h-12 rounded-[var(--r-sm)] flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin text-accent">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray="32"
            strokeDashoffset="8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (product.hero_image_url) {
    return (
      <div className="relative group flex-shrink-0">
        <img
          src={product.hero_image_url}
          alt={product.name.tr}
          className="w-12 h-12 rounded-[var(--r-sm)] object-cover"
          style={{ border: '1px solid var(--line)' }}
        />
        {/* Hover overlay */}
        <div
          className="absolute inset-0 rounded-[var(--r-sm)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
          style={{
            background: 'rgba(42, 31, 24, 0.75)',
          }}
        >
          <button
            onClick={onUpload}
            className="w-7 h-7 rounded-full bg-white/95 grid place-items-center hover:bg-white transition-colors"
            title="Değiştir"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-full bg-white/95 grid place-items-center hover:bg-white transition-colors"
            title="Kaldır"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Resim yok - upload butonu
  const isEmoji = product.hero_icon
    ? /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(product.hero_icon)
    : false;
  const showEmoji = product.hero_icon && isEmoji;

  return (
    <button
      onClick={onUpload}
      className="w-12 h-12 rounded-[var(--r-sm)] flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-all hover:border-accent hover:bg-paper-3 group"
      style={{
        background: 'var(--paper-2)',
        border: '1.5px dashed var(--line-2)',
      }}
      title="Resim ekle"
    >
      {showEmoji ? (
        <span className="text-xl">{product.hero_icon}</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-3 group-hover:text-accent transition-colors">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )}
      <span
        className="text-[8px] text-ink-3 group-hover:text-accent uppercase transition-colors"
        style={{
          fontFamily: 'var(--f-mono)',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        EKLE
      </span>
    </button>
  );
}

// ============================================================
// Tablo başlığı
// ============================================================
function StationBadge({
  product,
  station,
}: {
  product: Product;
  station: StationOption | undefined;
}) {
  // 1) Gerçek istasyon atanmışsa — renkli, iconlu rozet + tooltip
  if (station) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-all duration-300"
        title={`Siparişi ${station.name} istasyonuna düşer`}
        style={{
          background: `color-mix(in srgb, ${station.color} 12%, transparent)`,
          color: station.color,
          border: `1px solid color-mix(in srgb, ${station.color} 25%, transparent)`,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ fontSize: 12 }}>{station.icon}</span>
        <span>{station.name}</span>
      </span>
    );
  }

  // 2) Eski sistem — sadece print_station string'i varsa — sade gri rozet
  if (product.print_station) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded uppercase transition-all duration-300"
        title="Eski hazırlama alanı — daha iyi deneyim için yeni istasyon ata"
        style={{
          background: 'var(--paper-2)',
          color: 'var(--ink-3)',
          fontFamily: 'var(--f-mono)',
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}
      >
        {product.print_station}
      </span>
    );
  }

  // 3) Hiç atanmamış
  return (
    <span
      className="text-xs text-ink-3"
      title="Henüz istasyona atanmamış — siparişi hiçbir yazıcıya düşmez"
    >
      —
    </span>
  );
}

function ChipFilter({
  active,
  onClick,
  label,
  count,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: active ? 'var(--ink)' : 'var(--card)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
        fontFamily: 'var(--f-mono)',
        letterSpacing: '0.04em',
      }}
    >
      {dotColor && (
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: dotColor }}
        />
      )}
      <span>{label}</span>
      <span
        className="text-[10px] px-1.5 rounded"
        style={{
          background: active ? 'rgba(255,255,255,0.18)' : 'var(--paper-2)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-5">
      <span
        className="text-ink-3 uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}
      >
        {children}
      </span>
    </th>
  );
}

// ============================================================
// Durum rozeti
// ============================================================
function StatusBadge({ status }: { status: Product['status'] }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'AKTİF', color: 'var(--ok)', bg: 'color-mix(in oklab, var(--ok) 15%, transparent)' },
    soldout: { label: 'TÜKENDİ', color: 'var(--warn)', bg: 'color-mix(in oklab, var(--warn) 15%, transparent)' },
    draft: { label: 'TASLAK', color: 'var(--ink-3)', bg: 'var(--paper-2)' },
    archived: { label: 'ARŞİV', color: 'var(--ink-3)', bg: 'var(--paper-2)' },
  };
  const c = config[status] || config.active;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded"
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

// ============================================================
// Modal form
// ============================================================
function ProductFormModal({
  initial,
  categories,
  stations,
  onSubmit,
  onCancel,
  loading,
}: {
  initial: Product | null;
  categories: CategoryOption[];
  stations: StationOption[];
  onSubmit: (input: ProductInput) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ProductInput>({
    category_id: initial?.category_id || categories[0]?.id || null,
    name_tr: initial?.name.tr || '',
    name_en: initial?.name.en || '',
    description_tr: initial?.description?.tr || '',
    description_en: initial?.description?.en || '',
    price: initial?.price || 0,
    status: initial?.status || 'active',
    print_station: initial?.print_station || '',
    station_id: initial?.station_id || null,
    is_featured: initial?.is_featured || false,
    is_chef_recommend: initial?.is_chef_recommend || false,
    dietary_tags: initial?.dietary_tags || [],
    spicy_level: initial?.spicy_level || 0,
    hero_icon: initial?.hero_icon || '',
  });

  // AI işlemleri için loading state
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Kategoriyi ad olarak bul - AI'ya context vermek için
  const categoryName = categories.find((c) => c.id === form.category_id)?.name.tr;

  // TR açıklama üret
  const handleGenerateDescription = async () => {
    if (!form.name_tr.trim()) {
      setAiError('Önce ürün adını yaz');
      return;
    }
    setAiLoading('desc_tr');
    setAiError(null);
    const res = await aiGenerateProductDescription({
      name: form.name_tr,
      category: categoryName,
      language: 'tr',
    });
    setAiLoading(null);
    if (res.success && res.description) {
      setForm((f) => ({ ...f, description_tr: res.description! }));
    } else {
      setAiError(res.error || 'AI hatası');
    }
  };

  // TR isim → EN isim çevir
  const handleTranslateName = async () => {
    if (!form.name_tr.trim()) {
      setAiError('Önce Türkçe adı yaz');
      return;
    }
    setAiLoading('name_en');
    setAiError(null);
    const res = await aiTranslateText({
      text: form.name_tr,
      from: 'tr',
      to: 'en',
    });
    setAiLoading(null);
    if (res.success && res.translated) {
      setForm((f) => ({ ...f, name_en: res.translated! }));
    } else {
      setAiError(res.error || 'AI hatası');
    }
  };

  // TR açıklama → EN açıklama çevir
  const handleTranslateDescription = async () => {
    if (!form.description_tr?.trim()) {
      setAiError('Önce Türkçe açıklamayı yaz veya üret');
      return;
    }
    setAiLoading('desc_en');
    setAiError(null);
    const res = await aiTranslateText({
      text: form.description_tr,
      from: 'tr',
      to: 'en',
    });
    setAiLoading(null);
    if (res.success && res.translated) {
      setForm((f) => ({ ...f, description_en: res.translated! }));
    } else {
      setAiError(res.error || 'AI hatası');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const isValid = form.name_tr.trim().length >= 2 && form.price >= 0;

  return (
    <div
      className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-line rounded-[var(--r)] w-full max-w-2xl my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between">
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
            }}
          >
            {initial ? 'Ürünü Düzenle' : 'Yeni Ürün'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-ink-3 hover:text-ink text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* AI hata göster */}
          {aiError && (
            <div className="p-2.5 rounded-[var(--r-sm)] bg-warn/10 border border-warn/20 text-warn text-xs">
              ⚠ {aiError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ürün Adı (Türkçe)" required>
              <input
                type="text"
                value={form.name_tr}
                onChange={(e) => setForm((f) => ({ ...f, name_tr: e.target.value }))}
                placeholder="Flat White"
                className="form-input"
                autoFocus
              />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-2">
                  Ürün Adı (İngilizce)
                </label>
                <AiButton
                  onClick={handleTranslateName}
                  loading={aiLoading === 'name_en'}
                  disabled={!form.name_tr.trim() || aiLoading !== null}
                  label="Çevir"
                />
              </div>
              <input
                type="text"
                value={form.name_en || ''}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                placeholder="Flat White"
                className="form-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-2">
                Açıklama (Türkçe)
              </label>
              <AiButton
                onClick={handleGenerateDescription}
                loading={aiLoading === 'desc_tr'}
                disabled={!form.name_tr.trim() || aiLoading !== null}
                label="AI ile üret"
              />
            </div>
            <textarea
              value={form.description_tr || ''}
              onChange={(e) => setForm((f) => ({ ...f, description_tr: e.target.value }))}
              placeholder="Ethiopia Yirgacheffe, ipeksi süt dokusu, çift shot"
              rows={2}
              className="form-input resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-2">
                Açıklama (İngilizce)
              </label>
              <AiButton
                onClick={handleTranslateDescription}
                loading={aiLoading === 'desc_en'}
                disabled={!form.description_tr?.trim() || aiLoading !== null}
                label="Çevir"
              />
            </div>
            <textarea
              value={form.description_en || ''}
              onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
              placeholder="Ethiopia Yirgacheffe, silky microfoam, double shot"
              rows={2}
              className="form-input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Kategori" required>
              <select
                value={form.category_id || ''}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
                className="form-input"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.tr}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fiyat (₺)" required>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                min={0}
                step={0.5}
                className="form-input"
              />
            </Field>

            <Field label="Hazırlama İstasyonu">
              {stations.length > 0 ? (
                <select
                  value={form.station_id || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      station_id: e.target.value || null,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">— Atanmamış</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-11 flex items-center gap-2">
                  <span className="text-sm text-ink-3">
                    İstasyon yok —{' '}
                  </span>
                  <a
                    href="/panel/istasyonlar"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent text-sm font-semibold hover:underline"
                  >
                    oluştur ↗
                  </a>
                </div>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Durum">
              <select
                value={form.status || 'active'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as ProductInput['status'] }))
                }
                className="form-input"
              >
                <option value="active">Aktif (Menüde)</option>
                <option value="soldout">Tükendi (Menüde ama alınamıyor)</option>
                <option value="draft">Taslak (Gizli)</option>
              </select>
            </Field>

            <Field label="Öne Çıkan">
              <label className="flex items-center gap-3 h-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured || false}
                  onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                  className="w-5 h-5 rounded border-line accent-accent"
                />
                <span className="text-sm text-ink-2">Menüde öne çıkar</span>
              </label>
            </Field>

            <Field label="Şefin Önerisi">
              <label className="flex items-center gap-3 h-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_chef_recommend || false}
                  onChange={(e) => setForm((f) => ({ ...f, is_chef_recommend: e.target.checked }))}
                  className="w-5 h-5 rounded border-line accent-accent"
                />
                <span className="text-sm text-ink-2">Basılı menüde özel rozet</span>
              </label>
            </Field>

            <Field label="Acılık Derecesi">
              <select
                value={form.spicy_level || 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, spicy_level: parseInt(e.target.value, 10) }))
                }
                className="form-input"
              >
                <option value={0}>Yok</option>
                <option value={1}>🌶 Az acı</option>
                <option value={2}>🌶🌶 Orta</option>
                <option value={3}>🌶🌶🌶 Çok acı</option>
              </select>
            </Field>
          </div>

          {/* Diet/allergen tags - tam genişlik */}
          <div className="px-6 pb-6">
            <Field label="Diyet / Allergen Etiketleri">
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { id: 'vegan', icon: '🌱', label: 'Vegan' },
                  { id: 'vegetarian', icon: '🥬', label: 'Vejetaryen' },
                  { id: 'gluten_free', icon: 'GF', label: 'Glütensiz' },
                  { id: 'lactose_free', icon: 'LF', label: 'Laktozsuz' },
                  { id: 'halal', icon: '☪', label: 'Helal' },
                  { id: 'organic', icon: '✿', label: 'Organik' },
                  { id: 'homemade', icon: '⌂', label: 'Ev yapımı' },
                ].map((tag) => {
                  const checked = (form.dietary_tags || []).includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => {
                          const current = f.dietary_tags || [];
                          const next = checked
                            ? current.filter((t: string) => t !== tag.id)
                            : [...current, tag.id];
                          return { ...f, dietary_tags: next };
                        });
                      }}
                      className="px-3 h-9 inline-flex items-center gap-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
                      style={{
                        background: checked
                          ? 'var(--ink)'
                          : 'var(--card)',
                        color: checked ? 'var(--paper)' : 'var(--ink)',
                        border: checked
                          ? '1px solid var(--ink)'
                          : '1px solid var(--line)',
                      }}
                    >
                      <span>{tag.icon}</span>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
              <p
                className="mt-2 text-[11px]"
                style={{ color: 'var(--ink-3)' }}
              >
                Basılı menüde bu rozetler görünür. Birden fazla seçilebilir.
              </p>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex justify-end gap-2 bg-paper-2/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-11 px-5 rounded-[var(--r-sm)] text-ink-2 hover:bg-card font-medium text-sm disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!isValid || loading}
            className="h-11 px-6 rounded-[var(--r-sm)] bg-accent text-card font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: '#FAF5EA' }}
          >
            {loading ? 'Kaydediliyor...' : initial ? 'Güncelle' : 'Ekle'}
          </button>
        </div>

        <FormStyles />
      </form>
    </div>
  );
}

// ============================================================
// Yardımcı
// ============================================================
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-2 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function AiButton({
  onClick,
  loading,
  disabled,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[var(--r-sm)] text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ fontFamily: 'var(--f-sans)' }}
      title="Claude AI ile üretilir"
    >
      {loading ? (
        <>
          <span className="inline-block w-3 h-3 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <span>Üretiliyor...</span>
        </>
      ) : (
        <>
          <span>✨</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function FormStyles() {
  return (
    <style jsx global>{`
      .form-input {
        width: 100%;
        padding: 10px 14px;
        min-height: 44px;
        border-radius: 10px;
        background: var(--card);
        border: 1px solid var(--line);
        color: var(--ink);
        font-family: var(--f-sans);
        font-size: 14px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .form-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent);
      }
      .form-input::placeholder {
        color: var(--ink-3);
      }
      textarea.form-input {
        line-height: 1.5;
      }
    `}</style>
  );
}
