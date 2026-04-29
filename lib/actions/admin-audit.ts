'use server'

import { createClient } from '@/lib/supabase/server'

export interface AdminAuditLogEntry {
  id: number
  ts: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  is_system: boolean
  action: string
  target_type: string | null
  target_id: string | null
  target_label: string | null
  business_id: string | null
  business_name: string | null
  business_slug: string | null
  meta: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  tone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive'
}

async function requireSuperAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Yetkisiz: giriş yapmamışsınız')
  const { data: admin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!admin) throw new Error('Yetkisiz: süper admin değilsiniz')
  return { user }
}

interface ListAuditLogsParams {
  q?: string
  actorId?: string
  action?: string
  tone?: string
  businessId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export async function listAuditLogs(params: ListAuditLogsParams = {}) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { q, actorId, action, tone, businessId, from, to, limit = 100, offset = 0 } = params

  let query = supabase.from('v_admin_audit_logs_full').select('*', { count: 'exact' })

  if (actorId) query = query.eq('actor_id', actorId)
  if (action) query = query.eq('action', action)
  if (tone) query = query.eq('tone', tone)
  if (businessId) query = query.eq('business_id', businessId)
  if (from) query = query.gte('ts', from)
  if (to) query = query.lte('ts', to)

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(
      `action.ilike.${term},target_label.ilike.${term},business_name.ilike.${term},actor_email.ilike.${term}`,
    )
  }

  query = query.order('ts', { ascending: false }).range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return {
    items: (data ?? []) as unknown as AdminAuditLogEntry[],
    total: count ?? 0,
  }
}

export async function listAuditActionTypes() {
  await requireSuperAdmin()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platform_audit_logs')
    .select('action')
    .order('ts', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)

  const set = new Set<string>()
  for (const row of (data ?? []) as unknown as { action: string }[]) {
    if (row.action) set.add(row.action)
  }
  return Array.from(set).sort()
}
