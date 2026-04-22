'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type Review = {
  id: string;
  order_id: string | null;
  order_no: string | null;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  redirected_to_google: boolean;
  reply_text: string | null;
  reply_at: string | null;
  is_archived: boolean;
  created_at: string;
};

export type ReviewSummary = {
  total: number;
  average: number;
  byStar: Record<1 | 2 | 3 | 4 | 5, number>;
  thisMonthTotal: number;
  thisMonthAverage: number;
};

// ============================================================
// MUSTERI INPUT (anonim)
// ============================================================

export async function submitReview(input: {
  businessId: string;
  orderId?: string | null;
  rating: number;
  comment?: string;
  customerName?: string;
  customerPhone?: string;
  redirectedToGoogle?: boolean;
}): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  try {
    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: 'Geçersiz puan' };
    }
    if (!input.businessId) {
      return { success: false, error: 'İşletme bilgisi yok' };
    }

    const admin = createAdminClient();

    // İşletme var mı?
    const { data: business } = await admin
      .from('businesses')
      .select('id')
      .eq('id', input.businessId)
      .maybeSingle();

    if (!business) return { success: false, error: 'İşletme bulunamadı' };

    // Aynı sipariş için tekrar değerlendirme yapılmasını engelle
    if (input.orderId) {
      const { data: existing } = await admin
        .from('reviews')
        .select('id')
        .eq('order_id', input.orderId)
        .maybeSingle();
      if (existing) {
        return { success: false, error: 'Bu sipariş için değerlendirme zaten yapılmış' };
      }
    }

    const { data, error } = await admin
      .from('reviews')
      .insert({
        business_id: input.businessId,
        order_id: input.orderId || null,
        rating: input.rating,
        comment: input.comment?.trim() || null,
        customer_name: input.customerName?.trim() || null,
        customer_phone: input.customerPhone?.trim() || null,
        redirected_to_google: input.redirectedToGoogle || false,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, reviewId: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// İŞLETME PANELİ - LİSTE
// ============================================================

async function requireBusinessAccess(): Promise<{ businessId: string; userId: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return { businessId: membership.business_id, userId: user.id };
}

export async function getReviews(
  filter: { rating?: number; archived?: boolean; limit?: number } = {}
): Promise<{ success: boolean; reviews?: Review[]; summary?: ReviewSummary; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    let query = admin
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (filter.rating) query = query.eq('rating', filter.rating);
    if (filter.archived !== undefined)
      query = query.eq('is_archived', filter.archived);
    query = query.limit(filter.limit || 100);

    const { data: reviews, error } = await query;
    if (error) return { success: false, error: error.message };

    // Order numbers
    const orderIds = [
      ...new Set((reviews || []).map((r) => r.order_id).filter(Boolean)),
    ] as string[];
    const orderNoMap = new Map<string, string>();
    if (orderIds.length > 0) {
      orderIds.forEach((id) => orderNoMap.set(id, id.slice(0, 8).toUpperCase()));
    }

    const result: Review[] = (reviews || []).map((r) => ({
      id: r.id,
      order_id: r.order_id,
      order_no: r.order_id ? orderNoMap.get(r.order_id) || null : null,
      rating: r.rating,
      comment: r.comment,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      customer_email: r.customer_email,
      redirected_to_google: r.redirected_to_google,
      reply_text: r.reply_text,
      reply_at: r.reply_at,
      is_archived: r.is_archived,
      created_at: r.created_at,
    }));

    // Summary
    const { data: allReviews } = await admin
      .from('reviews')
      .select('rating, created_at')
      .eq('business_id', businessId)
      .eq('is_archived', false);

    const all = allReviews || [];
    const total = all.length;
    const sum = all.reduce((s, r) => s + (r.rating as number), 0);
    const average = total > 0 ? sum / total : 0;

    const byStar: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.forEach((r) => {
      const rating = r.rating as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) byStar[rating]++;
    });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const thisMonth = all.filter((r) => new Date(r.created_at as string) >= monthAgo);
    const thisMonthTotal = thisMonth.length;
    const thisMonthSum = thisMonth.reduce((s, r) => s + (r.rating as number), 0);
    const thisMonthAverage = thisMonthTotal > 0 ? thisMonthSum / thisMonthTotal : 0;

    const summary: ReviewSummary = {
      total,
      average,
      byStar,
      thisMonthTotal,
      thisMonthAverage,
    };

    return { success: true, reviews: result, summary };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function replyToReview(
  reviewId: string,
  replyText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId, userId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'Değerlendirme bulunamadı' };

    const { error } = await admin
      .from('reviews')
      .update({
        reply_text: replyText.trim(),
        reply_at: new Date().toISOString(),
        reply_user_id: userId,
      })
      .eq('id', reviewId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/panel/degerlendirmeler');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function archiveReview(
  reviewId: string,
  archived: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { error } = await admin
      .from('reviews')
      .update({ is_archived: archived })
      .eq('id', reviewId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/panel/degerlendirmeler');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Public — Müşteri değerlendirme sayfası açıldığında işletme bilgisi
export async function getReviewBusinessInfo(orderIdOrSlug: string): Promise<{
  success: boolean;
  data?: {
    business_id: string;
    business_name: string;
    order_id: string | null;
    review_smart_redirect: boolean;
    google_place_id: string;
    review_qr_text: string;
    already_reviewed: boolean;
  };
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidPattern.test(orderIdOrSlug);

    let businessId: string | null = null;
    let orderId: string | null = null;

    if (isUuid) {
      const { data: order } = await admin
        .from('orders').select('id, business_id').eq('id', orderIdOrSlug).maybeSingle();
      if (order) {
        businessId = order.business_id as string;
        orderId = order.id as string;
      }
    }

    if (!businessId) {
      const { data: biz } = await admin
        .from('businesses').select('id').eq('slug', orderIdOrSlug).maybeSingle();
      if (biz) businessId = biz.id as string;
    }

    if (!businessId) return { success: false, error: 'Sipariş veya işletme bulunamadı' };

    const { data: business } = await admin
      .from('businesses').select('name, receipt_settings').eq('id', businessId).maybeSingle();
    if (!business) return { success: false, error: 'İşletme bulunamadı' };

    const settings = (business.receipt_settings as any) || {};

    let alreadyReviewed = false;
    if (orderId) {
      const { data: existing } = await admin
        .from('reviews').select('id').eq('order_id', orderId).maybeSingle();
      alreadyReviewed = !!existing;
    }

    return {
      success: true,
      data: {
        business_id: businessId,
        business_name: business.name as string,
        order_id: orderId,
        review_smart_redirect: settings.review_smart_redirect || false,
        google_place_id: settings.google_place_id || '',
        review_qr_text: settings.review_qr_text || 'Deneyiminizi değerlendirin',
        already_reviewed: alreadyReviewed,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Hata' };
  }
}