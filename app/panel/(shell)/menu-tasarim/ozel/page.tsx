import { redirect } from 'next/navigation';
import { getCustomMenuContext } from '@/lib/actions/custom-menu';
import { CustomMenuClient } from './client';

export const dynamic = 'force-dynamic';

export default async function CustomMenuPage() {
  const result = await getCustomMenuContext();

  if (!result.success || !result.data) {
    redirect('/panel');
  }

  return <CustomMenuClient initial={result.data} />;
}
