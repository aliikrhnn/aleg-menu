'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AnnouncementCategory = 'info' | 'maintenance' | 'feature' | 'warning' | 'critical'
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'cancelled'
export type AnnouncementTargetType = 'all' | 'plan' | 'business' | 'city'

export interface AdminAnnouncement {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  target_type: AnnouncementTargetType
  target_value: string | null
  target_label: string
  status: AnnouncementStatus
  publish_at: string | null
  expires_at: string | null
  created_by: string | null
  created_by_name: string | null
  recipient_count: number
  read_count: number
  cta_label: string | null
  cta_url: string | null
  created_at: string
  updated_at: string
}

// Permission check
async function requireSuperAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Yetkisiz: giriş yapmamışsınız')
  const { data: admin } = await supabase
    .from('super_admins')
    .select('user_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!admin) throw new Error('Yetkisiz: süper admin değilsiniz')
  return { user, admin: admin as { user_id: string; full_name: string | null } }
}

async function logAudit(
  client: ReturnType<typeof createClient>,
  action: string,
  targetId: string | null,
  targetLabel: string | null,
  meta: Record<string, unknown>,
  tone: string,
) {
  try {
    await (client.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ error: unknown }>)('log_audit', {
      p_action: action,
      p_target_type: 'announcement',
      p_target_id: targetId,
      p_target_label: targetLabel,
      p_business_id: null,
      p_meta: meta,
      p_tone: tone,
    })
  } catch (e) {
    console.error('Audit log hatası:', e)
  }
}

interface ListAnnouncementsParams {
  q?: string
  status?: AnnouncementStatus | 'all'
  category?: AnnouncementCategory | 'all'
  limit?: number
  offset?: number
}

export async function listAnnouncements(params: ListAnnouncementsParams = {}) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { q, status = 'all', category = 'all', limit = 100, offset = 0 } = params

  let query = supabase.from('v_admin_announcements_list').select('*', { count: 'exact' })
  if (status !== 'all') query = query.eq('status', status)
  if (category !== 'all') query = query.eq('category', category)
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(`title.ilike.${term},body.ilike.${term}`)
  }
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return {
    items: (data ?? []) as unknown as AdminAnnouncement[],
    total: count ?? 0,
  }
}

export async function getAnnouncement(id: string) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_admin_announcements_list')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as AdminAnnouncement
}

export async function createAnnouncement(input: {
  title: string
  body: string
  category?: AnnouncementCategory
  targetType?: AnnouncementTargetType
  targetValue?: string | null
  publishAt?: string | null
  expiresAt?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  publishNow?: boolean
}) {
  const { user, admin } = await requireSuperAdmin()
  if (!input.title.trim() || !input.body.trim()) throw new Error('Başlık ve içerik zorunlu')

  const supabase = createClient()

  const status: AnnouncementStatus =
    input.publishNow ? 'published' : input.publishAt ? 'scheduled' : 'draft'

  const { data, error } = await supabase
    .from('platform_announcements')
    .insert({
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category ?? 'info',
      target_type: input.targetType ?? 'all',
      target_value: input.targetValue ?? null,
      status,
      publish_at: input.publishNow ? new Date().toISOString() : input.publishAt ?? null,
      expires_at: input.expiresAt ?? null,
      created_by: user.id,
      created_by_name: admin.full_name ?? user.email,
      cta_label: input.ctaLabel ?? null,
      cta_url: input.ctaUrl ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const row = data as unknown as { id: string }

  await logAudit(supabase, 'announcement.create', row.id, input.title, { status, target_type: input.targetType ?? 'all' }, 'super')

  revalidatePath('/bildirimler')
  return { ok: true, id: row.id }
}

export async function publishAnnouncement(id: string) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { error } = await supabase
    .from('platform_announcements')
    .update({ status: 'published', publish_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'announcement.publish', id, null, {}, 'super')

  revalidatePath('/bildirimler')
  return { ok: true }
}

export async function cancelAnnouncement(id: string) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { error } = await supabase
    .from('platform_announcements')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'announcement.cancel', id, null, {}, 'warn')

  revalidatePath('/bildirimler')
  return { ok: true }
}

export async function deleteAnnouncement(id: string) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { error } = await supabase.from('platform_announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'announcement.delete', id, null, {}, 'danger')

  revalidatePath('/bildirimler')
  return { ok: true }
}
