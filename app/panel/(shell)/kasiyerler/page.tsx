import { listCashiers } from '@/lib/actions/cashiers';
import { CashierManager } from './cashier-manager';

export const dynamic = 'force-dynamic';

export default async function CashiersPage() {
  const result = await listCashiers();

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1100px] mx-auto">
      <CashierManager
        initialCashiers={result.success ? result.cashiers || [] : []}
        error={result.success ? null : result.error || null}
      />
    </div>
  );
}
