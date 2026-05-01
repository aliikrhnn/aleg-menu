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
  role?: 'cashier' | 'waiter' | 'both';
  signed_in_at: number; // epoch ms
};

// App key — kasa ve garson uygulamaları farklı session storage kullansın
type AppKey = 'kasa' | 'garson';

function storageKeys(appKey: AppKey) {
  return {
    session: `aleg-${appKey}-session`,
    activity: `aleg-${appKey}-activity`,
    autoLock: `aleg-${appKey}-autolock-minutes`,
  };
}

const DEFAULT_AUTO_LOCK_MINUTES = 15;

function getAutoLockMinutes(autoLockKey: string): number {
  try {
    const raw = window.localStorage.getItem(autoLockKey);
    if (!raw) return DEFAULT_AUTO_LOCK_MINUTES;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_AUTO_LOCK_MINUTES;
    if (n === 0) return 0;
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

export function CashierSessionProvider({
  children,
  appKey = 'kasa',
}: {
  children: ReactNode;
  appKey?: AppKey;
}) {
  const keys = storageKeys(appKey);
  const STORAGE_KEY = keys.session;
  const ACTIVITY_KEY = keys.activity;
  const AUTO_LOCK_PREFS_KEY = keys.autoLock;

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
  }, [STORAGE_KEY]);

  // Aktivite takibi (auto-lock için)
  const updateActivity = useCallback(() => {
    try {
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [ACTIVITY_KEY]);

  // Auto-lock: belirlenen süre hareketsizse kilitle (varsayılan 15dk, özelleştirilebilir)
  useEffect(() => {
    if (!cashier || isLocked) return;

    // 0 ise auto-lock kapalı
    const lockMinutes = getAutoLockMinutes(AUTO_LOCK_PREFS_KEY);
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
        const currentLockMs = getAutoLockMinutes(AUTO_LOCK_PREFS_KEY) * 60 * 1000;
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
  }, [cashier, isLocked, updateActivity, ACTIVITY_KEY, AUTO_LOCK_PREFS_KEY]);

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
  }, [STORAGE_KEY, ACTIVITY_KEY]);

  const signOut = useCallback(() => {
    setCashier(null);
    setIsLocked(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(ACTIVITY_KEY);
    } catch {
      /* ignore */
    }
    // Server-side cookie session de temizle (subdomain rotaları için)
    // Hata olsa bile UI bozulmasın — paralel akış
    import('@/lib/actions/cashiers')
      .then((m) => m.signOutCashierSession())
      .catch(() => {
        /* ignore */
      });
  }, [STORAGE_KEY, ACTIVITY_KEY]);

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
  }, [STORAGE_KEY, ACTIVITY_KEY]);

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

// ============================================================
// Yetki yardımcıları — Bug #9 fix kapsamında
// ============================================================

/** Kasiyerin gün sonu alma yetkisi var mı? */
export function useCanCloseDay(): boolean {
  const { cashier } = useCashierSession();
  return !!cashier?.can_close_day;
}

/** Kasiyerin iade alma yetkisi var mı? */
export function useCanRefund(): boolean {
  const { cashier } = useCashierSession();
  return !!cashier?.can_refund;
}
