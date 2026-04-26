import { listCustomers } from '@/lib/actions/customers';
import { CustomersManager } from './customers-manager';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const result = await listCustomers({ filter: 'all', limit: 50 });

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1100px] mx-auto">
      <CustomersManager
        initialCustomers={result.success ? result.customers || [] : []}
        initialTotalCount={result.success ? result.totalCount || 0 : 0}
        error={result.success ? null : result.error || null}
      />
    </div>
  );
}
