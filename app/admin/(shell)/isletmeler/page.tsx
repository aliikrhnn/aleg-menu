import Link from 'next/link';
import {
  getBusinessList,
  getPlansForSelection,
  getCityList,
} from '@/lib/actions/admin-businesses';
import { Eyebrow, SerifTitle } from '@/components/admin/primitives';
import { BusinessListClient } from '@/components/admin/business-list-client';

type Props = {
  searchParams: {
    q?: string;
    status?: string;
    plan?: string;
    city?: string;
  };
};

export default async function BusinessesPage({ searchParams }: Props) {
  const filters = {
    search: searchParams.q,
    status: searchParams.status,
    planSlug: searchParams.plan,
    city: searchParams.city,
  };

  const [{ items, total }, plans, cities] = await Promise.all([
    getBusinessList(filters),
    getPlansForSelection(),
    getCityList(),
  ]);

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto grid gap-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>İŞLETME YÖNETİMİ</Eyebrow>
          <SerifTitle size={42} className="mt-2">
            İşletmeler
          </SerifTitle>
          <p className="text-ink-2 text-base mt-3 max-w-[640px]">
            Platformdaki tüm işletmeleri yönetin. Filtreler, toplu işlemler ve
            CSV dışa aktarma desteklenir.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/isletmeler/bekleyen"
            className="h-10 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 hover:border-line-2 transition-colors text-sm font-medium flex items-center gap-2"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <span style={{ color: 'var(--gold)' }}>●</span>
            Onay bekleyenler
          </Link>
          <Link
            href="/isletmeler/yeni"
            className="h-10 px-4 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
            Yeni işletme
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-4 flex-wrap">
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}
        >
          TOPLAM <strong style={{ color: 'var(--ink)' }}>{total}</strong> İŞLETME
        </div>
      </div>

      {/* List with filters & bulk actions */}
      <BusinessListClient
        initialItems={items}
        total={total}
        plans={plans}
        cities={cities}
        initialFilters={filters}
      />
    </div>
  );
}
