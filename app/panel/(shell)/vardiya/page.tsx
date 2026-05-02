import { listStaff } from '@/lib/actions/staff';
import { getShiftTemplates } from '@/lib/actions/shifts';
import { VardiyaManager } from './vardiya-manager';

export const dynamic = 'force-dynamic';

export default async function VardiyaPage() {
  const [staffResult, templatesResult] = await Promise.all([
    listStaff(true),
    getShiftTemplates(),
  ]);

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto">
      <VardiyaManager
        initialStaff={staffResult.success ? staffResult.staff || [] : []}
        initialTemplates={
          templatesResult.success && templatesResult.templates
            ? templatesResult.templates
            : null
        }
        error={
          staffResult.success
            ? templatesResult.success
              ? null
              : templatesResult.error || null
            : staffResult.error || null
        }
      />
    </div>
  );
}
