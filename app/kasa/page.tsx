import { redirect } from 'next/navigation';
import { listActiveCashiers } from '@/lib/actions/cashiers';
import { getActiveOrders } from '@/lib/actions/pos';
import { KasaApp } from './kasa-app';
import { KasaEmptyState } from './kasa-empty-state';

export const dynamic = 'force-dynamic';

export default async function KasaPage() {
  const cashiersResult = await listActiveCashiers('cashier');

  if (!cashiersResult.success) {
    // Giriş yapılmadıysa panel giriş ekranına
    redirect('/panel/giris?error=kasa_gerekli');
  }

  // Kasiyer yoksa boş durum ekranı (404 yerine)
  if (!cashiersResult.cashiers || cashiersResult.cashiers.length === 0) {
    return (
      <KasaEmptyState
        businessName={cashiersResult.businessName || 'Kafe'}
      />
    );
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
