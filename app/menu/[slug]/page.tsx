import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveQrSlug } from '@/lib/actions/qr';
import { getPublicCallButtons } from '@/lib/actions/call-buttons';
import { MenuView } from './menu-view';
import { MenuThemeWrapper } from './menu-theme-wrapper';
import { BusinessExtras } from './business-extras';
import { resolveTheme, buildThemeCSS } from '@/lib/menu-themes';
import type { LocalizedText } from '@/types/database';

interface Props {
  params: { slug: string };
  searchParams: {
    t?: string;
    preview_theme?: string;
    preview_accent?: string;
    preview_font?: string;
  };
}

// Beslenme/alerjen güncellemeleri anında yansısın - dinamik render
// Performans için ileride revalidate=30-60 yapılabilir, ama şimdilik 0
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function CustomerMenuPage({ params, searchParams }: Props) {
  // Admin client - anonim müşteri için RLS bypass (sadece menüye okuma)
  // businesses/categories/products public okuma policy'si olmadığı için admin gerekli
  const supabase = createAdminClient();

  // 1. İşletmeyi slug'dan bul
  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, logo_url, city, subscription_status, settings, app_config, order_config, menu_theme, instagram, facebook, website')
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

  // QR slug'ı varsa masa bilgisini çöz
  let qrTable: { id: string; name: string } | null = null;
  if (searchParams?.t) {
    const qrResult = await resolveQrSlug(business.id, searchParams.t);
    if (qrResult.success && qrResult.table_id && qrResult.table_name) {
      qrTable = { id: qrResult.table_id, name: qrResult.table_name };
    }
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
    .select('id, category_id, name, description, price, status, is_featured, hero_icon, hero_image_url, sort_order, allergens, calories, serving_size, ingredients, contains_alcohol, dietary_tags')
    .eq('business_id', business.id)
    .in('status', ['active', 'soldout'])
    .order('sort_order', { ascending: true });

  // Ürünlerin varyasyonlarını çek
  const productIds = (products || []).map((p) => p.id);
  const { data: productPresets } = productIds.length
    ? await supabase
        .from('product_option_presets')
        .select('product_id, preset_id, sort_order')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true })
    : { data: [] };

  const presetIds = [...new Set((productPresets || []).map((pp) => pp.preset_id))];

  const { data: presets } = presetIds.length
    ? await supabase
        .from('option_presets')
        .select('id, name, type, required, sort_order')
        .in('id', presetIds)
    : { data: [] };

  const { data: presetValues } = presetIds.length
    ? await supabase
        .from('option_preset_values')
        .select('id, preset_id, name, price_delta, is_default, sort_order')
        .in('preset_id', presetIds)
        .order('sort_order', { ascending: true })
    : { data: [] };

  // Tip dönüşümleri (LocalizedText)
  const formattedCategories = (categories || []).map((c) => ({
    id: c.id,
    name: c.name as LocalizedText,
    description: c.description as LocalizedText | null,
    hero_icon: c.hero_icon,
  }));

  // Her ürün için preset listesi
  const productPresetsMap = new Map<string, string[]>();
  (productPresets || []).forEach((pp) => {
    if (!productPresetsMap.has(pp.product_id)) {
      productPresetsMap.set(pp.product_id, []);
    }
    productPresetsMap.get(pp.product_id)!.push(pp.preset_id);
  });

  // Preset → values eşlemesi
  const presetMap = new Map(
    (presets || []).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name as LocalizedText,
        type: p.type as 'single' | 'multi',
        required: p.required,
        values: (presetValues || [])
          .filter((v) => v.preset_id === p.id)
          .map((v) => ({
            id: v.id,
            name: v.name as LocalizedText,
            price_delta: Number(v.price_delta),
            is_default: v.is_default,
          })),
      },
    ])
  );

  const formattedProducts = (products || []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name as LocalizedText,
    description: p.description as LocalizedText | null,
    price: p.price,
    status: p.status as 'active' | 'soldout',
    is_featured: p.is_featured,
    hero_icon: p.hero_icon,
    hero_image_url: p.hero_image_url,
    presets: (productPresetsMap.get(p.id) || [])
      .map((pid) => presetMap.get(pid))
      .filter((p): p is NonNullable<typeof p> => p !== undefined),
    // Beslenme & alerjen (Sprint 1B - Türkiye yasal uyum)
    allergens: (p.allergens as string[] | null) || [],
    calories: (p.calories as number | null) ?? null,
    serving_size: (p.serving_size as string | null) ?? null,
    ingredients: (p.ingredients as LocalizedText | null) ?? null,
    contains_alcohol: (p.contains_alcohol as boolean | null) ?? false,
    dietary_tags: (p.dietary_tags as string[] | null) || [],
  }));

  // Çağrı butonlarını çek (panel'den eklenmiş aktif olanlar)
  const callButtonsResult = await getPublicCallButtons(business.id);
  const callButtons = callButtonsResult.success
    ? callButtonsResult.buttons || []
    : [];

  // Tema yükle ve CSS oluştur
  // Önizleme parametreleri varsa onları kullan (panelden iframe ile çağrılırken)
  const validPresets = [
    'brutalist',
    'elite',
    'modern',
    'vintage',
    'minimal',
    'mediterranean',
    'darkluxe',
  ];
  type ValidPreset =
    | 'brutalist'
    | 'elite'
    | 'modern'
    | 'vintage'
    | 'minimal'
    | 'mediterranean'
    | 'darkluxe';
  const previewPreset =
    searchParams.preview_theme &&
    validPresets.includes(searchParams.preview_theme)
      ? (searchParams.preview_theme as ValidPreset)
      : null;
  const previewAccent =
    searchParams.preview_accent === 'default'
      ? null
      : searchParams.preview_accent &&
        /^[0-9A-Fa-f]{6}$/.test(searchParams.preview_accent)
      ? `#${searchParams.preview_accent}`
      : undefined; // undefined = "preview vermedi", DB'den oku

  const themeConfig = (business.menu_theme as {
    preset?: string;
    accent_override?: string | null;
    font_preset?: string;
    wifi?: {
      ssid?: string | null;
      password?: string | null;
      security?: 'WPA' | 'WPA3' | 'WEP' | 'nopass';
      hidden?: boolean;
    } | null;
    social_links?: {
      tiktok?: string | null;
      x?: string | null;
      youtube?: string | null;
      threads?: string | null;
      linkedin?: string | null;
    } | null;
  } | null) || null;

  const finalPreset: ValidPreset =
    previewPreset ||
    (themeConfig?.preset && validPresets.includes(themeConfig.preset)
      ? (themeConfig.preset as ValidPreset)
      : 'brutalist');
  const finalAccent =
    previewAccent !== undefined
      ? previewAccent
      : themeConfig?.accent_override || null;

  // Font preset
  const validFonts = ['serif', 'sans', 'display', 'mono'] as const;
  type FontPreset = (typeof validFonts)[number];
  // Önce preview (panelden iframe ile gelen), sonra DB
  const previewFont = validFonts.includes(
    (searchParams.preview_font || '') as FontPreset
  )
    ? (searchParams.preview_font as FontPreset)
    : null;
  const finalFont: FontPreset =
    previewFont ||
    (validFonts.includes((themeConfig?.font_preset || '') as FontPreset)
      ? (themeConfig!.font_preset as FontPreset)
      : 'serif');

  const resolvedTheme = resolveTheme({
    preset: finalPreset,
    accent_override: finalAccent,
  });
  const themeCSS = buildThemeCSS(resolvedTheme, '[data-menu-theme]');

  // ============ FONT CSS (data-menu-font'a göre) ============
  // Müşteri menüsünde 69+ yerde inline `var(--f-serif)` kullanılıyor.
  // h1/h2/h3 selector'ü yetersiz çünkü çoğu başlık div/span olarak yazılmış.
  // Çözüm: değişkenin kendisini scope'lu olarak override etmek. Tema CSS'i
  // önce render olur, fontCSS sonra → fontCSS kazanır.
  const fontCSS = `
    [data-menu-font="serif"] {
      --f-serif: "Instrument Serif", "Cormorant Garamond", Georgia, serif !important;
    }
    [data-menu-font="sans"] {
      --f-serif: "Inter", "Helvetica Neue", system-ui, sans-serif !important;
      --f-sans: "Inter", "Helvetica Neue", system-ui, sans-serif !important;
    }
    [data-menu-font="display"] {
      --f-serif: "Bricolage Grotesque", "Inter", sans-serif !important;
      --f-sans: "Bricolage Grotesque", "Inter", sans-serif !important;
    }
    [data-menu-font="mono"] {
      --f-serif: "JetBrains Mono", "Courier New", monospace !important;
      --f-sans: "JetBrains Mono", "Courier New", monospace !important;
    }
  `;

  // ============ WIFI QR ============
  // WIFI:T:WPA;S:NetworkName;P:Password;H:false;;
  const wifi = {
    ssid: themeConfig?.wifi?.ssid || null,
    password: themeConfig?.wifi?.password || null,
    security: (themeConfig?.wifi?.security || 'WPA') as
      | 'WPA'
      | 'WPA3'
      | 'WEP'
      | 'nopass',
    hidden: !!themeConfig?.wifi?.hidden,
    qrDataUrl: null as string | null,
  };

  if (wifi.ssid) {
    const escape = (s: string) =>
      s.replace(/([\\;,":])/g, '\\$1');
    const wifiSec = wifi.security === 'WPA3' ? 'WPA' : wifi.security; // WPA3 → WPA fallback
    const wifiString =
      wifi.security === 'nopass'
        ? `WIFI:T:nopass;S:${escape(wifi.ssid)};${
            wifi.hidden ? 'H:true;' : ''
          };`
        : `WIFI:T:${wifiSec};S:${escape(wifi.ssid)};P:${escape(
            wifi.password || ''
          )};${wifi.hidden ? 'H:true;' : ''};`;
    try {
      wifi.qrDataUrl = await QRCode.toDataURL(wifiString, {
        margin: 1,
        width: 360,
        color: { dark: '#1a1a1a', light: '#FFFFFF' },
      });
    } catch {
      wifi.qrDataUrl = null;
    }
  }

  // ============ SOSYAL MEDYA QR ============
  // Hem mevcut alanlar (instagram/facebook/website) hem yenileri (tiktok/x/...)
  const socialEntries: Array<{ id: string; label: string; url: string; icon: string }> = [];
  const pushSocial = (
    id: string,
    label: string,
    url: string | null | undefined,
    icon: string
  ) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      socialEntries.push({ id, label, url, icon });
    }
  };
  pushSocial('instagram', 'Instagram', business.instagram, '📷');
  pushSocial('facebook', 'Facebook', business.facebook, '📘');
  pushSocial('website', 'Web', business.website, '🌐');
  pushSocial('tiktok', 'TikTok', themeConfig?.social_links?.tiktok, '🎵');
  pushSocial('x', 'X', themeConfig?.social_links?.x, '𝕏');
  pushSocial('youtube', 'YouTube', themeConfig?.social_links?.youtube, '▶');
  pushSocial('threads', 'Threads', themeConfig?.social_links?.threads, '@');
  pushSocial('linkedin', 'LinkedIn', themeConfig?.social_links?.linkedin, 'in');

  const socialLinks: Array<{
    id: string;
    label: string;
    url: string;
    qrDataUrl: string;
    icon: string;
  }> = [];
  for (const s of socialEntries) {
    try {
      const qr = await QRCode.toDataURL(s.url, {
        margin: 1,
        width: 240,
        color: { dark: '#1a1a1a', light: '#FFFFFF' },
      });
      socialLinks.push({ ...s, qrDataUrl: qr });
    } catch {
      // QR oluşturulamadıysa atla
    }
  }

  return (
    <>
      {/* Tema CSS scope'lu olarak uygulanır */}
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <style dangerouslySetInnerHTML={{ __html: fontCSS }} />
      <div
        data-menu-theme={resolvedTheme.id}
        data-menu-font={finalFont}
        style={{ position: 'relative', minHeight: '100vh' }}
      >
        <MenuThemeWrapper
          theme={resolvedTheme}
          businessName={business.name}
          isPreview={!!previewPreset}
        >
          {/* Wifi + Sosyal medya QR — sticky topbar (en üstte) */}
          <BusinessExtras wifi={wifi} socialLinks={socialLinks} />

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
            qrTable={qrTable}
            orderConfig={
              business.order_config || {
                modes: { dinein: true, pickup: true, delivery: false },
                online_enabled: true,
              }
            }
            callButtons={callButtons}
          />
        </MenuThemeWrapper>
      </div>
    </>
  );
}
