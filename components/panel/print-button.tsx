'use client';

import { useState } from 'react';
import {
  requestCashierReceipt,
  requestKitchenReprint,
} from '@/lib/actions/printers';

type Props = {
  orderId: string;
  mode: 'cashier' | 'reprint_kitchen' | 'reprint_cashier';
  stationId?: string | null;
  variant?: 'primary' | 'secondary' | 'icon';
  label?: string;
  className?: string;
};

export function PrintButton({
  orderId,
  mode,
  stationId,
  variant = 'secondary',
  label,
  className = '',
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);

    let result: { success: boolean; error?: string };
    if (mode === 'cashier' || mode === 'reprint_cashier') {
      result = await requestCashierReceipt(orderId);
    } else {
      result = await requestKitchenReprint(orderId, stationId);
    }

    setBusy(false);

    if (!result.success) {
      alert(result.error || 'Yazdırma isteği başarısız');
    }
    // Başarılı ise print-queue-listener toast gösterir
  }

  const finalLabel =
    label ||
    (mode === 'cashier'
      ? 'Hesap yazdır'
      : mode === 'reprint_cashier'
        ? 'Hesabı tekrar yazdır'
        : 'Mutfağa tekrar yazdır');

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-50 ${className}`}
        title={finalLabel}
      >
        {busy ? (
          <span style={{ fontSize: 14 }}>⋯</span>
        ) : (
          <span style={{ fontSize: 15 }}>🖨</span>
        )}
      </button>
    );
  }

  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`h-10 px-4 rounded-[10px] text-[13px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{
        background: isPrimary ? 'var(--accent)' : 'var(--ink)',
        color: 'var(--paper)',
      }}
    >
      <span style={{ fontSize: 14 }}>🖨</span>
      {busy ? 'Gönderiliyor…' : finalLabel}
    </button>
  );
}
