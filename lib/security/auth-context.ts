/**
 * ════════════════════════════════════════════════════════════════════
 * AUTH CONTEXT
 * ════════════════════════════════════════════════════════════════════
 *
 * Server action'ların kullandığı birleşik authentication helper.
 * İki tip auth'u sırayla dener:
 *
 *   1. Panel oturumu (Supabase user, email/şifre)
 *      - Mevcut akış, business_members tablosundan businessId çözer
 *      - Panel'den giren işletme sahibi/personeli için
 *
 *   2. Cashier cookie session (PIN tabanlı, DB-backed)
 *      - Yeni subdomain rotalarından (cafe-x.alegstudio.com/kasa) gelir
 *      - Cookie'den session_id, DB'den businessId/cashierId çözer
 *      - Subdomain validation: cookie geldiği subdomain ≠ session.business_id
 *        ise REDDEDİLİR (subdomain spoofing koruması)
 *
 * Mevcut requireBusinessAccess() fonksiyonlarına DOKUNULMADI.
 * Onlar her action dosyasında local olarak tanımlı, aynen çalışıyor.
 *
 * Yeni helper fonksiyonlar şu şekilde isimlendirildi:
 *   • getBusinessContext() — başarılı veya null döner (silent)
 *   • requireBusinessContext() — başarılı veya throw (eski fonksiyona drop-in)
 *
 * Action dosyaları kademeli olarak yeniden bağlanacak (Paket 5).
 * ════════════════════════════════════════════════════════════════════
 */

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  getCashierSession,
  type CashierRole,
} from '@/lib/security/cashier-session';
import {
  extractSlugFromHost,
  resolveSlugToBusiness,
} from '@/lib/security/slug-resolver';

export type BusinessContext = {
  // Hangi işletme
  businessId: string;
  // Auth tipi — debug ve audit için faydalı
  authType: 'panel' | 'cashier';
  // Panel auth için
  user?: { id: string; email?: string };
  memberId?: string; // business_members.id
  // Cashier auth için
  cashierId?: string;
  cashierRole?: CashierRole;
};

// ════════════════════════════════════════════════════════════════════
// PANEL AUTH (mevcut akış — değişmedi)
// ════════════════════════════════════════════════════════════════════
async function tryPanelAuth(): Promise<BusinessContext | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: membership } = await supabase
      .from('business_members')
      .select('id, business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) return null;

    return {
      businessId: membership.business_id,
      authType: 'panel',
      user: { id: user.id, email: user.email },
      memberId: membership.id,
    };
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// CASHIER COOKIE AUTH (yeni akış)
//
// Subdomain validation kritik:
//   Cookie domain=.alegstudio.com → tüm subdomainlerde gönderilir
//   Eğer cafe-A'da PIN giren cashier cafe-B subdomain'ine girerse,
//   cookie gönderilir ama session.business_id ≠ cafe-B.business_id
//   → REDDEDİLİR
// ════════════════════════════════════════════════════════════════════
async function tryCashierAuth(): Promise<BusinessContext | null> {
  try {
    const session = await getCashierSession();
    if (!session) return null;

    // Subdomain validation
    const headerStore = headers();
    const host = headerStore.get('host');
    const slug = extractSlugFromHost(host);

    if (slug) {
      // Subdomain'den geliyor — slug'ı business_id'ye çevir, eşleşiyor mu?
      const business = await resolveSlugToBusiness(slug);
      if (!business) {
        // Subdomain bulunamadı — güvenli tarafa: reddet
        return null;
      }
      if (business.id !== session.businessId) {
        // ⚠ Subdomain spoofing girişimi
        // Cookie cafe-A'ya ait ama cafe-B subdomain'inden geliyor
        console.warn(
          `[auth-context] subdomain mismatch: session.bid=${session.businessId} vs slug.bid=${business.id}`
        );
        return null;
      }
      // Subscription kontrolü
      if (
        business.subscriptionStatus === 'suspended' ||
        business.subscriptionStatus === 'cancelled'
      ) {
        return null;
      }
    }
    // Subdomain yoksa (panel.alegstudio.com vb.) — slug check yok,
    // sadece session valid olduğu için kabul et.
    // Bu durum eski URL'de PIN ile girip orada kullananlar için.

    return {
      businessId: session.businessId,
      authType: 'cashier',
      cashierId: session.cashierId,
      cashierRole: session.role,
    };
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════

/**
 * Auth context'i çözer. Başarısızsa null döner (throw etmez).
 * Custom error handling gerektiren yerlerde kullanılır.
 */
export async function getBusinessContext(): Promise<BusinessContext | null> {
  // Önce panel oturumu (daha güvenli, daha eski)
  const panel = await tryPanelAuth();
  if (panel) return panel;

  // Sonra cashier cookie
  const cashier = await tryCashierAuth();
  if (cashier) return cashier;

  return null;
}

/**
 * Auth context'i çözer. Başarısızsa throw eder.
 * Mevcut requireBusinessAccess() fonksiyonlarına DROP-IN replacement.
 *
 * Eski fonksiyonun döndürdüğü { businessId, memberId, user } tipiyle uyumlu —
 * cashier auth ise memberId/user undefined olur.
 */
export async function requireBusinessContext(): Promise<BusinessContext> {
  const ctx = await getBusinessContext();
  if (!ctx) {
    throw new Error('Giriş yapmamışsınız');
  }
  return ctx;
}

/**
 * Sadece panel oturumu kabul eder.
 * Hassas admin işlemleri için (kasiyer ekleme, abonelik vs.).
 * Cashier cookie ile bypass edilemez.
 */
export async function requirePanelOnlyContext(): Promise<BusinessContext> {
  const panel = await tryPanelAuth();
  if (!panel) {
    throw new Error('Bu işlem için işletme paneli oturumu gerekiyor');
  }
  return panel;
}

/**
 * Sadece cashier session kabul eder.
 * Garson tablet, kasa gibi PIN-only akışlar için.
 * Panel oturumu varsa kullanmaz (kafe sahibi tabletten girerse cashier akışı çalışsın).
 */
export async function requireCashierOnlyContext(): Promise<BusinessContext> {
  const cashier = await tryCashierAuth();
  if (!cashier) {
    throw new Error('Geçerli bir kasiyer oturumu bulunamadı');
  }
  return cashier;
}
