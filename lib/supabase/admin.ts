import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * DİKKAT: Bu istemci service role key kullanır ve RLS'i BYPASS eder.
 * Sadece güvenli server-side ortamda kullanın (API routes, server actions).
 * Client bundle'a asla gitmemeli.
 *
 * Kullanım alanları:
 * - Süper admin işlemleri (yeni işletme oluşturma vs.)
 * - Webhooks (Stripe ödeme doğrulama vs.)
 * - Cross-tenant raporlar
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminClient sadece server-side kullanılabilir. Client bundle\'a sızdı!'
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
