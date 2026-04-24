'use client';

import { useEffect, useState, useCallback } from 'react';

const SIM_KEY = 'aleg-simulate-offline';

type ConnectionStatus = 'online' | 'offline' | 'simulated-offline';

/**
 * Online/offline durumu algılar.
 * `navigator.onLine` + geliştirici "simule et" toggle'ını birleştirir.
 */
export function useOnlineStatus(): {
  status: ConnectionStatus;
  isOnline: boolean;
  simulating: boolean;
  toggleSimulate: () => void;
} {
  const [navOnline, setNavOnline] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setNavOnline(window.navigator.onLine);

    // Simule flag (localStorage)
    try {
      const sim = window.localStorage.getItem(SIM_KEY);
      setSimulating(sim === '1');
    } catch {
      /* ignore */
    }

    const onOnline = () => setNavOnline(true);
    const onOffline = () => setNavOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIM_KEY) {
        setSimulating(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggleSimulate = useCallback(() => {
    setSimulating((prev) => {
      const next = !prev;
      try {
        if (next) {
          window.localStorage.setItem(SIM_KEY, '1');
        } else {
          window.localStorage.removeItem(SIM_KEY);
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  let status: ConnectionStatus;
  if (simulating) status = 'simulated-offline';
  else if (!navOnline) status = 'offline';
  else status = 'online';

  return {
    status,
    isOnline: status === 'online',
    simulating,
    toggleSimulate,
  };
}
