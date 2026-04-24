'use client';

import { useCallback } from 'react';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import {
  enqueueAction,
  markLocalPayment,
  generateUUID,
  type OutboxActionType,
} from './db';
import { flushOutbox } from './sync-worker';
import {
  takePayment as serverTakePayment,
  openCashSession as serverOpenCash,
  closeCashSession as serverCloseCash,
  changeOrderTable as serverChangeTable,
  type PaymentMethod,
} from '@/lib/actions/payments';
import {
  updateOrderStatus as serverUpdateStatus,
  cancelOrder as serverCancelOrder,
} from '@/lib/actions/pos';
import {
  createManualOrder as serverCreateManual,
  type CreateManualOrderInput,
} from '@/lib/actions/tables-status';

type TakePaymentInput = {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  amountPaid?: number;
  changeGiven?: number;
  note?: string;
  autoPrint?: boolean;
  giftAll?: boolean;
  giftReason?: string;
  tip?: number;
  discountAmount?: number;
  discountReason?: string;
  // UI için
  displayLabel?: string;
};

type OfflineActionResult = {
  success: boolean;
  queued?: boolean;     // offline'a yazıldı mı?
  online?: boolean;     // online başarıyla gönderildi mi?
  error?: string;
  syncClientId?: string;
};

/**
 * Offline-aware action hook
 *
 * Kullanım:
 *   const actions = useOfflineActions();
 *   const result = await actions.takePayment({ ... });
 *   if (result.queued) { toast("Çevrimdışı - kaydedildi"); }
 *   else if (result.online) { toast("Ödeme alındı"); }
 */
export function useOfflineActions() {
  const { isOnline } = useOnlineStatus();

  const takePayment = useCallback(
    async (input: TakePaymentInput): Promise<OfflineActionResult> => {
      const syncId = generateUUID();
      const label =
        input.displayLabel ||
        `Ödeme · ${fmt(input.amount)} · ${methodLabel(input.paymentMethod)}`;

      // Online: direkt dene
      if (isOnline) {
        try {
          const r = await serverTakePayment({
            ...input,
            syncClientId: syncId,
          });
          if (r.success) {
            return { success: true, online: true, syncClientId: syncId };
          }
          // Online ama server hatası — outbox'a yaz, retry edilsin
        } catch {
          // Network hatası, outbox'a düş
        }
      }

      // Offline (veya online hata) — outbox
      try {
        const item = await enqueueAction(
          'payment.take',
          input,
          { syncClientId: syncId, displayLabel: label }
        );
        // Cached order'ı local işaretle (UI anında güncellensin)
        if (item.id) {
          await markLocalPayment(input.orderId, item.id);
        }

        // Online'a geçtiysek hemen flush dene
        if (isOnline) {
          flushOutbox().catch(() => {
            /* ignore */
          });
        }

        return {
          success: true,
          queued: true,
          syncClientId: syncId,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  const updateStatus = useCallback(
    async (
      orderId: string,
      status:
        | 'received'
        | 'confirmed'
        | 'preparing'
        | 'ready'
        | 'on_way'
        | 'delivered'
        | 'cancelled'
    ): Promise<OfflineActionResult> => {
      const syncId = generateUUID();

      if (isOnline) {
        try {
          const r = await serverUpdateStatus(orderId, status);
          if (r.success) return { success: true, online: true };
        } catch {
          /* fall through */
        }
      }

      try {
        await enqueueAction(
          'order.status',
          { orderId, status },
          {
            syncClientId: syncId,
            displayLabel: `Sipariş durumu: ${statusLabel(status)}`,
          }
        );
        if (isOnline) {
          flushOutbox().catch(() => {
            /* ignore */
          });
        }
        return { success: true, queued: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  const cancelOrderOffline = useCallback(
    async (
      orderId: string,
      reason?: string
    ): Promise<OfflineActionResult> => {
      const syncId = generateUUID();

      if (isOnline) {
        try {
          const r = await serverCancelOrder(orderId, reason);
          if (r.success) return { success: true, online: true };
        } catch {
          /* fall through */
        }
      }

      try {
        await enqueueAction(
          'order.cancel',
          { orderId, reason },
          {
            syncClientId: syncId,
            displayLabel: `İptal: ${reason || 'sebep yok'}`,
          }
        );
        if (isOnline) {
          flushOutbox().catch(() => {
            /* ignore */
          });
        }
        return { success: true, queued: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  const openCash = useCallback(
    async (openingAmount: number, note?: string): Promise<OfflineActionResult> => {
      const syncId = generateUUID();

      if (isOnline) {
        try {
          const r = await serverOpenCash({ openingAmount, note });
          if (r.success) return { success: true, online: true };
          return { success: false, error: r.error };
        } catch {
          /* fall through */
        }
      }

      try {
        await enqueueAction(
          'cash.open',
          { openingAmount, note },
          {
            syncClientId: syncId,
            displayLabel: `Kasa aç · ${fmt(openingAmount)}`,
          }
        );
        return { success: true, queued: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  const closeCash = useCallback(
    async (
      countedAmount: number,
      note?: string
    ): Promise<OfflineActionResult> => {
      const syncId = generateUUID();

      if (isOnline) {
        try {
          const r = await serverCloseCash({ countedAmount, note });
          if (r.success) return { success: true, online: true };
          return { success: false, error: r.error };
        } catch {
          /* fall through */
        }
      }

      try {
        await enqueueAction(
          'cash.close',
          { countedAmount, note },
          {
            syncClientId: syncId,
            displayLabel: `Kasa kapat · ${fmt(countedAmount)}`,
          }
        );
        return { success: true, queued: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  const changeTable = useCallback(
    async (
      orderId: string,
      newTableId: string | null,
      newOrderType?: 'dine_in' | 'pickup' | 'delivery'
    ): Promise<OfflineActionResult> => {
      const syncId = generateUUID();

      if (isOnline) {
        try {
          const r = await serverChangeTable(orderId, newTableId, newOrderType);
          if (r.success) return { success: true, online: true };
        } catch {
          /* fall through */
        }
      }

      try {
        await enqueueAction(
          'order.change-table',
          { orderId, newTableId, newOrderType },
          {
            syncClientId: syncId,
            displayLabel: newTableId ? 'Masa değiştir' : 'Paket yap',
          }
        );
        return { success: true, queued: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  const createManualOrder = useCallback(
    async (input: CreateManualOrderInput): Promise<OfflineActionResult & { orderId?: string }> => {
      const syncId = generateUUID();
      const label =
        (input.tableId ? `Sipariş aç` : 'Hızlı satış') +
        ` · ${input.items.length} kalem`;

      if (isOnline) {
        try {
          const r = await serverCreateManual({ ...input, syncClientId: syncId });
          if (r.success) {
            return { success: true, online: true, orderId: r.orderId, syncClientId: syncId };
          }
        } catch {
          /* fall through */
        }
      }

      try {
        await enqueueAction(
          'order.create-manual',
          input,
          { syncClientId: syncId, displayLabel: label }
        );
        if (isOnline) {
          flushOutbox().catch(() => {
            /* ignore */
          });
        }
        return { success: true, queued: true, syncClientId: syncId };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Local kayıt hatası',
        };
      }
    },
    [isOnline]
  );

  return {
    isOnline,
    takePayment,
    updateStatus,
    cancelOrder: cancelOrderOffline,
    openCash,
    closeCash,
    changeTable,
    createManualOrder,
  };
}

// ============================================================
// Helpers
// ============================================================

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(n);
}

function methodLabel(m: OutboxActionType | string): string {
  const labels: Record<string, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale',
    online: 'Online',
    split: 'Bölünmüş',
    other: 'Diğer',
  };
  return labels[m as string] || m;
}

function statusLabel(s: string): string {
  const labels: Record<string, string> = {
    received: 'Alındı',
    confirmed: 'Onaylandı',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    on_way: 'Yolda',
    delivered: 'Teslim edildi',
    cancelled: 'İptal',
  };
  return labels[s] || s;
}
