'use client';

import Dexie, { type Table } from 'dexie';

// ============================================================
// OUTBOX - Offline'da yapılan işlemler
// ============================================================
// Online gelince arka planda sunucuya gönderilir.
// Sync_client_id ile idempotency — aynı işlem 2× DB'ye düşmez.
// ============================================================

export type OutboxActionType =
  | 'payment.take'       // ödeme al
  | 'order.status'       // sipariş durumu güncelle
  | 'order.cancel'       // iptal
  | 'order.change-table' // masa değiştir
  | 'order.create-manual' // kasiyerin oluşturduğu sipariş
  | 'cash.open'          // kasa aç
  | 'cash.close';        // kasa kapat

export type OutboxStatus =
  | 'pending'  // henüz denenmedi veya retry bekliyor
  | 'sending'  // şu an sunucuya gidiyor
  | 'sent'     // başarıyla işlendi, silinecek
  | 'failed'   // max retry aşıldı, manuel müdahale
  | 'conflict'; // sunucu duplicate/conflict döndürdü

export type OutboxItem = {
  id?: number;                  // auto-increment
  sync_client_id: string;       // idempotency key (UUID)
  action: OutboxActionType;
  payload: unknown;             // action'a özel data
  created_at: number;           // epoch ms
  last_attempt_at?: number;
  attempt_count: number;
  next_retry_at?: number;       // exponential backoff
  status: OutboxStatus;
  error_message?: string;
  // UI feedback için
  display_label?: string;       // "Masa 5 · 145 TL ödeme"
};

// ============================================================
// CACHED DATA - Son bilinen veriler (offline çalışabilmek için)
// ============================================================

export type CachedOrder = {
  id: string;                   // server ID
  business_id: string;
  data: unknown;                // ActiveOrder tüm alanları
  cached_at: number;
  // Offline'da yapılan değişiklikleri işaretle
  local_payment_status?: 'paid' | 'refunded';
  local_status?: string;
  // Hangi outbox item(ler) bunu etkiliyor
  pending_outbox_ids?: number[];
};

export type CachedProduct = {
  id: string;
  business_id: string;
  data: unknown;
  cached_at: number;
};

export type CachedSettings = {
  key: string;                  // 'active_cash_session' vb.
  value: unknown;
  updated_at: number;
};

// ============================================================
// DATABASE
// ============================================================

class AlegDB extends Dexie {
  outbox!: Table<OutboxItem, number>;
  cached_orders!: Table<CachedOrder, string>;
  cached_products!: Table<CachedProduct, string>;
  settings!: Table<CachedSettings, string>;

  constructor() {
    super('aleg-pos');
    this.version(1).stores({
      outbox: '++id, sync_client_id, status, next_retry_at, created_at, action',
      cached_orders: 'id, business_id, cached_at',
      cached_products: 'id, business_id',
      settings: 'key',
    });
  }
}

// Singleton instance
let _db: AlegDB | null = null;

export function getDB(): AlegDB {
  if (typeof window === 'undefined') {
    throw new Error('DB sadece client-side çalışır');
  }
  if (!_db) {
    _db = new AlegDB();
  }
  return _db;
}

// ============================================================
// OUTBOX HELPERS
// ============================================================

/**
 * Yeni bir outbox item oluştur (sipariş/ödeme sunucuya gidecek)
 */
export async function enqueueAction(
  action: OutboxActionType,
  payload: unknown,
  options?: {
    syncClientId?: string;
    displayLabel?: string;
  }
): Promise<OutboxItem> {
  const db = getDB();
  const syncId = options?.syncClientId || generateUUID();

  const item: OutboxItem = {
    sync_client_id: syncId,
    action,
    payload,
    created_at: Date.now(),
    attempt_count: 0,
    status: 'pending',
    next_retry_at: Date.now(),
    display_label: options?.displayLabel,
  };

  const id = await db.outbox.add(item);
  return { ...item, id };
}

/**
 * Pending (veya retry zamanı gelmiş) outbox itemlerini al
 */
export async function getNextOutboxBatch(limit = 5): Promise<OutboxItem[]> {
  const db = getDB();
  const now = Date.now();
  return await db.outbox
    .where('status')
    .equals('pending')
    .filter((item) => !item.next_retry_at || item.next_retry_at <= now)
    .limit(limit)
    .toArray();
}

/**
 * Bekleyen (pending + failed) toplam sayı - topbar rozeti için
 */
export async function getPendingCount(): Promise<number> {
  const db = getDB();
  const pending = await db.outbox.where('status').equals('pending').count();
  const failed = await db.outbox.where('status').equals('failed').count();
  return pending + failed;
}

/**
 * Outbox item'ı başarıyla gönderildi işaretle (sonra silinecek)
 */
export async function markSent(id: number): Promise<void> {
  const db = getDB();
  // Hemen sil - artık bekleme kuyruğunda yer tutmasın
  await db.outbox.delete(id);
}

/**
 * Outbox item'ı başarısız işaretle (retry)
 */
export async function markFailed(
  id: number,
  errorMessage: string,
  isConflict = false
): Promise<void> {
  const db = getDB();
  const item = await db.outbox.get(id);
  if (!item) return;

  const MAX_ATTEMPTS = 5;
  const newAttemptCount = item.attempt_count + 1;
  const shouldGiveUp = newAttemptCount >= MAX_ATTEMPTS;

  // Exponential backoff: 5s, 10s, 20s, 40s, 80s
  const backoffMs = Math.min(5000 * Math.pow(2, item.attempt_count), 80000);

  await db.outbox.update(id, {
    status: isConflict
      ? 'conflict'
      : shouldGiveUp
        ? 'failed'
        : 'pending',
    attempt_count: newAttemptCount,
    last_attempt_at: Date.now(),
    next_retry_at: shouldGiveUp ? undefined : Date.now() + backoffMs,
    error_message: errorMessage,
  });
}

/**
 * Sending'e geçir (reentry önleme)
 */
export async function markSending(id: number): Promise<void> {
  const db = getDB();
  await db.outbox.update(id, { status: 'sending' });
}

/**
 * Failed/conflict itemleri tekrar dene (kullanıcı manuel retry ister)
 */
export async function retryAllFailed(): Promise<void> {
  const db = getDB();
  const now = Date.now();
  const failed = await db.outbox
    .where('status')
    .anyOf(['failed', 'conflict'])
    .toArray();

  for (const item of failed) {
    await db.outbox.update(item.id!, {
      status: 'pending',
      next_retry_at: now,
      attempt_count: 0,
      error_message: undefined,
    });
  }
}

/**
 * Failed/conflict itemleri sil (kullanıcı "vazgeç" der)
 */
export async function discardFailed(id: number): Promise<void> {
  const db = getDB();
  await db.outbox.delete(id);
}

// ============================================================
// CACHED ORDERS HELPERS
// ============================================================

export async function cacheOrders(
  businessId: string,
  orders: Array<{ id: string } & Record<string, unknown>>
): Promise<void> {
  const db = getDB();
  const now = Date.now();

  await db.transaction('rw', db.cached_orders, async () => {
    // Mevcut offline değişiklikleri koru
    const existingMap = new Map<string, CachedOrder>();
    const existing = await db.cached_orders
      .where('business_id')
      .equals(businessId)
      .toArray();
    existing.forEach((e) => existingMap.set(e.id, e));

    // Yeni cache listesi
    const items: CachedOrder[] = orders.map((o) => {
      const prev = existingMap.get(o.id);
      return {
        id: o.id,
        business_id: businessId,
        data: o,
        cached_at: now,
        // Offline değişiklikleri koru
        local_payment_status: prev?.local_payment_status,
        local_status: prev?.local_status,
        pending_outbox_ids: prev?.pending_outbox_ids,
      };
    });

    await db.cached_orders.bulkPut(items);
  });
}

export async function getCachedOrders(
  businessId: string
): Promise<CachedOrder[]> {
  const db = getDB();
  return await db.cached_orders
    .where('business_id')
    .equals(businessId)
    .toArray();
}

/**
 * Offline ödeme işaretle - cached order'ı local olarak güncelle
 */
export async function markLocalPayment(
  orderId: string,
  outboxId: number
): Promise<void> {
  const db = getDB();
  const order = await db.cached_orders.get(orderId);
  if (!order) return;

  await db.cached_orders.update(orderId, {
    local_payment_status: 'paid',
    pending_outbox_ids: [...(order.pending_outbox_ids || []), outboxId],
  });
}

// ============================================================
// UUID (client-side, crypto.randomUUID fallback)
// ============================================================

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback (çok eski tarayıcılar)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
