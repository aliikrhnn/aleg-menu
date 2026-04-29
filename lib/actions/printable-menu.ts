'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type PrintableMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  hero_icon: string | null;
  is_featured: boolean;
  status: string;
};

export type PrintableMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  hero_icon: string | null;
  products: PrintableMenuProduct[];
};

export type PrintableMenuData = {
  business: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    city: string | null;
    tagline_tr: string | null;
    address: string | null;
    phone: string | null;
    instagram: string | null;
    website: string | null;
  };
  categories: PrintableMenuCategory[];
  qr_url: string;
};

/**
 * Basılı menü için tüm veriyi tek seferde çeker.
 * Sadece aktif kategoriler ve aktif ürünler — tükendi olanlar gösterilmez.
 */
export async function getPrintableMenuData(): Promise<{
  success: boolean;
  data?: PrintableMenuData;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Giriş yapmamışsınız' };
    }

    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return { success: false, error: 'İşletme üyeliği bulunamadı' };
    }

    const admin = createAdminClient();
    const businessId = membership.business_id as string;

    // Paralel sorgular
    const [businessRes, categoriesRes, productsRes] = await Promise.all([
      admin
        .from('businesses')
        .select(
          'id, name, slug, logo_url, city, tagline_tr, address, phone, instagram, website'
        )
        .eq('id', businessId)
        .maybeSingle(),
      admin
        .from('categories')
        .select('id, name, description, hero_icon, sort_order')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      admin
        .from('products')
        .select(
          'id, category_id, name, description, price, hero_icon, is_featured, status, sort_order'
        )
        .eq('business_id', businessId)
        .eq('status', 'active') // sadece aktif - tükendiler basılmaz
        .order('sort_order', { ascending: true }),
    ]);

    const business = businessRes.data;
    if (!business) {
      return { success: false, error: 'İşletme bulunamadı' };
    }

    // i18n alanlarını TR'ye çöz (basılı menü TR)
    const pickTr = (
      raw: string | { tr?: string; en?: string } | null | undefined
    ): string => {
      if (!raw) return '';
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'object') return raw.tr || raw.en || '';
      return '';
    };

    const categories: PrintableMenuCategory[] = (categoriesRes.data || []).map(
      (c) => ({
        id: c.id as string,
        name: pickTr(c.name as never),
        description: pickTr(c.description as never) || null,
        hero_icon: (c.hero_icon as string) || null,
        products: [],
      })
    );

    // Ürünleri kategorilere yerleştir
    const catMap = new Map<string, PrintableMenuCategory>(
      categories.map((c) => [c.id, c])
    );
    (productsRes.data || []).forEach((p) => {
      const cat = catMap.get(p.category_id as string);
      if (!cat) return;
      cat.products.push({
        id: p.id as string,
        name: pickTr(p.name as never),
        description: pickTr(p.description as never) || null,
        price: parseFloat(String(p.price || 0)),
        hero_icon: (p.hero_icon as string) || null,
        is_featured: !!p.is_featured,
        status: p.status as string,
      });
    });

    // Boş kategorileri filtrele
    const nonEmpty = categories.filter((c) => c.products.length > 0);

    // QR URL
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';
    const qrUrl = `https://${business.slug}.${rootDomain}`;

    return {
      success: true,
      data: {
        business: {
          id: business.id as string,
          name: business.name as string,
          slug: business.slug as string,
          logo_url: (business.logo_url as string) || null,
          city: (business.city as string) || null,
          tagline_tr: (business.tagline_tr as string) || null,
          address: (business.address as string) || null,
          phone: (business.phone as string) || null,
          instagram: (business.instagram as string) || null,
          website: (business.website as string) || null,
        },
        categories: nonEmpty,
        qr_url: qrUrl,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
