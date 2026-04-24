'use client';

import { useEffect, useState } from 'react';
import { getDB, getPendingCount } from './db';

/**
 * Outbox'taki bekleyen+failed öğe sayısını canlı dinler.
 * Dexie'nin observable API'si ile reaktif çalışır.
 */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const n = await getPendingCount();
        if (!cancelled) setCount(n);
      } catch {
        /* ignore */
      }
    };

    refresh();

    // Dexie hook - outbox tablosu değişince tetiklenir
    const db = getDB();
    const handler = () => {
      refresh();
    };

    db.outbox.hook('creating', handler);
    db.outbox.hook('deleting', handler);
    db.outbox.hook('updating', handler);

    // Fallback: her 3sn de poll et
    const interval = setInterval(refresh, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      try {
        db.outbox.hook('creating').unsubscribe(handler);
        db.outbox.hook('deleting').unsubscribe(handler);
        db.outbox.hook('updating').unsubscribe(handler);
      } catch {
        /* ignore */
      }
    };
  }, []);

  return count;
}
