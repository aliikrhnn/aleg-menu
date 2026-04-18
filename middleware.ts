import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Subdomain yönlendirme middleware'i.
 *
 * Yönlendirme kuralları:
 * - admin.alegstudio.com       → /admin/*
 * - panel.alegstudio.com       → /panel/*
 * - [slug].alegstudio.com      → /menu/[slug]/*  (örn: karakoy.alegstudio.com)
 * - alegstudio.com             → / (pazarlama sitesi)
 *
 * Geliştirme modunda (localhost):
 * - admin.localhost:3000       → /admin/*
 * - panel.localhost:3000       → /panel/*
 * - [slug].localhost:3000      → /menu/[slug]/*
 * - localhost:3000             → /
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Port'u temizle (localhost:3000 → localhost)
  const currentHost = hostname
    .replace(`.${ROOT_DOMAIN}`, '')
    .replace('.localhost:3000', '')
    .replace(':3000', '');

  // Zaten /admin, /panel veya /menu ile başlıyorsa karışma
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/panel') ||
    url.pathname.startsWith('/menu') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Kök domain → olduğu gibi devam et (pazarlama sitesi)
  if (
    currentHost === ROOT_DOMAIN ||
    currentHost === 'localhost' ||
    currentHost === 'www' ||
    hostname === ROOT_DOMAIN
  ) {
    return NextResponse.next();
  }

  // admin subdomain
  if (currentHost === 'admin') {
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // panel subdomain
  if (currentHost === 'panel') {
    url.pathname = `/panel${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Diğer tüm subdomain'ler → müşteri menüsü (örn: karakoy.alegstudio.com)
  url.pathname = `/menu/${currentHost}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Şunları hariç tut:
     * - API rotaları
     * - Static dosyalar
     * - Görsel optimizasyonu
     * - Favicon
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
