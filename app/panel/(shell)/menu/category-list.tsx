'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCategory, updateCategory, deleteCategory, type CategoryInput } from '@/lib/actions/menu';
import type { LocalizedText } from '@/types/database';

type CategoryWithCount = {
  id: string;
  name: LocalizedText;
  description: LocalizedText | null;
  hero_icon: string | null;
  sort_order: number;
  active: boolean;
  product_count: number;
};

interface Props {
  categories: CategoryWithCount[];
}

const ICON_OPTIONS = [
  { value: '', label: 'Yok' },
  { value: '☕', label: '☕ Kahve' },
  { value: '🍵', label: '🍵 Çay' },
  { value: '🥐', label: '🥐 Pastane' },
  { value: '🍰', label: '🍰 Tatlı' },
  { value: '🥗', label: '🥗 Salata' },
  { value: '🍔', label: '🍔 Burger' },
  { value: '🍕', label: '🍕 Pizza' },
  { value: '🥪', label: '🥪 Sandviç' },
  { value: '🥤', label: '🥤 Soğuk İçecek' },
  { value: '🍹', label: '🍹 Kokteyl' },
  { value: '🍺', label: '🍺 Bira' },
  { value: '🍷', label: '🍷 Şarap' },
  { value: '🍽️', label: '🍽️ Yemek' },
  { value: '🌿', label: '🌿 Mevsim' },
  { value: '⭐', label: '⭐ Özel' },
];

export function CategoryList({ categories }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (input: CategoryInput) => {
    setError(null);
    startTransition(async () => {
      const res = editingId
        ? await updateCategory(editingId, input)
        : await createCategory(input);
      if (res.success) {
        setShowForm(false);
        setEditingId(null);
        router.refresh();
      } else {
        setError(res.error || 'Hata');
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" kategorisini silmek istediğine emin misin?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCategory(id);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || 'Hata');
      }
    });
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    startTransition(async () => {
      await updateCategory(id, { active: !currentActive });
      router.refresh();
    });
  };

  const editingCategory = editingId ? categories.find((c) => c.id === editingId) : null;

  return (
    <div>
      {/* Yeni ekleme butonu */}
      {!showForm && (
        <button
          onClick={handleAdd}
          className="w-full h-14 mb-4 rounded-[var(--r)] border-2 border-dashed border-line hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-2 text-ink-2 hover:text-accent font-medium"
        >
          <span className="text-lg" style={{ fontFamily: 'var(--f-mono)' }}>+</span>
          Yeni Kategori Ekle
        </button>
      )}

      {/* Form (ekleme veya düzenleme) */}
      {showForm && (
        <CategoryForm
          initial={editingCategory}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isPending}
        />
      )}

      {/* Hata göster */}
      {error && (
        <div className="mb-4 p-3 rounded-[var(--r-sm)] bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Kategori kartları */}
      {categories.length === 0 && !showForm ? (
        <div className="text-center py-16 text-ink-3">
          <div className="text-4xl mb-3">○</div>
          <div className="font-medium text-ink-2 mb-1">Henüz kategori yok</div>
          <div className="text-sm">
            Başlamak için &quot;Yeni Kategori Ekle&quot;ye tıkla
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={() => handleEdit(cat.id)}
              onDelete={() => handleDelete(cat.id, cat.name.tr)}
              onToggleActive={() => handleToggleActive(cat.id, cat.active)}
              disabled={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Kategori Formu
// ============================================================

function CategoryForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial: CategoryWithCount | null | undefined;
  onSubmit: (input: CategoryInput) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<CategoryInput>({
    name_tr: initial?.name.tr || '',
    name_en: initial?.name.en || '',
    description_tr: initial?.description?.tr || '',
    description_en: initial?.description?.en || '',
    hero_icon: initial?.hero_icon || '',
    active: initial?.active !== false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const isValid = form.name_tr.trim().length >= 2;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-line rounded-[var(--r)] p-6 mb-6"
    >
      <div className="flex items-baseline justify-between mb-5">
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 26,
            fontWeight: 400,
          }}
        >
          {initial ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
        </h2>
      </div>

      <div className="space-y-5">
        {/* Ad (TR + EN) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kategori Adı (Türkçe)" required>
            <input
              type="text"
              value={form.name_tr}
              onChange={(e) => setForm((f) => ({ ...f, name_tr: e.target.value }))}
              placeholder="Örn: Kahveler"
              className="form-input"
              autoFocus
            />
          </Field>
          <Field label="Kategori Adı (İngilizce)" hint="Opsiyonel">
            <input
              type="text"
              value={form.name_en || ''}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              placeholder="Coffees"
              className="form-input"
            />
          </Field>
        </div>

        {/* Açıklama */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Açıklama (Türkçe)" hint="Kategori başlığının altında görünür">
            <textarea
              value={form.description_tr || ''}
              onChange={(e) => setForm((f) => ({ ...f, description_tr: e.target.value }))}
              placeholder="Özenle seçilmiş kahvelerimiz"
              rows={2}
              className="form-input resize-none"
            />
          </Field>
          <Field label="Açıklama (İngilizce)">
            <textarea
              value={form.description_en || ''}
              onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
              placeholder="Our carefully selected coffees"
              rows={2}
              className="form-input resize-none"
            />
          </Field>
        </div>

        {/* Icon + Aktif */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="İkon" hint="Menüdeki sembol">
            <select
              value={form.hero_icon || ''}
              onChange={(e) => setForm((f) => ({ ...f, hero_icon: e.target.value }))}
              className="form-input"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Durum">
            <label className="flex items-center gap-3 h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active !== false}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="w-5 h-5 rounded border-line accent-accent"
              />
              <span className="text-sm text-ink-2">
                {form.active ? 'Menüde gösterilsin' : 'Gizli (taslak)'}
              </span>
            </label>
          </Field>
        </div>
      </div>

      {/* Butonlar */}
      <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-line">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-11 px-5 rounded-[var(--r-sm)] text-ink-2 hover:bg-paper-2 font-medium text-sm disabled:opacity-50"
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
  );
}

// ============================================================
// Kategori Kartı
// ============================================================

function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: {
  category: CategoryWithCount;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`bg-card border border-line rounded-[var(--r)] p-5 transition-all ${
        category.active ? '' : 'opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {category.hero_icon ? (
          <div
            className="w-12 h-12 rounded-[var(--r-sm)] bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0"
          >
            {category.hero_icon}
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-[var(--r-sm)] bg-paper-2 text-ink-3 flex items-center justify-center flex-shrink-0"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
            }}
          >
            {category.name.tr.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-ink truncate"
            style={{ fontFamily: 'var(--f-sans)', fontSize: 16 }}
          >
            {category.name.tr}
          </h3>
          {category.name.en && (
            <div className="text-xs text-ink-3 truncate" style={{ fontFamily: 'var(--f-mono)' }}>
              {category.name.en}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {category.description?.tr && (
        <p className="text-sm text-ink-2 mb-4 line-clamp-2">{category.description.tr}</p>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs mb-4">
        <span
          className="text-ink-3 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          {category.product_count} ürün
        </span>
        <span
          className={`px-2 py-0.5 rounded-full ${category.active ? 'bg-ok/10 text-ok' : 'bg-ink-3/10 text-ink-3'}`}
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {category.active ? 'AKTİF' : 'GİZLİ'}
        </span>
      </div>

      {/* Butonlar */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          disabled={disabled}
          className="flex-1 h-9 rounded-[var(--r-sm)] bg-paper-2 hover:bg-paper-3 text-ink-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Düzenle
        </button>
        <button
          onClick={onToggleActive}
          disabled={disabled}
          className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 hover:bg-paper-3 text-ink-2 text-sm transition-colors disabled:opacity-50"
          title={category.active ? 'Gizle' : 'Göster'}
        >
          {category.active ? '👁️' : '🚫'}
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="h-9 px-3 rounded-[var(--r-sm)] text-danger hover:bg-danger/10 text-sm transition-colors disabled:opacity-50"
          title="Sil"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Yardımcı bileşenler
// ============================================================

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-2 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <div className="text-xs text-ink-3 mt-1.5">{hint}</div>}
    </div>
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
