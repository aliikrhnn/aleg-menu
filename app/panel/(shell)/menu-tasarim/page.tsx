import { redirect } from 'next/navigation';
import { getPrintableMenuData } from '@/lib/actions/printable-menu';
import { PrintableMenuClient } from './client';

export const dynamic = 'force-dynamic';

export default async function PrintableMenuPage() {
  const result = await getPrintableMenuData();

  if (!result.success || !result.data) {
    redirect('/panel');
  }

  return <PrintableMenuClient data={result.data} />;
}
