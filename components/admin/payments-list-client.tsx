'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill,
  LogoTile,
  SearchInput,
  FilterChip,
} from '@/components/admin/primitives';
import { type PaymentRow } from '@/lib/actions/admin-billing';
import { PAYMENT_METHOD_LABELS } from '@/components/admin/invoices-list-client';

type Props = {
  initialItems: PaymentRow[];
  total: number;
  initialFilters: {
    search?: string;
    method?: string;
    status?: string;
  };
};

const STATUS_LABELS: Record<
  string,
  { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }
> = {
  succeeded: { label: 'BAŞARILI', tone: 'ok' },
  pending: { label: 'BEKLİYOR', tone: 'warn' },
  failed: { label: 'BAŞARISIZ', tone: 'danger' },
  refunded: { label: 'İADE', tone: 'muted' },
};

function formatDateTime(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return (
    d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }) +
    ' ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function PaymentsListClient({
  initialItems,
  total,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(initialFilters.search || '');
  const [methodFilter, setMethodFilter] = useState(initialFilters.method || 'all');
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || 'all');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (methodFilter !== 'all') params.set('method', methodFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    startTransition(() => {
      router.push(`/odemeler${params.toString() ? '?' + params.toString() : ''}`);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setMethodFilter('all');
    setStatusFilter('all');
    startTransition(() => router.push('/odemeler'));
  };

  const hasActiveFilters =
    !!search.trim() || methodFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="grid gap-5">
      {/* Filtre bar */}
      <div className="bg-card border border-line rounded-[var(--r)] p-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="İşletme, fatura no, TX ID ara…"
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
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm yöntemler</option>
            <option value="card">Kart</option>
            <option value="bank_transfer">Havale</option>
            <option value="cash">Nakit</option>
            <option value="manual">Manuel</option>
            <option value="other">Diğer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="all">Tüm durumlar</option>
            <option value="succeeded">Başarılı</option>
            <option value="pending">Bekliyor</option>
            <option value="failed">Başarısız</option>
            <option value="refunded">İade</option>
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
            {methodFilter !== 'all' && (
              <FilterChip
                label="YÖNTEM"
                value={PAYMENT_METHOD_LABELS[methodFilter] || methodFilter}
                active
                onClear={() => {
                  setMethodFilter('all');
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
          </div>
        )}
      </div>

      {/* Liste */}
      {initialItems.length === 0 ? (
        <div className="bg-card border border-line rounded-[var(--r)] py-16 text-center">
          <div className="text-3xl mb-3 text-ink-3">○</div>
          <div className="text-ink-2 text-sm">
            {hasActiveFilters ? 'Filtreyle eşleşen ödeme yok.' : 'Henüz ödeme yok.'}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-[var(--r)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--paper-2)' }}>
                  <ThEy>TARİH</ThEy>
                  <ThEy>İŞLETME</ThEy>
                  <ThEy>FATURA</ThEy>
                  <ThEy>TUTAR</ThEy>
                  <ThEy>YÖNTEM</ThEy>
                  <ThEy>DURUM</ThEy>
                  <ThEy>TX</ThEy>
                </tr>
              </thead>
              <tbody>
                {initialItems.map((p) => (
                  <PaymentRowComp key={p.id} p={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

function PaymentRowComp({ p }: { p: PaymentRow }) {
  const status = STATUS_LABELS[p.status] || {
    label: p.status,
    tone: 'muted' as const,
  };

  return (
    <tr className="border-t border-line hover:bg-paper-2 transition-colors">
      <td
        className="p-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          color: 'var(--ink-2)',
        }}
      >
        {formatDateTime(p.paid_at)}
      </td>
      <td className="p-3">
        {p.business_id ? (
          <Link
            href={`/isletmeler/${p.business_id}`}
            className="flex items-center gap-2 group"
          >
            <LogoTile
              logo={p.business_logo || '?'}
              tint="var(--super)"
              size={28}
            />
            <span className="text-sm group-hover:text-super truncate max-w-[200px]">
              {p.business_name || '—'}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-ink-3">—</span>
        )}
      </td>
      <td className="p-3">
        {p.invoice_id ? (
          <Link
            href={`/faturalar/${p.invoice_id}`}
            className="text-sm text-ink hover:text-super"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            {p.invoice_no || '—'}
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
            color: p.status === 'succeeded' ? 'var(--ink)' : 'var(--ink-3)',
          }}
        >
          ₺{p.amount.toLocaleString('tr-TR')}
        </span>
      </td>
      <td className="p-3 text-sm">
        {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
      </td>
      <td className="p-3">
        <Pill tone={status.tone}>{status.label}</Pill>
      </td>
      <td
        className="p-3 text-xs truncate max-w-[140px]"
        style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
      >
        {p.transaction_id || '—'}
      </td>
    </tr>
  );
}
