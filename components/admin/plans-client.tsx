'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eyebrow,
  Pill,
  Money,
  SerifNum,
} from '@/components/admin/primitives';
import {
  createPlan,
  updatePlan,
  archivePlan,
  restorePlan,
  reorderPlans,
  type PlanWithStats,
  type PlanInput,
} from '@/lib/actions/admin-billing';

type Props = { initialPlans: PlanWithStats[] };

export function PlansClient({ initialPlans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingPlan, setEditingPlan] = useState<PlanWithStats | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<PlanWithStats | null>(null);

  const handleMove = (id: string, dir: -1 | 1) => {
    const idx = initialPlans.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= initialPlans.length) return;

    const reordered = [...initialPlans];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];

    startTransition(async () => {
      await reorderPlans(reordered.map((p) => p.id));
      router.refresh();
    });
  };

  const handleArchive = () => {
    if (!confirmArchive) return;
    startTransition(async () => {
      const r = confirmArchive.active
        ? await archivePlan(confirmArchive.id)
        : await restorePlan(confirmArchive.id);
      if (!r.success) alert(`Hata: ${r.error}`);
      setConfirmArchive(null);
      router.refresh();
    });
  };

  const totalActive = initialPlans.filter((p) => p.active).length;
  const totalSubscribers = initialPlans.reduce((s, p) => s + p.total_count, 0);
  const totalMRR = initialPlans.reduce((s, p) => s + p.mrr_contribution, 0);

  return (
    <div className="grid gap-5">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="AKTİF PLAN" value={String(totalActive)} suffix="adet" />
        <StatCard label="TOPLAM ABONE" value={String(totalSubscribers)} suffix="işletme" />
        <StatCard label="TOPLAM MRR" value={`₺${totalMRR.toLocaleString('tr-TR')}`} suffix="/ay" tone="ok" />
      </div>

      {/* Header action */}
      <div className="flex items-center justify-between">
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}
        >
          {initialPlans.length} PLAN ({totalActive} AKTİF)
        </div>
        <button
          onClick={() => setCreatingPlan(true)}
          className="h-10 px-4 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
          Yeni plan
        </button>
      </div>

      {/* Plans list */}
      {initialPlans.length === 0 ? (
        <div className="bg-card border border-line rounded-[var(--r)] py-16 text-center">
          <div className="text-3xl mb-3 text-ink-3">○</div>
          <div className="text-ink-2 text-sm">Henüz plan tanımlı değil.</div>
          <button
            onClick={() => setCreatingPlan(true)}
            className="mt-4 h-9 px-4 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            İlk planı oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {initialPlans.map((p, idx) => (
            <PlanCard
              key={p.id}
              plan={p}
              canMoveUp={idx > 0}
              canMoveDown={idx < initialPlans.length - 1}
              onMoveUp={() => handleMove(p.id, -1)}
              onMoveDown={() => handleMove(p.id, 1)}
              onEdit={() => setEditingPlan(p)}
              onArchive={() => setConfirmArchive(p)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {creatingPlan && (
        <PlanFormModal
          mode="create"
          onClose={() => setCreatingPlan(false)}
          onSuccess={() => {
            setCreatingPlan(false);
            router.refresh();
          }}
        />
      )}

      {/* Edit modal */}
      {editingPlan && (
        <PlanFormModal
          mode="edit"
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSuccess={() => {
            setEditingPlan(null);
            router.refresh();
          }}
        />
      )}

      {/* Archive confirm */}
      {confirmArchive && (
        <Modal
          onClose={() => setConfirmArchive(null)}
          title={confirmArchive.active ? 'Planı Arşivle' : 'Planı Geri Aç'}
        >
          <p className="text-ink-2 text-sm mb-4">
            <strong>{confirmArchive.name}</strong> planı{' '}
            {confirmArchive.active ? (
              <>
                arşivlenecek. Yeni işletmeler bu planı seçemeyecek, ancak mevcut{' '}
                <strong>{confirmArchive.total_count} abone</strong> etkilenmez.
              </>
            ) : (
              'tekrar aktif edilecek ve yeni işletmeler bu planı seçebilecek.'
            )}
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setConfirmArchive(null)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handleArchive}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{
                background: confirmArchive.active ? 'var(--warn)' : 'var(--ok)',
                fontFamily: 'var(--f-sans)',
              }}
            >
              {isPending ? 'İşleniyor…' : confirmArchive.active ? 'Arşivle' : 'Geri aç'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// PlanCard — listede tek bir plan
// ============================================================
function PlanCard({
  plan,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onArchive,
  isPending,
}: {
  plan: PlanWithStats;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onArchive: () => void;
  isPending: boolean;
}) {
  const featureList = Array.isArray(plan.features)
    ? (plan.features as string[])
    : plan.features && typeof plan.features === 'object'
      ? Object.keys(plan.features as Record<string, unknown>)
      : [];

  return (
    <div
      className="bg-card border rounded-[var(--r)] p-5"
      style={{
        borderColor: 'var(--line)',
        opacity: plan.active ? 1 : 0.6,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Move arrows */}
        <div className="flex flex-col gap-1 pt-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp || isPending}
            className="w-7 h-7 rounded-[var(--r-sm)] border border-line bg-paper-2 text-ink-3 hover:text-ink hover:bg-paper-3 disabled:opacity-30 text-xs flex items-center justify-center"
            aria-label="Yukarı taşı"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown || isPending}
            className="w-7 h-7 rounded-[var(--r-sm)] border border-line bg-paper-2 text-ink-3 hover:text-ink hover:bg-paper-3 disabled:opacity-30 text-xs flex items-center justify-center"
            aria-label="Aşağı taşı"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            ↓
          </button>
        </div>

        {/* Plan info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
              }}
            >
              {plan.name}
            </h3>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                letterSpacing: '0.04em',
              }}
            >
              {plan.slug}
            </span>
            {!plan.active && <Pill tone="muted">ARŞİV</Pill>}
          </div>

          {plan.description && (
            <p className="text-ink-2 text-sm mt-2 max-w-[640px]">
              {plan.description}
            </p>
          )}

          {/* Features */}
          {featureList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {featureList.slice(0, 6).map((f, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-[var(--r-sm)] bg-paper-2 text-ink-2"
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  ✓ {f}
                </span>
              ))}
              {featureList.length > 6 && (
                <span
                  className="text-xs px-2 py-1 text-ink-3"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  +{featureList.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Limits */}
          {(plan.max_branches || plan.max_products || plan.max_team_members) && (
            <div className="flex gap-4 mt-3 flex-wrap">
              {plan.max_branches !== null && (
                <LimitChip label="ŞUBE" value={plan.max_branches} />
              )}
              {plan.max_products !== null && (
                <LimitChip label="ÜRÜN" value={plan.max_products} />
              )}
              {plan.max_team_members !== null && (
                <LimitChip label="EKİP" value={plan.max_team_members} />
              )}
            </div>
          )}
        </div>

        {/* Stats + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <Money amount={plan.price_monthly || 0} size={28} />
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
              }}
            >
              AYLIK
            </div>
            {plan.price_yearly && (
              <div
                className="mt-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                }}
              >
                ₺{plan.price_yearly.toLocaleString('tr-TR')} / yıl
              </div>
            )}
          </div>

          {/* Subscriber pill */}
          <div className="flex gap-1.5">
            {plan.active_count > 0 && (
              <Pill tone="ok">{plan.active_count} aktif</Pill>
            )}
            {plan.trial_count > 0 && (
              <Pill tone="super">{plan.trial_count} trial</Pill>
            )}
            {plan.total_count === 0 && <Pill tone="muted">abone yok</Pill>}
          </div>

          {plan.mrr_contribution > 0 && (
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                color: 'var(--ok)',
                fontWeight: 700,
              }}
            >
              MRR ₺{plan.mrr_contribution.toLocaleString('tr-TR')}
            </div>
          )}

          <div className="flex gap-1 mt-1">
            <button
              onClick={onEdit}
              className="h-8 px-3 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 hover:border-line-2 text-xs font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Düzenle
            </button>
            <button
              onClick={onArchive}
              className="h-8 px-3 rounded-[var(--r-sm)] border text-xs font-medium"
              style={{
                fontFamily: 'var(--f-sans)',
                borderColor: plan.active ? 'var(--warn)' : 'var(--ok)',
                color: plan.active ? 'var(--warn)' : 'var(--ok)',
              }}
            >
              {plan.active ? 'Arşivle' : 'Geri aç'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          color: 'var(--ink)',
          fontWeight: 600,
        }}
      >
        {value === 0 ? '∞' : value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const toneColor =
    tone === 'ok'
      ? 'var(--ok)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'danger'
          ? 'var(--danger)'
          : 'var(--ink)';
  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-baseline gap-2 mt-1">
        <SerifNum size={28} tone={toneColor}>
          {value}
        </SerifNum>
        {suffix && (
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Plan Form Modal
// ============================================================
function PlanFormModal({
  mode,
  plan,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  plan?: PlanWithStats;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialFeatures = Array.isArray(plan?.features)
    ? (plan.features as string[])
    : [];

  const [form, setForm] = useState<{
    slug: string;
    name: string;
    description: string;
    price_monthly: string;
    price_yearly: string;
    features: string[];
    featureInput: string;
    max_branches: string;
    max_products: string;
    max_team_members: string;
    active: boolean;
  }>({
    slug: plan?.slug || '',
    name: plan?.name || '',
    description: plan?.description || '',
    price_monthly: plan?.price_monthly?.toString() || '',
    price_yearly: plan?.price_yearly?.toString() || '',
    features: initialFeatures,
    featureInput: '',
    max_branches: plan?.max_branches?.toString() || '',
    max_products: plan?.max_products?.toString() || '',
    max_team_members: plan?.max_team_members?.toString() || '',
    active: plan?.active ?? true,
  });

  const addFeature = () => {
    const f = form.featureInput.trim();
    if (!f) return;
    setForm((prev) => ({
      ...prev,
      features: [...prev.features, f],
      featureInput: '',
    }));
  };

  const removeFeature = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload: PlanInput = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price_monthly: form.price_monthly ? Number(form.price_monthly) : null,
      price_yearly: form.price_yearly ? Number(form.price_yearly) : null,
      features: form.features,
      max_branches: form.max_branches ? Number(form.max_branches) : null,
      max_products: form.max_products ? Number(form.max_products) : null,
      max_team_members: form.max_team_members ? Number(form.max_team_members) : null,
      active: form.active,
    };

    const r = mode === 'create'
      ? await createPlan(payload)
      : await updatePlan(plan!.id, payload);

    setSubmitting(false);
    if (r.success) onSuccess();
    else setError(r.error || 'Hata');
  };

  return (
    <Modal onClose={onClose} title={mode === 'create' ? 'Yeni Plan' : 'Planı Düzenle'} wide>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan adı" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Standart"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-sans)' }}
            />
          </Field>
          <Field label="Slug" required help="küçük harf, rakam, -">
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
              }
              placeholder="standart"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
        </div>

        <Field label="Açıklama">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Bu planın kime uygun olduğunu kısaca anlat…"
            className="w-full p-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm resize-none focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Aylık ücret (₺)">
            <input
              type="number"
              value={form.price_monthly}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_monthly: e.target.value }))
              }
              placeholder="499"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
          <Field label="Yıllık ücret (₺)" help="opsiyonel">
            <input
              type="number"
              value={form.price_yearly}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_yearly: e.target.value }))
              }
              placeholder="4990"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
        </div>

        {/* Features */}
        <Field label="Özellikler" help="Her satıra bir özellik">
          <div className="grid gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={form.featureInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featureInput: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="Sınırsız menü kategorisi"
                className="flex-1 h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
                style={{ fontFamily: 'var(--f-sans)' }}
              />
              <button
                type="button"
                onClick={addFeature}
                className="h-10 px-4 rounded-[var(--r-sm)] border border-super text-super text-sm font-semibold hover:bg-super-soft"
                style={{ fontFamily: 'var(--f-sans)' }}
              >
                + Ekle
              </button>
            </div>
            {form.features.length > 0 && (
              <div className="grid gap-1">
                {form.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-[var(--r-sm)] bg-paper-2 text-sm"
                  >
                    <span style={{ color: 'var(--ok)' }}>✓</span>
                    <span className="flex-1">{f}</span>
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="text-ink-3 hover:text-danger text-sm"
                      aria-label="Sil"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Limits */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Max şube" help="boş = ∞">
            <input
              type="number"
              value={form.max_branches}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_branches: e.target.value }))
              }
              placeholder="∞"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
          <Field label="Max ürün" help="boş = ∞">
            <input
              type="number"
              value={form.max_products}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_products: e.target.value }))
              }
              placeholder="∞"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
          <Field label="Max ekip üyesi" help="boş = ∞">
            <input
              type="number"
              value={form.max_team_members}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_team_members: e.target.value }))
              }
              placeholder="∞"
              className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          <span className="text-sm">
            Aktif (yeni işletmeler bu planı seçebilir)
          </span>
        </label>

        {error && (
          <div
            className="p-3 rounded-[var(--r-sm)] text-sm"
            style={{
              background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
              color: 'var(--danger)',
              border: '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-5 border-t border-line">
        <button
          onClick={onClose}
          disabled={submitting}
          className="h-10 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          Vazgeç
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !form.name || !form.slug}
          className="h-10 px-5 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          {submitting ? 'Kaydediliyor…' : mode === 'create' ? 'Plan oluştur' : 'Kaydet'}
        </button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
        {help && (
          <span
            className="ml-2"
            style={{
              fontWeight: 400,
              letterSpacing: '0.02em',
              color: 'var(--ink-3)',
              textTransform: 'none',
            }}
          >
            {help}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-line rounded-[var(--r)] p-6 w-full my-12"
        style={{ maxWidth: wide ? 720 : 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <Eyebrow>İŞLEM</Eyebrow>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              marginTop: 4,
            }}
          >
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
