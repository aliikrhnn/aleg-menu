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
  const { cashier, isLocked, setBusinessName } = useCashierSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBusinessName(businessName);
  }, [businessName, setBusinessName]);

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

  // Kasiyer yok veya kilitli → giriş ekranı (kasa ile aynı PIN sistemi)
  if (!cashier || isLocked) {
    return (
      <CashierLogin
        availableCashiers={availableCashiers}
        businessName={businessName}
        mode={isLocked && cashier ? 'unlock' : 'login'}
        lockedCashierId={isLocked ? cashier?.id : undefined}
      />
    );
  }

  // Açık → garson board
  return <WaiterBoard businessId={businessId} />;
}
