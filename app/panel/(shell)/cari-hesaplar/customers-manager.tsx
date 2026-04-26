'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import {
  listCustomers,
  createCustomer,
  type CustomerWithStats,
} from '@/lib/actions/customers';
import { CustomerFormModal } from './customer-form-modal';
import { CustomerDetailModal } from './customer-detail-modal';

const fmt = (n: number) =>
  `₺${Math.round(Math.abs(n)).toLocaleString('tr-TR')}`;

const formatDateShort = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 1000 / 3600;
  if (diffH < 24) {
    return d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffH < 24 * 7) {
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  }
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

type Filter = 'all' | 'debt' | 'zero';

type Props = {
  initialCustomers: CustomerWithStats[];
  initialTotalCount: number;
  error: string | null;
};

export function CustomersManager({
  initialCustomers,
  initialTotalCount,
  error,
}: Props) {
  const [customers, setCustomers] =
    useState<CustomerWithStats[]>(initialCustomers);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Filter / search değişince yenile
  const refetch = useCallback(async () => {
    setLoading(true);
    const r = await listCustomers({
      filter,
      search: search.trim() || undefined,
      limit: 100,
    });
    setLoading(false);
    if (!r.success) {
      toast.error(r.error || 'Liste alınamadı');
      return;
    }
    setCustomers(r.customers || []);
    setTotalCount(r.totalCount || 0);
  }, [filter, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      void refetch();
    }, 250);
    return () => clearTimeout(t);
  }, [filter, search, refetch]);

  const handleCreate = useCallback(
    async (input: {
      name: string;
      phone?: string;
      email?: string;
      note?: string;
    }) => {
      const r = await createCustomer(input);
      if (!r.success) {
        toast.error(r.error || 'Eklenemedi');
        return false;
      }
      toast.success('Kullanıcı eklendi');
      setFormOpen(false);
      await refetch();
      return true;
    },
    [refetch]
  );

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => c.balance < 0);
    const totalDebt = debtors.reduce((s, c) => s + Math.abs(c.balance), 0);
    return {
      debtorCount: debtors.length,
      totalDebt,
    };
  }, [customers]);

  if (error) {
    return (
      <div
        className="rounded-[12px] p-6 text-sm"
        style={{
          background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
        }}
      >
        Hata: {error}
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            CARİ HESAPLAR
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 36,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.025em',
              lineHeight: 1,
            }}
          >
            Kullanıcılar
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--ink-2)', maxWidth: 560 }}
          >
            Düzenli müşterilerin, çalışanlar veya kurumsal hesaplar. Açık hesap
            siparişleri ve ödeme geçmişi.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormOpen(true);
          }}
          className="h-11 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-95 active:scale-[0.98]"
          style={{
            background: 'var(--accent)',
            color: '#FAF5EA',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: 12,
            boxShadow:
              '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
          }}
        >
          + Yeni Kullanıcı
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          label="TOPLAM KULLANICI"
          value={totalCount.toString()}
          color="var(--ink)"
        />
        <StatCard
          label="BORÇLU"
          value={stats.debtorCount.toString()}
          subValue={stats.debtorCount > 0 ? `${fmt(stats.totalDebt)} toplam` : undefined}
          color={stats.debtorCount > 0 ? 'var(--accent)' : 'var(--ink)'}
        />
        <StatCard
          label="GÜNCEL"
          value={(totalCount - stats.debtorCount).toString()}
          color="var(--ok)"
        />
      </div>

      {/* FILTER + SEARCH */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Tümü
          </FilterChip>
          <FilterChip
            active={filter === 'debt'}
            onClick={() => setFilter('debt')}
            danger
          >
            Borçlu
          </FilterChip>
          <FilterChip
            active={filter === 'zero'}
            onClick={() => setFilter('zero')}
          >
            Sıfır Bakiye
          </FilterChip>
        </div>

        <div className="flex-1 min-w-[200px] max-w-[400px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim veya telefon ara…"
              className="w-full h-10 px-3 pr-9 rounded-[8px] text-sm"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
                style={{ color: 'var(--ink-3)', fontSize: 14 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div
          className="text-center py-12"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            color: 'var(--ink-3)',
          }}
        >
          Yükleniyor…
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          search={search}
          filter={filter}
          onAddClick={() => {
            setEditingId(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-2">
          {customers.map((c) => (
            <CustomerRow
              key={c.id}
              customer={c}
              onClick={() => setDetailId(c.id)}
            />
          ))}
        </div>
      )}

      {/* MODALS */}
      {formOpen && (
        <CustomerFormModal
          customerId={editingId}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreate}
          onUpdated={async () => {
            setFormOpen(false);
            await refetch();
          }}
        />
      )}

      {detailId && (
        <CustomerDetailModal
          customerId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={refetch}
          onEdit={() => {
            setEditingId(detailId);
            setDetailId(null);
            setFormOpen(true);
          }}
        />
      )}
    </>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 32,
          fontWeight: 500,
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subValue && (
        <div
          className="mt-1 text-xs"
          style={{
            fontFamily: 'var(--f-mono)',
            fontWeight: 600,
            color,
          }}
        >
          {subValue}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  danger,
  children,
}: {
  active: boolean;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const accent = danger ? 'var(--accent)' : 'var(--ink)';
  return (
    <button
      onClick={onClick}
      className="h-9 px-3.5 rounded-full transition-all active:scale-[0.97]"
      style={{
        background: active ? accent : 'var(--card)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        border: `1px solid ${active ? accent : 'var(--line)'}`,
        fontFamily: 'var(--f-mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  );
}

function CustomerRow({
  customer,
  onClick,
}: {
  customer: CustomerWithStats;
  onClick: () => void;
}) {
  const isDebtor = customer.balance < 0;
  const balance = Number(customer.balance);

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3.5 rounded-[10px] transition-all hover:opacity-95 active:scale-[0.998]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background: isDebtor
            ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
            : 'color-mix(in srgb, var(--ok) 10%, transparent)',
          color: isDebtor ? 'var(--accent)' : 'var(--ok)',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {customer.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {customer.name}
        </div>
        <div
          className="flex items-center gap-2 mt-0.5"
          style={{ fontSize: 12, color: 'var(--ink-3)' }}
        >
          {customer.phone && (
            <span style={{ fontFamily: 'var(--f-mono)' }}>
              📞 {customer.phone}
            </span>
          )}
          <span>·</span>
          <span>Son işlem: {formatDateShort(customer.last_transaction_at)}</span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        {isDebtor ? (
          <>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}
            >
              BORÇLU
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              {fmt(balance)}
            </div>
          </>
        ) : balance > 0 ? (
          <>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--ok)',
              }}
            >
              ALACAK
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--ok)',
              }}
            >
              +{fmt(balance)}
            </div>
          </>
        ) : (
          <div
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--ink-3)',
            }}
          >
            ✓ TEMİZ
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyState({
  search,
  filter,
  onAddClick,
}: {
  search: string;
  filter: Filter;
  onAddClick: () => void;
}) {
  if (search) {
    return (
      <div
        className="text-center py-12"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          color: 'var(--ink-3)',
        }}
      >
        &ldquo;{search}&rdquo; ile eşleşen kullanıcı bulunamadı
      </div>
    );
  }
  if (filter === 'debt') {
    return (
      <div
        className="text-center py-12 rounded-[12px]"
        style={{
          background: 'color-mix(in srgb, var(--ok) 5%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--ok) 25%, var(--line))',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            color: 'var(--ok)',
            marginBottom: 4,
          }}
        >
          ✓ Tüm hesaplar temiz
        </div>
        <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
          Borçlu kullanıcı bulunmuyor
        </div>
      </div>
    );
  }
  return (
    <div
      className="text-center py-16 rounded-[12px]"
      style={{
        background: 'var(--card)',
        border: '1px dashed var(--line)',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>📒</div>
      <h3
        style={{
          fontFamily: 'var(--f-serif)',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 4,
        }}
      >
        Henüz kullanıcı yok
      </h3>
      <p
        className="text-sm mb-5"
        style={{ color: 'var(--ink-2)', maxWidth: 400, margin: '0 auto 20px' }}
      >
        Düzenli müşterilerini, çalışanlarını veya kurumsal hesaplarını ekle.
        Açık hesap akışında bunları seçebilirsin.
      </p>
      <button
        onClick={onAddClick}
        className="h-10 px-5 rounded-[8px] text-sm font-semibold"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        + İlk Kullanıcıyı Ekle
      </button>
    </div>
  );
}
