import { NextRequest } from 'next/server';
import {
  extractSlugFromHost,
  resolveSlugToBusiness,
} from '@/lib/security/slug-resolver';

/**
 * Dinamik PWA Manifest — Kasa uygulaması.
 *
 * Subdomain'den kafe slug'ını çıkarır, kafenin logosunu PWA ikonu yapar.
 *
 * Örnek:
 *   demo.alegstudio.com/api/manifest/kasa
 *   → name: "Demo Kafe Kasa"
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('host');
  const slug = extractSlugFromHost(host);

  let businessName = 'Aleg Kasa';
  let logoUrl: string | null = null;

  if (slug) {
    const business = await resolveSlugToBusiness(slug);
    if (business) {
      businessName = `${business.name} · Kasa`;
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
    return 'image/png';
  }

  // İkonlar: önce kafenin logosu (varsa), sonra her zaman default SVG fallback
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

  icons.push({
    src: '/icons/kasa-icon.svg',
    sizes: '512x512',
    type: 'image/svg+xml',
    purpose: 'any',
  });
  icons.push({
    src: '/icons/kasa-icon.svg',
    sizes: '192x192',
    type: 'image/svg+xml',
    purpose: 'maskable',
  });

  const manifest = {
    name: businessName,
    short_name: businessName.length > 12 ? 'Kasa' : businessName,
    description: `${businessName} - ödeme, sipariş, kasa yönetimi`,
    start_url: '/kasa',
    scope: '/kasa',
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
      'Cache-Control': 'public, max-age=300',
    },
  });
}
