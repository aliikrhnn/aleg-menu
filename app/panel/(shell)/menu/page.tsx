import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CategoryList } from './category-list';
import type { LocalizedText } from '@/types/database';

export default async function MenuPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user?.id || '')
    .eq('status', 'active')
    .maybeSingle();

  // Kategorileri çek
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, description, hero_icon, sort_order, active')
    .eq('business_id', membership?.business_id || '')
    .order('sort_order', { ascending: true });

  // Her kategorideki ürün sayısını al
  const categoriesWithCounts = await Promise.all(
    (categories || []).map(async (cat) => {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id);
      return {
        ...cat,
        name: cat.name as LocalizedText,
        description: cat.description as LocalizedText | null,
        product_count: count ?? 0,
      };
    })
  );

  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/" className="text-ink-3 hover:text-ink-2 transition-colors">
          Ana Sayfa
        </Link>
        <span className="text-ink-3">/</span>
        <span className="text-ink-2">Menü</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div
            className="text-accent uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            MENÜ · KATEGORİLER
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 48,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Menünüz
          </h1>
          <p className="text-ink-2 text-base mt-3">
            Kategorilerini organize et, ürünlerini ekle. Müşterin menünü QR koddan görecek.
          </p>
        </div>
      </div>

      {/* İstatistik bar */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <StatPill label="KATEGORİ" value={categoriesWithCounts.length.toString()} />
        <StatPill
          label="TOPLAM ÜRÜN"
          value={categoriesWithCounts.reduce((sum, c) => sum + c.product_count, 0).toString()}
        />
        <StatPill
          label="AKTİF"
          value={categoriesWithCounts.filter((c) => c.active).length.toString()}
        />
      </div>

      {/* Kategori listesi */}
      <CategoryList categories={categoriesWithCounts} />
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-line rounded-[var(--r-sm)] px-4 py-2 flex items-center gap-2">
      <span
        className="text-ink-3 uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        className="text-ink font-semibold"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
          fontWeight: 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}
