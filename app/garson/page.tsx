import { redirect } from 'next/navigation';
import { listActiveCashiers } from '@/lib/actions/cashiers';
import { getActiveOrders } from '@/lib/actions/pos';
import { WaiterApp } from './waiter-app';

export const dynamic = 'force-dynamic';

export default async function GarsonPage() {
  const cashiersResult = await listActiveCashiers('waiter');

  if (!cashiersResult.success) {
    redirect('/panel/giris?error=garson_gerekli');
  }

  const ordersResult = await getActiveOrders();

  return (
    <WaiterApp
      availableCashiers={cashiersResult.cashiers || []}
      businessName={cashiersResult.businessName || 'Kafe'}
      businessId={ordersResult.businessId || ''}
    />
  );
}
