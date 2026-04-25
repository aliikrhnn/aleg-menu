'use server';

import { createClient } from '@/lib/supabase/server';

export type NewOrderNotification = {
  id: string;
  business_id: string;
  table_id: string | null;
  table_name?: string | null;
  total: number;
  source: string;
  created_at: string;
  status: string;
};

// ============================================================
// İzin kontrolü helper
// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('id, business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { user, businessId: membership.business_id };
}

/**
 * Son N saniyede gelen yeni QR siparişlerini getir.
 * Bildirim için kullanılır - eski siparişler için ses çalmasın.
 */
export async function getRecentNewOrders(
  sinceSeconds: number = 30
): Promise<{
  success: boolean;
  orders?: NewOrderNotification[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();

    const since = new Date(Date.now() - sinceSeconds * 1000).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, business_id, table_id, total, source, created_at, status'
      )
      .eq('business_id', businessId)
      .eq('source', 'qr')
      .in('status', ['new', 'preparing', 'ready'])
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const orders = ((data || []) as unknown[]).map(
      (o) => o as NewOrderNotification
    );

    // Masa adlarını topla
    const tableIds = orders
      .map((o) => o.table_id)
      .filter((id): id is string => !!id);

    if (tableIds.length > 0) {
      const { data: tables } = await supabase
        .from('tables')
        .select('id, name')
        .in('id', tableIds);

      const tableMap = new Map<string, string>();
      ((tables || []) as unknown[]).forEach((t) => {
        const tt = t as { id: string; name: string };
        tableMap.set(tt.id, tt.name);
      });

      orders.forEach((o) => {
        if (o.table_id) o.table_name = tableMap.get(o.table_id) || null;
      });
    }

    return { success: true, orders };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
