'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eyebrow,
  Pill,
  LogoTile,
  StatusDot,
  SearchInput,
  FilterChip,
} from '@/components/admin/primitives';
import {
  bulkSuspendBusinesses,
  bulkChangePlan,
  exportBusinessesCSV,
  type BusinessListRow,
} from '@/lib/actions/admin-businesses';

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
};

type Props = {
  initialItems: BusinessListRow[];
  total: number;
  plans: Plan[];
  cities: string[];
  initialFilters: {
    search?: string;
    status?: string;
    planSlug?: string;
    city?: string;
  };
};

const STATUS_LABELS: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' }> = {
  active: { label: 'AKTİF', tone: 'ok' },
  trial: { label: 'TRIAL', tone: 'super' },
  pending_approval: { label: 'BEKLİYOR', tone: 'gold' },
  past_due: { label: 'GECİKMİŞ', tone: 'warn' },
  suspended: { label: 'ASKIDA', tone: 'danger' },
  cancelled: { label: 'İPTAL', tone: 'muted' },
};

function formatRelative(ts: string | null): string {
  if (!ts) return '—';
  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 60) return `${diffMin}dk`;
  if (diffHr < 24) return `${diffHr}sa`;
  if (diffDay < 7) return `${diffDay}g`;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

export function BusinessListClient({
  initialItems,
  total,
  plans,
  cities,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtreler — URL search params ile sync
  const [search, setSearch] = useState(initialFilters.search || '');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.status || 'all');
  const [planFilter, setPlanFilter] = useState<string>(initialFilters.planSlug || 'all');
  const [cityFilter, setCityFilter] = useState<string>(initialFilters.city || 'all');

  // View toggle
  const [view, setView] = useState<'table' | 'grid'>('table');

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal'lar
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [chosenPlanId, setChosenPlanId] = useState<string>('');

  // Kullanıcı arama yazınca debounce yerine basitçe enter veya filter buton ile uygula
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (planFilter !== 'all') params.set('plan', planFilter);
    if (cityFilter !== 'all') params.set('city', cityFilter);
    startTransition(() => {
      router.push(`/isletmeler${params.toString() ? '?' + params.toString() : ''}`);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPlanFilter('all');
    setCityFilter('all');
    startTransition(() => router.push('/isletmeler'));
  };

  const hasActiveFilters =
    !!search.trim() ||
    statusFilter !== 'all' ||
    planFilter !== 'all' ||
    cityFilter !== 'all';

  const allSelected =
    initialItems.length > 0 &&
    initialItems.every((i) => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(initialItems.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkSuspend = () => {
    if (selected.size === 0) return;
    setSuspendModalOpen(true);
  };

  const confirmBulkSuspend = () => {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkSuspendBusinesses(ids, suspendReason || undefined);
      alert(`${result.succeeded} işletme askıya alındı${result.failed > 0 ? `, ${result.failed} hata` : ''}`);
      setSelected(new Set());
      setSuspendModalOpen(false);
      setSuspendReason('');
      router.refresh();
    });
  };

  const handleBulkPlanChange = () => {
    if (selected.size === 0) return;
    setPlanModalOpen(true);
  };

  const confirmBulkPlanChange = () => {
    if (!chosenPlanId) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkChangePlan(ids, chosenPlanId);
      alert(`${result.succeeded} işletmenin planı değiştirildi${result.failed > 0 ? `, ${result.failed} hata` : ''}`);
      setSelected(new Set());
      setPlanModalOpen(false);
      setChosenPlanId('');
      router.refresh();
    });
  };

  const handleExport = async () => {
    startTransition(async () => {
      const csv = await exportBusinessesCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `isletmeler-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="grid gap-5">
      {/* ============== FİLTRE BARI ============== */}
      <div className="bg-card border border-line rounded-[var(--r)] p-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="İsim, slug, şehir, e-posta ara…"
            width={360}
          />
          <button
            onClick={applyFilters}
            className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card text-sm font-semibold hover:opacity-90"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            Ara
          </button>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="trial">Trial</option>
            <option value="pending_approval">Onay bekliyor</option>
            <option value="past_due">Gecikmiş</option>
            <option value="suspended">Askıda</option>
            <option value="cancelled">İptal</option>
          </select>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm planlar</option>
            {plans.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>

          {/* City filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm şehirler</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-9 px-3 text-sm text-ink-3 hover:text-ink"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Filtreleri temizle ×
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-paper-2 border border-line rounded-[var(--r-sm)] overflow-hidden">
              <button
                onClick={() => setView('table')}
                className="h-9 px-3 text-sm flex items-center"
                style={{
                  background: view === 'table' ? 'var(--card)' : 'transparent',
                  color: view === 'table' ? 'var(--ink)' : 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
                aria-label="Tablo görünümü"
              >
                ☰ TABLO
              </button>
              <button
                onClick={() => setView('grid')}
                className="h-9 px-3 text-sm flex items-center"
                style={{
                  background: view === 'grid' ? 'var(--card)' : 'transparent',
                  color: view === 'grid' ? 'var(--ink)' : 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
                aria-label="Kart görünümü"
              >
                ⊞ KART
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium hover:border-line-2 disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              CSV indir
            </button>
          </div>
        </div>

        {/* Aktif filtre özeti */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-line">
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
              }}
            >
              {total} SONUÇ ·
            </span>
            {search.trim() && (
              <FilterChip
                label="ARAMA"
                value={`"${search}"`}
                active
                onClear={() => {
                  setSearch('');
                  applyFilters();
                }}
              />
            )}
            {statusFilter !== 'all' && (
              <FilterChip
                label="DURUM"
                value={STATUS_LABELS[statusFilter]?.label || statusFilter}
                active
                onClear={() => {
                  setStatusFilter('all');
                  applyFilters();
                }}
              />
            )}
            {planFilter !== 'all' && (
              <FilterChip
                label="PLAN"
                value={plans.find((p) => p.slug === planFilter)?.name || planFilter}
                active
                onClear={() => {
                  setPlanFilter('all');
                  applyFilters();
                }}
              />
            )}
            {cityFilter !== 'all' && (
              <FilterChip
                label="ŞEHİR"
                value={cityFilter}
                active
                onClear={() => {
                  setCityFilter('all');
                  applyFilters();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ============== BULK ACTION BAR ============== */}
      {selected.size > 0 && (
        <div
          className="rounded-[var(--r)] p-4 flex items-center gap-3 animate-in"
          style={{
            background: 'var(--super-soft)',
            border: '1px solid var(--super)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: 'var(--super)',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {selected.size} İŞLETME SEÇİLDİ
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkPlanChange}
              disabled={isPending}
              className="h-8 px-3 rounded-[var(--r-sm)] bg-card border border-super text-super text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Plan değiştir
            </button>
            <button
              onClick={handleBulkSuspend}
              disabled={isPending}
              className="h-8 px-3 rounded-[var(--r-sm)] bg-card border text-xs font-semibold disabled:opacity-50"
              style={{
                fontFamily: 'var(--f-sans)',
                borderColor: 'var(--warn)',
                color: 'var(--warn)',
              }}
            >
              Askıya al
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="h-8 px-3 rounded-[var(--r-sm)] text-ink-3 text-xs hover:text-ink"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ============== LİSTE: TABLO veya GRID ============== */}
      {initialItems.length === 0 ? (
        <div className="bg-card border border-line rounded-[var(--r)] py-16 text-center">
          <div className="text-3xl mb-3 text-ink-3">○</div>
          <div className="text-ink-2 text-sm">
            {hasActiveFilters ? 'Filtreyle eşleşen işletme yok.' : 'Henüz işletme yok.'}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-super text-sm underline hover:opacity-80"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : view === 'table' ? (
        <BusinessTable
          items={initialItems}
          selected={selected}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
        />
      ) : (
        <BusinessGrid items={initialItems} />
      )}

      {/* ============== SUSPEND MODAL ============== */}
      {suspendModalOpen && (
        <Modal onClose={() => setSuspendModalOpen(false)} title="İşletmeleri Askıya Al">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{selected.size} işletme</strong> askıya alınacak. İsterseniz bir
            sebep yazın (üyelere gösterilebilir).
          </p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Askı sebebi (opsiyonel)…"
            rows={3}
            className="w-full p-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm resize-none focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setSuspendModalOpen(false)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={confirmBulkSuspend}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{
                background: 'var(--warn)',
                fontFamily: 'var(--f-sans)',
              }}
            >
              {isPending ? 'İşleniyor…' : 'Askıya al'}
            </button>
          </div>
        </Modal>
      )}

      {/* ============== PLAN MODAL ============== */}
      {planModalOpen && (
        <Modal onClose={() => setPlanModalOpen(false)} title="Plan Değiştir">
          <p className="text-ink-2 text-sm mb-4">
            Seçili <strong>{selected.size} işletmenin</strong> planı değiştirilecek.
          </p>
          <div className="grid gap-2">
            {plans.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-[var(--r-sm)] border cursor-pointer hover:bg-paper-2"
                style={{
                  borderColor:
                    chosenPlanId === p.id ? 'var(--super)' : 'var(--line)',
                  background:
                    chosenPlanId === p.id ? 'var(--super-soft)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={chosenPlanId === p.id}
                  onChange={(e) => setChosenPlanId(e.target.value)}
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-ink-3 text-xs">
                    Aylık ₺{p.price_monthly.toLocaleString('tr-TR')}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setPlanModalOpen(false)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={confirmBulkPlanChange}
              disabled={!chosenPlanId || isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card text-sm font-semibold disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'Plan değiştir'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Tablo görünümü
// ============================================================
function BusinessTable({
  items,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
}: {
  items: BusinessListRow[];
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-line rounded-[var(--r)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--paper-2)' }}>
              <th className="w-10 p-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Hepsini seç"
                />
              </th>
              <ThEy>İŞLETME</ThEy>
              <ThEy>DURUM</ThEy>
              <ThEy>PLAN</ThEy>
              <ThEy>MRR</ThEy>
              <ThEy>SİPARİŞ 30g</ThEy>
              <ThEy>SON GİRİŞ</ThEy>
              <ThEy>KAYIT</ThEy>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <BusinessTableRow
                key={b.id}
                b={b}
                selected={selected.has(b.id)}
                onToggle={() => onToggleOne(b.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThEy({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="p-3 text-left"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </th>
  );
}

function BusinessTableRow({
  b,
  selected,
  onToggle,
}: {
  b: BusinessListRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_LABELS[b.subscription_status] || {
    label: b.subscription_status,
    tone: 'muted' as const,
  };
  const isPaid = b.subscription_status === 'active';
  const mrr = isPaid ? b.plan_price : 0;

  return (
    <tr
      className="border-t border-line hover:bg-paper-2 transition-colors"
      style={{ background: selected ? 'var(--super-soft)' : undefined }}
    >
      <td className="p-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${b.name} seç`}
        />
      </td>
      <td className="p-3">
        <Link
          href={`/isletmeler/${b.id}`}
          className="flex items-center gap-3 group"
        >
          <LogoTile logo={b.logo} tint="var(--super)" size={36} />
          <div className="min-w-0">
            <div className="font-semibold text-[14px] text-ink truncate group-hover:text-super">
              {b.name}
            </div>
            <div
              className="text-xs text-ink-3 truncate"
              style={{ fontFamily: 'var(--f-mono)' }}
            >
              {b.slug} {b.city && `· ${b.city}`}
            </div>
          </div>
        </Link>
      </td>
      <td className="p-3">
        <Pill tone={status.tone}>{status.label}</Pill>
      </td>
      <td className="p-3 text-sm">{b.plan_name || '—'}</td>
      <td className="p-3">
        {mrr > 0 ? (
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--ink)',
            }}
          >
            ₺{mrr.toLocaleString('tr-TR')}
          </span>
        ) : (
          <span className="text-ink-3 text-sm">—</span>
        )}
      </td>
      <td
        className="p-3 text-sm"
        style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-2)' }}
      >
        {b.orders_30d}
      </td>
      <td
        className="p-3 text-sm"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 12,
          color: !b.last_login_at
            ? 'var(--ink-3)'
            : Date.now() - new Date(b.last_login_at).getTime() > 7 * 24 * 60 * 60 * 1000
              ? 'var(--warn)'
              : 'var(--ink-2)',
        }}
      >
        {formatRelative(b.last_login_at)}
      </td>
      <td
        className="p-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
        }}
      >
        {new Date(b.created_at).toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        })}
      </td>
      <td className="p-3 text-right">
        <Link
          href={`/isletmeler/${b.id}`}
          className="text-ink-3 hover:text-super text-sm"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          →
        </Link>
      </td>
    </tr>
  );
}

// ============================================================
// Grid görünümü
// ============================================================
function BusinessGrid({ items }: { items: BusinessListRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((b) => {
        const status = STATUS_LABELS[b.subscription_status] || {
          label: b.subscription_status,
          tone: 'muted' as const,
        };
        const isPaid = b.subscription_status === 'active';
        const mrr = isPaid ? b.plan_price : 0;

        return (
          <Link
            key={b.id}
            href={`/isletmeler/${b.id}`}
            className="bg-card border border-line rounded-[var(--r)] p-5 hover:border-super transition-colors group"
          >
            <div className="flex items-start gap-3 mb-3">
              <LogoTile logo={b.logo} tint="var(--super)" size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[15px] text-ink truncate group-hover:text-super">
                  {b.name}
                </div>
                <div
                  className="text-xs text-ink-3 truncate"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {b.slug}
                </div>
              </div>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line">
              <div>
                <Eyebrow>MRR</Eyebrow>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--ink)',
                    marginTop: 2,
                  }}
                >
                  {mrr > 0 ? `₺${mrr.toLocaleString('tr-TR')}` : '—'}
                </div>
              </div>
              <div>
                <Eyebrow>SİPARİŞ 30g</Eyebrow>
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 16,
                    color: 'var(--ink)',
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {b.orders_30d}
                </div>
              </div>
              <div>
                <Eyebrow>SON GİRİŞ</Eyebrow>
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {formatRelative(b.last_login_at)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line">
              <StatusDot
                tone={
                  b.subscription_status === 'active'
                    ? 'ok'
                    : b.subscription_status === 'suspended'
                      ? 'danger'
                      : b.subscription_status === 'trial'
                        ? 'super'
                        : 'muted'
                }
                size={6}
              />
              <span
                className="text-xs text-ink-3 truncate"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {b.city || '—'} · {b.plan_name || 'Plan yok'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================
// Modal (basit)
// ============================================================
function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-line rounded-[var(--r)] p-6 max-w-md w-full"
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
