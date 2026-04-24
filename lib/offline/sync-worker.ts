'use client';

import {
  getNextOutboxBatch,
  markSending,
  markSent,
  markFailed,
  type OutboxItem,
} from './db';
import {
  takePayment,
  openCashSession,
  closeCashSession,
  changeOrderTable,
  type PaymentMethod,
} from '@/lib/actions/payments';
import { updateOrderStatus, cancelOrder } from '@/lib/actions/pos';
import {
  createManualOrder,
  type CreateManualOrderInput,
} from '@/lib/actions/tables-status';

// ============================================================
// TYPES — Payload tipleri (enqueue edilenle eşleşmeli)
// ============================================================

type PaymentTakePayload = {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  amountPaid?: number;
  changeGiven?: number;
  note?: string;
  autoPrint?: boolean;
};

type OrderStatusPayload = {
  orderId: string;
  status:
    | 'received'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'on_way'
    | 'delivered'
    | 'cancelled';
};

type OrderCancelPayload = {
  orderId: string;
  reason?: string;
};

type OrderChangeTablePayload = {
  orderId: string;
  newTableId: string | null;
  newOrderType?: 'dine_in' | 'pickup' | 'delivery';
};

type CashOpenPayload = {
  openingAmount: number;
  note?: string;
};

type CashClosePayload = {
  countedAmount: number;
  note?: string;
};

// ============================================================
// ITEM PROCESSOR — Bir outbox item'ını sunucuya gönder
// ============================================================

async function processItem(item: OutboxItem): Promise<{
  success: boolean;
  error?: string;
  isConflict?: boolean;
}> {
  try {
    switch (item.action) {
      case 'payment.take': {
        const p = item.payload as PaymentTakePayload;
        const r = await takePayment({
          ...p,
          syncClientId: item.sync_client_id,
        });
        if (!r.success) {
          return { success: false, error: r.error };
        }
        // alreadyPaid gelse bile başarı sayılır (idempotency)
        return { success: true };
      }

      case 'order.status': {
        const p = item.payload as OrderStatusPayload;
        const r = await updateOrderStatus(p.orderId, p.status);
        if (!r.success) {
          const conflict =
            r.error?.toLowerCase().includes('bulunamadı') ||
            r.error?.toLowerCase().includes('not found');
          return { success: false, error: r.error, isConflict: conflict };
        }
        return { success: true };
      }

      case 'order.cancel': {
        const p = item.payload as OrderCancelPayload;
        const r = await cancelOrder(p.orderId, p.reason);
        if (!r.success) {
          return { success: false, error: r.error };
        }
        return { success: true };
      }

      case 'order.change-table': {
        const p = item.payload as OrderChangeTablePayload;
        const r = await changeOrderTable(
          p.orderId,
          p.newTableId,
          p.newOrderType
        );
        if (!r.success) {
          return { success: false, error: r.error };
        }
        return { success: true };
      }

      case 'order.create-manual': {
        const p = item.payload as CreateManualOrderInput;
        const r = await createManualOrder({
          ...p,
          syncClientId: item.sync_client_id,
        });
        if (!r.success) {
          return { success: false, error: r.error };
        }
        return { success: true };
      }

      case 'cash.open': {
        const p = item.payload as CashOpenPayload;
        const r = await openCashSession(p);
        if (!r.success) {
          // "zaten açık" conflict olabilir
          const conflict = r.error?.toLowerCase().includes('açık');
          return { success: !!conflict, error: r.error, isConflict: conflict };
        }
        return { success: true };
      }

      case 'cash.close': {
        const p = item.payload as CashClosePayload;
        const r = await closeCashSession(p);
        if (!r.success) {
          return { success: false, error: r.error };
        }
        return { success: true };
      }

      default:
        return {
          success: false,
          error: `Bilinmeyen action: ${item.action}`,
          isConflict: true,
        };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// WORKER LIFECYCLE
// ============================================================

type WorkerState = {
  running: boolean;
  intervalId: number | null;
  currentBatchSize: number;
  onChange?: () => void; // UI refresh tetikleyici
};

const state: WorkerState = {
  running: false,
  intervalId: null,
  currentBatchSize: 0,
};

/**
 * Outbox'ı bir kez boşaltmaya dene
 */
export async function flushOutbox(onItemDone?: () => void): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  if (!navigator.onLine) {
    // Offline — denemeye değmez
    return { processed: 0, failed: 0, remaining: 0 };
  }

  if (state.currentBatchSize > 0) {
    // Zaten bir batch işleniyor, üst üste binme
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const batch = await getNextOutboxBatch(5);
  state.currentBatchSize = batch.length;

  let processed = 0;
  let failed = 0;

  try {
    for (const item of batch) {
      if (!navigator.onLine) break; // ortada bağlantı kopabilir

      await markSending(item.id!);
      const result = await processItem(item);

      if (result.success) {
        await markSent(item.id!);
        processed++;
      } else {
        await markFailed(
          item.id!,
          result.error || 'Bilinmeyen hata',
          result.isConflict || false
        );
        failed++;
      }

      onItemDone?.();
      state.onChange?.();
    }
  } finally {
    state.currentBatchSize = 0;
  }

  // Kalan pending sayısını hesapla
  const remainingBatch = await getNextOutboxBatch(100);

  return { processed, failed, remaining: remainingBatch.length };
}

/**
 * Worker'ı başlat - her 5sn'de outbox'ı kontrol eder
 */
export function startSyncWorker(onChange?: () => void): void {
  if (state.running) return;
  state.running = true;
  state.onChange = onChange;

  // Hemen bir kez dene
  flushOutbox().catch(() => {
    /* errors logged in flushOutbox */
  });

  // Periyodik
  state.intervalId = window.setInterval(() => {
    if (navigator.onLine) {
      flushOutbox().catch(() => {
        /* ignore */
      });
    }
  }, 5000);

  // Online event — bağlantı gelince hemen flush
  const onOnline = () => {
    flushOutbox().catch(() => {
      /* ignore */
    });
  };
  window.addEventListener('online', onOnline);

  // Cleanup için save
  (state as WorkerState & { _cleanup?: () => void })._cleanup = () => {
    window.removeEventListener('online', onOnline);
  };
}

/**
 * Worker'ı durdur (component unmount'ta)
 */
export function stopSyncWorker(): void {
  if (state.intervalId !== null) {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }
  const cleanup = (state as WorkerState & { _cleanup?: () => void })._cleanup;
  if (cleanup) cleanup();
  state.running = false;
  state.onChange = undefined;
}
