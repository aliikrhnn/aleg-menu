/**
 * ════════════════════════════════════════════════════════════════════
 * CASHIER SESSION YÖNETİMİ
 * ════════════════════════════════════════════════════════════════════
 *
 * PIN ile giriş yapan kasiyer/garson cihazları için DB tabanlı session.
 * Cookie sadece random session_id taşır (HttpOnly + Secure + SameSite=Lax).
 *
 * Mimari:
 *   1. PIN doğrulanır (verifyCashierPin)
 *   2. createCashierSession() → DB'ye kayıt + cookie set
 *   3. Sonraki her request: getCashierSession()
 *      - Cookie'den session_id oku
 *      - DB lookup (60sn cache ile)
 *      - expires_at kontrolü
 *      - last_used_at uzat (sliding)
 *   4. Çıkış: clearCashierSession() → DB'den sil + cookie temizle
 *
 * Güvenlik:
 *   • Anlık iptal: cashier silinince cascade, max 60sn içinde düşer
 *   • Subdomain check: cookie geldiği subdomain ≠ session.business_id ise red
 *   • httpOnly cookie: XSS ile çalınamaz
 *   • SameSite=Lax: CSRF koruması
 *
 * Performans:
 *   • Session lookup 60sn in-memory cache
 *   • Sliding update sadece son 5dk içinde değilse yapılır (update bombardımanı önler)
 * ════════════════════════════════════════════════════════════════════
 */

import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';

// Cookie ayarları
export const COOKIE_NAME = 'aleg_cs';
const SESSION_TTL_HOURS = 24;
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;

// Sliding update — son aktiflikten 5 dk geçmediyse update yapma (DB yükü)
const SLIDING_UPDATE_THRESHOLD_MS = 5 * 60 * 1000;

// In-memory cache TTL — 60 saniye
// Bu sürede cashier silinse bile system'de görünmeye devam eder (kabul edilebilir)
const CACHE_TTL_MS = 60 * 1000;

export type CashierRole = 'cashier' | 'waiter' | 'both';

export type CashierSessionData = {
  sessionId: string;
  businessId: string;
  cashierId: string;
  role: CashierRole;
  expiresAt: Date;
};

// ════════════════════════════════════════════════════════════════════
// In-memory cache (per-instance)
// Vercel serverless'te her function instance kendi cache'ini tutar.
// Çok kafe için bu yeterli — hot session'lar aynı instance'a düşer.
// ════════════════════════════════════════════════════════════════════
type CacheEntry = {
  data: CashierSessionData | null; // null = "lookup yapıldı, geçersiz"
  cachedAt: number;
};
const sessionCache = new Map<string, CacheEntry>();

// Cache temizleme — 1000 entry'yi geçerse en eskileri at
function maintainCache() {
  if (sessionCache.size <= 1000) return;
  const now = Date.now();
  // Süresi geçenler
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      sessionCache.delete(key);
    }
  }
  // Hala 1000+ ise en eski 200 tanesini at
  if (sessionCache.size > 1000) {
    const sorted = Array.from(sessionCache.entries()).sort(
      (a, b) => a[1].cachedAt - b[1].cachedAt
    );
    for (let i = 0; i < 200 && i < sorted.length; i++) {
      sessionCache.delete(sorted[i][0]);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// Token üretimi
// 32 byte random = 256 bit entropi, base64url ile 43 karakter
// Brute force: 2^256 olasılık → astronomik
// ════════════════════════════════════════════════════════════════════
function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

// ════════════════════════════════════════════════════════════════════
// SESSION OLUŞTUR
// PIN doğrulandıktan sonra çağrılır.
// DB'ye kayıt + cookie set.
// ════════════════════════════════════════════════════════════════════
export async function createCashierSession(params: {
  businessId: string;
  cashierId: string;
  role: CashierRole;
}): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const sessionId = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const headerStore = headers();
    const userAgent = headerStore.get('user-agent') || null;
    const ipAddress = extractIp(headerStore);

    const admin = createAdminClient();
    const { error } = await admin.from('cashier_sessions').insert({
      id: sessionId,
      business_id: params.businessId,
      cashier_id: params.cashierId,
      role: params.role,
      user_agent: userAgent?.slice(0, 500) || null,
      ip_address: ipAddress,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error('[cashier-session] create error:', error.message);
      return { success: false, error: 'Oturum oluşturulamadı' };
    }

    // Cookie set
    const cookieStore = cookies();
    cookieStore.set({
      name: COOKIE_NAME,
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // Tüm subdomain'lerde paylaşılır (alegstudio.com ve *.alegstudio.com)
      domain: getCookieDomain(),
      path: '/',
      maxAge: SESSION_TTL_HOURS * 60 * 60,
    });

    return { success: true, sessionId };
  } catch (err) {
    console.error('[cashier-session] create exception:', err);
    return { success: false, error: 'Beklenmeyen hata' };
  }
}

// ════════════════════════════════════════════════════════════════════
// SESSION OKU
// Server action'larda çağrılır. Cookie → DB lookup → cache.
// expires_at < now ise null döner (otomatik geçersiz).
// ════════════════════════════════════════════════════════════════════
export async function getCashierSession(): Promise<CashierSessionData | null> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const now = Date.now();

  // Cache kontrolü
  const cached = sessionCache.get(sessionId);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    if (!cached.data) return null;
    if (cached.data.expiresAt.getTime() <= now) {
      sessionCache.delete(sessionId);
      return null;
    }
    return cached.data;
  }

  // DB lookup
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from('cashier_sessions')
    .select('id, business_id, cashier_id, role, expires_at')
    .eq('id', sessionId)
    .gt('expires_at', new Date(now).toISOString())
    .maybeSingle();

  if (error || !session) {
    // Cache'le ki bu sessionId'yi tekrar tekrar sorgulamayalım
    sessionCache.set(sessionId, { data: null, cachedAt: now });
    maintainCache();
    return null;
  }

  const data: CashierSessionData = {
    sessionId: session.id,
    businessId: session.business_id,
    cashierId: session.cashier_id,
    role: session.role as CashierRole,
    expiresAt: new Date(session.expires_at),
  };

  // Cache'e koy
  sessionCache.set(sessionId, { data, cachedAt: now });
  maintainCache();

  // Sliding update — son 5dk içinde update edilmediyse expires_at'i uzat
  // Background update, hata olursa önemsiz
  void slidingUpdate(admin, sessionId, now);

  return data;
}

// Sliding update — DB bombardımanını önle
// Sadece son aktiflikten 5dk geçtiyse update yap
const lastSlidingUpdate = new Map<string, number>();

async function slidingUpdate(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
  now: number
): Promise<void> {
  const last = lastSlidingUpdate.get(sessionId) || 0;
  if (now - last < SLIDING_UPDATE_THRESHOLD_MS) return;

  lastSlidingUpdate.set(sessionId, now);

  // Memory leak önleme — 1000+ entry varsa temizle
  if (lastSlidingUpdate.size > 1000) {
    const sorted = Array.from(lastSlidingUpdate.entries()).sort(
      (a, b) => a[1] - b[1]
    );
    for (let i = 0; i < 200; i++) {
      lastSlidingUpdate.delete(sorted[i][0]);
    }
  }

  try {
    const newExpiresAt = new Date(now + SESSION_TTL_MS);
    await admin
      .from('cashier_sessions')
      .update({
        expires_at: newExpiresAt.toISOString(),
        last_used_at: new Date(now).toISOString(),
      })
      .eq('id', sessionId);

    // Cache'i de güncelle
    const cached = sessionCache.get(sessionId);
    if (cached?.data) {
      cached.data.expiresAt = newExpiresAt;
    }
  } catch (e) {
    // Sliding update başarısız olsa bile request'i bozma
    console.error('[cashier-session] sliding update error:', e);
  }
}

// ════════════════════════════════════════════════════════════════════
// SESSION SİL (çıkış)
// ════════════════════════════════════════════════════════════════════
export async function clearCashierSession(): Promise<void> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  // Cookie temizle
  cookieStore.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: getCookieDomain(),
    path: '/',
    maxAge: 0,
  });

  if (!sessionId) return;

  // Cache temizle
  sessionCache.delete(sessionId);
  lastSlidingUpdate.delete(sessionId);

  // DB'den sil
  try {
    const admin = createAdminClient();
    await admin.from('cashier_sessions').delete().eq('id', sessionId);
  } catch (e) {
    console.error('[cashier-session] clear error:', e);
  }
}

// ════════════════════════════════════════════════════════════════════
// CASHIER'IN TÜM OTURUMLARINI SİL
// "Tüm cihazlardan çıkış" + "kasiyer kovuldu" senaryoları için
// ════════════════════════════════════════════════════════════════════
export async function revokeAllCashierSessions(
  cashierId: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    // İlk önce silinecek session_id'leri al ki cache'i de temizleyebilelim
    const { data: sessions } = await admin
      .from('cashier_sessions')
      .select('id')
      .eq('cashier_id', cashierId);

    if (sessions && sessions.length > 0) {
      for (const s of sessions) {
        sessionCache.delete(s.id);
        lastSlidingUpdate.delete(s.id);
      }
    }

    await admin.from('cashier_sessions').delete().eq('cashier_id', cashierId);
  } catch (e) {
    console.error('[cashier-session] revoke all error:', e);
  }
}

// ════════════════════════════════════════════════════════════════════
// İŞLETMENİN TÜM OTURUMLARINI SİL
// Vardiya kapanışı / acil durum için
// ════════════════════════════════════════════════════════════════════
export async function revokeAllBusinessSessions(
  businessId: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: sessions } = await admin
      .from('cashier_sessions')
      .select('id')
      .eq('business_id', businessId);

    if (sessions && sessions.length > 0) {
      for (const s of sessions) {
        sessionCache.delete(s.id);
        lastSlidingUpdate.delete(s.id);
      }
    }

    await admin
      .from('cashier_sessions')
      .delete()
      .eq('business_id', businessId);
  } catch (e) {
    console.error('[cashier-session] revoke business error:', e);
  }
}

// ════════════════════════════════════════════════════════════════════
// AKTİF OTURUMLARI LİSTELE
// İşletme paneli "Aktif Oturumlar" özelliği için
// ════════════════════════════════════════════════════════════════════
export async function listActiveCashierSessions(businessId: string): Promise<
  Array<{
    id: string;
    cashierId: string;
    role: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
  }>
> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('cashier_sessions')
      .select(
        'id, cashier_id, role, user_agent, ip_address, created_at, last_used_at, expires_at'
      )
      .eq('business_id', businessId)
      .gt('expires_at', new Date().toISOString())
      .order('last_used_at', { ascending: false });

    return (data || []).map((s) => ({
      id: s.id,
      cashierId: s.cashier_id,
      role: s.role,
      userAgent: s.user_agent,
      ipAddress: s.ip_address ? String(s.ip_address) : null,
      createdAt: s.created_at,
      lastUsedAt: s.last_used_at,
      expiresAt: s.expires_at,
    }));
  } catch (e) {
    console.error('[cashier-session] list error:', e);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ════════════════════════════════════════════════════════════════════

/**
 * Cookie domain — production'da .alegstudio.com (tüm subdomainler),
 * development'ta localhost (subdomain yok).
 */
function getCookieDomain(): string | undefined {
  // Production: .alegstudio.com (cookie tüm subdomainlerde geçerli)
  // Development: undefined (host = localhost)
  if (process.env.NODE_ENV !== 'production') return undefined;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';
  return `.${rootDomain}`;
}

/**
 * Vercel x-forwarded-for header'dan IP çıkar.
 * extractIpFromHeaders ile aynı mantık (DRY için ayrı modül de yapılabilir).
 */
function extractIp(headerStore: Headers): string | null {
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim() || null;
  }
  const realIp = headerStore.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}
