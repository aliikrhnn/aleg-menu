/**
 * ════════════════════════════════════════════════════════════════════
 * SLUG → BUSINESS RESOLVER
 * ════════════════════════════════════════════════════════════════════
 *
 * Subdomain'den (örn. "demo") business_id ve temel kafe bilgisini
 * çözen yardımcı modül.
 *
 * Performans için kritik:
 *   • 50 kafe × 1000 req/dk = 50,000 req/dk slug lookup
 *   • Cache olmadan her request DB'ye gider → Supabase quota dolar
 *   • Cache ile %99 hit → DB'de 50 lookup / 5 dk
 *
 * Cache stratejisi:
 *   • In-memory Map (per-instance)
 *   • 5 dakika TTL — kafe ayarları değişebilir, çok uzun cache iyi değil
 *   • Negative cache (slug yok) — 60 saniye TTL (yanlış URL spam'ini engelle)
 *   • LRU benzeri temizleme (1000+ entry olunca eski'leri at)
 *
 * Subdomain → slug çıkarma:
 *   • host = "demo.alegstudio.com" → slug = "demo"
 *   • host = "panel.alegstudio.com" → slug = null (panel rezerve)
 *   • host = "admin.alegstudio.com" → slug = null (admin rezerve)
 *   • host = "alegstudio.com" → slug = null (root)
 *
 * Güvenlik:
 *   • Slug sadece DB'de var olan ile eşleşmeli
 *   • Subscription_status kontrolü ÇAĞRANIN sorumluluğunda (bu helper sadece resolve eder)
 * ════════════════════════════════════════════════════════════════════
 */

import { createAdminClient } from '@/lib/supabase/admin';

// Rezerve subdomainler — bunlar kafe slug'ı olamaz
const RESERVED_SUBDOMAINS = new Set([
  'panel',
  'admin',
  'www',
  'api',
  'app',
  'mail',
  'ftp',
  'localhost',
]);

// Cache TTL'leri
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika (positive)
const NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 1 dakika (slug bulunamadı)
const MAX_CACHE_SIZE = 1000;

export type ResolvedBusiness = {
  id: string;
  slug: string;
  name: string;
  subscriptionStatus: string | null;
};

type CacheEntry = {
  data: ResolvedBusiness | null; // null = "slug yok" (negative cache)
  cachedAt: number;
  ttl: number;
};

const slugCache = new Map<string, CacheEntry>();

// LRU benzeri temizleme — cache büyürse en eski entry'leri at
function maintainCache() {
  if (slugCache.size <= MAX_CACHE_SIZE) return;
  const sorted = Array.from(slugCache.entries()).sort(
    (a, b) => a[1].cachedAt - b[1].cachedAt
  );
  // En eski %20'sini at
  const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
  for (let i = 0; i < toRemove && i < sorted.length; i++) {
    slugCache.delete(sorted[i][0]);
  }
}

/**
 * Hostname'den (subdomain) slug çıkarır.
 *
 * Örnek:
 *   extractSlugFromHost("demo.alegstudio.com") → "demo"
 *   extractSlugFromHost("panel.alegstudio.com") → null (rezerve)
 *   extractSlugFromHost("alegstudio.com") → null (root)
 *   extractSlugFromHost("localhost:3000") → null (development root)
 */
export function extractSlugFromHost(host: string | null): string | null {
  if (!host) return null;

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';

  // Port'u temizle (development)
  const cleanHost = host.split(':')[0].toLowerCase();

  // Root domain mı?
  if (cleanHost === rootDomain || cleanHost === `www.${rootDomain}`) {
    return null;
  }

  // Localhost (development)
  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
    return null;
  }

  // Subdomain çıkar
  // "demo.alegstudio.com" → "demo"
  // "test.local.alegstudio.com" → "test.local" (multi-level subdomain — destekleniyor)
  if (cleanHost.endsWith(`.${rootDomain}`)) {
    const subdomain = cleanHost.slice(0, -(rootDomain.length + 1));
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return null;
    }
    // Slug formatı kontrolü — sadece a-z, 0-9, -
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomain)) {
      return null;
    }
    return subdomain;
  }

  // Development: "demo.localhost:3000" → "demo"
  if (cleanHost.endsWith('.localhost')) {
    const subdomain = cleanHost.slice(0, -'.localhost'.length);
    if (RESERVED_SUBDOMAINS.has(subdomain)) return null;
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomain)) return null;
    return subdomain;
  }

  return null;
}

/**
 * Slug'dan business bilgisini çözer (cache'li).
 *
 * Returns:
 *   • ResolvedBusiness — bulundu
 *   • null — slug yok / kafe pasif / cache miss + DB hata
 */
export async function resolveSlugToBusiness(
  slug: string
): Promise<ResolvedBusiness | null> {
  if (!slug) return null;

  const now = Date.now();
  const cached = slugCache.get(slug);

  // Cache hit (positive veya negative)
  if (cached && now - cached.cachedAt < cached.ttl) {
    return cached.data;
  }

  // DB lookup
  try {
    const admin = createAdminClient();
    const { data: business, error } = await admin
      .from('businesses')
      .select('id, slug, name, subscription_status')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[slug-resolver] DB error:', error.message);
      // Hata durumunda cache'leme (geçici sorun olabilir)
      return null;
    }

    if (!business) {
      // Negative cache — yanlış slug spam'ini engelle
      slugCache.set(slug, {
        data: null,
        cachedAt: now,
        ttl: NEGATIVE_CACHE_TTL_MS,
      });
      maintainCache();
      return null;
    }

    const resolved: ResolvedBusiness = {
      id: business.id,
      slug: business.slug,
      name: business.name,
      subscriptionStatus: business.subscription_status,
    };

    // Positive cache
    slugCache.set(slug, {
      data: resolved,
      cachedAt: now,
      ttl: CACHE_TTL_MS,
    });
    maintainCache();

    return resolved;
  } catch (err) {
    console.error('[slug-resolver] exception:', err);
    return null;
  }
}

/**
 * Hostname'den doğrudan business çözer (slug çıkarma + lookup birlikte).
 * Server action'larda kolaylık için.
 */
export async function resolveHostToBusiness(
  host: string | null
): Promise<ResolvedBusiness | null> {
  const slug = extractSlugFromHost(host);
  if (!slug) return null;
  return resolveSlugToBusiness(slug);
}

/**
 * Cache'i manuel olarak invalidate et.
 * İşletme bilgileri değiştiğinde (örn. slug değişti, abonelik iptal) çağrılır.
 */
export function invalidateSlugCache(slug?: string) {
  if (slug) {
    slugCache.delete(slug);
  } else {
    slugCache.clear();
  }
}
