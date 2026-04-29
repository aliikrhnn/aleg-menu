import { notFound } from 'next/navigation';
import { getInvoiceDetail } from '@/lib/actions/admin-billing';
import { InvoiceDetailClient } from '@/components/admin/invoice-detail-client';

type Props = { params: { id: string } };

export default async function InvoiceDetailPage({ params }: Props) {
  const result = await getInvoiceDetail(params.id);
  if (!result) notFound();
  return <InvoiceDetailClient invoice={result.invoice} payments={result.payments} />;
}
