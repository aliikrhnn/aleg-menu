import { notFound } from 'next/navigation';
import {
  getBusinessDetail,
  getPlansForSelection,
} from '@/lib/actions/admin-businesses';
import { BusinessDetailClient } from '@/components/admin/business-detail-client';

type Props = {
  params: { id: string };
};

export default async function BusinessDetailPage({ params }: Props) {
  const [business, plans] = await Promise.all([
    getBusinessDetail(params.id),
    getPlansForSelection(),
  ]);

  if (!business) {
    notFound();
  }

  return <BusinessDetailClient business={business} plans={plans} />;
}
