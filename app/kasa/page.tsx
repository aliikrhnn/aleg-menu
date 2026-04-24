import { redirect } from 'next/navigation';
import { listActiveCashiers } from '@/lib/actions/cashiers';
import { getActiveOrders } from '@/lib/actions/pos';
import { KasaApp } from './kasa-app';

export const dynamic = 'force-dynamic';

export default async function KasaPage() {
  const cashiersResult = await listActiveCashiers();

  if (!cashiersResult.success) {
    // Giriş yapılmadıysa panel giriş ekranına
    redirect('/panel/giris?error=kasa_gerekli');
  }

  // Aktif sipariş listesi (offline cache için)
  const ordersResult = await getActiveOrders();

  return (
    <KasaApp
      availableCashiers={cashiersResult.cashiers || []}
      businessName={cashiersResult.businessName || 'Kafe'}
      businessId={ordersResult.businessId || ''}
      initialOrders={ordersResult.success ? ordersResult.orders || [] : []}
    />
  );
}
