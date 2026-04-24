'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LocalizedText } from '@/types/database';
import {
  createPreset,
  updatePreset,
  deletePreset,
  syncPresetProducts,
  type Preset,
  type PresetInput,
} from '@/lib/actions/options';
import { PresetFormModal } from './preset-form-modal';
import { AttachProductsModal } from './attach-products-modal';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

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
  initialPresets: Preset[];
  products: ProductOption[];
  categories: CategoryOption[];
}

export function PresetsManager({ initialPresets, products, categories }: Props) {
  const router = useRouter();
  // initialPresets prop'unu direkt kullan ki router.refresh sonrası güncel veri gelsin
  const presets = initialPresets;
  const [formModal, setFormModal] = useState<{
    open: boolean;
    preset: Preset | null;
  }>({ open: false, preset: null });
  const [attachModal, setAttachModal] = useState<{
    open: boolean;
    preset: Preset | null;
  }>({ open: false, preset: null });
  const [saving, setSaving] = useState(false);

  async function handleCreate(input: PresetInput) {
    setSaving(true);
    const result = await createPreset(input);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || 'Oluşturulamadı');
      return;
    }
    setFormModal({ open: false, preset: null });
    router.refresh();
  }

  async function handleUpdate(input: PresetInput) {
    if (!formModal.preset) return;
    setSaving(true);
    const result = await updatePreset(formModal.preset.id, input);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || 'Güncellenemedi');
      return;
    }
    setFormModal({ open: false, preset: null });
    router.refresh();
  }

  async function handleDelete(preset: Preset) {
    const count = preset.product_count || 0;
    const title = `"${preset.name.tr}" varyasyonunu sil?`;
    const body =
      count > 0
        ? `Bu varyasyon ${count} üründe kullanılıyor. Silersen tüm ürünlerden kaldırılır.`
        : undefined;
    const ok = await confirmDialog({
      title,
      body,
      tone: 'danger',
      confirmLabel: 'Sil',
    });
    if (!ok) return;

    setSaving(true);
    const result = await deletePreset(preset.id);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || 'Silinemedi');
      return;
    }
    router.refresh();
  }

  async function handleAttach(productIds: string[]) {
    if (!attachModal.preset) return;
    setSaving(true);
    const result = await syncPresetProducts(attachModal.preset.id, productIds);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || 'Güncellenemedi');
      return;
    }
    const added = result.added || 0;
    const removed = result.removed || 0;
    let msg = '';
    if (added === 0 && removed === 0) {
      msg = 'Değişiklik yok';
    } else if (added > 0 && removed > 0) {
      msg = `${added} ürüne eklendi, ${removed} üründen kaldırıldı`;
    } else if (added > 0) {
      msg = `${added} ürüne eklendi`;
    } else {
      msg = `${removed} üründen kaldırıldı`;
    }
    toast.error(msg);
    setAttachModal({ open: false, preset: null });
    router.refresh();
  }

  return (
    <div>
      {/* Aksiyon bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setFormModal({ open: true, preset: null })}
          className="h-10 px-4 rounded-[var(--r-sm)] bg-accent font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ color: '#FAF5EA' }}
        >
          <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
          Yeni Varyasyon
        </button>
        <div className="text-sm text-ink-3">
          <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}>
            {presets.length}
          </span>{' '}
          şablon
        </div>
      </div>

      {presets.length === 0 ? (
        <EmptyState onAdd={() => setFormModal({ open: true, preset: null })} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              onEdit={() => setFormModal({ open: true, preset: p })}
              onDelete={() => handleDelete(p)}
              onAttach={() => setAttachModal({ open: true, preset: p })}
              disabled={saving}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {formModal.open && (
        <PresetFormModal
          initial={formModal.preset}
          onSubmit={formModal.preset ? handleUpdate : handleCreate}
          onClose={() => setFormModal({ open: false, preset: null })}
          saving={saving}
        />
      )}

      {/* Attach products modal */}
      {attachModal.open && attachModal.preset && (
        <AttachProductsModal
          preset={attachModal.preset}
          products={products}
          categories={categories}
          onAttach={handleAttach}
          onClose={() => setAttachModal({ open: false, preset: null })}
          saving={saving}
        />
      )}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="text-center py-16 rounded-[var(--r)]"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div
        className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4"
        style={{ background: 'var(--paper-2)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-3">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
        </svg>
      </div>
      <h3
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--ink)',
          lineHeight: 1.2,
        }}
        className="mb-2"
      >
        Henüz varyasyon yok
      </h3>
      <p className="text-ink-2 text-sm max-w-[420px] mx-auto mb-5">
        Boy, süt çeşidi, ek malzeme gibi seçenekleri tanımla — birden fazla ürüne uygula.
      </p>
      <button
        onClick={onAdd}
        className="h-10 px-5 rounded-[var(--r-sm)] bg-accent font-semibold text-sm"
        style={{ color: '#FAF5EA' }}
      >
        + İlk Varyasyonu Ekle
      </button>
    </div>
  );
}

// ============================================================
// Preset Card
// ============================================================
function PresetCard({
  preset,
  onEdit,
  onDelete,
  onAttach,
  disabled,
}: {
  preset: Preset;
  onEdit: () => void;
  onDelete: () => void;
  onAttach: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="rounded-[14px] p-5 transition-all hover:border-line-2"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
            className="truncate"
          >
            {preset.name.tr}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="uppercase px-1.5 py-0.5 rounded"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
                background: 'var(--paper-2)',
                color: 'var(--ink-3)',
              }}
            >
              {preset.type === 'single' ? 'TEK SEÇİM' : 'ÇOKLU SEÇİM'}
            </span>
            <span
              className="uppercase px-1.5 py-0.5 rounded"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                fontWeight: 700,
                background: preset.required
                  ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                  : 'var(--paper-2)',
                color: preset.required ? 'var(--accent)' : 'var(--ink-3)',
              }}
            >
              {preset.required ? 'ZORUNLU' : 'OPSİYONEL'}
            </span>
            {preset.product_count !== undefined && preset.product_count > 0 && (
              <span
                className="uppercase px-1.5 py-0.5 rounded"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  background: 'color-mix(in srgb, var(--ok) 15%, transparent)',
                  color: 'var(--ok)',
                }}
              >
                {preset.product_count} ÜRÜN
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Değerler preview */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {preset.values.slice(0, 6).map((v) => (
          <span
            key={v.id}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px]"
            style={{
              background: v.is_default
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'var(--paper-2)',
              border: '1px solid',
              borderColor: v.is_default
                ? 'color-mix(in srgb, var(--accent) 30%, transparent)'
                : 'var(--line)',
              color: v.is_default ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {v.is_default && <span style={{ fontSize: 10 }}>●</span>}
            {v.name.tr}
            {v.price_delta !== 0 && (
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: 0.7,
                }}
              >
                {v.price_delta > 0 ? `+${v.price_delta}` : v.price_delta}₺
              </span>
            )}
          </span>
        ))}
        {preset.values.length > 6 && (
          <span
            className="h-7 px-2.5 rounded-full text-[12px] text-ink-3 flex items-center"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            +{preset.values.length - 6}
          </span>
        )}
      </div>

      {/* Hangi ürünlerde kullanılıyor */}
      {preset.product_names && preset.product_names.length > 0 && (
        <div
          className="mb-4 px-3 py-2 rounded-[10px]"
          style={{
            background: 'color-mix(in srgb, var(--ok) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ok) 20%, transparent)',
          }}
        >
          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              fontWeight: 700,
              color: 'var(--ok)',
            }}
          >
            KULLANILIYOR
          </div>
          <div className="flex flex-wrap gap-1">
            {preset.product_names.slice(0, 6).map((pname, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  background: 'var(--card)',
                  border: '1px solid color-mix(in srgb, var(--ok) 20%, transparent)',
                  color: 'var(--ink-2)',
                }}
              >
                {pname}
              </span>
            ))}
            {preset.product_names.length > 6 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-ink-3"
                style={{
                  background: 'transparent',
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 700,
                }}
              >
                +{preset.product_names.length - 6} daha
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAttach}
          disabled={disabled}
          className="flex-1 h-9 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Ürünlere Uygula
        </button>
        <button
          onClick={onEdit}
          disabled={disabled}
          className="h-9 px-3 rounded-[10px] text-[13px] font-medium transition-colors hover:bg-paper-3 disabled:opacity-50"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
          }}
        >
          Düzenle
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="h-9 w-9 rounded-[10px] grid place-items-center transition-colors disabled:opacity-50 hover:bg-paper-3"
          style={{
            background: 'transparent',
            color: 'var(--accent)',
          }}
          title="Sil"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
