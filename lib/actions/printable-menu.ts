'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type DietaryTag =
  | 'vegan'
  | 'vegetarian'
  | 'gluten_free'
  | 'lactose_free'
  | 'halal'
  | 'organic'
  | 'homemade';

export type PrintableMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  hero_icon: string | null;
  is_featured: boolean;
  is_chef_recommend: boolean;
  dietary_tags: DietaryTag[];
  spicy_level: number; // 0..3
  status: string;
};

export type PrintableMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  hero_icon: string | null;
  products: PrintableMenuProduct[];
};

export type PrintableMenuTable = {
  id: string;
  name: string; // "Masa 1", "Salon 3" vb.
  zone_name: string | null;
  qr_url: string; // Tam URL: https://slug.alegstudio.com/?t=xxx
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
    facebook: string | null;
    website: string | null;
    social_links: {
      tiktok: string | null;
      x: string | null;
      youtube: string | null;
      threads: string | null;
      linkedin: string | null;
    };
    created_year: number;
  };
  categories: PrintableMenuCategory[];
  qr_url: string;
  tables: PrintableMenuTable[];
};

/**
 * Basılı menü için tüm veriyi tek seferde çeker.
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

    const [businessRes, categoriesRes, productsRes, tablesRes, qrCodesRes] =
      await Promise.all([
        admin
          .from('businesses')
          .select(
            'id, name, slug, logo_url, city, tagline_tr, address, phone, instagram, facebook, website, created_at, menu_theme'
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
            'id, category_id, name, description, price, hero_icon, is_featured, is_chef_recommend, dietary_tags, spicy_level, status, sort_order'
          )
          .eq('business_id', businessId)
          .eq('status', 'active')
          .order('sort_order', { ascending: true }),
        admin
          .from('tables')
          .select('id, name, zone_id, table_zones(name)')
          .eq('business_id', businessId)
          .neq('status', 'inactive')
          .order('name', { ascending: true }),
        admin
          .from('qr_codes')
          .select('table_id, slug')
          .eq('business_id', businessId)
          .eq('active', true),
      ]);

    const business = businessRes.data;
    if (!business) {
      return { success: false, error: 'İşletme bulunamadı' };
    }

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

    const validTags: DietaryTag[] = [
      'vegan',
      'vegetarian',
      'gluten_free',
      'lactose_free',
      'halal',
      'organic',
      'homemade',
    ];

    const catMap = new Map<string, PrintableMenuCategory>(
      categories.map((c) => [c.id, c])
    );
    (productsRes.data || []).forEach((p) => {
      const cat = catMap.get(p.category_id as string);
      if (!cat) return;

      // Dietary tags - güvenli parse
      let dietaryTags: DietaryTag[] = [];
      try {
        const raw = p.dietary_tags;
        if (Array.isArray(raw)) {
          dietaryTags = raw.filter((t): t is DietaryTag =>
            validTags.includes(t as DietaryTag)
          );
        }
      } catch {
        dietaryTags = [];
      }

      const spicy = Number(p.spicy_level || 0);
      const safeSpicy = spicy >= 0 && spicy <= 3 ? spicy : 0;

      cat.products.push({
        id: p.id as string,
        name: pickTr(p.name as never),
        description: pickTr(p.description as never) || null,
        price: parseFloat(String(p.price || 0)),
        hero_icon: (p.hero_icon as string) || null,
        is_featured: !!p.is_featured,
        is_chef_recommend: !!p.is_chef_recommend,
        dietary_tags: dietaryTags,
        spicy_level: safeSpicy,
        status: p.status as string,
      });
    });

    const nonEmpty = categories.filter((c) => c.products.length > 0);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';
    const qrUrl = `https://${business.slug}.${rootDomain}`;

    // Masa listesini hazırla (mevcut QR slug'larıyla)
    const qrByTable = new Map<string, string>();
    (qrCodesRes.data || []).forEach((q) => {
      if (q.table_id) qrByTable.set(q.table_id as string, q.slug as string);
    });
    const tables: PrintableMenuTable[] = (tablesRes.data || [])
      .map((t) => {
        const zoneData = Array.isArray(t.table_zones)
          ? t.table_zones[0]
          : t.table_zones;
        const slug = qrByTable.get(t.id as string);
        if (!slug) return null; // QR henüz oluşturulmamışsa boyay
        return {
          id: t.id as string,
          name: t.name as string,
          zone_name:
            (zoneData as { name?: string } | null | undefined)?.name || null,
          qr_url: `https://${business.slug}.${rootDomain}/?t=${slug}`,
        };
      })
      .filter((x): x is PrintableMenuTable => x !== null);

    const createdYear = business.created_at
      ? new Date(business.created_at as string).getFullYear()
      : new Date().getFullYear();

    // menu_theme'den social_links'i parse et
    const rawTheme = business.menu_theme as
      | { social_links?: Partial<{
          tiktok: string;
          x: string;
          youtube: string;
          threads: string;
          linkedin: string;
        }> }
      | null;
    const socialLinks = {
      tiktok: rawTheme?.social_links?.tiktok || null,
      x: rawTheme?.social_links?.x || null,
      youtube: rawTheme?.social_links?.youtube || null,
      threads: rawTheme?.social_links?.threads || null,
      linkedin: rawTheme?.social_links?.linkedin || null,
    };

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
          facebook: (business.facebook as string) || null,
          website: (business.website as string) || null,
          social_links: socialLinks,
          created_year: createdYear,
        },
        categories: nonEmpty,
        qr_url: qrUrl,
        tables,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Logo'yu base64 dataURL olarak fetch et (PDF için)
// ============================================================
export async function fetchLogoAsDataUrl(
  logoUrl: string
): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  try {
    if (!logoUrl) return { success: false, error: 'Logo URL yok' };

    const res = await fetch(logoUrl);
    if (!res.ok) {
      return { success: false, error: 'Logo indirilemedi' };
    }
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const mime = res.headers.get('content-type') || 'image/png';
    return {
      success: true,
      dataUrl: `data:${mime};base64,${base64}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Logo hatası',
    };
  }
}
