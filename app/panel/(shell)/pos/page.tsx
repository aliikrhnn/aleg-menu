import { getActiveOrders } from '@/lib/actions/pos';
import { OrdersBoard } from './orders-board';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const result = await getActiveOrders();

  if (!result.success) {
    return (
      <div className="px-8 py-10 max-w-[1200px] mx-auto">
        <div
          className="bg-card border border-line rounded-[var(--r)] p-8 text-center"
        >
          <div className="text-accent text-3xl mb-3">⚠</div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            Siparişler yüklenemedi
          </h2>
          <p className="text-ink-2 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  if (!result.businessId) {
    redirect('/panel/giris');
  }

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 h-full flex flex-col">
      <OrdersBoard
        initialOrders={result.orders || []}
        businessId={result.businessId}
      />
    </div>
  );
}
