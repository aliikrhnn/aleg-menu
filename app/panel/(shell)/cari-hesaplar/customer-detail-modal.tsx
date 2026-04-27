'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getCustomer,
  deactivateCustomer,
  addManualCharge,
  addManualCredit,
  recordCustomerPayment,
  getCustomerTransactions,
  type Customer,
  type CustomerTransaction,
} from '@/lib/actions/customers';

const fmt = (n: number) =>
  `₺${Math.round(Math.abs(n)).toLocaleString('tr-TR')}`;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 1000 / 3600;
  if (diffH < 1) return 'Az önce';
  if (diffH < 24) {
    return d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffH < 24 * 7) {
    const days = Math.floor(diffH / 24);
    return `${days} gün önce`;
  }
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

type Props = {
  customerId: string;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
};

type ActionMode = null | 'payment' | 'manual_charge' | 'manual_credit';

type DateFilter = 'all' | 'week' | 'month' | 'year';

function computeDateRange(
  filter: DateFilter
): { from?: string; to?: string } {
  if (filter === 'all') return {};
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);
  if (filter === 'week') from.setDate(now.getDate() - 7);
  else if (filter === 'month') from.setMonth(now.getMonth() - 1);
  else if (filter === 'year') from.setFullYear(now.getFullYear() - 1);
  return { from: from.toISOString(), to };
}

export function CustomerDetailModal({
  customerId,
  onClose,
  onChanged,
  onEdit,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [filterLoading, setFilterLoading] = useState(false);

  // ESC tuşu ile kapama (sadece iç action modal kapalıyken)
  useEscapeKey(onClose, !actionMode);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getCustomer(customerId);
    setLoading(false);
    if (!r.success || !r.customer) {
      toast.error(r.error || 'Yüklenemedi');
      onClose();
      return;
    }
    setCustomer(r.customer);
    setTransactions(r.recentTransactions || []);
  }, [customerId, onClose]);

  // Tarih filtresi değişince hareketleri yeniden yükle
  const reloadTransactions = useCallback(
    async (filter: DateFilter) => {
      setFilterLoading(true);
      const range = computeDateRange(filter);
      const r = await getCustomerTransactions({
        customerId,
        limit: 200,
        fromDate: range.from,
        toDate: range.to,
      });
      setFilterLoading(false);
      if (!r.success) {
        toast.error(r.error || 'Hareketler alınamadı');
        return;
      }
      setTransactions(r.transactions || []);
    },
    [customerId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Filter değişimi
  useEffect(() => {
    if (loading) return; // ilk yükleme bittikten sonra
    void reloadTransactions(dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Kullanıcıyı pasifleştir?',
      body: `${customer?.name} pasif duruma alınacak. Geçmiş hareketler korunur ama listede görünmez.`,
      confirmLabel: 'Pasifleştir',
      cancelLabel: 'Vazgeç',
    });
    if (!ok) return;
    const r = await deactivateCustomer(customerId);
    if (!r.success) {
      toast.error(r.error || 'Hata');
      return;
    }
    toast.success('Pasifleştirildi');
    onChanged();
    onClose();
  };

  const refresh = async () => {
    setActionMode(null);
    await load();
    onChanged();
  };

  if (loading || !customer) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      >
        <div
          className="rounded-[12px] px-8 py-6"
          style={{
            background: 'var(--paper)',
            color: 'var(--ink-3)',
            fontStyle: 'italic',
          }}
        >
          Yükleniyor…
        </div>
      </div>
    );
  }

  const balance = Number(customer.balance);
  const isDebtor = balance < 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.65)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[700px] rounded-[14px] flex flex-col overflow-hidden aleg-modal-mobile-fullscreen aleg-modal-content"
        style={{
          background: 'var(--card)',
          boxShadow: '0 24px 80px -20px rgba(0,0,0,0.5)',
        }}
      >
        {/* HEADER */}
        <div
          className="px-6 py-4 flex items-start justify-between gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: isDebtor
                  ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                  : 'color-mix(in srgb, var(--ok) 10%, transparent)',
                color: isDebtor ? 'var(--accent)' : 'var(--ok)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2
                className="truncate"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.1,
                }}
              >
                {customer.name}
              </h2>
              <div
                className="flex items-center gap-2 mt-0.5 text-xs"
                style={{ color: 'var(--ink-3)' }}
              >
                {customer.phone && (
                  <span style={{ fontFamily: 'var(--f-mono)' }}>
                    📞 {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <>
                    <span>·</span>
                    <span>{customer.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--ink-2)' }}
          >
            ✕
          </button>
        </div>

        {/* BALANCE CARD + ACTIONS */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{
            background: isDebtor
              ? 'color-mix(in srgb, var(--accent) 5%, var(--paper-2))'
              : 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
            <div>
              <div
                className="uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: isDebtor ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {balance < 0
                  ? 'BORÇ'
                  : balance > 0
                    ? 'ALACAK (AVANS)'
                    : 'BAKİYE'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 40,
                  fontWeight: 500,
                  color: isDebtor
                    ? 'var(--accent)'
                    : balance > 0
                      ? 'var(--ok)'
                      : 'var(--ink)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                }}
              >
                {balance === 0 ? '✓' : fmt(balance)}
              </div>
            </div>

            <div
              className="text-right text-xs"
              style={{ color: 'var(--ink-3)' }}
            >
              <div>
                Toplam ciro:{' '}
                <span
                  style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}
                >
                  {fmt(customer.total_charged)}
                </span>
              </div>
              <div>
                Toplam ödeme:{' '}
                <span
                  style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}
                >
                  {fmt(customer.total_paid)}
                </span>
              </div>
              <div>
                Hareket:{' '}
                <span
                  style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}
                >
                  {customer.transaction_count}
                </span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ActionBtn
              icon="💵"
              label="Ödeme Al"
              onClick={() => setActionMode('payment')}
              primary
            />
            <ActionBtn
              icon="📝"
              label="Manuel Borç"
              onClick={() => setActionMode('manual_charge')}
            />
            <ActionBtn
              icon="🎁"
              label="Manuel Alacak"
              onClick={() => setActionMode('manual_credit')}
            />
            <ActionBtn
              icon="✏️"
              label="Düzenle"
              onClick={onEdit}
            />
          </div>

          {customer.note && (
            <div
              className="mt-3 p-3 rounded-[8px] text-xs"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              📌 {customer.note}
            </div>
          )}
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-2)',
              }}
            >
              HAREKETLER ({transactions.length})
            </div>
            <button
              onClick={() => downloadCsv(customer, transactions)}
              disabled={transactions.length === 0}
              className="text-xs px-2 py-1 rounded disabled:opacity-40"
              style={{
                fontFamily: 'var(--f-mono)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--ink-2)',
                textTransform: 'uppercase',
              }}
              title="Hareketleri CSV olarak indir"
            >
              📥 CSV İndir
            </button>
          </div>

          {/* Tarih filter chips */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {(['all', 'week', 'month', 'year'] as DateFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className="h-7 px-3 rounded-full text-xs transition-all active:scale-[0.97]"
                style={{
                  background: dateFilter === f ? 'var(--ink)' : 'var(--card)',
                  color: dateFilter === f ? 'var(--paper)' : 'var(--ink-2)',
                  border: `1px solid ${dateFilter === f ? 'var(--ink)' : 'var(--line)'}`,
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {f === 'all'
                  ? 'Tümü'
                  : f === 'week'
                    ? 'Son 7 Gün'
                    : f === 'month'
                      ? 'Son 30 Gün'
                      : 'Son 1 Yıl'}
              </button>
            ))}
          </div>

          {filterLoading ? (
            <div
              className="text-center py-12"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                color: 'var(--ink-3)',
              }}
            >
              Filtreleniyor…
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="📒"
              title={
                dateFilter === 'all'
                  ? 'Henüz hareket yok'
                  : 'Bu aralıkta hareket yok'
              }
              description={
                dateFilter === 'all'
                  ? 'Sipariş açık hesaba yazıldığında veya manuel kayıt eklendiğinde burada görünecek'
                  : 'Farklı bir tarih aralığı seçmeyi deneyin'
              }
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="px-6 py-3 flex items-center justify-between gap-2 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={handleDelete}
            className="text-xs"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            🗑 Pasifleştir
          </button>
          <div
            className="text-xs"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            Eklenme: {formatDateTime(customer.created_at)}
          </div>
        </div>

        {/* ACTION MODAL */}
        {actionMode && (
          <ActionModal
            mode={actionMode}
            customerId={customerId}
            customerName={customer.name}
            currentBalance={balance}
            onClose={() => setActionMode(null)}
            onDone={refresh}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ACTION BUTTON
// ============================================================
function ActionBtn({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="h-12 rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.97]"
      style={{
        background: primary ? 'var(--accent)' : 'var(--paper)',
        color: primary ? '#FAF5EA' : 'var(--ink-2)',
        border: `1.5px solid ${primary ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ============================================================
// TRANSACTION ROW
// ============================================================
function TransactionRow({ tx }: { tx: CustomerTransaction }) {
  const isCharge = tx.type === 'charge' || tx.type === 'manual_charge';
  const sign = isCharge ? '+' : '−';
  const color = isCharge ? 'var(--accent)' : 'var(--ok)';

  let typeLabel = '';
  let icon = '';
  switch (tx.type) {
    case 'charge':
      typeLabel = 'Sipariş';
      icon = '🍽';
      break;
    case 'payment':
      typeLabel = `Ödeme (${methodLabel(tx.payment_method)})`;
      icon = '💵';
      break;
    case 'manual_charge':
      typeLabel = 'Manuel Borç';
      icon = '📝';
      break;
    case 'manual_credit':
      typeLabel = 'Manuel Alacak';
      icon = '🎁';
      break;
  }

  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ fontSize: 18, lineHeight: 1.2 }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--ink)',
              }}
            >
              {typeLabel}
            </span>
            {tx.order_info && (
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'color-mix(in srgb, var(--ink) 6%, transparent)',
                  color: 'var(--ink-2)',
                }}
              >
                #{tx.order_info.order_no}
              </span>
            )}
            {tx.order_info?.table_name && (
              <span
                className="text-xs"
                style={{ color: 'var(--ink-3)' }}
              >
                Masa {tx.order_info.table_name}
              </span>
            )}
          </div>

          {tx.order_info && tx.order_info.items.length > 0 && (
            <div
              className="mt-1 text-xs"
              style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}
            >
              {tx.order_info.items
                .map((it) => `${it.quantity}× ${it.product_name}`)
                .join(', ')}
            </div>
          )}

          {tx.note && (
            <div
              className="mt-1 text-xs"
              style={{
                color: 'var(--ink-3)',
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              &ldquo;{tx.note}&rdquo;
            </div>
          )}

          <div
            className="mt-1.5 flex items-center gap-2 text-xs"
            style={{ color: 'var(--ink-3)' }}
          >
            <span title={formatDateTime(tx.created_at)}>
              {formatRelative(tx.created_at)}
            </span>
            {tx.cashier_name && (
              <>
                <span>·</span>
                <span>{tx.cashier_name}</span>
              </>
            )}
          </div>
        </div>

        <div
          className="flex-shrink-0 text-right"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 16,
            fontWeight: 700,
            color,
          }}
        >
          {sign}
          {fmt(tx.amount)}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CSV DOWNLOAD
// ============================================================
function downloadCsv(
  customer: Customer | null,
  transactions: CustomerTransaction[]
) {
  if (!customer || transactions.length === 0) return;

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headers = [
    'Tarih',
    'Saat',
    'Tip',
    'Tutar',
    'Yon',
    'Yontem',
    'Siparis No',
    'Masa',
    'Urunler',
    'Kasiyer',
    'Not',
  ];

  const rows = transactions.map((tx) => {
    const d = new Date(tx.created_at);
    const date = d.toLocaleDateString('tr-TR');
    const time = d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const isCharge = tx.type === 'charge' || tx.type === 'manual_charge';
    let tipLabel = '';
    switch (tx.type) {
      case 'charge':
        tipLabel = 'Siparis';
        break;
      case 'payment':
        tipLabel = 'Odeme';
        break;
      case 'manual_charge':
        tipLabel = 'Manuel Borc';
        break;
      case 'manual_credit':
        tipLabel = 'Manuel Alacak';
        break;
    }
    const items = tx.order_info?.items
      ? tx.order_info.items
          .map((it) => `${it.quantity}x ${it.product_name}`)
          .join('; ')
      : '';
    return [
      date,
      time,
      tipLabel,
      tx.amount.toFixed(2),
      isCharge ? '+' : '-',
      tx.payment_method
        ? tx.payment_method === 'cash'
          ? 'Nakit'
          : tx.payment_method === 'card'
            ? 'Kart'
            : tx.payment_method === 'transfer'
              ? 'Havale'
              : tx.payment_method
        : '',
      tx.order_info?.order_no || '',
      tx.order_info?.table_name || '',
      items,
      tx.cashier_name || '',
      tx.note || '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  // BOM + Headers + Rows
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  link.download = `cari_${safeName}_${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function methodLabel(m: string | null): string {
  switch (m) {
    case 'cash':
      return 'Nakit';
    case 'card':
      return 'Kart';
    case 'transfer':
      return 'Havale';
    case 'online':
      return 'Online';
    default:
      return 'Diğer';
  }
}

// ============================================================
// ACTION MODAL — Ödeme alma / Manuel borç / Manuel alacak
// ============================================================
function ActionModal({
  mode,
  customerId,
  customerName,
  currentBalance,
  onClose,
  onDone,
}: {
  mode: 'payment' | 'manual_charge' | 'manual_credit';
  customerId: string;
  customerName: string;
  currentBalance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'card' | 'transfer'
  >('cash');
  // Manuel alacak için 3 tip
  const [creditType, setCreditType] = useState<'cash' | 'card' | 'adjustment'>(
    'cash'
  );
  const [submitting, setSubmitting] = useState(false);

  const amt = parseFloat(amount) || 0;
  const debt = Math.abs(Math.min(0, currentBalance));

  const titles = {
    payment: 'Ödeme Al',
    manual_charge: 'Manuel Borç Ekle',
    manual_credit: 'Manuel Alacak Ekle',
  };
  const subtitles = {
    payment: `${customerName}'den ödeme al (kasaya yazılır)`,
    manual_charge: `${customerName}'in hesabına borç ekle (kasaya yansır)`,
    manual_credit: `${customerName}'in hesabına alacak ekle`,
  };
  const colors = {
    payment: 'var(--ok)',
    manual_charge: 'var(--accent)',
    manual_credit: 'var(--super)',
  };

  const handleSubmit = async () => {
    if (amt <= 0) {
      toast.error('Geçerli bir tutar gir');
      return;
    }
    setSubmitting(true);
    let result: { success: boolean; error?: string };
    if (mode === 'payment') {
      result = await recordCustomerPayment({
        customerId,
        amount: amt,
        paymentMethod,
        note: note.trim() || undefined,
      });
    } else if (mode === 'manual_charge') {
      result = await addManualCharge({
        customerId,
        amount: amt,
        note: note.trim() || undefined,
      });
    } else {
      result = await addManualCredit({
        customerId,
        amount: amt,
        creditType,
        note: note.trim() || undefined,
      });
    }
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error || 'Hata');
      return;
    }
    toast.success(
      mode === 'payment' ? 'Ödeme alındı' : 'Hareket eklendi'
    );
    onDone();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-[14px] flex flex-col overflow-hidden"
        style={{
          background: 'var(--paper)',
          maxHeight: '90vh',
        }}
      >
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: colors[mode],
            }}
          >
            {titles[mode]}
          </div>
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              color: 'var(--ink)',
            }}
          >
            {subtitles[mode]}
          </h3>
          {mode === 'payment' && debt > 0 && (
            <div
              className="mt-2 text-sm"
              style={{
                color: 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
              }}
            >
              Mevcut borç:{' '}
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                {fmt(debt)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tutar */}
          <div>
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-2)',
              }}
            >
              TUTAR (₺)
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full h-14 px-3 rounded-[8px]"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
                fontFamily: 'var(--f-mono)',
                fontSize: 24,
                fontWeight: 700,
              }}
            />
            {mode === 'payment' && debt > 0 && (
              <button
                onClick={() => setAmount(debt.toString())}
                className="mt-2 text-xs"
                style={{
                  color: 'var(--accent)',
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Tüm borcu öde ({fmt(debt)})
              </button>
            )}
          </div>

          {/* Yöntem (sadece ödeme için) */}
          {mode === 'payment' && (
            <div>
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-2)',
                }}
              >
                YÖNTEM
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <MethodBtn
                  active={paymentMethod === 'cash'}
                  onClick={() => setPaymentMethod('cash')}
                  icon="💵"
                  label="Nakit"
                />
                <MethodBtn
                  active={paymentMethod === 'card'}
                  onClick={() => setPaymentMethod('card')}
                  icon="💳"
                  label="Kart"
                />
                <MethodBtn
                  active={paymentMethod === 'transfer'}
                  onClick={() => setPaymentMethod('transfer')}
                  icon="↗"
                  label="Havale"
                />
              </div>
              <div
                className="mt-2 text-xs flex items-start gap-2"
                style={{
                  color: 'var(--ink-3)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                <span>ℹ️</span>
                <span>
                  Ödeme bugünün kasa oturumuna işlenir → gün sonu raporunda
                  görünür.
                </span>
              </div>
            </div>
          )}

          {/* Manuel Alacak - 3 tip seçimi */}
          {mode === 'manual_credit' && (
            <div>
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-2)',
                }}
              >
                ALACAK TİPİ
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <MethodBtn
                  active={creditType === 'cash'}
                  onClick={() => setCreditType('cash')}
                  icon="💵"
                  label="Nakit"
                />
                <MethodBtn
                  active={creditType === 'card'}
                  onClick={() => setCreditType('card')}
                  icon="💳"
                  label="Kart"
                />
                <MethodBtn
                  active={creditType === 'adjustment'}
                  onClick={() => setCreditType('adjustment')}
                  icon="📝"
                  label="Düzeltme"
                />
              </div>
              <div
                className="mt-2 text-xs flex items-start gap-2"
                style={{
                  color: 'var(--ink-3)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                <span>ℹ️</span>
                <span>
                  {creditType === 'cash' &&
                    'Avans olarak nakit alındı → kasaya nakit girişi olarak yazılır.'}
                  {creditType === 'card' &&
                    'Avans olarak kart ödemesi alındı → kasaya kart girişi olarak yazılır.'}
                  {creditType === 'adjustment' &&
                    'Düzeltme/iade — sadece bakiyeyi düzeltir, kasaya yazılmaz.'}
                </span>
              </div>
            </div>
          )}

          {/* Manuel Borç - kasa uyarısı */}
          {mode === 'manual_charge' && (
            <div
              className="rounded-[8px] p-3 text-xs flex items-start gap-2"
              style={{
                background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                border:
                  '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
                color: 'var(--ink-2)',
                lineHeight: 1.5,
              }}
            >
              <span>⚠️</span>
              <span>
                Manuel borç bugünün kasa oturumuna kayıt yapılır. Kasa
                kapalıysa önce bir kasiyer kasayı açmalı.
              </span>
            </div>
          )}

          {/* Not */}
          <div>
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-2)',
              }}
            >
              NOT (opsiyonel)
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === 'payment'
                  ? 'örn: Aralık ödemesi'
                  : mode === 'manual_charge'
                    ? 'örn: Eksik ödeme'
                    : 'örn: İade, avans'
              }
              className="w-full h-10 px-3 rounded-[8px] text-sm"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div
          className="px-5 py-4 flex gap-2 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || amt <= 0}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold disabled:opacity-40"
            style={{
              background: colors[mode],
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {submitting ? 'İşleniyor…' : 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MethodBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 rounded-[10px] flex flex-col items-center justify-center gap-0.5"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))'
          : 'var(--card)',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
        color: active ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </button>
  );
}
