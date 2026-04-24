import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Gün Sonu Atomic Finalize API Route
 *
 * Server Action alternatifi — Next.js 14.2 dev mode'da server action
 * connection pool'u bazen takılıyor. API route daha stabil.
 *
 * TEK UPDATE ile declared + variance + close_at hepsini birlikte yazar.
 */

type Body = {
  declared_cash: number;
  declared_card: number;
  card_expected: number;
  cash_variance: number;
  card_variance: number;
  expected_cash: number; // Client'ın hesapladığı beklenen nakit (opening + payments - refunds)
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmamışsınız' },
        { status: 401 }
      );
    }

    const { data: membership } = await supabase
      .from('business_members')
      .select('id, business_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'İşletme üyeliği bulunamadı' },
        { status: 403 }
      );
    }

    // 2. Body parse
    const input: Body = await req.json();

    // 3. Admin client ile direct queries (nested action YOK)
    // NOT: cash_drawer_sessions type'ı generated types'ta yok, any cast ile bypass
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any;

    // Active session bul (sadece id lazım, diğer alanları body'den alıyoruz)
    const { data: activeSess, error: sessErr } = await admin
      .from('cash_drawer_sessions')
      .select('id')
      .eq('business_id', membership.business_id)
      .is('closed_at', null)
      .maybeSingle();

    if (sessErr) {
      return NextResponse.json(
        { success: false, error: sessErr.message },
        { status: 500 }
      );
    }
    if (!activeSess) {
      return NextResponse.json(
        { success: false, error: 'Açık kasa oturumu yok' },
        { status: 404 }
      );
    }

    const expected = Number(input.expected_cash ?? 0);
    const counted = Number(input.declared_cash);
    const difference = counted - expected;

    // TEK UPDATE: declared + variance + close atomik
    const { error } = await admin
      .from('cash_drawer_sessions')
      .update({
        // Close fields
        closed_at: new Date().toISOString(),
        closed_by: membership.id,
        counted_amount: counted,
        expected_amount: expected,
        difference,
        closing_note: input.note || 'Gün Sonu ile otomatik kapatıldı',
        // Declared/variance fields (migration 0026)
        declared_cash: Number(input.declared_cash),
        declared_card: Number(input.declared_card),
        card_expected: Number(input.card_expected),
        cash_variance: Number(input.cash_variance),
        card_variance: Number(input.card_variance),
      })
      .eq('id', activeSess.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: activeSess.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
