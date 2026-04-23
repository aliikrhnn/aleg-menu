import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductList } from './product-list';
import type { LocalizedText } from '@/types/database';

export default async function ProductsPage() {
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

  // Kategoriler (dropdown için)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .eq('business_id', businessId || '')
    .order('sort_order', { ascending: true });

  // Ürünler
  const { data: products } = await supabase
    .from('products')
    .select('id, category_id, name, description, price, status, is_featured, print_station, station_id, hero_icon, hero_image_url, sort_order')
    .eq('business_id', businessId || '')
    .order('sort_order', { ascending: true });

  // İstasyonlar (rozet + filtre + form dropdown için)
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, icon, color, sort_order, is_active')
    .eq('business_id', businessId || '')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Ürün başına varyasyon sayısı
  const productIds = (products || []).map((p) => p.id);
  const { data: productPresets } = productIds.length
    ? await supabase
        .from('product_option_presets')
        .select('product_id')
        .in('product_id', productIds)
    : { data: [] };

  const presetCountMap = new Map<string, number>();
  (productPresets || []).forEach((pp) => {
    presetCountMap.set(pp.product_id, (presetCountMap.get(pp.product_id) || 0) + 1);
  });

  const formattedCategories = (categories || []).map((c) => ({
    id: c.id,
    name: c.name as LocalizedText,
    sort_order: c.sort_order,
  }));

  const formattedProducts = (products || []).map((p) => ({
    ...p,
    name: p.name as LocalizedText,
    description: p.description as LocalizedText | null,
    preset_count: presetCountMap.get(p.id) || 0,
  }));

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/" className="text-ink-3 hover:text-ink-2 transition-colors">
          Ana Sayfa
        </Link>
        <span className="text-ink-3">/</span>
        <Link href="/panel/menu" className="text-ink-3 hover:text-ink-2 transition-colors">
          Menü
        </Link>
        <span className="text-ink-3">/</span>
        <span className="text-ink-2">Ürünler</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div
          className="text-accent uppercase mb-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          MENÜ · ÜRÜNLER
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
          Ürünler
        </h1>
        <p className="text-ink-2 text-base mt-3">
          {formattedProducts.length} ürün{' '}
          <span className="text-ink-3">· {formattedCategories.length} kategoride</span>
        </p>
      </div>

      {formattedCategories.length === 0 ? (
        <div className="text-center py-16 bg-card border border-line rounded-[var(--r)]">
          <div className="text-4xl mb-3">○</div>
          <div className="font-medium text-ink-2 mb-1">Önce bir kategori ekleyin</div>
          <div className="text-sm text-ink-3 mb-4">
            Ürün ekleyebilmek için en az bir kategorinize ihtiyacınız var.
          </div>
          <Link
            href="/panel/menu"
            className="inline-block h-10 px-5 rounded-[var(--r-sm)] bg-accent text-card font-semibold text-sm hover:opacity-90 transition-opacity leading-10"
            style={{ color: '#FAF5EA' }}
          >
            Kategori Ekle →
          </Link>
        </div>
      ) : (
        <ProductList
          products={formattedProducts}
          categories={formattedCategories}
          stations={(stations || []).map((s) => ({
            id: s.id as string,
            name: s.name as string,
            icon: (s.icon as string) || '●',
            color: (s.color as string) || '#C4553A',
          }))}
        />
      )}
    </div>
  );
}
