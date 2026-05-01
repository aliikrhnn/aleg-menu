'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ============================================================
// İzin kontrolü - aktif business üyesi
// ============================================================
async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Panel oturumu yoksa cashier cookie + subdomain dene (yeni subdomain rotaları için)
  if (!user) {
    const { tryCashierFallback } = await import('@/lib/security/auth-context');
    const fallback = await tryCashierFallback();
    if (fallback) {
      return {
        user: null as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'],
        businessId: fallback.businessId,
      };
    }
    throw new Error('Giriş yapmamışsınız');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('id, business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { user, businessId: membership.business_id };
}

// ============================================================
// TİPLER
// ============================================================

export type CallButton = {
  id: string;
  business_id: string;
  name: string;
  emoji: string | null;
  color: string; // accent, gold, ok, super, danger
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type WaiterCall = {
  id: string;
  business_id: string;
  table_id: string | null;
  table_name?: string | null;
  button_id: string | null;
  button_name_snapshot: string | null;
  button_emoji_snapshot: string | null;
  note: string | null;
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at: string | null;
};

// ============================================================
// PANEL: Çağrı butonlarını listele
// ============================================================
export async function getCallButtons(): Promise<{
  success: boolean;
  buttons?: CallButton[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('call_buttons')
      .select('*')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      buttons: ((data || []) as unknown[]).map((b) => b as CallButton),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// PANEL: Yeni çağrı butonu oluştur
// ============================================================
export async function createCallButton(input: {
  name: string;
  emoji?: string | null;
  color?: string;
  sort_order?: number;
}): Promise<{ success: boolean; button?: CallButton; error?: string }> {
  try {
    if (!input.name?.trim()) {
      return { success: false, error: 'Buton adı boş olamaz' };
    }

    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('call_buttons')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        emoji: input.emoji?.trim() || null,
        color: input.color || 'accent',
        sort_order: input.sort_order ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/cagrilar');
    return { success: true, button: data as CallButton };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// PANEL: Çağrı butonu güncelle
// ============================================================
export async function updateCallButton(
  buttonId: string,
  patch: {
    name?: string;
    emoji?: string | null;
    color?: string;
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const updates: Record<string, unknown> = {};

    if (patch.name !== undefined) {
      if (!patch.name.trim()) {
        return { success: false, error: 'Buton adı boş olamaz' };
      }
      updates.name = patch.name.trim();
    }
    if (patch.emoji !== undefined) updates.emoji = patch.emoji?.trim() || null;
    if (patch.color !== undefined) updates.color = patch.color;
    if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
    if (patch.is_active !== undefined) updates.is_active = patch.is_active;

    const { error } = await supabase
      .from('call_buttons')
      .update(updates)
      .eq('id', buttonId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/cagrilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// PANEL: Çağrı butonu sil
// ============================================================
export async function deleteCallButton(
  buttonId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('call_buttons')
      .delete()
      .eq('id', buttonId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/cagrilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// PANEL: Buton sıralarını topluca güncelle (drag-drop)
// ============================================================
export async function reorderCallButtons(
  buttons: Array<{ id: string; sort_order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    // Tek tek update (idempotent)
    for (const b of buttons) {
      const { error } = await supabase
        .from('call_buttons')
        .update({ sort_order: b.sort_order })
        .eq('id', b.id);
      if (error) return { success: false, error: error.message };
    }
    revalidatePath('/panel/cagrilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// QR MENÜ: Aktif butonları listele (anonim erişim - admin client)
// ============================================================
export async function getPublicCallButtons(
  businessId: string
): Promise<{ success: boolean; buttons?: CallButton[]; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('call_buttons')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      buttons: ((data || []) as unknown[]).map((b) => b as CallButton),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// QR MENÜ: Müşteri çağrı gönder (anonim - admin client)
// ============================================================
export async function submitWaiterCall(input: {
  businessId: string;
  tableId?: string | null;
  buttonId: string;
  note?: string;
}): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    const admin = createAdminClient();

    // Buton bilgisini al (snapshot için)
    const { data: button } = await admin
      .from('call_buttons')
      .select('id, name, emoji, business_id, is_active')
      .eq('id', input.buttonId)
      .maybeSingle();

    if (!button) {
      return { success: false, error: 'Buton bulunamadı' };
    }
    if (button.business_id !== input.businessId) {
      return { success: false, error: 'Geçersiz işletme' };
    }
    if (!button.is_active) {
      return { success: false, error: 'Bu çağrı şu an devre dışı' };
    }

    // Aynı masada son 30 saniyede aynı butonla çağrı varsa engelle (spam koruma)
    if (input.tableId) {
      const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString();
      const { data: recent } = await admin
        .from('waiter_calls')
        .select('id')
        .eq('business_id', input.businessId)
        .eq('table_id', input.tableId)
        .eq('button_id', input.buttonId)
        .eq('status', 'pending')
        .gte('created_at', thirtySecAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return {
          success: false,
          error: 'Az önce aynı çağrı yapıldı, lütfen birkaç saniye bekleyin',
        };
      }
    }

    const { data, error } = await admin
      .from('waiter_calls')
      .insert({
        business_id: input.businessId,
        table_id: input.tableId || null,
        button_id: input.buttonId,
        button_name_snapshot: button.name,
        button_emoji_snapshot: button.emoji,
        note: input.note?.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // ──────────────────────────────────────────────────────────
    // PUSH NOTIFICATION — tüm garsonlara bildirim
    //
    // ÖNEMLİ: Bu blok await edilmeli (fire-and-forget DEĞİL).
    // Vercel serverless function return ettikten sonra background
    // task'lar terminate olur — push henüz teslim edilmemiş olabilir.
    // Push hatası çağrıyı etkilemesin diye try-catch içinde.
    // ──────────────────────────────────────────────────────────
    try {
      // Masa adını çek (bildirim metni için)
      let tableName = 'Bilinmeyen';
      if (input.tableId) {
        const { data: table } = await admin
          .from('tables')
          .select('name')
          .eq('id', input.tableId)
          .maybeSingle();
        if (table?.name) tableName = table.name;
      }

      const { sendPushToBusiness } = await import(
        '@/lib/security/web-push'
      );

      const emoji = button.emoji || '🔔';
      const callName = button.name || 'Çağrı';

      const pushResult = await sendPushToBusiness(input.businessId, 'waiter', {
        title: `${emoji} ${tableName}`,
        body: callName,
        url: '/garson',
        tag: `call-${input.tableId || 'general'}`, // aynı masadan üst üste çağrılar tek bildirim olur
        requireInteraction: true, // garson dokunana kadar dursun
        vibrate: [200, 100, 200, 100, 200],
      });

      console.log(
        `[submitWaiterCall] Push sonuç: sent=${pushResult.sent}, failed=${pushResult.failed}, expired=${pushResult.expired}`
      );
    } catch (pushErr) {
      console.error('[submitWaiterCall] Push gönderme hatası:', pushErr);
      // Push hatası çağrı kaydını etkilemez — kullanıcıya success döneriz
    }

    return { success: true, callId: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// KASA: Aktif (pending) çağrıları listele
// ============================================================
export async function getActiveWaiterCalls(): Promise<{
  success: boolean;
  calls?: WaiterCall[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    // Admin client kullan — cashier session'da auth user yok, RLS engellemesin
    // Güvenlik: businessId zaten requireBusinessAccess'te doğrulandı,
    // .eq('business_id', businessId) ile manuel filter yapıyoruz.
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('waiter_calls')
      .select('id, business_id, table_id, button_id, button_name_snapshot, button_emoji_snapshot, note, status, created_at, resolved_at')
      .eq('business_id', businessId)
      .in('status', ['pending', 'acknowledged'])
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const calls = ((data || []) as unknown[]).map((c) => c as WaiterCall);

    // Masa adlarını topla
    const tableIds = calls
      .map((c) => c.table_id)
      .filter((id): id is string => !!id);

    if (tableIds.length > 0) {
      const { data: tables } = await admin
        .from('tables')
        .select('id, name')
        .in('id', tableIds);

      const tableMap = new Map<string, string>();
      ((tables || []) as unknown[]).forEach((t) => {
        const tt = t as { id: string; name: string };
        tableMap.set(tt.id, tt.name);
      });

      calls.forEach((c) => {
        if (c.table_id) c.table_name = tableMap.get(c.table_id) || null;
      });
    }

    return { success: true, calls };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// KASA: Çağrıyı çözüldü olarak işaretle
// ============================================================
export async function resolveWaiterCall(
  callId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();
    // Güvenlik: callId business'a ait mi kontrol et
    // (Yoksa cashier başka kafenin çağrısını çözebilir)
    const { error } = await admin
      .from('waiter_calls')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .eq('business_id', businessId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// KASA: Tüm bekleyen çağrıları topluca temizle
// ============================================================
export async function resolveAllPendingCalls(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('waiter_calls')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .in('status', ['pending', 'acknowledged'])
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: (data || []).length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// KASA: Bir masaya ait aktif çağrıları getir (masa kartı rozeti için)
// ============================================================
export async function getActiveCallsByTable(): Promise<{
  success: boolean;
  callsByTable?: Map<string, number>;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('waiter_calls')
      .select('table_id')
      .eq('business_id', businessId)
      .in('status', ['pending', 'acknowledged']);

    if (error) {
      return { success: false, error: error.message };
    }

    const map = new Map<string, number>();
    ((data || []) as unknown[]).forEach((c) => {
      const cc = c as { table_id: string | null };
      if (cc.table_id) {
        map.set(cc.table_id, (map.get(cc.table_id) || 0) + 1);
      }
    });

    return { success: true, callsByTable: map };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
