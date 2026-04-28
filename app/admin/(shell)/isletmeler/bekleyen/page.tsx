import Link from 'next/link';
import { getPendingBusinesses } from '@/lib/actions/admin-businesses';
import { Eyebrow, SerifTitle, Pill } from '@/components/admin/primitives';
import { PendingBusinessesClient } from '@/components/admin/pending-businesses-client';

export default async function PendingBusinessesPage() {
  const items = await getPendingBusinesses();

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto grid gap-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/isletmeler"
          className="text-ink-3 hover:text-super"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          ← İŞLETMELER
        </Link>
      </div>

      <div>
        <Eyebrow tone="gold">ONAY BEKLİYOR</Eyebrow>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <SerifTitle size={42}>Bekleyen işletmeler</SerifTitle>
          {items.length > 0 && (
            <Pill tone="gold">{items.length} adet</Pill>
          )}
        </div>
        <p className="text-ink-2 text-base mt-3 max-w-[640px]">
          Yeni kayıt olmuş ama henüz onaylanmamış işletmeler. Onayladığınızda{' '}
          <strong>14 günlük trial</strong> başlar ve sahibi panele giriş yapabilir.
        </p>
      </div>

      <PendingBusinessesClient initialItems={items} />
    </div>
  );
}
