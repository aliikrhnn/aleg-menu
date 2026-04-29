'use client';

import { useEffect, useState } from 'react';
import { useCashierSession } from '@/lib/cashier-session';
import { CashierLogin } from '@/app/kasa/cashier-login';
import { WaiterBoard } from './waiter-board';

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
};

export function WaiterApp({
  availableCashiers,
  businessName,
  businessId,
}: Props) {
  const { cashier, isLocked, setBusinessName, signOut } = useCashierSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBusinessName(businessName);
  }, [businessName, setBusinessName]);

  // Stale session koruması: rolü 'cashier' olan biri garson uygulamasına
  // erişmeye çalışırsa session'ı temizle
  useEffect(() => {
    if (!mounted) return;
    if (cashier && cashier.role && cashier.role === 'cashier') {
      signOut();
    }
  }, [mounted, cashier, signOut]);

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

  const hasInvalidRole = cashier && cashier.role === 'cashier';

  // Kasiyer yok veya kilitli veya yanlış rol → giriş ekranı (kasa ile aynı PIN sistemi)
  if (!cashier || isLocked || hasInvalidRole) {
    return (
      <CashierLogin
        availableCashiers={availableCashiers}
        businessName={businessName}
        mode={isLocked && cashier ? 'unlock' : 'login'}
        lockedCashierId={isLocked ? cashier?.id : undefined}
        expectedRole="waiter"
      />
    );
  }

  // Açık → garson board
  return <WaiterBoard businessId={businessId} />;
}
