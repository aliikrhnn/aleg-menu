import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPresets } from '@/lib/actions/options';
import type { LocalizedText } from '@/types/database';
import { PresetsManager } from './presets-manager';

export const dynamic = 'force-dynamic';

export default async function VaryasyonlarPage() {
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

  const presetsResult = await getPresets();
  const presets = presetsResult.success ? presetsResult.presets || [] : [];

  // Ürünleri de çek (çoklu atama için)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category_id, status')
    .eq('business_id', businessId || '')
    .in('status', ['active', 'soldout', 'draft'])
    .order('sort_order', { ascending: true });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('business_id', businessId || '')
    .order('sort_order', { ascending: true });

  const formattedProducts = (products || []).map((p) => ({
    id: p.id,
    name: p.name as LocalizedText,
    category_id: p.category_id,
    status: p.status as 'active' | 'soldout' | 'draft',
  }));

  const formattedCategories = (categories || []).map((c) => ({
    id: c.id,
    name: c.name as LocalizedText,
  }));

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/panel" className="text-ink-3 hover:text-ink-2 transition-colors">
          Ana Sayfa
        </Link>
        <span className="text-ink-3">/</span>
        <Link href="/panel/menu" className="text-ink-3 hover:text-ink-2 transition-colors">
          Menü
        </Link>
        <span className="text-ink-3">/</span>
        <span className="text-ink-2">Varyasyonlar</span>
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
          MENÜ · VARYASYONLAR
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
          Varyasyonlar
        </h1>
        <p className="text-ink-2 text-base mt-3 max-w-[620px]">
          Boy, süt çeşidi, ek malzeme gibi seçenekleri bir kez tanımla — birden fazla ürüne
          hızlıca uygula. Değer değiştirdiğinde tüm bağlı ürünlerde otomatik güncellenir.
        </p>
      </div>

      <PresetsManager
        initialPresets={presets}
        products={formattedProducts}
        categories={formattedCategories}
      />
    </div>
  );
}
