'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSuperAdminUser } from '@/lib/auth/super-admin'
import { logAdminAction } from '@/lib/admin/audit'

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

interface ListAnnouncementsParams {
  q?: string
  status?: AnnouncementStatus | 'all'
  category?: AnnouncementCategory | 'all'
  limit?: number
  offset?: number
}

export async function listAnnouncements(params: ListAnnouncementsParams = {}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
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
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
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
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')
  if (!input.title.trim() || !input.body.trim()) throw new Error('Başlık ve içerik zorunlu')

  const supabase = await createClient()

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
      created_by: admin.user_id,
      created_by_name: admin.full_name ?? admin.email,
      cta_label: input.ctaLabel ?? null,
      cta_url: input.ctaUrl ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const row = data as unknown as { id: string }

  await logAdminAction({
    action: 'announcement.create',
    target_type: 'announcement',
    target_id: row.id,
    target_label: input.title,
    tone: 'super',
    meta: { status, target_type: input.targetType ?? 'all' },
  })

  revalidatePath('/bildirimler')
  return { ok: true, id: row.id }
}

export async function publishAnnouncement(id: string) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { error } = await supabase
    .from('platform_announcements')
    .update({ status: 'published', publish_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'announcement.publish',
    target_type: 'announcement',
    target_id: id,
    tone: 'super',
  })

  revalidatePath('/bildirimler')
  return { ok: true }
}

export async function cancelAnnouncement(id: string) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { error } = await supabase
    .from('platform_announcements')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'announcement.cancel',
    target_type: 'announcement',
    target_id: id,
    tone: 'warn',
  })

  revalidatePath('/bildirimler')
  return { ok: true }
}

export async function deleteAnnouncement(id: string) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { error } = await supabase.from('platform_announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'announcement.delete',
    target_type: 'announcement',
    target_id: id,
    tone: 'danger',
  })

  revalidatePath('/bildirimler')
  return { ok: true }
}
