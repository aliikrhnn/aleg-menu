'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction, fetchPerformerInfo } from './audit-log';
import { revalidatePath } from 'next/cache';

// ============================================================
// İzin kontrolü
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
        memberId: null as unknown as string,
      };
    }
    throw new Error('Giriş yapmamışsınız');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('id, business_id, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    throw new Error('İşletme üyeliği bulunamadı');
  }

  return {
    user,
    businessId: membership.business_id,
    memberId: membership.id,
  };
}

// ============================================================
// SERT VARDIYA MODU
// Açık vardiya yoksa yeni satış / ödeme YAPILMAZ.
// Sadece düzeltici işlemler (iptal, ikram, taşıma) yapılır.
// ============================================================
type AdminClient = ReturnType<typeof createAdminClient>;

export async function ensureOpenCashSession(
  admin: AdminClient,
  businessId: string
): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  const { data: session } = await admin
    .from('cash_drawer_sessions')
    .select('id')
    .eq('business_id', businessId)
    .is('closed_at', null)
    .maybeSingle();

  if (!session) {
    return {
      ok: false,
      error:
        'Vardiya kapalı. Satış almak için önce kasayı açmanız gerekir.',
    };
  }

  return { ok: true, sessionId: session.id };
}

// ============================================================
// Yardımcı: Siparişi delivered'a çek ve masada başka aktif sipariş yoksa masayı boşalt
// ============================================================
// Üç yerde kullanılır: takePayment (normal + giftAll) ve takePartialPayment (tam kapanınca)

export async function closeOrderAndMaybeFreeTable(
  admin: AdminClient,
  businessId: string,
  orderId: string,
  tableId: string | null
): Promise<void> {
  // MASALI sipariş: ödeme alındıysa sipariş delivered'a çekilir
  // (müşteri çıktı, masa boş = iş tamamlandı)
  //
  // MASASIZ sipariş (hızlı satış / kapıdan): ödeme alınmış olsa bile
  // mutfak hâlâ hazırlıyor olabilir. Status'u ZORLA değiştirmiyoruz —
  // doğal akışında ilerlesin (received → preparing → ready → delivered).
  // Böylece sipariş mutfak kolonlarında görünmeye devam eder.
  if (tableId) {
    await admin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)
      .not('status', 'in', '(delivered,cancelled)');
  }

  if (!tableId) return; // masasız siparişte bitir

  // Bu masada BAŞKA aktif sipariş var mı? (iki ayrı sorgu — or() kırılganlığını önler)
  const [inProcess, deliveredUnpaid] = await Promise.all([
    admin
      .from('orders')
      .select('id')
      .eq('business_id', businessId)
      .eq('table_id', tableId)
      .neq('id', orderId)
      .in('status', ['received', 'confirmed', 'preparing', 'ready', 'on_way']),
    admin
      .from('orders')
      .select('id')
      .eq('business_id', businessId)
      .eq('table_id', tableId)
      .neq('id', orderId)
      .eq('status', 'delivered')
      .not('payment_status', 'in', '(paid,refunded)'),
  ]);

  const otherActiveCount =
    (inProcess.data?.length || 0) + (deliveredUnpaid.data?.length || 0);

  if (otherActiveCount === 0) {
    await admin
      .from('tables')
      .update({ status: 'available' })
      .eq('id', tableId);
  }
}

// ============================================================
// TYPES
// ============================================================

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'online' | 'split' | 'other';

export type TakePaymentInput = {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;          // alınan tutar (genelde order.total)
  amountPaid?: number;     // müşterinin verdiği (nakit için, > amount olabilir)
  changeGiven?: number;    // para üstü
  note?: string;
  syncClientId?: string;   // offline için idempotency
  // Otomatik fiş basımı
  autoPrint?: boolean;
  // Tümünü ikram et: tüm kalemleri is_complimentary yapar, amount=0
  giftAll?: boolean;
  giftReason?: string;
  // Bahşiş (opsiyonel — ödeme ile birlikte)
  tip?: number;
  // İndirim (opsiyonel — ödemeden önce siparişe uygulanır)
  discountAmount?: number;
  discountReason?: string;
};

// ============================================================
// Ödeme al - sipariş için ödeme kaydeder
// ============================================================
export async function takePayment(input: TakePaymentInput): Promise<{
  success: boolean;
  orderId?: string;
  paymentLogId?: string;
  cashSessionId?: string;
  error?: string;
  alreadyPaid?: boolean; // aynı sync_client_id ile geldiyse
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Idempotency kontrolü (offline senkron için)
    if (input.syncClientId) {
      const { data: existing } = await admin
        .from('payment_logs')
        .select('id, order_id, cash_session_id')
        .eq('business_id', businessId)
        .eq('sync_client_id', input.syncClientId)
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          alreadyPaid: true,
          orderId: existing.order_id || undefined,
          paymentLogId: existing.id,
          cashSessionId: existing.cash_session_id || undefined,
        };
      }
    }

    // Sipariş güvenlik kontrolü
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, payment_status, total, table_id')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    if (order.payment_status === 'paid') {
      return { success: false, error: 'Bu sipariş zaten ödenmiş' };
    }

    // ╔════════════════════════════════════════════════════════════╗
    // ║ SERT VARDIYA MODU                                          ║
    // ║ Gerçek ödeme alımı için vardiya AÇIK olmalı.               ║
    // ║ giftAll (tümü ikram) düzeltici bir işlem olduğu için       ║
    // ║ vardiya kontrolünden muaf.                                  ║
    // ╚════════════════════════════════════════════════════════════╝
    if (!input.giftAll) {
      const shiftCheck = await ensureOpenCashSession(admin, businessId);
      if (!shiftCheck.ok) {
        return { success: false, error: shiftCheck.error };
      }
    }

    // Açık kasa oturumu var mı? (nakit ise otomatik bağla)
    let cashSessionId: string | null = null;
    if (input.paymentMethod === 'cash') {
      const { data: openSession } = await admin
        .from('cash_drawer_sessions')
        .select('id')
        .eq('business_id', businessId)
        .is('closed_at', null)
        .maybeSingle();
      cashSessionId = openSession?.id || null;
    }

    const now = new Date().toISOString();

    // Eğer tümünü ikram ediyorsa, kalemleri işaretle + order'ı sıfırla
    if (input.giftAll) {
      const giftReason = input.giftReason || 'Tümü ikram';
      const originalTotal = Number(order.total);

      // Kalemleri ikram olarak işaretle
      await admin
        .from('order_items')
        .update({
          is_complimentary: true,
          complimentary_reason: giftReason,
        })
        .eq('order_id', input.orderId);

      // Siparişi güncelle: total 0, complimentary_total = eski total
      const { error: orderError } = await admin
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: 'other',
          amount_paid: 0,
          change_given: 0,
          payment_note: `Tümü ikram: ${giftReason}`,
          paid_at: now,
          cash_session_id: null,
          total: 0,
          subtotal: 0,
          complimentary_total: originalTotal,
        })
        .eq('id', input.orderId);

      if (orderError) {
        return { success: false, error: orderError.message };
      }

      // Log kaydı (action: 'discount' — ikram da bir tür tam indirim)
      const { data: logRow, error: logError } = await admin
        .from('payment_logs')
        .insert({
          business_id: businessId,
          order_id: input.orderId,
          cash_session_id: null,
          action: 'discount',
          payment_method: 'other',
          amount: 0,
          amount_paid: 0,
          change_given: 0,
          note: `Tümü ikram: ${giftReason}`,
          performed_by: memberId,
          performed_at: now,
          sync_client_id: input.syncClientId || null,
        })
        .select('id')
        .single();

      if (logError) {
        return { success: false, error: logError.message };
      }

      // Masa boşaltma (kırılgan or() yerine helper)
      await closeOrderAndMaybeFreeTable(admin, businessId, input.orderId, order.table_id);

      revalidatePath('/panel/masalar');
      revalidatePath('/panel');
      revalidatePath('/kasa');

      return {
        success: true,
        orderId: input.orderId,
        paymentLogId: logRow.id,
      };
    }

    // 1) orders'ı güncelle (normal ödeme akışı)
    const tipAmount = Number(input.tip || 0);
    const discountAmount = Number(input.discountAmount || 0);
    const orderUpdate: Record<string, unknown> = {
      payment_status: 'paid',
      payment_method: input.paymentMethod,
      amount_paid: input.amountPaid ?? input.amount,
      change_given: input.changeGiven ?? 0,
      payment_note: input.note || null,
      paid_at: now,
      cash_session_id: cashSessionId,
    };
    if (tipAmount > 0) orderUpdate.tip = tipAmount;
    if (discountAmount > 0) {
      orderUpdate.discount = discountAmount;
      if (input.discountReason) orderUpdate.discount_reason = input.discountReason;
    }

    const { error: orderError } = await admin
      .from('orders')
      .update(orderUpdate)
      .eq('id', input.orderId);

    if (orderError) {
      return { success: false, error: orderError.message };
    }

    // İndirim logu (ayrı satır, raporlama için)
    if (discountAmount > 0) {
      await admin.from('payment_logs').insert({
        business_id: businessId,
        order_id: input.orderId,
        cash_session_id: cashSessionId,
        action: 'discount',
        payment_method: null,
        amount: discountAmount,
        amount_paid: 0,
        change_given: 0,
        note: input.discountReason || 'İndirim',
        performed_by: memberId,
        performed_at: now,
        sync_client_id: input.syncClientId ? `${input.syncClientId}-disc` : null,
      });
    }

    // Bahşiş logu (ayrı satır — personel paylaşımı raporlanabilsin)
    if (tipAmount > 0) {
      await admin.from('payment_logs').insert({
        business_id: businessId,
        order_id: input.orderId,
        cash_session_id: cashSessionId,
        action: 'tip',
        payment_method: input.paymentMethod,
        amount: tipAmount,
        amount_paid: tipAmount,
        change_given: 0,
        note: 'Bahşiş',
        performed_by: memberId,
        performed_at: now,
        sync_client_id: input.syncClientId ? `${input.syncClientId}-tip` : null,
      });
    }

    // 2) payment_logs'a düş
    const { data: logRow, error: logError } = await admin
      .from('payment_logs')
      .insert({
        business_id: businessId,
        order_id: input.orderId,
        cash_session_id: cashSessionId,
        action: 'payment',
        payment_method: input.paymentMethod,
        amount: input.amount,
        amount_paid: input.amountPaid ?? input.amount,
        change_given: input.changeGiven ?? 0,
        note: input.note || null,
        performed_by: memberId,
        performed_at: now,
        sync_client_id: input.syncClientId || null,
      })
      .select('id')
      .single();

    if (logError) {
      return { success: false, error: logError.message };
    }

    // Masa otomatik boşaltma mantığı:
    // Eğer bu sipariş bir masaya aitse VE masada başka ödenmemiş aktif sipariş yoksa
    // → tables.status = 'available', siparişin status'unu delivered yap
    if (order.table_id) {
      await closeOrderAndMaybeFreeTable(admin, businessId, input.orderId, order.table_id);
    } else {
      await closeOrderAndMaybeFreeTable(admin, businessId, input.orderId, null);
    }

    // Kasa fişi otomatik basım
    if (input.autoPrint) {
      try {
        const { requestCashierReceipt } = await import('@/lib/actions/printers');
        await requestCashierReceipt(input.orderId);
      } catch (e) {
        console.warn('[aleg] Cashier receipt print failed:', e);
      }
    }

    revalidatePath('/panel/masalar');
    revalidatePath('/panel');
    revalidatePath('/kasa');

    return {
      success: true,
      orderId: input.orderId,
      paymentLogId: logRow.id,
      cashSessionId: cashSessionId || undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Bölünmüş ödeme — siparişin bir parçasını öde
// ============================================================
// Tutar-bazlı: amount > 0 ile çağrılır, toplam kapandığında order kapanır
// Kalem-bazlı: itemIds[] dolu gelir, o kalemler "bu log ile kapandı" işaretlenir

export type TakePartialPaymentInput = {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;          // bu parçanın tutarı
  amountPaid?: number;
  changeGiven?: number;
  note?: string;
  syncClientId?: string;
  // Kalem-bazlı split: hangi kalemler kapatılıyor
  coversItemIds?: string[];
  // Split gruplaması (aynı orderId için tüm parçalar aynı grup)
  splitGroup?: string;
  // Bu parça için kişi etiketi (ör: "Kişi 1")
  partyLabel?: string;
};

export async function takePartialPayment(input: TakePartialPaymentInput): Promise<{
  success: boolean;
  orderId?: string;
  paymentLogId?: string;
  remainingAmount?: number;
  isFullyPaid?: boolean;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Idempotency
    if (input.syncClientId) {
      const { data: existing } = await admin
        .from('payment_logs')
        .select('id, order_id')
        .eq('sync_client_id', input.syncClientId)
        .maybeSingle();
      if (existing) {
        return { success: true, orderId: existing.order_id || undefined, paymentLogId: existing.id };
      }
    }

    if (input.amount <= 0) {
      return { success: false, error: 'Ödeme tutarı 0 veya eksi olamaz' };
    }

    // Order güvenliği
    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, payment_status, total, table_id')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }
    if (order.payment_status === 'paid') {
      return { success: false, error: 'Bu sipariş zaten ödenmiş' };
    }

    // ╔════════════════════════════════════════════════════════════╗
    // ║ SERT VARDIYA MODU — parsiyel ödeme de gerçek ödemedir      ║
    // ╚════════════════════════════════════════════════════════════╝
    const shiftCheck = await ensureOpenCashSession(admin, businessId);
    if (!shiftCheck.ok) {
      return { success: false, error: shiftCheck.error };
    }

    // Şimdiye kadar yapılmış partial payment toplam
    const { data: existingPartials } = await admin
      .from('payment_logs')
      .select('amount')
      .eq('order_id', input.orderId)
      .eq('action', 'partial_payment');

    const alreadyPaid = (existingPartials || []).reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );
    const remainingBefore = Number(order.total) - alreadyPaid;

    if (input.amount > remainingBefore + 0.01) {
      return {
        success: false,
        error: `Kalan tutar ₺${remainingBefore.toFixed(2)}, daha fazlası alınamaz`,
      };
    }

    // Açık kasa oturumu (nakit ise)
    let cashSessionId: string | null = null;
    if (input.paymentMethod === 'cash') {
      const { data: openSession } = await admin
        .from('cash_drawer_sessions')
        .select('id')
        .eq('business_id', businessId)
        .is('closed_at', null)
        .maybeSingle();
      cashSessionId = openSession?.id || null;
    }

    const now = new Date().toISOString();
    const splitGroup = input.splitGroup || `${input.orderId}-split`;

    // Partial payment logunu ekle
    const { data: logRow, error: logError } = await admin
      .from('payment_logs')
      .insert({
        business_id: businessId,
        order_id: input.orderId,
        cash_session_id: cashSessionId,
        action: 'partial_payment',
        payment_method: input.paymentMethod,
        amount: input.amount,
        amount_paid: input.amountPaid ?? input.amount,
        change_given: input.changeGiven ?? 0,
        note: input.partyLabel
          ? `${input.partyLabel}${input.note ? ' · ' + input.note : ''}`
          : input.note || null,
        performed_by: memberId,
        performed_at: now,
        sync_client_id: input.syncClientId || null,
        split_group: splitGroup,
        covers_item_ids: input.coversItemIds || [],
      })
      .select('id')
      .single();

    if (logError || !logRow) {
      return { success: false, error: logError?.message || 'Log yazılamadı' };
    }

    // Kalem-bazlı split ise kalemleri işaretle
    if (input.coversItemIds && input.coversItemIds.length > 0) {
      await admin
        .from('order_items')
        .update({ paid_by_log_id: logRow.id })
        .in('id', input.coversItemIds)
        .eq('order_id', input.orderId);
    }

    // Kalan tutar — bu ödeme sonrası
    const totalPaidNow = alreadyPaid + input.amount;
    const remainingAfter = Number(order.total) - totalPaidNow;
    const isFullyPaid = remainingAfter <= 0.01; // float toleransı

    // Tümü tamamsa order kapat
    if (isFullyPaid) {
      await admin
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: 'split', // bölünmüş ödeme
          amount_paid: totalPaidNow,
          paid_at: now,
          cash_session_id: cashSessionId,
          payment_note: 'Bölünmüş ödeme',
        })
        .eq('id', input.orderId);

      // Masa boşaltma (helper kullan)
      await closeOrderAndMaybeFreeTable(admin, businessId, input.orderId, order.table_id);

      // Tüm ödemeler tamamsa kasa fişi otomatik bas
      try {
        const { requestCashierReceipt } = await import('@/lib/actions/printers');
        await requestCashierReceipt(input.orderId);
      } catch (e) {
        console.warn('[aleg] Split final cashier receipt print failed:', e);
      }
    }

    revalidatePath('/panel/masalar');
    revalidatePath('/kasa');

    return {
      success: true,
      orderId: input.orderId,
      paymentLogId: logRow.id,
      remainingAmount: isFullyPaid ? 0 : remainingAfter,
      isFullyPaid,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Bir siparişin tüm partial paymentlerini getir (UI göstermek için)
export async function getPartialPayments(orderId: string): Promise<{
  success: boolean;
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string | null;
    note: string | null;
    covers_item_ids: string[];
    performed_at: string;
  }>;
  totalPaid?: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    const { data: logs } = await admin
      .from('payment_logs')
      .select('id, amount, payment_method, note, covers_item_ids, performed_at')
      .eq('order_id', orderId)
      .eq('action', 'partial_payment')
      .order('performed_at', { ascending: true });

    const payments = (logs || []).map((l) => ({
      id: l.id,
      amount: Number(l.amount),
      payment_method: l.payment_method,
      note: l.note,
      covers_item_ids: l.covers_item_ids || [],
      performed_at: l.performed_at,
    }));

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    return { success: true, payments, totalPaid };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}


export async function refundPayment(
  orderId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id, payment_method, total, cash_session_id, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    // Idempotency: Zaten iade edilmişse iki kez iade etme
    if (order.payment_status === 'refunded') {
      return { success: false, error: 'Bu sipariş zaten iade edilmiş' };
    }

    // ──────────────────────────────────────────────────────────────
    // GERÇEK ALINAN ÖDEMELERİ payment_logs'tan çek
    //
    // Eski mantık: amount = -order.total tek satır iade.
    // SORUN: Eğer indirim varsa orders.total indirim ÖNCESİ tutar.
    // SORUN: Bölünmüş ödenen siparişlerde nakit/kart parçaları kayıp.
    //
    // Yeni mantık: orijinal payment & partial_payment log'larını oku,
    // her birinin ters kaydını refund olarak yaz.
    // → İndirim sonrası gerçek tutar iade edilir
    // → Bölünmüş ödeme: her partial kendi method'unda iade
    // → byMethod (Paket 1) iadeyi doğru düşer
    // ──────────────────────────────────────────────────────────────
    const { data: originalPayments, error: paymentsError } = await admin
      .from('payment_logs')
      .select('id, payment_method, amount, cash_session_id, split_group')
      .eq('order_id', orderId)
      .in('action', ['payment', 'partial_payment']);

    if (paymentsError) {
      return { success: false, error: paymentsError.message };
    }

    // Hiç ödeme bulunamazsa fallback: orders.total kullan (eski davranış)
    // Bu sadece veri tutarsızlığı durumunda devreye girer (normalde olmamalı)
    const refundLogs =
      originalPayments && originalPayments.length > 0
        ? originalPayments.map((p) => ({
            business_id: businessId,
            order_id: orderId,
            cash_session_id: p.cash_session_id, // orijinal oturum tercih
            action: 'refund' as const,
            payment_method: p.payment_method,
            amount: -Number(p.amount),
            amount_paid: -Number(p.amount),
            change_given: 0,
            note: reason,
            performed_by: memberId,
            performed_at: new Date().toISOString(),
            split_group: p.split_group, // bölünmüşse aynı grup
          }))
        : [
            {
              business_id: businessId,
              order_id: orderId,
              cash_session_id: order.cash_session_id,
              action: 'refund' as const,
              payment_method: order.payment_method,
              amount: -Number(order.total),
              amount_paid: -Number(order.total),
              change_given: 0,
              note: `${reason} (uyarı: orijinal ödeme bulunamadı, brüt tutar iade edildi)`,
              performed_by: memberId,
              performed_at: new Date().toISOString(),
            },
          ];

    // Önce orders'ı güncelle, sonra log'ları yaz
    // (sıra önemli: log yazılınca status değişimini hemen görmemiz gerek)
    const { error: uErr } = await admin
      .from('orders')
      .update({
        payment_status: 'refunded',
        payment_note: `İade: ${reason}`,
      })
      .eq('id', orderId);

    if (uErr) {
      return { success: false, error: uErr.message };
    }

    const { error: logsError } = await admin
      .from('payment_logs')
      .insert(refundLogs);

    if (logsError) {
      // Log yazılamadıysa orders.payment_status'u geri al (best effort)
      await admin
        .from('orders')
        .update({ payment_status: order.payment_status, payment_note: null })
        .eq('id', orderId);
      return { success: false, error: logsError.message };
    }

    revalidatePath('/panel/masalar');
    revalidatePath('/kasa');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// MANUEL/SERBEST İADE — Kasa "İade Yap" butonu için
// ============================================================
// Kasiyer manuel iade yaparken (sipariş seçmeden veya seçerek):
//   • amount   — iade edilecek tutar (₺)
//   • method   — 'cash' veya 'card'
//   • reason   — zorunlu sebep (audit için)
//   • orderId  — opsiyonel: belirli bir sipariş varsa
//
// Kasaya negatif kayıt düşer (Paket 1 sayesinde byMethod doğru düşer).
// Bu fonksiyon refundPayment'tan AYRIDIR — refundPayment tüm siparişi
// iade ederken bu manuel/kısmi/sebep-bazlı iade içindir.

export async function recordManualRefund(input: {
  amount: number;
  method: 'cash' | 'card';
  reason: string;
  orderId?: string | null;
}): Promise<{ success: boolean; refundLogId?: string; error?: string }> {
  try {
    // Validasyon
    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'İade tutarı 0 veya eksi olamaz' };
    }
    if (input.amount > 100000) {
      return { success: false, error: 'İade tutarı çok büyük (max ₺100.000)' };
    }
    if (!input.reason || input.reason.trim().length < 3) {
      return {
        success: false,
        error: 'İade sebebi zorunlu (en az 3 karakter)',
      };
    }
    if (!['cash', 'card'].includes(input.method)) {
      return { success: false, error: 'Geçersiz iade yöntemi' };
    }

    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Yetki kontrolü — sadece can_refund yetkisi olan kasiyer iade yapabilir
    // (Cookie session ile gelen kasiyerlerin yetkisi tryCashierFallback'tan
    // doğrulanmış olur — burada ekstra DB kontrolü yapmıyoruz, kasiyer ekranı
    // zaten yetkisizleri butona izin vermiyor)

    // Açık kasa oturumu (nakit iadesi için zorunlu)
    let cashSessionId: string | null = null;
    if (input.method === 'cash') {
      const { data: openSession } = await admin
        .from('cash_drawer_sessions')
        .select('id')
        .eq('business_id', businessId)
        .is('closed_at', null)
        .maybeSingle();

      if (!openSession) {
        return {
          success: false,
          error: 'Nakit iade için açık bir kasa oturumu olmalı',
        };
      }
      cashSessionId = openSession.id;
    }

    // Sipariş varsa doğrula
    if (input.orderId) {
      const { data: order } = await admin
        .from('orders')
        .select('id, business_id, payment_status')
        .eq('id', input.orderId)
        .maybeSingle();

      if (!order || order.business_id !== businessId) {
        return { success: false, error: 'Sipariş bulunamadı' };
      }
      if (order.payment_status === 'refunded') {
        return { success: false, error: 'Bu sipariş zaten iade edilmiş' };
      }
    }

    // Negatif refund kaydı
    const reasonClean = input.reason.trim().slice(0, 500);
    const { data: logRow, error: logError } = await admin
      .from('payment_logs')
      .insert({
        business_id: businessId,
        order_id: input.orderId || null,
        cash_session_id: cashSessionId,
        action: 'refund',
        payment_method: input.method,
        amount: -Math.abs(input.amount),
        amount_paid: -Math.abs(input.amount),
        change_given: 0,
        note: `Manuel iade: ${reasonClean}`,
        performed_by: memberId,
        performed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError || !logRow) {
      return {
        success: false,
        error: logError?.message || 'İade kaydı oluşturulamadı',
      };
    }

    // Eğer sipariş bağlıysa ve tüm tutar iade edildiyse sipariş status'unu güncelle
    if (input.orderId) {
      const { data: orderInfo } = await admin
        .from('orders')
        .select('total')
        .eq('id', input.orderId)
        .maybeSingle();

      if (orderInfo) {
        const orderTotal = Number(orderInfo.total);
        // Bu siparişe ait toplam iade
        const { data: refunds } = await admin
          .from('payment_logs')
          .select('amount')
          .eq('order_id', input.orderId)
          .eq('action', 'refund');

        const totalRefunded = (refunds || []).reduce(
          (s, r) => s + Math.abs(Number(r.amount || 0)),
          0
        );

        // Tam iade ise siparişi 'refunded' yap
        if (totalRefunded >= orderTotal - 0.01) {
          await admin
            .from('orders')
            .update({
              payment_status: 'refunded',
              payment_note: `İade: ${reasonClean}`,
            })
            .eq('id', input.orderId);
        }
      }
    }

    revalidatePath('/kasa');
    revalidatePath('/panel/masalar');

    return { success: true, refundLogId: logRow.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export type CashSession = {
  id: string;
  opened_at: string;
  opened_by_name: string | null;
  opening_amount: number;
  opening_note: string | null;
  // Gün boyu hesaplar
  cash_payments_total: number;    // bu oturumda alınan nakit toplamı
  card_payments_total: number;    // bu oturumda alınan kart toplamı (snapshot, mutabakat için)
  cash_refunds_total: number;     // bu oturumda iade toplamı
  expected_cash: number;          // opening + payments - refunds
  payment_count: number;
};

export async function getActiveCashSession(): Promise<{
  success: boolean;
  session?: CashSession | null;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: session, error: sessErr } = await admin
      .from('cash_drawer_sessions')
      .select('id, opened_at, opening_amount, opening_note, opened_by')
      .eq('business_id', businessId)
      .is('closed_at', null)
      .maybeSingle();

    if (sessErr) {
      console.error('getActiveCashSession error:', sessErr);
      return { success: false, error: sessErr.message };
    }

    if (!session) {
      return { success: true, session: null };
    }

    // Nakit ödemeleri topla
    const { data: logs } = await admin
      .from('payment_logs')
      .select('action, payment_method, amount')
      .eq('business_id', businessId)
      .eq('cash_session_id', session.id);

    let cashPayments = 0;
    let cashRefunds = 0;
    let cardPayments = 0;
    let count = 0;
    (logs || []).forEach((log) => {
      // payment / partial_payment / tip → kasaya nakit/kart girişi
      // (Eski kod sadece 'payment' bakıyordu — partial_payment ve tip atlanıyordu,
      // bölme ödenen siparişlerin nakit parçaları görünmüyordu)
      if (
        log.action === 'payment' ||
        log.action === 'partial_payment' ||
        log.action === 'tip'
      ) {
        if (log.payment_method === 'cash') {
          cashPayments += Number(log.amount);
          count++;
        } else if (log.payment_method === 'card') {
          cardPayments += Number(log.amount);
          count++;
        } else {
          // diğer yöntemler sayaca dahil, ama cash/card toplamına değil
          count++;
        }
      } else if (log.action === 'refund' && log.payment_method === 'cash') {
        cashRefunds += Math.abs(Number(log.amount));
      }
    });

    const opening = Number(session.opening_amount);
    const expected = opening + cashPayments - cashRefunds;

    // opened_by_name ayrı lookup - sessiz geç hata olursa (critical path değil)
    let openedByName: string | null = null;
    if (session.opened_by) {
      try {
        const { data: member } = await admin
          .from('business_members')
          .select('full_name')
          .eq('id', session.opened_by)
          .maybeSingle();

        openedByName = member?.full_name || null;
      } catch {
        // sessiz geç
      }
    }

    return {
      success: true,
      session: {
        id: session.id,
        opened_at: session.opened_at,
        opened_by_name: openedByName,
        opening_amount: opening,
        opening_note: session.opening_note,
        cash_payments_total: cashPayments,
        card_payments_total: cardPayments,
        cash_refunds_total: cashRefunds,
        expected_cash: expected,
        payment_count: count,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Kasa aç
export async function openCashSession(input: {
  openingAmount: number;
  note?: string;
}): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Mevcut açık var mı?
    const { data: existing } = await admin
      .from('cash_drawer_sessions')
      .select('id')
      .eq('business_id', businessId)
      .is('closed_at', null)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Zaten açık bir kasa oturumu var. Önce kapat.' };
    }

    const { data, error } = await admin
      .from('cash_drawer_sessions')
      .insert({
        business_id: businessId,
        opened_by: memberId,
        opening_amount: input.openingAmount,
        opening_note: input.note || null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // revalidatePath KALDIRILDI - client loadSession ile yeniliyor
    return { success: true, sessionId: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Kasa kapat
export async function closeCashSession(input: {
  countedAmount: number;
  note?: string;
}): Promise<{
  success: boolean;
  expected?: number;
  counted?: number;
  difference?: number;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Active session'ı DIRECT query ile al (nested server action yerine)
    // NOT: cash_refunds_total ve expected_cash kolonları DB'de yok —
    // hesabı payment_logs'tan yapıyoruz.
    const { data: activeSess, error: sessErr } = await admin
      .from('cash_drawer_sessions')
      .select('id, opening_amount')
      .eq('business_id', businessId)
      .is('closed_at', null)
      .maybeSingle();

    if (sessErr) {
      return { success: false, error: sessErr.message };
    }
    if (!activeSess) {
      return { success: false, error: 'Açık kasa oturumu yok' };
    }

    // Beklenen nakit = açılış + nakit ödemeler + nakit bahşiş - nakit iadeler
    // Sadece BU kasa oturumuna ait payment_logs
    const { data: sessionLogs } = await admin
      .from('payment_logs')
      .select('action, payment_method, amount')
      .eq('cash_session_id', activeSess.id);

    let cashIn = 0;
    let cashRefunds = 0;
    (sessionLogs || []).forEach((log) => {
      if (log.payment_method !== 'cash') return;
      if (
        log.action === 'payment' ||
        log.action === 'partial_payment' ||
        log.action === 'tip'
      ) {
        cashIn += Number(log.amount);
      } else if (log.action === 'refund') {
        cashRefunds += Math.abs(Number(log.amount));
      }
    });

    const opening = Number(activeSess.opening_amount || 0);
    const expected = opening + cashIn - cashRefunds;
    const counted = input.countedAmount;
    const difference = counted - expected;

    const { error } = await admin
      .from('cash_drawer_sessions')
      .update({
        closed_at: new Date().toISOString(),
        closed_by: memberId,
        counted_amount: counted,
        expected_amount: expected,
        difference,
        closing_note: input.note || null,
      })
      .eq('id', activeSess.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      expected,
      counted,
      difference,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// GÜN SONU TEK ATOMİK SERVER ACTION
// Declared + card_expected + variance + close hepsini TEK update'te yapar
// ============================================================
export async function finalizeGunSonu(input: {
  declared_cash: number;
  declared_card: number;
  card_expected: number;
  cash_variance: number;
  card_variance: number;
  note?: string;
}): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Active session direct query
    const { data: activeSess, error: sessErr } = await admin
      .from('cash_drawer_sessions')
      .select('id, expected_cash')
      .eq('business_id', businessId)
      .is('closed_at', null)
      .maybeSingle();

    if (sessErr) return { success: false, error: sessErr.message };
    if (!activeSess) {
      return { success: false, error: 'Açık kasa oturumu yok' };
    }

    const expected = Number(activeSess.expected_cash ?? 0);
    const counted = input.declared_cash;
    const difference = counted - expected;

    // TEK UPDATE - declared + card + variance + close
    const { error } = await admin
      .from('cash_drawer_sessions')
      .update({
        // Close
        closed_at: new Date().toISOString(),
        closed_by: memberId,
        counted_amount: counted,
        expected_amount: expected,
        difference,
        closing_note: input.note || 'Gün Sonu ile otomatik kapatıldı',
        // Declared/variance (migration 0026)
        declared_cash: input.declared_cash,
        declared_card: input.declared_card,
        card_expected: input.card_expected,
        cash_variance: input.cash_variance,
        card_variance: input.card_variance,
      })
      .eq('id', activeSess.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, sessionId: activeSess.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Kasa mutabakat beyanı — kapanıştaki nakit + kart bilgisi
// ============================================================
// Kapanış sonrası declared_cash/declared_card/card_expected/variance
// alanlarını yazar. closeCashSession ile ayrı (atomik akışı bozmamak için).
// ============================================================
export async function declareCashSessionCard(
  sessionId: string,
  input: {
    declared_cash: number;
    declared_card: number;
    card_expected: number;
    cash_variance: number;
    card_variance: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { error } = await admin
      .from('cash_drawer_sessions')
      .update({
        declared_cash: input.declared_cash,
        declared_card: input.declared_card,
        card_expected: input.card_expected,
        cash_variance: input.cash_variance,
        card_variance: input.card_variance,
      })
      .eq('id', sessionId)
      .eq('business_id', businessId);

    if (error) {
      return { success: false, error: error.message };
    }

    // revalidatePath KALDIRILDI — client zaten loadSession ile yeniliyor
    // ve aynı sayfada çağrıldığı için sayfayı zorla remount ettiriyordu
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Siparişi masa/tür değiştir
// ============================================================
export async function changeOrderTable(
  orderId: string,
  newTableId: string | null,
  newOrderType?: 'dine_in' | 'pickup' | 'delivery'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, business_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }

    const updates: Record<string, unknown> = { table_id: newTableId };
    if (newOrderType) updates.order_type = newOrderType;

    const { error } = await admin
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/panel/masalar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Z-Raporu — Günlük özet
// ============================================================
export type ZReport = {
  date: string;
  // Seçilen aralık (bu rapor hangi süreye ait)
  range: {
    from: string; // ISO datetime
    to: string; // ISO datetime
    preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
    label: string; // "Bugün", "Dün", "Bu Hafta", "23 Nisan 14:00 - 22:00"
  };
  business: {
    name: string;
    address: string | null;
    logo_url: string | null;
    phone: string | null;
  };
  total_orders: number;
  total_orders_paid: number;
  total_revenue: number;
  total_cancelled: number;
  total_cancelled_amount: number;
  total_refunded: number;
  average_basket: number;
  total_tip: number;
  total_discount: number;
  total_complimentary: number;
  open_orders: number;
  peak_hour: number | null;
  by_method: Record<string, { count: number; amount: number }>;
  by_hour: Array<{ hour: number; count: number; amount: number }>;
  by_cashier: Array<{
    cashier_id: string | null;
    cashier_name: string;
    count: number;
    amount: number;
  }>;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  cancelled_orders: Array<{
    order_no: string;
    total: number;
    time: string;
    cashier_name: string | null;
    reason: string | null;
  }>;
  refunded_orders: Array<{
    order_no: string;
    total: number;
    time: string;
    cashier_name: string | null;
  }>;
  // Ürün bazında ikram detayları (is_complimentary=true order_items)
  complimentary_items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    time: string;            // siparişin oluşturulma saati HH:MM
    cashier_name: string | null;
    reason: string | null;   // complimentary_reason
  }>;
  // İptal edilmiş siparişlerin kalemleri
  cancelled_items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    time: string;
    cashier_name: string | null;
    order_reason: string | null; // orders.note
  }>;
  // Oranlar (oran bilgisi)
  rates: {
    complimentary_rate: number; // ikram / brüt * 100 (%)
    cancellation_rate: number;  // iptal tutarı / (brüt + iptal) * 100 (%)
  };
  // İstasyona göre satış (ciro sıralı, boş istasyonlar yok, atanmamış ayrı)
  by_station: Array<{
    station_id: string | null; // null = atanmamış
    name: string;
    icon: string;
    color: string;
    item_count: number;   // kaç kalem (qty toplam)
    revenue: number;      // tutar (unit_price × qty)
  }>;
  // Mutabakat (kasa hesabı)
  reconciliation: {
    gross_sales: number;        // tüm paid siparişlerin toplam (total sum)
    discount_total: number;      // toplam indirim
    complimentary_total: number; // toplam ikram
    cancelled_total: number;     // iptal edilen sipariş tutarı (bilgi amaçlı)
    net_sales: number;           // gross - discount - complimentary
    cash_total: number;          // tahsil edilen nakit
    card_total: number;          // tahsil edilen kart
    other_total: number;         // online/diğer (eski: havale dahildi)
    // Kasa oturumu verisi (açıksa)
    opening_amount: number | null;
    cash_refunds: number;        // gün içindeki nakit iadeler
    expected_cash: number | null; // açılış + nakit - iade
    // Kasa kapanışında girilen değerler (oturum kapatıldıktan sonra doldurulur)
    declared_cash: number | null;
    declared_card: number | null;
    cash_variance: number | null;   // declared - expected
    card_variance: number | null;   // declared - card_total
  };
  // PAKET C EKLENTİLERİ
  // Ortalama hazırlama süresi (created_at → payment_logs.created_at ilk 'payment' action'ı)
  avg_prep_minutes: number | null; // null = hesaplanacak veri yok
  // Pik 3 saat (by_hour'dan amount sıralı top 3)
  peak_hours: Array<{ hour: number; count: number; amount: number }>;
  // Sipariş kaynağı dağılımı
  by_source: Record<string, { count: number; amount: number }>;
  // Haftalık trend (son 7 gün, aralıktan bağımsız — her zaman son 7 gün)
  weekly_trend: Array<{
    date: string;       // 'YYYY-MM-DD'
    day_label: string;  // 'Pzt', 'Sal', ...
    orders: number;
    revenue: number;
  }>;
  // Cari hesap özeti (Açık Hesap işlemleri)
  on_account_summary: {
    new_charges_count: number;
    new_charges_amount: number;
    payments_received_count: number;
    payments_received_amount: number;
    net_change: number; // payments - new_charges (pozitif = bugün borç tahsil edildi)
    new_charges: Array<{
      customer_name: string;
      amount: number;
      time: string; // HH:MM
      source: 'order' | 'manual';
    }>;
    payments_received: Array<{
      customer_name: string;
      amount: number;
      method: string; // 'cash' | 'card' | 'transfer'
      time: string;
      source: 'payment' | 'manual_credit';
    }>;
  };
};

export type DaySummaryRange =
  | { preset: 'today' }
  | { preset: 'yesterday' }
  | { preset: 'week' }
  | { preset: 'month' }
  | { preset: 'custom'; from: string; to: string }; // ISO datetime

function computeRange(
  range?: DaySummaryRange
): { from: Date; to: Date; preset: ZReport['range']['preset']; label: string } {
  const now = new Date();
  const preset = range?.preset || 'today';

  if (preset === 'today') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to, preset: 'today', label: 'Bugün' };
  }
  if (preset === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const from = new Date(d);
    from.setHours(0, 0, 0, 0);
    const to = new Date(d);
    to.setHours(23, 59, 59, 999);
    return { from, to, preset: 'yesterday', label: 'Dün' };
  }
  if (preset === 'week') {
    // Son 7 gün
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to, preset: 'week', label: 'Son 7 Gün' };
  }
  if (preset === 'month') {
    // Son 30 gün
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to, preset: 'month', label: 'Son 30 Gün' };
  }
  // custom
  if (range && range.preset === 'custom') {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const fromStr = from.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const toStr = to.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return { from, to, preset: 'custom', label: `${fromStr} → ${toStr}` };
  }
  // fallback
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to, preset: 'today', label: 'Bugün' };
}

// Geriye dönük uyum: getZReport(date?) eski imza. Yeni kullanım için getDaySummary(range?) tercih edilir.
export async function getZReport(
  dateOrRange?: string | DaySummaryRange
): Promise<{
  success: boolean;
  report?: ZReport;
  error?: string;
}> {
  const t0 = Date.now();
  const log = (phase: string, extra?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.log(`[Z-REPORT] ${phase}`, { ms: Date.now() - t0, ...extra });
  };

  try {
    log('start');
    const { businessId } = await requireBusinessAccess();
    log('auth done');
    const admin = createAdminClient();

    // Parametre tipi: string (eski) veya DaySummaryRange (yeni) veya undefined
    let rng: DaySummaryRange | undefined;
    if (typeof dateOrRange === 'string') {
      // Eski API: sadece tarih (YYYY-MM-DD) → o günün 00:00-23:59
      const d = new Date(dateOrRange);
      const fromISO = new Date(d);
      fromISO.setHours(0, 0, 0, 0);
      const toISO = new Date(d);
      toISO.setHours(23, 59, 59, 999);
      rng = { preset: 'custom', from: fromISO.toISOString(), to: toISO.toISOString() };
    } else if (dateOrRange) {
      rng = dateOrRange;
    }

    const { from: start, to: end, preset, label } = computeRange(rng);

    // Business bilgileri (PDF için)
    const { data: business } = await admin
      .from('businesses')
      .select('name, address, logo_url, phone')
      .eq('id', businessId)
      .maybeSingle();
    log('business fetched');

    // ============================================================
    // ÖNEMLİ: Z-Report HESAP ALMA bazlı çalışır, sipariş açılışına göre değil.
    //   - Ödenmiş siparişler:  paid_at aralıkta olanlar (gerçek ciro zamanı)
    //   - Açık/iptal siparişler: created_at aralıkta olanlar (bilgi amaçlı)
    // Akşam vardiyasında öğle açılan ama akşam kapatılan masalar
    // o akşamın cirosuna doğru yansır.
    // ============================================================

    // [1] ÖDENMİŞ siparişler — paid_at aralıkta
    const { data: paidOrdersRaw, error: paidOrdersError } = await admin
      .from('orders')
      .select(`
        id, total, payment_method, payment_status, status, paid_at, created_at,
        tip, discount, complimentary_total, created_by_cashier, note, source,
        cashier:created_by_cashier(display_name)
      `)
      .eq('business_id', businessId)
      .eq('payment_status', 'paid')
      .gte('paid_at', start.toISOString())
      .lte('paid_at', end.toISOString());

    if (paidOrdersError) {
      return { success: false, error: paidOrdersError.message };
    }

    // [2] AÇIK + İPTAL siparişler — created_at aralıkta (bilgi)
    const { data: openCancelledRaw, error: openCancelledError } = await admin
      .from('orders')
      .select(`
        id, total, payment_method, payment_status, status, paid_at, created_at,
        tip, discount, complimentary_total, created_by_cashier, note, source,
        cashier:created_by_cashier(display_name)
      `)
      .eq('business_id', businessId)
      .neq('payment_status', 'paid')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (openCancelledError) {
      return { success: false, error: openCancelledError.message };
    }

    const allOrders = [...(paidOrdersRaw || []), ...(openCancelledRaw || [])];
    log('orders fetched', {
      paid: paidOrdersRaw?.length || 0,
      openCancelled: openCancelledRaw?.length || 0,
    });
    const paid = paidOrdersRaw || [];
    const cancelled = (openCancelledRaw || []).filter(
      (o) => o.status === 'cancelled'
    );
    const refunded = allOrders.filter((o) => o.payment_status === 'refunded');
    // Açık siparişler: hazırlanan/hazır ama henüz ödenmemiş
    const openOrders = (openCancelledRaw || []).filter(
      (o) =>
        o.status !== 'cancelled' &&
        o.payment_status !== 'paid' &&
        o.payment_status !== 'refunded'
    );

    // ============================================================
    // ÖDEME YÖNTEMİ DAĞILIMI — payment_logs'tan türetilir
    // ============================================================
    // ESKİ MANTIK YANLIŞTI: paid.forEach ile orders.total topluyordu.
    //   - İndirimi yansıtmıyordu (orders.total indirim ÖNCESİ tutar)
    //   - Bölünmüş ödemenin nakit/kart parçalarını kaybediyordu
    //     (split sipariş orders.payment_method='split' yazılır)
    //   - İade alındığında düşmüyordu
    //   - Bahşiş kasaya yansımıyordu
    //
    // YENİ MANTIK: payment_logs'taki gerçek kasa hareketleri
    //   - action='payment'         → tam ödeme
    //   - action='partial_payment' → bölünmüş ödeme parçası (kendi method'unda)
    //   - action='tip'             → bahşiş (kasaya FİZİKEN girer)
    //   - action='refund'          → iade (amount zaten negatif)
    //   - action='discount'        → kasa hareketi DEĞİL, yoksay
    //   - action='adjustment'      → kasa hareketi DEĞİL, yoksay
    //
    // Bu mantık getActiveCashSession ile tutarlı (zaten doğru çalışan).
    // Cari ödemeler (order_id=null) doğal olarak bu sorguya dahil olur.
    // ============================================================
    const KASA_ACTIONS = ['payment', 'partial_payment', 'tip', 'refund'];

    const { data: allKasaLogs } = await admin
      .from('payment_logs')
      .select('id, order_id, amount, payment_method, action, performed_at, cashier_id')
      .eq('business_id', businessId)
      .in('action', KASA_ACTIONS)
      .gte('performed_at', start.toISOString())
      .lte('performed_at', end.toISOString());

    const byMethod: Record<string, { count: number; amount: number }> = {};
    (allKasaLogs || []).forEach((log) => {
      const method = (log.payment_method as string | null) || 'other';
      if (!byMethod[method]) byMethod[method] = { count: 0, amount: 0 };
      // count: sadece pozitif kasa girişi sayar (refund'u sayma)
      // amount: tüm hareketler dahil (refund negatif olduğu için doğal düşer)
      if (log.action !== 'refund') {
        byMethod[method].count++;
      }
      byMethod[method].amount += Number(log.amount);
    });

    // Cari ödemeler (order_id=null) — sadece liste/raporlama için ayrı tut
    // (byMethod'a zaten allKasaLogs içinden dahil oldular)
    const cariPaymentLogs = (allKasaLogs || []).filter(
      (log) =>
        log.order_id === null &&
        log.action === 'payment' &&
        log.payment_method !== 'other' // manuel borç işareti
    );

    // Saat bazlı — payment_logs üzerinden (raporla tutarlı, indirim sonrası)
    const hourMap = new Map<number, { count: number; amount: number }>();
    (allKasaLogs || []).forEach((log) => {
      // Refund'u saat bazlıdan da düş ama negatif olarak count etme
      if (log.action === 'refund') return; // saat bazlı dağılımı kirletmesin
      const h = new Date(log.performed_at).getHours();
      const existing = hourMap.get(h) || { count: 0, amount: 0 };
      hourMap.set(h, {
        count: existing.count + 1,
        amount: existing.amount + Number(log.amount),
      });
    });
    const byHour = Array.from(hourMap.entries())
      .map(([hour, v]) => ({ hour, ...v }))
      .sort((a, b) => a.hour - b.hour);

    // Peak hour (en yoğun saat — amount bazlı)
    let peakHour: number | null = null;
    if (byHour.length > 0) {
      const peak = byHour.reduce((a, b) => (a.amount > b.amount ? a : b));
      peakHour = peak.hour;
    }

    // Pik 3 saat (amount bazlı, sıfırdan büyük olanlar)
    const peakHours = byHour
      .filter((h) => h.amount > 0)
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Sipariş kaynağı dağılımı (orders.source → qr/manual/waiter/delivery/...)
    const bySource: Record<string, { count: number; amount: number }> = {};
    paid.forEach((o) => {
      const src = (o.source as string | null) || 'manual';
      const cur = bySource[src] || { count: 0, amount: 0 };
      bySource[src] = {
        count: cur.count + 1,
        amount: cur.amount + Number(o.total || 0),
      };
    });

    // Ortalama hazırlama süresi (created_at → paid_at farkı)
    // Sadece paid olan ve paid_at'i olan siparişlerden
    let avgPrepMinutes: number | null = null;
    const prepTimes = paid
      .map((o) => {
        if (!o.paid_at || !o.created_at) return null;
        const diff = new Date(o.paid_at).getTime() - new Date(o.created_at).getTime();
        const minutes = diff / 60000;
        // Mantıksız değerleri ele (0dk altı veya 4 saat üstü outlier)
        if (minutes < 0 || minutes > 240) return null;
        return minutes;
      })
      .filter((m): m is number => m !== null);
    if (prepTimes.length > 0) {
      const sum = prepTimes.reduce((a, b) => a + b, 0);
      avgPrepMinutes = sum / prepTimes.length;
    }

    // Kasiyere göre — created_by_cashier → cashier_accounts.display_name JOIN'den
    const cashierMap = new Map<
      string,
      { cashier_id: string | null; cashier_name: string; count: number; amount: number }
    >();
    paid.forEach((o) => {
      const ccId = (o.created_by_cashier as string | null) || '__none';
      const cashierRel = Array.isArray((o as { cashier?: unknown }).cashier)
        ? ((o as { cashier: Array<{ display_name?: string }> }).cashier[0])
        : ((o as { cashier?: { display_name?: string } | null }).cashier);
      const displayName = cashierRel?.display_name;
      const cashierName =
        displayName ||
        (ccId === '__none' ? 'Panel / Admin' : 'Kasiyer');
      const existing = cashierMap.get(ccId) || {
        cashier_id: ccId === '__none' ? null : ccId,
        cashier_name: cashierName,
        count: 0,
        amount: 0,
      };
      cashierMap.set(ccId, {
        ...existing,
        count: existing.count + 1,
        amount: existing.amount + Number(o.total),
      });
    });

    // Cari hareketleri de kasiyere göre dağıt (cariPaymentLogs.cashier_id)
    const cariCashierIds = (cariPaymentLogs || [])
      .map((p) => p.cashier_id as string | null)
      .filter((x): x is string => !!x);
    let cariCashierNames: Map<string, string> = new Map();
    if (cariCashierIds.length > 0) {
      const uniq = Array.from(new Set(cariCashierIds));
      const { data: cashiersData } = await admin
        .from('cashier_accounts')
        .select('id, display_name')
        .in('id', uniq);
      cariCashierNames = new Map(
        (cashiersData || []).map((c) => [
          c.id as string,
          (c.display_name as string) || 'Kasiyer',
        ])
      );
    }
    (cariPaymentLogs || []).forEach((p) => {
      const ccId = (p.cashier_id as string | null) || '__none';
      const cashierName =
        ccId === '__none'
          ? 'Panel / Admin'
          : cariCashierNames.get(ccId) || 'Kasiyer';
      const existing = cashierMap.get(ccId) || {
        cashier_id: ccId === '__none' ? null : ccId,
        cashier_name: cashierName,
        count: 0,
        amount: 0,
      };
      cashierMap.set(ccId, {
        ...existing,
        count: existing.count + 1,
        amount: existing.amount + Number(p.amount),
      });
    });
    const byCashier = Array.from(cashierMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    // Ekstralar
    const totalTip = paid.reduce((sum, o) => sum + Number(o.tip || 0), 0);
    const totalDiscount = paid.reduce(
      (sum, o) => sum + Number(o.discount || 0),
      0
    );
    const totalComplimentary = paid.reduce(
      (sum, o) => sum + Number(o.complimentary_total || 0),
      0
    );
    const totalCancelledAmount = cancelled.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );

    // ============================================================
    // PERFORMANS: Tüm order_items + stations + cash_session + weekly_trend PARALEL
    // ============================================================
    const paidOrderIds = paid.map((o) => o.id);
    const cancelledOrderIds = cancelled.map((o) => o.id);

    // Weekly trend için son 7 gün aralığı (aralıktan bağımsız, hep son 7 gün)
    const weekTrendEnd = new Date();
    weekTrendEnd.setHours(23, 59, 59, 999);
    const weekTrendStart = new Date();
    weekTrendStart.setDate(weekTrendStart.getDate() - 6);
    weekTrendStart.setHours(0, 0, 0, 0);

    const [paidItemsResp, cancItemsResp, stationsResp, weekTrendResp] =
      await Promise.all([
        paidOrderIds.length > 0
          ? admin
              .from('order_items')
              .select(
                'product_name, quantity, unit_price, station_id, is_complimentary, complimentary_reason, order_id'
              )
              .in('order_id', paidOrderIds)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        cancelledOrderIds.length > 0
          ? admin
              .from('order_items')
              .select('product_name, quantity, unit_price, order_id')
              .in('order_id', cancelledOrderIds)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        admin
          .from('stations')
          .select('id, name, icon, color')
          .eq('business_id', businessId),
        // Son 7 günün paid siparişleri (sadece created_at + total lazım, hafif)
        admin
          .from('orders')
          .select('created_at, total')
          .eq('business_id', businessId)
          .eq('payment_status', 'paid')
          .gte('created_at', weekTrendStart.toISOString())
          .lte('created_at', weekTrendEnd.toISOString()),
      ]);

    const paidItems = (paidItemsResp.data || []) as Array<{
      product_name: string;
      quantity: number | string;
      unit_price: number | string;
      station_id: string | null;
      is_complimentary: boolean | null;
      complimentary_reason: string | null;
      order_id: string;
    }>;
    const cancItems = (cancItemsResp.data || []) as Array<{
      product_name: string;
      quantity: number | string;
      unit_price: number | string;
      order_id: string;
    }>;
    const stationsData = (stationsResp.data || []) as Array<{
      id: string;
      name: string | null;
      icon: string | null;
      color: string | null;
    }>;

    // Weekly trend: son 7 gün günlük grupla
    const weekOrders = (weekTrendResp.data || []) as Array<{
      created_at: string;
      total: number | string;
    }>;
    // 7 günü önceden boş kur, hepsine sayaç
    const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const weeklyMap = new Map<
      string,
      { date: string; day_label: string; orders: number; revenue: number }
    >();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const ds = d.toISOString().slice(0, 10); // YYYY-MM-DD
      weeklyMap.set(ds, {
        date: ds,
        day_label: dayLabels[d.getDay()],
        orders: 0,
        revenue: 0,
      });
    }
    weekOrders.forEach((o) => {
      const ds = new Date(o.created_at).toISOString().slice(0, 10);
      const cur = weeklyMap.get(ds);
      if (cur) {
        cur.orders += 1;
        cur.revenue += Number(o.total || 0);
      }
    });
    const weeklyTrend = Array.from(weeklyMap.values());

    // Order meta map (bir kere kur, birden fazla bölümde kullan)
    const paidOrderMetaMap = new Map<
      string,
      { created_at: string; cashier_name: string | null }
    >();
    paid.forEach((o) => {
      const rel = Array.isArray((o as { cashier?: unknown }).cashier)
        ? (o as { cashier: Array<{ display_name?: string }> }).cashier[0]
        : ((o as { cashier?: { display_name?: string } | null }).cashier);
      paidOrderMetaMap.set(String(o.id), {
        created_at: o.created_at,
        cashier_name: rel?.display_name || null,
      });
    });

    const cancelledOrderMetaMap = new Map<
      string,
      { created_at: string; cashier_name: string | null; note: string | null }
    >();
    cancelled.forEach((o) => {
      const rel = Array.isArray((o as { cashier?: unknown }).cashier)
        ? (o as { cashier: Array<{ display_name?: string }> }).cashier[0]
        : ((o as { cashier?: { display_name?: string } | null }).cashier);
      cancelledOrderMetaMap.set(String(o.id), {
        created_at: o.created_at,
        cashier_name: rel?.display_name || null,
        note: (o.note as string | null) || null,
      });
    });

    // ============================================================
    // TOP PRODUCTS (paidItems içinde)
    // ============================================================
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    paidItems.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const unit = Number(item.unit_price || 0);
      const existing = productMap.get(item.product_name) || {
        quantity: 0,
        revenue: 0,
      };
      productMap.set(item.product_name, {
        quantity: existing.quantity + qty,
        revenue: existing.revenue + unit * qty,
      });
    });
    const topProducts: ZReport['top_products'] = Array.from(productMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const totalRevenue = paid.reduce((sum, o) => sum + Number(o.total), 0);
    const avgBasket = paid.length > 0 ? totalRevenue / paid.length : 0;

    // İptal detayları
    const cancelledDetail: ZReport['cancelled_orders'] = cancelled
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((o) => {
        const rel = Array.isArray((o as { cashier?: unknown }).cashier)
          ? (o as { cashier: Array<{ display_name?: string }> }).cashier[0]
          : ((o as { cashier?: { display_name?: string } | null }).cashier);
        return {
          order_no: '#' + String(o.id).slice(0, 6).toUpperCase(),
          total: Number(o.total),
          time: new Date(o.created_at).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          cashier_name: rel?.display_name || null,
          reason: (o.note as string | null) || null,
        };
      });

    // İade detayları
    const refundedDetail: ZReport['refunded_orders'] = refunded
      .slice()
      .sort(
        (a, b) =>
          new Date(b.paid_at || b.created_at).getTime() -
          new Date(a.paid_at || a.created_at).getTime()
      )
      .map((o) => {
        const rel = Array.isArray((o as { cashier?: unknown }).cashier)
          ? (o as { cashier: Array<{ display_name?: string }> }).cashier[0]
          : ((o as { cashier?: { display_name?: string } | null }).cashier);
        return {
          order_no: '#' + String(o.id).slice(0, 6).toUpperCase(),
          total: Number(o.total),
          time: new Date(o.paid_at || o.created_at).toLocaleTimeString(
            'tr-TR',
            { hour: '2-digit', minute: '2-digit' }
          ),
          cashier_name: rel?.display_name || null,
        };
      });

    // ============================================================
    // ÜRÜN BAZINDA İKRAM DETAYI (paidItems içinden filter)
    // ============================================================
    const complimentaryItems: ZReport['complimentary_items'] = paidItems
      .filter((it) => it.is_complimentary === true)
      .map((it) => {
        const meta = paidOrderMetaMap.get(String(it.order_id));
        const qty = Number(it.quantity || 0);
        const unit = Number(it.unit_price || 0);
        return {
          product_name: it.product_name,
          quantity: qty,
          unit_price: unit,
          total: qty * unit,
          time: meta
            ? new Date(meta.created_at).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          cashier_name: meta?.cashier_name || null,
          reason: it.complimentary_reason || null,
          _createdAt: meta?.created_at || '',
        };
      })
      .sort((a, b) => (b._createdAt || '').localeCompare(a._createdAt || ''))
      .map((x) => {
        const { _createdAt, ...rest } = x;
        void _createdAt;
        return rest;
      });

    // ============================================================
    // İPTAL EDİLMİŞ SİPARİŞLERİN KALEMLERİ (cancItems zaten fetched)
    // ============================================================
    const cancelledItems: ZReport['cancelled_items'] = cancItems
      .map((it) => {
        const meta = cancelledOrderMetaMap.get(String(it.order_id));
        const qty = Number(it.quantity || 0);
        const unit = Number(it.unit_price || 0);
        return {
          product_name: it.product_name,
          quantity: qty,
          unit_price: unit,
          total: qty * unit,
          time: meta
            ? new Date(meta.created_at).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          cashier_name: meta?.cashier_name || null,
          order_reason: meta?.note || null,
          _createdAt: meta?.created_at || '',
        };
      })
      .sort((a, b) => (b._createdAt || '').localeCompare(a._createdAt || ''))
      .map((x) => {
        const { _createdAt, ...rest } = x;
        void _createdAt;
        return rest;
      });

    // ============================================================
    // ORANLAR
    // ============================================================
    // İkram oranı: net satışa göre ne kadar ikram verildi (iç metrik)
    // İptal oranı: (iptal tutarı) / (brüt + iptal tutarı) — toplam içindeki iptal payı
    const complimentaryRate =
      totalRevenue > 0 ? (totalComplimentary / totalRevenue) * 100 : 0;
    const cancellationRate =
      totalRevenue + totalCancelledAmount > 0
        ? (totalCancelledAmount /
            (totalRevenue + totalCancelledAmount)) *
          100
        : 0;

    // ============================================================
    // İSTASYONA GÖRE SATIŞ (paidItems + stationsData memory'den)
    // ============================================================
    // İkramlar sayılmaz (müşteri paraya dönmedi).
    // Atanmamış (station_id NULL) kalemler ayrı grup olur.
    const stationMap = new Map<
      string,
      { name: string; icon: string; color: string }
    >();
    stationsData.forEach((s) => {
      stationMap.set(String(s.id), {
        name: s.name || 'İstasyon',
        icon: s.icon || '●',
        color: s.color || '#C4553A',
      });
    });

    const aggMap = new Map<string, { item_count: number; revenue: number }>();
    paidItems.forEach((it) => {
      if (it.is_complimentary) return;
      const qty = Number(it.quantity || 0);
      const unit = Number(it.unit_price || 0);
      const key = it.station_id || '__none';
      const cur = aggMap.get(key) || { item_count: 0, revenue: 0 };
      aggMap.set(key, {
        item_count: cur.item_count + qty,
        revenue: cur.revenue + unit * qty,
      });
    });

    const byStation: ZReport['by_station'] = Array.from(aggMap.entries())
      .map(([key, agg]) => {
        if (key === '__none') {
          return {
            station_id: null,
            name: 'Atanmamış',
            icon: '○',
            color: '#8A7A6D',
            ...agg,
          };
        }
        const meta = stationMap.get(key);
        return {
          station_id: key,
          name: meta?.name || 'İstasyon',
          icon: meta?.icon || '●',
          color: meta?.color || '#C4553A',
          ...agg,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // ============================================================
    // MUTABAKAT HESABI (kasa hesabı)
    // ============================================================
    // Gross Sales: Tüm paid siparişlerin total (ödeme yöntemi kırılımından önce)
    // Net Sales: Gross - İkram - İndirim (iptal zaten paid dışında)
    // Method totals: by_method'tan çıkarılır
    //
    // Kasa oturumu açıksa: opening_amount, expected_cash
    // Oturum kapandıysa (closed): declared_cash, declared_card, variance
    const cashTotal = byMethod.cash?.amount || 0;
    const cardTotal = byMethod.card?.amount || 0;
    const otherTotal = Object.entries(byMethod)
      .filter(([m]) => m !== 'cash' && m !== 'card')
      .reduce((s, [, v]) => s + v.amount, 0);
    const netSales = totalRevenue - totalComplimentary - totalDiscount;

    // Aktif kasa oturumunu bul (gün içindeki)
    // NOT: cash_refunds_total kolonu DB'de YOK — payment_logs'tan hesaplıyoruz
    const { data: sess } = await admin
      .from('cash_drawer_sessions')
      .select(
        'id, opening_amount, closed_at, declared_cash, declared_card, cash_variance, card_variance'
      )
      .eq('business_id', businessId)
      .gte('opened_at', start.toISOString())
      .lte('opened_at', end.toISOString())
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const openingAmount = sess
      ? Number((sess as { opening_amount: number }).opening_amount)
      : null;

    // İade toplamı (sadece NAKİT iade — kart iadesi POS'tan gider, kasayı etkilemez)
    // payment_logs'tan türetiyoruz (allKasaLogs zaten yüklü, ekstra sorgu yok)
    const cashRefunds = (allKasaLogs || [])
      .filter(
        (log) => log.action === 'refund' && log.payment_method === 'cash'
      )
      .reduce((sum, log) => sum + Math.abs(Number(log.amount)), 0);

    // expectedCash: açılış + nakit tahsilat - nakit iade
    // cashTotal byMethod.cash.amount'tan geliyor, refund zaten orada negatif olarak
    // dahil — bunu çıkarmak çift düşürme olur. cashTotal'ın brüt karşılığını
    // kullanmamız gerek. cashPayments = cashTotal + cashRefunds (refund'u geri ekle)
    const cashPaymentsGross = (allKasaLogs || [])
      .filter(
        (log) =>
          (log.action === 'payment' || log.action === 'partial_payment' || log.action === 'tip') &&
          log.payment_method === 'cash'
      )
      .reduce((sum, log) => sum + Number(log.amount), 0);

    const expectedCash =
      openingAmount !== null
        ? openingAmount + cashPaymentsGross - cashRefunds
        : null;

    const declaredCash = sess
      ? (sess as { declared_cash: number | null }).declared_cash
      : null;
    const declaredCard = sess
      ? (sess as { declared_card: number | null }).declared_card
      : null;
    const cashVariance =
      declaredCash !== null && expectedCash !== null
        ? Number(declaredCash) - expectedCash
        : null;
    const cardVariance =
      declaredCard !== null ? Number(declaredCard) - cardTotal : null;

    log('done, returning');

    // ============================================================
    // CARİ HESAP ÖZETİ (Açık Hesap)
    // ============================================================
    // Bu raporun aralığında:
    //   - charge        → sipariş cariye yazıldı (yeni borç)
    //   - manual_charge → panelden manuel borç (yeni borç)
    //   - payment       → cari ödeme alındı (tahsilat)
    //   - manual_credit → manuel alacak (kasa girişi olanlar tahsilat sayılır)
    const { data: allCariTxs } = await admin
      .from('customer_transactions')
      .select(
        'id, type, amount, customer_id, order_id, payment_method, created_at, customers(name)'
      )
      .eq('business_id', businessId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    type CustomerJoin = { name?: string } | { name?: string }[] | null;
    const extractName = (cj: CustomerJoin): string => {
      if (Array.isArray(cj)) return cj[0]?.name || '—';
      if (cj && typeof cj === 'object' && 'name' in cj) return cj.name || '—';
      return '—';
    };

    type RawTx = {
      id: string;
      type: string;
      amount: number | string;
      payment_method: string | null;
      created_at: string;
      customers: CustomerJoin;
    };
    const txs = ((allCariTxs || []) as unknown as RawTx[]) || [];

    // Charge'lar (sipariş + manuel borç)
    const chargeTxs = txs.filter(
      (t) => t.type === 'charge' || t.type === 'manual_charge'
    );
    // Tahsilat (payment + kasaya giren manuel alacak)
    const paymentTxs = txs.filter(
      (t) =>
        t.type === 'payment' ||
        (t.type === 'manual_credit' && t.payment_method != null)
    );

    const newChargesAmount = chargeTxs.reduce(
      (s, t) => s + Number(t.amount),
      0
    );
    const paymentsReceivedAmount = paymentTxs.reduce(
      (s, t) => s + Number(t.amount),
      0
    );

    const formatTime = (iso: string) =>
      new Date(iso).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const newCharges = chargeTxs.map((t) => ({
      customer_name: extractName(t.customers),
      amount: Number(t.amount),
      time: formatTime(t.created_at),
      source:
        t.type === 'manual_charge' ? ('manual' as const) : ('order' as const),
    }));

    const paymentsReceived = paymentTxs.map((t) => ({
      customer_name: extractName(t.customers),
      amount: Number(t.amount),
      method: (t.payment_method as string) || 'cash',
      time: formatTime(t.created_at),
      source:
        t.type === 'manual_credit'
          ? ('manual_credit' as const)
          : ('payment' as const),
    }));

    const onAccountSummary = {
      new_charges_count: chargeTxs.length,
      new_charges_amount: newChargesAmount,
      payments_received_count: paymentTxs.length,
      payments_received_amount: paymentsReceivedAmount,
      net_change: paymentsReceivedAmount - newChargesAmount,
      new_charges: newCharges,
      payments_received: paymentsReceived,
    };

    return {
      success: true,
      report: {
        date: start.toISOString().slice(0, 10),
        range: {
          from: start.toISOString(),
          to: end.toISOString(),
          preset,
          label,
        },
        business: {
          name: (business?.name as string) || 'İşletme',
          address: (business?.address as string | null) || null,
          logo_url: (business?.logo_url as string | null) || null,
          phone: (business?.phone as string | null) || null,
        },
        total_orders: allOrders.length,
        total_orders_paid: paid.length,
        total_revenue: totalRevenue,
        total_cancelled: cancelled.length,
        total_cancelled_amount: totalCancelledAmount,
        total_refunded: refunded.length,
        average_basket: avgBasket,
        total_tip: totalTip,
        total_discount: totalDiscount,
        total_complimentary: totalComplimentary,
        open_orders: openOrders.length,
        peak_hour: peakHour,
        by_method: byMethod,
        by_hour: byHour,
        by_cashier: byCashier,
        top_products: topProducts,
        cancelled_orders: cancelledDetail,
        refunded_orders: refundedDetail,
        complimentary_items: complimentaryItems,
        cancelled_items: cancelledItems,
        rates: {
          complimentary_rate: complimentaryRate,
          cancellation_rate: cancellationRate,
        },
        by_station: byStation,
        reconciliation: {
          gross_sales: totalRevenue,
          discount_total: totalDiscount,
          complimentary_total: totalComplimentary,
          cancelled_total: totalCancelledAmount,
          net_sales: netSales,
          cash_total: cashTotal,
          card_total: cardTotal,
          other_total: otherTotal,
          opening_amount: openingAmount,
          cash_refunds: cashRefunds,
          expected_cash: expectedCash,
          declared_cash: declaredCash !== null ? Number(declaredCash) : null,
          declared_card: declaredCard !== null ? Number(declaredCard) : null,
          cash_variance: cashVariance,
          card_variance: cardVariance,
        },
        on_account_summary: onAccountSummary,
        // PAKET C EKLENTİLERİ
        avg_prep_minutes: avgPrepMinutes,
        peak_hours: peakHours,
        by_source: bySource,
        weekly_trend: weeklyTrend,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Bölme ödemesi öncesi indirim/bahşiş uygula
// ============================================================
// Sipariş bölmeye gönderilmeden ÖNCE order.total'a discount/tip uygulanır.
// Böylece server ve client aynı net total üzerinden hesap yapar.
// Ödeme zaten kısmen yapılmışsa veya status paid'se hata döner.
// ============================================================
export async function applyAdjustmentsBeforeSplit(input: {
  orderId: string;
  discountAmount: number;
  discountReason?: string;
  tipAmount: number;
}): Promise<{
  success: boolean;
  newTotal?: number;
  error?: string;
}> {
  try {
    const { businessId, memberId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (input.discountAmount < 0 || input.tipAmount < 0) {
      return { success: false, error: 'İndirim/bahşiş eksi olamaz' };
    }

    const { data: order } = await admin
      .from('orders')
      .select(
        'id, business_id, payment_status, total, subtotal, discount_amount, tip_amount'
      )
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.business_id !== businessId) {
      return { success: false, error: 'Sipariş bulunamadı' };
    }
    if (order.payment_status === 'paid') {
      return { success: false, error: 'Bu sipariş zaten ödenmiş' };
    }

    // Önceden kısmi ödeme yapılmış mı?
    const { data: existingPartials } = await admin
      .from('payment_logs')
      .select('id')
      .eq('order_id', input.orderId)
      .eq('action', 'partial_payment')
      .limit(1);

    if (existingPartials && existingPartials.length > 0) {
      return {
        success: false,
        error:
          'Önceden kısmi ödeme yapılmış. İndirim/bahşiş artık uygulanamaz.',
      };
    }

    // Subtotal: ham kalemler toplamı (zaten orders.subtotal'da)
    const subtotal = Number(order.subtotal || order.total);
    const newTotal =
      Math.max(0, subtotal - input.discountAmount) + input.tipAmount;

    const { error: updateError } = await admin
      .from('orders')
      .update({
        total: newTotal,
        discount: input.discountAmount, // Z-Report bu kolonu okur
        discount_amount: input.discountAmount, // legacy uyum
        discount_reason: input.discountReason || null,
        tip: input.tipAmount, // Z-Report bu kolonu okur
        tip_amount: input.tipAmount, // legacy uyum
        // adjusted_at: new Date().toISOString(), // varsa
      })
      .eq('id', input.orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Adjustment log (eski payment_logs)
    await admin.from('payment_logs').insert({
      business_id: businessId,
      order_id: input.orderId,
      action: 'adjustment',
      payment_method: 'other',
      amount: 0,
      amount_paid: 0,
      change_given: 0,
      note: `Bölme öncesi: indirim ₺${input.discountAmount.toFixed(2)}${input.discountReason ? ' (' + input.discountReason + ')' : ''}, bahşiş ₺${input.tipAmount.toFixed(2)}`,
      performed_by: memberId,
      performed_at: new Date().toISOString(),
    });

    // AUDIT LOG (yeni order_logs)
    const performer = await fetchPerformerInfo(memberId);
    if (input.discountAmount > 0) {
      void logAction({
        businessId,
        orderId: input.orderId,
        action: 'discount_applied',
        details: {
          amount: input.discountAmount,
          reason: input.discountReason || null,
          context: 'before_split',
        },
        ...performer,
      });
    }
    if (input.tipAmount > 0) {
      void logAction({
        businessId,
        orderId: input.orderId,
        action: 'tip_applied',
        details: {
          amount: input.tipAmount,
          context: 'before_split',
        },
        ...performer,
      });
    }
    void logAction({
      businessId,
      orderId: input.orderId,
      action: 'split_payment_started',
      details: {
        newTotal,
        previousSubtotal: subtotal,
      },
      ...performer,
    });

    revalidatePath('/panel/masalar');
    return { success: true, newTotal };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
