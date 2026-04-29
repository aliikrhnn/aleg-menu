'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eyebrow,
  SerifTitle,
  Pill,
  LogoTile,
} from '@/components/admin/primitives';
import {
  markInvoicePaid,
  cancelInvoice,
  recordManualPayment,
  type InvoiceRow,
  type PaymentRow,
} from '@/lib/actions/admin-billing';
import {
  STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/components/admin/invoices-list-client';

type Props = {
  invoice: InvoiceRow;
  payments: PaymentRow[];
};

function formatDateLong(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) +
    ' ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function InvoiceDetailClient({ invoice: inv, payments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState<null | 'paid' | 'cancel' | 'payment'>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [paidMethod, setPaidMethod] = useState('manual');

  const status = STATUS_LABELS[inv.status] || {
    label: inv.status,
    tone: 'muted' as const,
  };

  const totalPaid = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + p.amount, 0);

  const remaining = Math.max(0, inv.amount - totalPaid);

  const handleMarkPaid = () => {
    startTransition(async () => {
      const r = await markInvoicePaid(inv.id, paidMethod);
      if (r.success) {
        alert('Fatura ödendi olarak işaretlendi');
        setConfirmOpen(null);
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const r = await cancelInvoice(inv.id, cancelReason || undefined);
      if (r.success) {
        alert('Fatura iptal edildi');
        setConfirmOpen(null);
        setCancelReason('');
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto grid gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/faturalar"
          className="text-ink-3 hover:text-super"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          ← FATURALAR
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card border border-line rounded-[var(--r)] p-6">
        <div className="flex items-start gap-5 mb-5 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <Eyebrow>FATURA · {inv.invoice_no}</Eyebrow>
            <SerifTitle size={36} className="mt-2">
              ₺{inv.amount.toLocaleString('tr-TR')}
            </SerifTitle>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Pill tone={status.tone}>{status.label}</Pill>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.04em',
                }}
              >
                {formatDateLong(inv.period_start)} → {formatDateLong(inv.period_end)}
              </span>
              {inv.days_overdue > 0 && (
                <Pill tone="danger">{inv.days_overdue} GÜN GECİKMİŞ</Pill>
              )}
              {inv.due_soon && <Pill tone="warn">VADE YAKLAŞIYOR</Pill>}
              {inv.retry_count > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    color: 'var(--warn)',
                  }}
                >
                  ⟳ {inv.retry_count} hatırlatma
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {inv.status === 'pending' || inv.status === 'failed' ? (
              <>
                <button
                  onClick={() => setConfirmOpen('paid')}
                  disabled={isPending}
                  className="h-9 px-4 rounded-[var(--r-sm)] text-card font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--ok)', fontFamily: 'var(--f-sans)' }}
                >
                  ✓ Ödendi işaretle
                </button>
                <button
                  onClick={() => setConfirmOpen('payment')}
                  disabled={isPending}
                  className="h-9 px-4 rounded-[var(--r-sm)] border border-super text-super font-semibold text-sm hover:bg-super-soft disabled:opacity-50"
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  + Ödeme kaydı
                </button>
                <button
                  onClick={() => setConfirmOpen('cancel')}
                  disabled={isPending}
                  className="h-9 px-4 rounded-[var(--r-sm)] border text-sm font-semibold disabled:opacity-50"
                  style={{
                    fontFamily: 'var(--f-sans)',
                    borderColor: 'var(--warn)',
                    color: 'var(--warn)',
                  }}
                >
                  İptal et
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* 4-metric */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-line">
          <Metric
            label="VADE TARİHİ"
            value={formatDateLong(inv.due_at)}
            tone={
              inv.days_overdue > 0
                ? 'var(--danger)'
                : inv.due_soon
                  ? 'var(--warn)'
                  : 'var(--ink)'
            }
          />
          <Metric
            label="ÖDEME TARİHİ"
            value={formatDateLong(inv.paid_at)}
            tone={inv.paid_at ? 'var(--ok)' : 'var(--ink-3)'}
          />
          <Metric label="YÖNTEM" value={
            inv.payment_method ? PAYMENT_METHOD_LABELS[inv.payment_method] || inv.payment_method : '—'
          } />
          <Metric label="OLUŞTURMA" value={formatDateLong(inv.created_at)} />
        </div>
      </div>

      {/* İşletme + Ödeme özeti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* İşletme */}
        <div className="bg-card border border-line rounded-[var(--r)] p-5">
          <Eyebrow>İŞLETME</Eyebrow>
          {inv.business_id ? (
            <Link
              href={`/isletmeler/${inv.business_id}`}
              className="flex items-center gap-3 mt-3 group"
            >
              <LogoTile
                logo={inv.business_logo || '?'}
                tint="var(--super)"
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-base text-ink truncate group-hover:text-super">
                  {inv.business_name || '—'}
                </div>
                <div
                  className="text-xs text-ink-3 truncate"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {inv.business_slug}
                </div>
              </div>
              <span
                className="text-ink-3 group-hover:text-super"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                →
              </span>
            </Link>
          ) : (
            <div className="text-sm text-ink-3 mt-3">İşletme bağlantısı yok</div>
          )}
        </div>

        {/* Tahsilat özeti */}
        <div className="bg-card border border-line rounded-[var(--r)] p-5">
          <Eyebrow>TAHSİLAT ÖZETİ</Eyebrow>
          <div className="grid gap-2 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-2">Fatura tutarı</span>
              <span
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                }}
              >
                ₺{inv.amount.toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-2">Tahsil edilen</span>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 16,
                  color: 'var(--ok)',
                  fontWeight: 600,
                }}
              >
                ₺{totalPaid.toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <span className="text-sm text-ink-2">Kalan</span>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 18,
                  color: remaining > 0 ? 'var(--warn)' : 'var(--ink-3)',
                  fontWeight: 700,
                }}
              >
                ₺{remaining.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notlar */}
      {inv.notes && (
        <div className="bg-card border border-line rounded-[var(--r)] p-5">
          <Eyebrow>NOTLAR</Eyebrow>
          <div className="mt-2 text-sm text-ink-2 whitespace-pre-wrap">{inv.notes}</div>
        </div>
      )}

      {/* Ödemeler */}
      <div className="bg-card border border-line rounded-[var(--r)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Eyebrow>ÖDEME HAREKETLERİ</Eyebrow>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 20,
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              {payments.length === 0 ? 'Henüz ödeme yok' : `${payments.length} hareket`}
            </div>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="py-8 text-center text-ink-3 text-sm">
            Bu faturaya bağlı ödeme kaydı yok.
          </div>
        ) : (
          <div className="grid gap-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="grid items-center gap-3 p-3 rounded-[var(--r-sm)] border border-line"
                style={{ gridTemplateColumns: 'auto 1fr auto auto' }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      p.status === 'succeeded'
                        ? 'var(--ok)'
                        : p.status === 'failed'
                          ? 'var(--danger)'
                          : p.status === 'refunded'
                            ? 'var(--warn)'
                            : 'var(--ink-3)',
                  }}
                />
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold"
                    style={{ fontFamily: 'var(--f-mono)' }}
                  >
                    {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
                    {p.transaction_id && (
                      <span className="ml-2 text-ink-3 text-xs">
                        TX: {p.transaction_id}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {formatDateTime(p.paid_at)}
                    {p.recorded_by_email && ` · ${p.recorded_by_email}`}
                  </div>
                  {p.notes && (
                    <div className="text-xs text-ink-2 mt-1 italic">
                      {p.notes}
                    </div>
                  )}
                </div>
                <Pill
                  tone={
                    p.status === 'succeeded'
                      ? 'ok'
                      : p.status === 'failed'
                        ? 'danger'
                        : 'muted'
                  }
                >
                  {p.status.toUpperCase()}
                </Pill>
                <span
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: p.status === 'succeeded' ? 'var(--ink)' : 'var(--ink-3)',
                  }}
                >
                  ₺{p.amount.toLocaleString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmOpen === 'paid' && (
        <Modal onClose={() => setConfirmOpen(null)} title="Ödendi İşaretle">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{inv.invoice_no}</strong> faturasını ödendi olarak işaretle ve
            otomatik bir <strong>₺{inv.amount.toLocaleString('tr-TR')}</strong> ödeme
            kaydı oluştur.
          </p>
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
            Ödeme yöntemi
          </label>
          <select
            value={paidMethod}
            onChange={(e) => setPaidMethod(e.target.value)}
            className="w-full h-10 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="manual">Manuel</option>
            <option value="bank_transfer">Havale</option>
            <option value="card">Kart</option>
            <option value="cash">Nakit</option>
            <option value="other">Diğer</option>
          </select>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setConfirmOpen(null)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handleMarkPaid}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ok)', fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'Ödendi işaretle'}
            </button>
          </div>
        </Modal>
      )}

      {confirmOpen === 'cancel' && (
        <Modal onClose={() => setConfirmOpen(null)} title="Faturayı İptal Et">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{inv.invoice_no}</strong> iptal edilecek. Sebep yazabilirsin
            (notlara eklenir).
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="İptal sebebi (opsiyonel)…"
            rows={3}
            className="w-full p-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm resize-none focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => {
                setConfirmOpen(null);
                setCancelReason('');
              }}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--warn)', fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'İptal et'}
            </button>
          </div>
        </Modal>
      )}

      {confirmOpen === 'payment' && (
        <ManualPaymentModal
          invoice={inv}
          remaining={remaining}
          onClose={() => setConfirmOpen(null)}
          onSuccess={() => {
            setConfirmOpen(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ManualPaymentModal({
  invoice,
  remaining,
  onClose,
  onSuccess,
}: {
  invoice: InvoiceRow;
  remaining: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    amount: remaining.toString(),
    paymentMethod: 'bank_transfer',
    paidAt: new Date().toISOString().slice(0, 10),
    transactionId: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const r = await recordManualPayment({
      invoiceId: invoice.id,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      paidAt: new Date(form.paidAt).toISOString(),
      transactionId: form.transactionId || undefined,
      notes: form.notes || undefined,
    });
    setSubmitting(false);
    if (r.success) onSuccess();
    else setError(r.error || 'Hata');
  };

  return (
    <Modal onClose={onClose} title="Ödeme Kaydet">
      <p className="text-ink-2 text-sm mb-4">
        <strong>{invoice.invoice_no}</strong> için manuel ödeme kaydı oluştur.
      </p>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tutar (₺) *</Label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </div>
          <div>
            <Label>Tarih *</Label>
            <input
              type="date"
              value={form.paidAt}
              onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
              className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
              style={{ fontFamily: 'var(--f-mono)' }}
            />
          </div>
        </div>

        <div>
          <Label>Yöntem *</Label>
          <select
            value={form.paymentMethod}
            onChange={(e) =>
              setForm((f) => ({ ...f, paymentMethod: e.target.value }))
            }
            className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <option value="bank_transfer">Havale</option>
            <option value="card">Kart</option>
            <option value="cash">Nakit</option>
            <option value="manual">Manuel</option>
            <option value="other">Diğer</option>
          </select>
        </div>

        <div>
          <Label>İşlem ID</Label>
          <input
            type="text"
            value={form.transactionId}
            onChange={(e) =>
              setForm((f) => ({ ...f, transactionId: e.target.value }))
            }
            placeholder="opsiyonel"
            className="w-full h-10 px-3 mt-1.5 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-mono)' }}
          />
        </div>

        <div>
          <Label>Not</Label>
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
          disabled={submitting || !form.amount}
          className="h-10 px-5 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          {submitting ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div
        className="mt-1 truncate"
        style={{
          color: tone || 'var(--ink)',
          fontSize: 14,
          fontFamily: 'var(--f-sans)',
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}

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
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-line rounded-[var(--r)] p-6 max-w-md w-full my-12"
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
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
