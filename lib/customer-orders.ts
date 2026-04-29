/**
 * Müşteri tarafı sipariş ID'leri yönetimi (localStorage).
 *
 * Müşteri her sipariş verdiğinde ID kaydedilir. "Siparişlerim" panelinde
 * batch sorgu için kullanılır. Slug bazlı saklanır (farklı işletmeler
 * için ayrı listeler).
 *
 * Veri yapısı (localStorage):
 *   key: aleg-customer-orders-{slug}
 *   value: JSON [{ id, addedAt }, ...]
 *
 * Eski entry'ler 7 gün sonra otomatik temizlenir.
 */

const KEY_PREFIX = 'aleg-customer-orders-';
const MAX_ENTRIES = 30;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

type StoredOrder = {
  id: string;
  addedAt: number;
};

function storageKey(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

function readStore(slug: string): StoredOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredOrder[];
    if (!Array.isArray(parsed)) return [];
    // TTL temizliği — 7 günden eski entry'leri at
    const now = Date.now();
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.addedAt === 'number' &&
        now - e.addedAt < TTL_MS
    );
  } catch {
    return [];
  }
}

function writeStore(slug: string, entries: StoredOrder[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(slug),
      JSON.stringify(entries.slice(0, MAX_ENTRIES))
    );
  } catch {
    /* kota dolu, yoksay */
  }
}

/**
 * Müşteri yeni bir sipariş verdiğinde çağrılır.
 * Aynı ID iki kez eklenmez, en yeni başa konur.
 */
export function addCustomerOrder(slug: string, orderId: string): void {
  if (!slug || !orderId) return;
  const existing = readStore(slug);
  // Tekilleştir
  const filtered = existing.filter((e) => e.id !== orderId);
  filtered.unshift({ id: orderId, addedAt: Date.now() });
  writeStore(slug, filtered);
}

/**
 * Bu işletmedeki tüm sipariş ID'lerini döndürür (en yeni üstte).
 */
export function getCustomerOrderIds(slug: string): string[] {
  return readStore(slug).map((e) => e.id);
}

/**
 * Bir siparişi listeden kaldırır (örn. müşteri "kaldır" butonuna basarsa).
 */
export function removeCustomerOrder(slug: string, orderId: string): void {
  if (!slug || !orderId) return;
  const filtered = readStore(slug).filter((e) => e.id !== orderId);
  writeStore(slug, filtered);
}

/**
 * Tüm sipariş listesini siler.
 */
export function clearCustomerOrders(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(slug));
  } catch {
    /* yoksay */
  }
}
