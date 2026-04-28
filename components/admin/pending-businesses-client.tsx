'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogoTile,
} from '@/components/admin/primitives';
import {
  approveBusiness,
  type BusinessListRow,
} from '@/lib/actions/admin-businesses';

function formatDateLong(ts: string): string {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRelative(ts: string): string {
  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 60) return `${diffMin}dk önce`;
  if (diffHr < 24) return `${diffHr}sa önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;
  return formatDateLong(ts);
}

export function PendingBusinessesClient({
  initialItems,
}: {
  initialItems: BusinessListRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const r = await approveBusiness(id);
      setBusyId(null);
      if (r.success) {
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  if (initialItems.length === 0) {
    return (
      <div className="bg-card border border-line rounded-[var(--r)] py-16 text-center">
        <div className="text-3xl mb-3" style={{ color: 'var(--ok)' }}>
          ✓
        </div>
        <div className="text-ink-2 text-sm">
          Onay bekleyen işletme yok — hepsi güncel.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {initialItems.map((b) => (
        <div
          key={b.id}
          className="bg-card border rounded-[var(--r)] p-5 grid items-center gap-4"
          style={{
            gridTemplateColumns: 'auto 1fr auto',
            borderColor: 'color-mix(in oklab, var(--gold) 30%, var(--line))',
          }}
        >
          <LogoTile logo={b.logo} tint="var(--gold)" size={48} />
          <div className="min-w-0">
            <Link
              href={`/isletmeler/${b.id}`}
              className="font-semibold text-base text-ink hover:text-super truncate block"
            >
              {b.name}
            </Link>
            <div
              className="flex items-center gap-3 mt-1 flex-wrap text-xs"
              style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}
            >
              <span>{b.slug}</span>
              {b.city && <span>· {b.city}</span>}
              {b.email && <span>· {b.email}</span>}
              <span>· Kayıt: {formatRelative(b.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/isletmeler/${b.id}`}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium hover:border-line-2"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              İncele
            </Link>
            <button
              onClick={() => handleApprove(b.id)}
              disabled={isPending && busyId === b.id}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ok)', fontFamily: 'var(--f-sans)' }}
            >
              {isPending && busyId === b.id ? 'Onaylanıyor…' : '✓ Onayla'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
