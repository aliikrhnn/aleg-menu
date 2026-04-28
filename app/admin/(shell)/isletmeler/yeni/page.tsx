import { getPlansForSelection } from '@/lib/actions/admin-businesses';
import { NewBusinessWizard } from '@/components/admin/new-business-wizard';

export default async function NewBusinessPage() {
  const plans = await getPlansForSelection();
  return <NewBusinessWizard plans={plans} />;
}
