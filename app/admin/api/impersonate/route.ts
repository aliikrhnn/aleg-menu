import { NextRequest, NextResponse } from 'next/server';
import { startImpersonation } from '@/lib/actions/admin-dashboard';

/**
 * Login-as business
 *
 * POST /admin/api/impersonate
 * Body: { businessId: string }
 *
 * Süper admin'in, herhangi bir işletmenin paneline o işletme bağlamında
 * girmesini sağlar. Audit log'a kaydedilir (admin.impersonate action).
 *
 * NOT: Bu paket 1 versiyonunda sadece audit log'a kaydedip yönlendirme
 * yapıyor. Gerçek session/cookie tabanlı impersonation paket 2 veya
 * 4'te devreye alınacak.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId } = body || {};

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        { error: 'businessId gerekli' },
        { status: 400 },
      );
    }

    const result = await startImpersonation(businessId);

    return NextResponse.json({
      success: true,
      redirectTo: result.redirectTo,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Bir hata oluştu' },
      { status: 500 },
    );
  }
}
