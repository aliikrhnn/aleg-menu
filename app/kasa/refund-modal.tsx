'use client';

import { useState, useTransition } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { recordManualRefund } from '@/lib/actions/payments';
import { toast } from '@/components/ui/toast';

/**
 * RefundModal — Kasada "İade Yap" butonuna basıldığında açılır.
 *
 * Akış:
 *   1. Kasiyer tutar girer (₺)
 *   2. Yöntem seçer (Nakit / Kart)
 *   3. Sebep yazar (zorunlu)
 *   4. Onayla
 *   5. payment_logs'a refund kaydı düşer (negatif)
 *   6. Kasa raporu otomatik yenilenir (Paket 1 sayesinde doğru düşer)
 */

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function RefundModal({ onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  useEscapeKey(onClose, !isPending);

  const numericAmount = Number(amount);
  const isAmountValid = !isNaN(numericAmount) && numericAmount > 0;
  const isReasonValid = reason.trim().length >= 3;
  const canSubmit = isAmountValid && isReasonValid;

  const handleNext = () => {
    setError(null);

    if (!isAmountValid) {
      setError('Geçerli bir tutar girin (örn. 50)');
      return;
    }
    if (numericAmount > 100000) {
      setError('Tutar çok büyük (max ₺100.000)');
      return;
    }
    if (!isReasonValid) {
      setError('İade sebebi zorunlu (en az 3 karakter)');
      return;
    }

    setStep('confirm');
  };

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await recordManualRefund({
        amount: numericAmount,
        method,
        reason: reason.trim(),
      });

      if (!result.success) {
        setError(result.error || 'İade kaydedilemedi');
        setStep('form');
        return;
      }

      toast.success(
        `${method === 'cash' ? 'Nakit' : 'Kart'} iade kaydedildi: ${money(numericAmount)}`,
        4000
      );
      onSuccess();
    });
  };

  // ============================================================
  // ONAY EKRANI
  // ============================================================
  if (step === 'confirm') {
    return (
      <ModalShell onClose={onClose}>
        <div className="px-6 py-6">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
              color: 'var(--danger)',
              fontSize: 22,
            }}
          >
            ⚠
          </div>

          <h2
            className="mb-2 text-center"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            İadeyi onayla
          </h2>
          <p
            className="text-sm text-center mb-5"
            style={{ color: 'var(--ink-2)' }}
          >
            Bu işlem geri alınamaz. Devam etmeden önce kontrol et.
          </p>

          <div
            className="rounded-[var(--r)] p-4 mb-4"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            <Row label="Tutar" value={money(numericAmount)} bold />
            <div className="my-2" style={{ height: 1, background: 'var(--line)' }} />
            <Row
              label="Yöntem"
              value={method === 'cash' ? 'Nakit' : 'Kart'}
              color={method === 'cash' ? 'var(--ok)' : 'var(--accent)'}
            />
            <div className="my-2" style={{ height: 1, background: 'var(--line)' }} />
            <div>
              <div
                className="uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                SEBEP
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {reason.trim()}
              </div>
            </div>
          </div>

          {error && (
            <div
              className="mb-3 text-sm rounded-[10px] px-3 py-2"
              style={{
                background:
                  'color-mix(in srgb, var(--danger) 10%, transparent)',
                color: 'var(--danger)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={isPending}
              className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Geri
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'var(--danger)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {isPending ? 'Kaydediliyor...' : 'İadeyi Onayla'}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ============================================================
  // FORM EKRANI
  // ============================================================
  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-6">
        <h2
          className="mb-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--ink)',
          }}
        >
          İade Yap
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--ink-2)' }}>
          Müşteriye geri verilen tutarı kaydet.
        </p>

        {/* TUTAR */}
        <div className="mb-4">
          <label
            className="block uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            Tutar (₺)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            autoFocus
            className="w-full px-4 py-3 rounded-[10px] text-lg outline-none transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontFamily: 'var(--f-mono)',
              fontWeight: 600,
            }}
          />
        </div>

        {/* YÖNTEM TOGGLE */}
        <div className="mb-4">
          <label
            className="block uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            Yöntem
          </label>
          <div
            className="grid grid-cols-2 gap-2 p-1 rounded-[10px]"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className="h-10 rounded-[8px] text-sm font-semibold transition-all"
              style={{
                background: method === 'cash' ? 'var(--ok)' : 'transparent',
                color: method === 'cash' ? '#FAF5EA' : 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Nakit
            </button>
            <button
              type="button"
              onClick={() => setMethod('card')}
              className="h-10 rounded-[8px] text-sm font-semibold transition-all"
              style={{
                background: method === 'card' ? 'var(--accent)' : 'transparent',
                color: method === 'card' ? '#FAF5EA' : 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Kart
            </button>
          </div>
        </div>

        {/* SEBEP */}
        <div className="mb-4">
          <label
            className="block uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            Sebep <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: Yanlış sipariş, müşteri şikayeti..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-[10px] text-sm outline-none transition-colors resize-none"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              lineHeight: 1.5,
            }}
          />
          <div
            className="text-right mt-1"
            style={{ fontSize: 10, color: 'var(--ink-3)' }}
          >
            {reason.length}/500
          </div>
        </div>

        {/* HATA */}
        {error && (
          <div
            className="mb-3 text-sm rounded-[10px] px-3 py-2"
            style={{
              background:
                'color-mix(in srgb, var(--danger) 10%, transparent)',
              color: 'var(--danger)',
              border:
                '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            }}
          >
            {error}
          </div>
        )}

        {/* BUTONLAR */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canSubmit || isPending}
            className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: 'var(--ink)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Devam
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ============================================================
// HELPERS
// ============================================================

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes aleg-modal-in {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: bold ? 16 : 13,
          fontWeight: bold ? 700 : 500,
          color: color || 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(n);
}
