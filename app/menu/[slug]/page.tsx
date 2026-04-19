import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MenuView } from './menu-view';
import type { LocalizedText } from '@/types/database';

interface Props {
  params: { slug: string };
}

// Cache: 60 saniye - menü sürekli aynı, değişiklik olunca sahip refresh tetikler
export const revalidate = 60;

export default async function CustomerMenuPage({ params }: Props) {
  const supabase = createClient();

  // 1. İşletmeyi slug'dan bul
  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, logo_url, city, subscription_status, settings, app_config')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!business) {
    notFound();
  }

  // İşletme askıya alınmış / iptal edilmişse menü gösterme
  if (business.subscription_status === 'suspended' || business.subscription_status === 'cancelled') {
    return (
      <div data-theme="warm" className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div
            className="text-ink-3 uppercase mb-4"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            MENÜ ŞU AN AKTİF DEĞİL
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
            className="mb-3"
          >
            {business.name}
          </h1>
          <p className="text-ink-2 text-sm">
            Bu işletmenin menüsü şu anda görüntülenemez. Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  // 2. Aktif kategorileri çek (sıralı)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, description, hero_icon, sort_order')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  // 3. Aktif/tükendi ürünleri çek (taslakları gösterme)
  const { data: products } = await supabase
    .from('products')
    .select('id, category_id, name, description, price, status, is_featured, hero_icon, sort_order')
    .eq('business_id', business.id)
    .in('status', ['active', 'soldout'])
    .order('sort_order', { ascending: true });

  // Tip dönüşümleri (LocalizedText)
  const formattedCategories = (categories || []).map((c) => ({
    id: c.id,
    name: c.name as LocalizedText,
    description: c.description as LocalizedText | null,
    hero_icon: c.hero_icon,
  }));

  const formattedProducts = (products || []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name as LocalizedText,
    description: p.description as LocalizedText | null,
    price: p.price,
    status: p.status as 'active' | 'soldout',
    is_featured: p.is_featured,
    hero_icon: p.hero_icon,
  }));

  return (
    <MenuView
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        logo_url: business.logo_url,
        city: business.city,
      }}
      categories={formattedCategories}
      products={formattedProducts}
    />
  );
}
