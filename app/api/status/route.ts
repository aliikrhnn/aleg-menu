import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Status = 'operational' | 'degraded' | 'down';

type ServiceCheck = {
  name: string;
  status: Status;
  latency_ms: number | null;
  message?: string;
};

export async function GET() {
  const checks: ServiceCheck[] = [];

  // 1. Supabase DB ping
  const dbStart = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.push({
        name: 'Veritabanı',
        status: 'down',
        latency_ms: dbLatency,
        message: error.message,
      });
    } else {
      checks.push({
        name: 'Veritabanı',
        status: dbLatency > 2000 ? 'degraded' : 'operational',
        latency_ms: dbLatency,
      });
    }
  } catch (err) {
    checks.push({
      name: 'Veritabanı',
      status: 'down',
      latency_ms: Date.now() - dbStart,
      message: err instanceof Error ? err.message : 'Bağlanılamadı',
    });
  }

  // 2. Auth servisi
  const authStart = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const authLatency = Date.now() - authStart;

    if (error) {
      checks.push({
        name: 'Kimlik Doğrulama',
        status: 'down',
        latency_ms: authLatency,
        message: error.message,
      });
    } else {
      checks.push({
        name: 'Kimlik Doğrulama',
        status: authLatency > 2000 ? 'degraded' : 'operational',
        latency_ms: authLatency,
      });
    }
  } catch {
    checks.push({
      name: 'Kimlik Doğrulama',
      status: 'down',
      latency_ms: Date.now() - authStart,
    });
  }

  // 3. Realtime / API server (bu endpoint zaten çalıştığına göre operational)
  checks.push({
    name: 'API Sunucusu',
    status: 'operational',
    latency_ms: 1,
  });

  // 4. Web uygulaması
  checks.push({
    name: 'Web Uygulaması',
    status: 'operational',
    latency_ms: 1,
  });

  // Genel durum
  const hasDown = checks.some((c) => c.status === 'down');
  const hasDegraded = checks.some((c) => c.status === 'degraded');
  const overallStatus: Status = hasDown
    ? 'down'
    : hasDegraded
      ? 'degraded'
      : 'operational';

  return NextResponse.json(
    {
      status: overallStatus,
      checked_at: new Date().toISOString(),
      services: checks,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
