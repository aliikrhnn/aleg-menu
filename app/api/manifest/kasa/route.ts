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

  const icons = logoUrl
    ? [
        {
          src: logoUrl,
          sizes: 'any',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ]
    : [
        {
          src: '/icons/kasa-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ];

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
