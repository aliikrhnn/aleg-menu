'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill,
  LogoTile,
} from '@/components/admin/primitives';
import {
  bulkSendReminder,
  markInvoicePaid,
  type InvoiceRow,
} from '@/lib/actions/admin-billing';

type Props = {
  overdue: InvoiceRow[];
  dueSoon: InvoiceRow[];
  upcoming: InvoiceRow[];
};

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
  });
}

export function PendingInvoicesClient({
  overdue,
  dueSoon,
  upcoming,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const all = [...overdue, ...dueSoon, ...upcoming];

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectGroup = (items: InvoiceRow[]) => {
    const next = new Set(selected);
    items.forEach((i) => next.add(i.id));
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

  const handleMarkPaid = (id: string) => {
    startTransition(async () => {
      const r = await markInvoicePaid(id);
      if (r.success) {
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  if (all.length === 0) {
    return (
      <div className="bg-card border border-line rounded-[var(--r)] py-16 text-center">
        <div className="text-3xl mb-3" style={{ color: 'var(--ok)' }}>
          ✓
        </div>
        <div className="text-ink-2 text-sm">
          Bekleyen ödeme yok — hepsi güncel.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
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

      {overdue.length > 0 && (
        <Section
          title="Vade geçmiş"
          subtitle="Acil — tahsilat riski"
          tone="danger"
          count={overdue.length}
          items={overdue}
          selected={selected}
          onToggle={toggleOne}
          onSelectAll={() => selectGroup(overdue)}
          onMarkPaid={handleMarkPaid}
          isPending={isPending}
        />
      )}
      {dueSoon.length > 0 && (
        <Section
          title="Vade yaklaşıyor"
          subtitle="7 gün içinde"
          tone="warn"
          count={dueSoon.length}
          items={dueSoon}
          selected={selected}
          onToggle={toggleOne}
          onSelectAll={() => selectGroup(dueSoon)}
          onMarkPaid={handleMarkPaid}
          isPending={isPending}
        />
      )}
      {upcoming.length > 0 && (
        <Section
          title="Sonraki dönem"
          subtitle="Vade 7 günden sonra"
          tone="muted"
          count={upcoming.length}
          items={upcoming}
          selected={selected}
          onToggle={toggleOne}
          onSelectAll={() => selectGroup(upcoming)}
          onMarkPaid={handleMarkPaid}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  tone,
  count,
  items,
  selected,
  onToggle,
  onSelectAll,
  onMarkPaid,
  isPending,
}: {
  title: string;
  subtitle: string;
  tone: 'danger' | 'warn' | 'muted';
  count: number;
  items: InvoiceRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onMarkPaid: (id: string) => void;
  isPending: boolean;
}) {
  const toneColor =
    tone === 'danger'
      ? 'var(--danger)'
      : tone === 'warn'
        ? 'var(--warn)'
        : 'var(--ink-3)';

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div
      className="bg-card border-2 rounded-[var(--r)] overflow-hidden"
      style={{
        borderColor:
          tone === 'danger'
            ? 'color-mix(in oklab, var(--danger) 30%, var(--line))'
            : tone === 'warn'
              ? 'color-mix(in oklab, var(--warn) 30%, var(--line))'
              : 'var(--line)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{
          background:
            tone === 'danger'
              ? 'color-mix(in oklab, var(--danger) 5%, transparent)'
              : tone === 'warn'
                ? 'color-mix(in oklab, var(--warn) 5%, transparent)'
                : 'var(--paper-2)',
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Pill tone={tone === 'muted' ? 'muted' : tone}>{count}</Pill>
            <h3
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 400,
                color: toneColor,
              }}
            >
              {title}
            </h3>
          </div>
          <div
            className="text-xs mt-1"
            style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
          >
            {subtitle} · Toplam ₺{totalAmount.toLocaleString('tr-TR')}
          </div>
        </div>
        <button
          onClick={onSelectAll}
          className="h-8 px-3 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-xs font-medium hover:border-line-2"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          Bu grubu seç
        </button>
      </div>

      <div>
        {items.map((inv) => (
          <PendingRow
            key={inv.id}
            inv={inv}
            selected={selected.has(inv.id)}
            onToggle={() => onToggle(inv.id)}
            onMarkPaid={() => onMarkPaid(inv.id)}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}

function PendingRow({
  inv,
  selected,
  onToggle,
  onMarkPaid,
  isPending,
}: {
  inv: InvoiceRow;
  selected: boolean;
  onToggle: () => void;
  onMarkPaid: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="grid items-center gap-3 p-4 border-t border-line first:border-t-0"
      style={{
        gridTemplateColumns: 'auto auto 1fr auto auto auto',
        background: selected ? 'var(--super-soft)' : undefined,
      }}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} />

      <LogoTile
        logo={inv.business_logo || '?'}
        tint="var(--super)"
        size={36}
      />

      <div className="min-w-0">
        <Link
          href={`/faturalar/${inv.id}`}
          className="font-semibold text-sm text-ink hover:text-super"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {inv.invoice_no}
        </Link>
        <div
          className="text-xs text-ink-3 truncate"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {inv.business_name || '—'}
          {inv.retry_count > 0 && (
            <span className="ml-2" style={{ color: 'var(--warn)' }}>
              · ⟳ {inv.retry_count} hatırlatma
            </span>
          )}
        </div>
      </div>

      <div className="text-right">
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink)',
          }}
        >
          ₺{inv.amount.toLocaleString('tr-TR')}
        </div>
      </div>

      <div className="text-right min-w-[80px]">
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color:
              inv.days_overdue > 0
                ? 'var(--danger)'
                : inv.due_soon
                  ? 'var(--warn)'
                  : 'var(--ink-3)',
            fontWeight: 600,
          }}
        >
          {formatDate(inv.due_at)}
        </div>
        {inv.days_overdue > 0 && (
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              color: 'var(--danger)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {inv.days_overdue}g
          </div>
        )}
      </div>

      <button
        onClick={onMarkPaid}
        disabled={isPending}
        className="h-8 px-3 rounded-[var(--r-sm)] text-card text-xs font-semibold disabled:opacity-50 hover:opacity-90"
        style={{ background: 'var(--ok)', fontFamily: 'var(--f-sans)' }}
      >
        ✓ Ödendi
      </button>
    </div>
  );
}
