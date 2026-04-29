'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eyebrow,
  Pill,
  LogoTile,
  SearchInput,
  FilterChip,
} from '@/components/admin/primitives';
import {
  exportInvoicesCSV,
  bulkSendReminder,
  createManualInvoice,
  type InvoiceRow,
} from '@/lib/actions/admin-billing';

type BusinessOption = { id: string; name: string; slug: string };

type Props = {
  initialItems: InvoiceRow[];
  total: number;
  businesses: BusinessOption[];
  initialFilters: {
    search?: string;
    status?: string;
    businessId?: string;
  };
};

export const STATUS_LABELS: Record<
  string,
  { label: string; tone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' }
> = {
  paid: { label: 'ÖDENDİ', tone: 'ok' },
  pending: { label: 'BEKLİYOR', tone: 'warn' },
  failed: { label: 'BAŞARISIZ', tone: 'danger' },
  cancelled: { label: 'İPTAL', tone: 'muted' },
  refunded: { label: 'İADE', tone: 'muted' },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Kart',
  bank_transfer: 'Havale',
  cash: 'Nakit',
  manual: 'Manuel',
  other: 'Diğer',
};

function formatDate(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function InvoicesListClient({
  initialItems,
  total,
  businesses,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || 'all');
  const [businessFilter, setBusinessFilter] = useState(initialFilters.businessId || 'all');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (businessFilter !== 'all') params.set('business', businessFilter);
    startTransition(() => {
      router.push(`/faturalar${params.toString() ? '?' + params.toString() : ''}`);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setBusinessFilter('all');
    startTransition(() => router.push('/faturalar'));
  };

  const hasActiveFilters =
    !!search.trim() || statusFilter !== 'all' || businessFilter !== 'all';

  const allSelected =
    initialItems.length > 0 && initialItems.every((i) => selected.has(i.id));

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

  const handleBulkReminder = () => {
    if (selected.size === 0) return;
    startTransition(async () => {
      const r = await bulkSendReminder(Array.from(selected));
      alert(`${r.succeeded} faturaya hatırlatma sayacı +1`);
      setSelected(new Set());
      router.refresh();
    });
  };

  const handleExport = () => {
    startTransition(async () => {
      const csv = await exportInvoicesCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faturalar-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const businessName = (id: string) =>
    businesses.find((b) => b.id === id)?.name || id;

  return (
    <div className="grid gap-5">
      {/* Filtre bar */}
      <div className="bg-card border border-line rounded-[var(--r)] p-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Fatura no, işletme ara…"
            width={320}
          />
          <button
            onClick={applyFilters}
            className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card text-sm font-semibold hover:opacity-90"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            Ara
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm durumlar</option>
            <option value="paid">Ödendi</option>
            <option value="pending">Bekliyor</option>
            <option value="failed">Başarısız</option>
            <option value="cancelled">İptal</option>
            <option value="refunded">İade</option>
          </select>

          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm işletmeler</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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
            <button
              onClick={handleExport}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium hover:border-line-2 disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              CSV indir
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card text-sm font-semibold hover:opacity-90"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              + Manuel fatura
            </button>
          </div>
        </div>

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
            {businessFilter !== 'all' && (
              <FilterChip
                label="İŞLETME"
                value={businessName(businessFilter)}
                active
                onClear={() => {
                  setBusinessFilter('all');
                  applyFilters();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="rounded-[var(--r)] p-4 flex items-center gap-3"
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
            {selected.size} FATURA SEÇİLDİ
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkReminder}
              disabled={isPending}
              className="h-8 px-3 rounded-[var(--r-sm)] bg-card border border-super text-super text-xs font-semibold disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Hatırlatma gönder
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

      {/* Tablo */}
      {initialItems.length === 0 ? (
        <div className="bg-card border border-line rounded-[var(--r)] py-16 text-center">
          <div className="text-3xl mb-3 text-ink-3">○</div>
          <div className="text-ink-2 text-sm">
            {hasActiveFilters ? 'Filtreyle eşleşen fatura yok.' : 'Henüz fatura yok.'}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-[var(--r)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--paper-2)' }}>
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Hepsini seç"
                    />
                  </th>
                  <ThEy>FATURA NO</ThEy>
                  <ThEy>İŞLETME</ThEy>
                  <ThEy>TUTAR</ThEy>
                  <ThEy>DURUM</ThEy>
                  <ThEy>DÖNEM</ThEy>
                  <ThEy>VADE</ThEy>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {initialItems.map((inv) => (
                  <InvoiceRowComp
                    key={inv.id}
                    inv={inv}
                    selected={selected.has(inv.id)}
                    onToggle={() => toggleOne(inv.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && (
        <CreateInvoiceModal
          businesses={businesses}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}
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

function InvoiceRowComp({
  inv,
  selected,
  onToggle,
}: {
  inv: InvoiceRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_LABELS[inv.status] || {
    label: inv.status,
    tone: 'muted' as const,
  };

  const overdueWarn = inv.days_overdue > 0;
  const dueSoonWarn = inv.due_soon;

  return (
    <tr
      className="border-t border-line hover:bg-paper-2 transition-colors"
      style={{ background: selected ? 'var(--super-soft)' : undefined }}
    >
      <td className="p-3">
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td className="p-3">
        <Link
          href={`/faturalar/${inv.id}`}
          className="font-semibold text-sm text-ink hover:text-super"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {inv.invoice_no}
        </Link>
      </td>
      <td className="p-3">
        {inv.business_id ? (
          <Link
            href={`/isletmeler/${inv.business_id}`}
            className="flex items-center gap-2 group"
          >
            <LogoTile logo={inv.business_logo || '?'} tint="var(--super)" size={28} />
            <span className="text-sm group-hover:text-super truncate max-w-[200px]">
              {inv.business_name || '—'}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-ink-3">—</span>
        )}
      </td>
      <td className="p-3">
        <span
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--ink)',
          }}
        >
          ₺{inv.amount.toLocaleString('tr-TR')}
        </span>
      </td>
      <td className="p-3">
        <Pill tone={status.tone}>{status.label}</Pill>
        {inv.retry_count > 0 && (
          <span
            className="ml-2 text-xs"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--warn)',
            }}
          >
            ⟳{inv.retry_count}
          </span>
        )}
      </td>
      <td
        className="p-3 text-xs"
        style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
      >
        {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
      </td>
      <td className="p-3">
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 12,
            color: overdueWarn
              ? 'var(--danger)'
              : dueSoonWarn
                ? 'var(--warn)'
                : 'var(--ink-2)',
            fontWeight: overdueWarn || dueSoonWarn ? 600 : 400,
          }}
        >
          {formatDate(inv.due_at)}
        </div>
        {overdueWarn && (
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              color: 'var(--danger)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {inv.days_overdue}g GECİKMİŞ
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        <Link
          href={`/faturalar/${inv.id}`}
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
// Create invoice modal
// ============================================================
function CreateInvoiceModal({
  businesses,
  onClose,
  onSuccess,
}: {
  businesses: BusinessOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const dueDate = new Date(today.getTime() + 14 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [form, setForm] = useState({
    businessId: '',
    amount: '',
    periodStart: monthStart,
    periodEnd: monthEnd,
    dueAt: dueDate,
    invoiceNo: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const r = await createManualInvoice({
      businessId: form.businessId,
      amount: Number(form.amount),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      dueAt: form.dueAt,
      invoiceNo: form.invoiceNo || undefined,
      notes: form.notes || undefined,
    });
    setSubmitting(false);
    if (r.success) onSuccess();
    else setError(r.error || 'Hata');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-line rounded-[var(--r)] p-6 max-w-lg w-full my-12"
        onClick={(e) => e.stopPropagation()}
      >
        <Eyebrow>İŞLEM</Eyebrow>
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 24,
            fontWeight: 400,
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          Manuel fatura oluştur
        </h2>

        <div className="grid gap-3">
          <div>
            <label
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              İşletme *
            </label>
            <select
              value={form.businessId}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessId: e.target.value }))
              }
              className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              <option value="">Seç…</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                }}
              >
                Tutar (₺) *
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="499"
                className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
                style={{ fontFamily: 'var(--f-mono)' }}
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                }}
              >
                Fatura no
              </label>
              <input
                type="text"
                value={form.invoiceNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, invoiceNo: e.target.value }))
                }
                placeholder="otomatik"
                className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
                style={{ fontFamily: 'var(--f-mono)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                }}
              >
                Dönem başı *
              </label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodStart: e.target.value }))
                }
                className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
                style={{ fontFamily: 'var(--f-mono)' }}
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                }}
              >
                Dönem sonu *
              </label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodEnd: e.target.value }))
                }
                className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
                style={{ fontFamily: 'var(--f-mono)' }}
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                }}
              >
                Vade *
              </label>
              <input
                type="date"
                value={form.dueAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueAt: e.target.value }))
                }
                className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
                style={{ fontFamily: 'var(--f-mono)' }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              Notlar
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full p-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm resize-none focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-sans)' }}
            />
          </div>

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
            disabled={
              submitting ||
              !form.businessId ||
              !form.amount ||
              !form.periodStart ||
              !form.periodEnd ||
              !form.dueAt
            }
            className="h-10 px-5 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm disabled:opacity-50"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            {submitting ? 'Oluşturuluyor…' : 'Fatura oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}
