import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  const currentHost = hostname
    .replace(`.${ROOT_DOMAIN}`, '')
    .replace('.localhost:3000', '')
    .replace(':3000', '');

  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let rewrittenPath = url.pathname;
  let isAdminSubdomain = false;
  let isPanelSubdomain = false;

  const isRootDomain =
    currentHost === ROOT_DOMAIN ||
    currentHost === 'localhost' ||
    currentHost === 'www' ||
    hostname === ROOT_DOMAIN;

  if (isRootDomain) {
    // Root domain - olduğu gibi
  } else if (currentHost === 'admin') {
    isAdminSubdomain = true;
    if (!url.pathname.startsWith('/admin')) {
      rewrittenPath = `/admin${url.pathname}`;
    }
  } else if (currentHost === 'panel') {
    isPanelSubdomain = true;
    // /kasa ve /garson route'ları ana app altında — panel'de de
    // doğrudan erişilebilsin, /panel prefix'i eklenmesin
    const isStandaloneRoute =
      url.pathname.startsWith('/kasa') ||
      url.pathname.startsWith('/garson');

    if (!url.pathname.startsWith('/panel') && !isStandaloneRoute) {
      rewrittenPath = `/panel${url.pathname}`;
    }
    // /kasa, /garson ise rewrittenPath = url.pathname (değiştirilmedi)
  } else {
    if (!url.pathname.startsWith('/menu')) {
      rewrittenPath = `/menu/${currentHost}${url.pathname}`;
    }
  }

  // ============================================================
  // ADMIN AUTH CHECK
  // ============================================================
  if (
    isAdminSubdomain &&
    !url.pathname.startsWith('/giris') &&
    !rewrittenPath.startsWith('/admin/giris')
  ) {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/giris', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const { data: isSuperAdmin } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!isSuperAdmin) {
      const loginUrl = new URL('/giris?error=not_authorized', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ============================================================
  // PANEL AUTH CHECK
  // ============================================================
  if (
    isPanelSubdomain &&
    !url.pathname.startsWith('/giris') &&
    !rewrittenPath.startsWith('/panel/giris')
  ) {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/giris', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Business member mi kontrol et
    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      // Member değilse login'e yönlendir
      const loginUrl = new URL('/giris?error=no_business', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (rewrittenPath !== url.pathname) {
    url.pathname = rewrittenPath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
