'use client';

import { useState, useTransition } from 'react';
import {
  getOrderLogs,
  getAuditSummary,
  type OrderLogRow,
  type AuditSummaryRow,
  type AuditAction,
} from '@/lib/actions/audit-log';

const ACTION_LABELS: Record<AuditAction, { label: string; color: string; icon: string }> = {
  order_created: { label: 'Sipariş oluştu', color: 'var(--ink-2)', icon: '+' },
  order_status_changed: { label: 'Durum değişti', color: 'var(--ink-2)', icon: '↻' },
  item_added: { label: 'Kalem eklendi', color: 'var(--ok)', icon: '+' },
  item_removed: { label: 'Kalem silindi', color: 'var(--ink-3)', icon: '×' },
  item_quantity_changed: { label: 'Adet değişti', color: 'var(--ink-2)', icon: '#' },
  item_cancelled: { label: 'Kalem iptal', color: '#C4553A', icon: '×' },
  item_complimentary: { label: 'Kalem ikram', color: 'var(--gold, #B8903E)', icon: '★' },
  item_status_changed: { label: 'Kalem durum', color: 'var(--ink-2)', icon: '↻' },
  note_changed: { label: 'Not değişti', color: 'var(--ink-2)', icon: '✎' },
  discount_applied: { label: 'İndirim uygulandı', color: '#C4553A', icon: '−' },
  tip_applied: { label: 'Bahşiş eklendi', color: 'var(--gold, #B8903E)', icon: '+' },
  table_moved: { label: 'Masa taşındı', color: 'var(--ink-2)', icon: '→' },
  tables_merged: { label: 'Masalar birleşti', color: 'var(--ink-2)', icon: '⊕' },
  tables_split: { label: 'Masalar ayrıldı', color: 'var(--ink-2)', icon: '⊗' },
  order_cancelled: { label: 'Sipariş iptal', color: '#C4553A', icon: '×' },
  split_payment_started: { label: 'Bölmeli ödeme', color: 'var(--super)', icon: '⇄' },
};

function fmt(n: number): string {
  return `₺${n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type DateRange = 'today' | 'yesterday' | 'week' | 'custom';

export function AuditLogClient({
  initialLogs,
  initialSummary,
}: {
  initialLogs: OrderLogRow[];
  initialSummary: AuditSummaryRow[];
}) {
  const [logs, setLogs] = useState<OrderLogRow[]>(initialLogs);
  const [summary, setSummary] = useState<AuditSummaryRow[]>(initialSummary);
  const [range, setRange] = useState<DateRange>('today');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [isPending, startTransition] = useTransition();

  function reload(newRange: DateRange, newAction: AuditAction | 'all') {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    if (newRange === 'today') {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
    } else if (newRange === 'yesterday') {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59
      );
    } else {
      // week
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    startTransition(async () => {
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(newAction !== 'all' && { action: newAction }),
      };
      const [logsRes, sumRes] = await Promise.all([
        getOrderLogs({ ...params, limit: 500 }),
        getAuditSummary({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      ]);
      if (logsRes.success) setLogs(logsRes.logs || []);
      if (sumRes.success) setSummary(sumRes.rows || []);
    });
  }

  function handleRangeChange(r: DateRange) {
    setRange(r);
    reload(r, actionFilter);
  }

  function handleActionFilter(a: AuditAction | 'all') {
    setActionFilter(a);
    reload(range, a);
  }

  // Toplam istatistikler
  const totalCancellations = summary.reduce(
    (s, r) => s + r.cancellation_amount,
    0
  );
  const totalComplimentary = summary.reduce(
    (s, r) => s + r.complimentary_amount,
    0
  );
  const totalDiscount = summary.reduce((s, r) => s + r.discount_amount, 0);

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1400px] mx-auto pb-28">
      {/* HEADER */}
      <div className="mb-8">
        <div
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--accent)',
          }}
        >
          RAPORLAR · AUDIT LOG
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: 'var(--ink)',
          }}
        >
          İşlem Geçmişi
        </h1>
        <p
          className="text-base mt-2"
          style={{ color: 'var(--ink-2)', maxWidth: 720 }}
        >
          Sipariş, kalem, ikram, iptal ve bütün masa hareketleri burada
          izlenir. Hangi çalışan ne yaptı, ne zaman yaptı — tutanak gibi.
        </p>
      </div>

      {/* TARİH FİLTRELERİ */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['today', 'yesterday', 'week'] as DateRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleRangeChange(r)}
            disabled={isPending}
            className="h-9 px-4 rounded-[8px] text-xs font-bold transition-all"
            style={{
              background: range === r ? 'var(--ink)' : 'var(--card)',
              color: range === r ? 'var(--paper)' : 'var(--ink)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {r === 'today' ? 'Bugün' : r === 'yesterday' ? 'Dün' : 'Son 7 gün'}
          </button>
        ))}
        <span style={{ color: 'var(--ink-3)' }}>·</span>
        <select
          value={actionFilter}
          onChange={(e) => handleActionFilter(e.target.value as AuditAction | 'all')}
          disabled={isPending}
          className="h-9 px-3 rounded-[8px] text-xs"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontFamily: 'var(--f-mono)',
          }}
        >
          <option value="all">Tüm işlemler</option>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a].label}
            </option>
          ))}
        </select>
        {isPending && (
          <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
            Yükleniyor…
          </span>
        )}
      </div>

      {/* ÖZET KARTLAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <SummaryCard
          label="Toplam İptal"
          value={fmt(totalCancellations)}
          count={summary.reduce((s, r) => s + r.cancellations, 0)}
          color="#C4553A"
        />
        <SummaryCard
          label="Toplam İkram"
          value={fmt(totalComplimentary)}
          count={summary.reduce((s, r) => s + r.complimentaries, 0)}
          color="var(--gold, #B8903E)"
        />
        <SummaryCard
          label="Toplam İndirim"
          value={fmt(totalDiscount)}
          count={summary.reduce((s, r) => s + r.discounts, 0)}
          color="var(--accent)"
        />
      </div>

      {/* ÇALIŞAN BAZLI ÖZET */}
      {summary.length > 0 && (
        <div
          className="rounded-[var(--r)] mb-6 overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <div
            className="px-4 py-3"
            style={{
              borderBottom: '1px solid var(--line)',
              background: 'var(--paper-2)',
            }}
          >
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              ÇALIŞAN BAZLI ÖZET
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th
                    className="text-left py-3 px-4"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: 'var(--ink-3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Çalışan
                  </th>
                  <th
                    className="text-right py-3 px-4"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: 'var(--ink-3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    İptal (#/₺)
                  </th>
                  <th
                    className="text-right py-3 px-4"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: 'var(--ink-3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    İkram (#/₺)
                  </th>
                  <th
                    className="text-right py-3 px-4"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: 'var(--ink-3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    İndirim (#/₺)
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr
                    key={row.performed_by}
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold" style={{ color: 'var(--ink)' }}>
                        {row.performed_by_name || '— sistem —'}
                      </div>
                      {row.performed_by_role && (
                        <div
                          className="text-[10px] mt-0.5 uppercase"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            color: 'var(--ink-3)',
                            letterSpacing: '0.12em',
                          }}
                        >
                          {row.performed_by_role}
                        </div>
                      )}
                    </td>
                    <td
                      className="text-right py-3 px-4"
                      style={{ fontFamily: 'var(--f-mono)' }}
                    >
                      <span style={{ color: '#C4553A', fontWeight: 700 }}>
                        {row.cancellations}
                      </span>{' '}
                      <span style={{ color: 'var(--ink-3)' }}>·</span>{' '}
                      <span style={{ color: 'var(--ink-2)' }}>
                        {fmt(row.cancellation_amount)}
                      </span>
                    </td>
                    <td
                      className="text-right py-3 px-4"
                      style={{ fontFamily: 'var(--f-mono)' }}
                    >
                      <span
                        style={{
                          color: 'var(--gold, #B8903E)',
                          fontWeight: 700,
                        }}
                      >
                        {row.complimentaries}
                      </span>{' '}
                      <span style={{ color: 'var(--ink-3)' }}>·</span>{' '}
                      <span style={{ color: 'var(--ink-2)' }}>
                        {fmt(row.complimentary_amount)}
                      </span>
                    </td>
                    <td
                      className="text-right py-3 px-4"
                      style={{ fontFamily: 'var(--f-mono)' }}
                    >
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                        {row.discounts}
                      </span>{' '}
                      <span style={{ color: 'var(--ink-3)' }}>·</span>{' '}
                      <span style={{ color: 'var(--ink-2)' }}>
                        {fmt(row.discount_amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAYLI LOG LİSTESİ */}
      <div
        className="rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="px-4 py-3"
          style={{
            borderBottom: '1px solid var(--line)',
            background: 'var(--paper-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            DETAYLI İŞLEM LİSTESİ
          </div>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {logs.length} kayıt
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--ink-3)' }}>
            <div className="text-4xl mb-2 opacity-40">∅</div>
            <p
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
              }}
            >
              Bu aralıkta kayıt yok
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {logs.map((log) => {
              const cfg = ACTION_LABELS[log.action];
              const amount = Number(log.details.amount || 0);
              return (
                <div
                  key={log.id}
                  className="px-4 py-3 flex items-start gap-3"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 grid place-items-center w-8 h-8 rounded-[6px]"
                    style={{
                      background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                      color: cfg.color,
                      fontWeight: 700,
                    }}
                  >
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: 'var(--ink)' }}
                      >
                        {cfg.label}
                      </span>
                      {log.details.productName && (
                        <span
                          className="text-sm"
                          style={{ color: 'var(--ink-2)' }}
                        >
                          · {String(log.details.productName)}
                        </span>
                      )}
                      {log.details.quantity != null && (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          ×{String(log.details.quantity)}
                        </span>
                      )}
                      {amount > 0 && (
                        <span
                          className="text-sm"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            color: cfg.color,
                            fontWeight: 700,
                          }}
                        >
                          {fmt(amount)}
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-2 mt-0.5 text-xs"
                      style={{ color: 'var(--ink-3)' }}
                    >
                      <span>{log.performed_by_name || '— sistem —'}</span>
                      {log.performed_by_role && (
                        <>
                          <span>·</span>
                          <span
                            className="uppercase"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {log.performed_by_role}
                          </span>
                        </>
                      )}
                      {log.table_name && (
                        <>
                          <span>·</span>
                          <span>Masa {log.table_name}</span>
                        </>
                      )}
                      {log.details.reason ? (
                        <>
                          <span>·</span>
                          <span style={{ fontStyle: 'italic' }}>
                            &ldquo;{String(log.details.reason)}&rdquo;
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className="text-xs flex-shrink-0"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      color: 'var(--ink-3)',
                    }}
                  >
                    <div>{formatTime(log.performed_at)}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">
                      {formatDate(log.performed_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  count,
  color,
}: {
  label: string;
  value: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-4"
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
          letterSpacing: '0.16em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 26,
          fontWeight: 700,
          color: color,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
        {count} işlem
      </div>
    </div>
  );
}
