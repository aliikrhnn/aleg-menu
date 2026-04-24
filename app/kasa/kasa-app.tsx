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
  const { cashier, isLocked, setBusinessName } = useCashierSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBusinessName(businessName);
  }, [businessName, setBusinessName]);

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

  // Kasiyer yok veya kilitli → giriş ekranı
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

  // Kasiyer açık → board
  return <KasaBoard initialOrders={initialOrders} businessId={businessId} />;
}
