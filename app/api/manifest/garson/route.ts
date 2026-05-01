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

  // Manifest icon: kafe logosu veya default
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
        // Default: SVG icon (her boyutta scale eder)
        {
          src: '/icons/garson-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ];

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
      'Cache-Control': 'public, max-age=300', // 5 dakika cache
    },
  });
}
