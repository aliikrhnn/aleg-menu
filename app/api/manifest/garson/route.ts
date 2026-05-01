import { NextRequest } from 'next/server';
import {
  extractSlugFromHost,
  resolveSlugToBusiness,
} from '@/lib/security/slug-resolver';

/**
 * Dinamik PWA Manifest — Garson uygulaması.
 *
 * Subdomain'den kafe slug'ını çıkarır, kafenin logosunu PWA ikonu yapar.
 * Bu sayede her kafe kendi markası ile "ana ekrana ekle" yapabilir.
 *
 * Örnek:
 *   demo.alegstudio.com/api/manifest/garson
 *   → name: "Demo Kafe Garson"
 *   → icon: demo kafenin logo_url'i
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('host');
  const slug = extractSlugFromHost(host);

  let businessName = 'Aleg Garson';
  let logoUrl: string | null = null;

  if (slug) {
    const business = await resolveSlugToBusiness(slug);
    if (business) {
      businessName = `${business.name} · Garson`;
      logoUrl = business.logoUrl;
    }
  }

  // Logo URL'sinden MIME type tespit
  function detectMimeType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/png'; // varsayılan
  }

  // İkonlar: önce kafenin logosu (varsa), sonra her zaman default SVG fallback.
  // Default fallback olunca tarayıcı PNG yüklenemediğinde SVG'yi kullanır.
  const icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }> = [];

  if (logoUrl) {
    icons.push({
      src: logoUrl,
      sizes: '512x512',
      type: detectMimeType(logoUrl),
      purpose: 'any',
    });
    icons.push({
      src: logoUrl,
      sizes: '192x192',
      type: detectMimeType(logoUrl),
      purpose: 'maskable',
    });
  }

  // Her zaman default SVG fallback ekle (PNG/SVG yüklenemezse)
  icons.push({
    src: '/icons/garson-icon.svg',
    sizes: '512x512',
    type: 'image/svg+xml',
    purpose: 'any',
  });
  icons.push({
    src: '/icons/garson-icon.svg',
    sizes: '192x192',
    type: 'image/svg+xml',
    purpose: 'maskable',
  });

  const manifest = {
    name: businessName,
    short_name: businessName.length > 12 ? 'Garson' : businessName,
    description: `${businessName} - sipariş alma, masa yönetimi`,
    start_url: '/garson',
    scope: '/garson',
    display: 'standalone' as const,
    orientation: 'any' as const,
    theme_color: '#2A1F18',
    background_color: '#F4EEE2',
    lang: 'tr',
    icons,
  };

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Logo değişiklikleri 60sn içinde yansısın
      'Cache-Control': 'public, max-age=60, must-revalidate',
    },
  });
}
