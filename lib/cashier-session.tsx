'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type CashierSession = {
  id: string;
  display_name: string;
  color: string;
  emoji: string;
  can_close_day: boolean;
  can_refund: boolean;
  signed_in_at: number; // epoch ms
};

const STORAGE_KEY = 'aleg-kasa-session';
const ACTIVITY_KEY = 'aleg-kasa-activity';
const AUTO_LOCK_PREFS_KEY = 'aleg-kasa-autolock-minutes';
// Varsayılan 15 dakika. localStorage'da 'aleg-kasa-autolock-minutes' varsa onu kullan.
// Min 5, max 120 dakika. 0 yazarsa hiç kilitlenmez.
const DEFAULT_AUTO_LOCK_MINUTES = 15;

function getAutoLockMinutes(): number {
  try {
    const raw = window.localStorage.getItem(AUTO_LOCK_PREFS_KEY);
    if (!raw) return DEFAULT_AUTO_LOCK_MINUTES;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_AUTO_LOCK_MINUTES;
    if (n === 0) return 0; // kilitleme kapalı
    return Math.max(5, Math.min(120, n));
  } catch {
    return DEFAULT_AUTO_LOCK_MINUTES;
  }
}

type Ctx = {
  cashier: CashierSession | null;
  isLocked: boolean;
  locking: boolean;
  signIn: (c: Omit<CashierSession, 'signed_in_at'>) => void;
  signOut: () => void;
  lock: () => void;
  unlock: (sessionToRestore: CashierSession) => void;
  updateActivity: () => void;
  businessName: string;
  setBusinessName: (name: string) => void;
};

const CashierContext = createContext<Ctx | null>(null);

export function CashierSessionProvider({ children }: { children: ReactNode }) {
  const [cashier, setCashier] = useState<CashierSession | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [locking, setLocking] = useState(false);
  const [businessName, setBusinessName] = useState('Kafe');

  // Storage'tan yükle
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CashierSession;
        setCashier(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Aktivite takibi (auto-lock için)
  const updateActivity = useCallback(() => {
    try {
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-lock: belirlenen süre hareketsizse kilitle (varsayılan 15dk, özelleştirilebilir)
  useEffect(() => {
    if (!cashier || isLocked) return;

    // 0 ise auto-lock kapalı
    const lockMinutes = getAutoLockMinutes();
    if (lockMinutes === 0) return;

    let interval: number | null = null;
    const checkActivity = () => {
      try {
        const raw = window.localStorage.getItem(ACTIVITY_KEY);
        if (!raw) {
          updateActivity();
          return;
        }
        const last = Number(raw);
        const diff = Date.now() - last;
        // Her çağrıda tazele — kullanıcı console'dan değiştirirse hemen yansısın
        const currentLockMs = getAutoLockMinutes() * 60 * 1000;
        if (currentLockMs > 0 && diff > currentLockMs) {
          setIsLocked(true);
        }
      } catch {
        /* ignore */
      }
    };

    checkActivity();
    interval = window.setInterval(checkActivity, 15000); // 15sn'de bir kontrol

    // İlk aktivite
    updateActivity();

    // Event dinleyicileri
    const handlers = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    handlers.forEach((e) => {
      window.addEventListener(e, updateActivity, { passive: true });
    });

    return () => {
      if (interval !== null) clearInterval(interval);
      handlers.forEach((e) => {
        window.removeEventListener(e, updateActivity);
      });
    };
  }, [cashier, isLocked, updateActivity]);

  const signIn = useCallback((c: Omit<CashierSession, 'signed_in_at'>) => {
    const full: CashierSession = { ...c, signed_in_at: Date.now() };
    setCashier(full);
    setIsLocked(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(() => {
    setCashier(null);
    setIsLocked(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(ACTIVITY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const lock = useCallback(() => {
    setLocking(true);
    // Kısa animasyon süresi için
    setTimeout(() => {
      setIsLocked(true);
      setLocking(false);
    }, 150);
  }, []);

  const unlock = useCallback((session: CashierSession) => {
    setCashier(session);
    setIsLocked(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <CashierContext.Provider
      value={{
        cashier,
        isLocked,
        locking,
        signIn,
        signOut,
        lock,
        unlock,
        updateActivity,
        businessName,
        setBusinessName,
      }}
    >
      {children}
    </CashierContext.Provider>
  );
}

export function useCashierSession(): Ctx {
  const ctx = useContext(CashierContext);
  if (!ctx) throw new Error('useCashierSession must be used within CashierSessionProvider');
  return ctx;
}
