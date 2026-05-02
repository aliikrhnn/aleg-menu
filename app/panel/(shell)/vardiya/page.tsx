import { listStaff } from '@/lib/actions/staff';
import { StaffList } from './staff-list';

export const dynamic = 'force-dynamic';

export default async function VardiyaPage() {
  const result = await listStaff(true); // pasif personeli de dahil et

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto">
      <StaffList
        initialStaff={result.success ? result.staff || [] : []}
        error={result.success ? null : result.error || null}
      />
    </div>
  );
}
