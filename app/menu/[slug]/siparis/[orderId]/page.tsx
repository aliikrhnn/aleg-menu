import { notFound } from 'next/navigation';
import { getOrderTracking } from '@/lib/actions/orders';
import { TrackingClient } from './tracking-client';

export const dynamic = 'force-dynamic';

export default async function OrderTrackingPage({
  params,
}: {
  params: { slug: string; orderId: string };
}) {
  const result = await getOrderTracking(params.orderId, params.slug);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <TrackingClient
      initialData={result.data}
      orderId={params.orderId}
      businessSlug={params.slug}
    />
  );
}
