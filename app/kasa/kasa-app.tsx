'use client';

import { useEffect, useState } from 'react';
import { useCashierSession } from '@/lib/cashier-session';
import { CashierLogin } from './cashier-login';
import { KasaBoard } from './kasa-board';
import type { ActiveOrder } from '@/lib/actions/pos';

type AvailableCashier = {
  id: string;
  display_name: string;
  color: string;
  emoji: string;
};

type Props = {
  availableCashiers: AvailableCashier[];
  businessName: string;
  businessId: string;
  initialOrders: ActiveOrder[];
};

export function KasaApp({
  availableCashiers,
  businessName,
  businessId,
  initialOrders,
}: Props) {
  const { cashier, isLocked, setBusinessName, signOut } = useCashierSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBusinessName(businessName);
  }, [businessName, setBusinessName]);

  // Stale session koruması: localStorage'da role'ü 'waiter' olan biri kasaya
  // erişmeye çalışırsa session'ı temizle (eski/manipüle edilmiş session olabilir)
  useEffect(() => {
    if (!mounted) return;
    if (cashier && cashier.role && cashier.role === 'waiter') {
      signOut();
    }
  }, [mounted, cashier, signOut]);

  // Hydration sırasında blank göster (SSR mismatch önleme)
  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--paper)', color: 'var(--ink-3)' }}
      >
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
          }}
        >
          yükleniyor…
        </div>
      </div>
    );
  }

  // Stale waiter session — yukarıdaki effect signOut tetikler, redirect'e gerek yok
  const hasInvalidRole = cashier && cashier.role === 'waiter';

  // Kasiyer yok veya kilitli veya yanlış rol → giriş ekranı
  if (!cashier || isLocked || hasInvalidRole) {
    return (
      <CashierLogin
        availableCashiers={availableCashiers}
        businessName={businessName}
        mode={isLocked && cashier ? 'unlock' : 'login'}
        lockedCashierId={isLocked ? cashier?.id : undefined}
        expectedRole="cashier"
      />
    );
  }

  // Kasiyer açık → board
  return <KasaBoard initialOrders={initialOrders} businessId={businessId} />;
}
