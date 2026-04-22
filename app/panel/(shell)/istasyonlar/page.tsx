import { createClient } from '@/lib/supabase/server';
import { getStations } from '@/lib/actions/stations';
import { StationsManager } from './stations-manager';
import type { LocalizedText } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function StationsPage() {
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

  const businessId = membership?.business_id;

  const stationsResult = await getStations();

  // Ürünler
  const { data: productsRaw } = await supabase
    .from('products')
    .select('id, name, station_id, category_id')
    .eq('business_id', businessId || '')
    .eq('status', 'active')
    .order('sort_order', { ascending: true });

  // Kategoriler
  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .eq('business_id', businessId || '')
    .order('sort_order', { ascending: true });

  if (!stationsResult.success) {
    return (
      <div className="px-8 py-10 max-w-[1200px] mx-auto">
        <div className="bg-card border border-line rounded-[var(--r)] p-8 text-center">
          <div className="text-accent text-3xl mb-3">⚠</div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            İstasyonlar yüklenemedi
          </h2>
          <p className="text-ink-3 text-sm">
            {stationsResult.error || 'Bir sorun oluştu'}
          </p>
        </div>
      </div>
    );
  }

  const products = (productsRaw || []).map((p) => ({
    id: p.id as string,
    name: (p.name as LocalizedText)?.tr || 'Ürün',
    station_id: (p.station_id as string | null) || null,
    category_id: (p.category_id as string | null) || null,
  }));

  const categories = (categoriesRaw || []).map((c) => ({
    id: c.id as string,
    name: (c.name as LocalizedText)?.tr || 'Kategori',
  }));

  return (
    <StationsManager
      initialStations={stationsResult.stations || []}
      allProducts={products}
      categories={categories}
    />
  );
}
