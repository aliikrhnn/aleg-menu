'use server'

import { createClient } from '@/lib/supabase/server'

export interface SystemHealth {
  total_businesses: number
  active_businesses: number
  total_users: number
  active_users_24h: number
  orders_24h: number
  revenue_24h: number
  print_jobs_24h: number
  failed_jobs_24h: number
  open_tickets: number
  db_size_bytes: number
}

export interface SystemSignal {
  label: string
  value: string
  status: 'ok' | 'warn' | 'danger'
  hint?: string
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

export async function getSystemHealth() {
  await requireSuperAdmin()
  const supabase = createClient()
  const { data, error } = await supabase.from('v_admin_system_health').select('*').single()
  if (error) throw new Error(error.message)
  const h = data as unknown as SystemHealth

  const signals: SystemSignal[] = []

  signals.push({
    label: 'Veritabanı',
    value: 'Online',
    status: 'ok',
    hint: `${(h.db_size_bytes / 1024 / 1024).toFixed(1)} MB`,
  })

  const failureRate = h.print_jobs_24h > 0 ? (h.failed_jobs_24h / h.print_jobs_24h) * 100 : 0
  signals.push({
    label: 'Yazıcı kuyruğu',
    value: `${h.print_jobs_24h} iş / 24s`,
    status: failureRate > 10 ? 'warn' : 'ok',
    hint: failureRate > 0 ? `${failureRate.toFixed(0)}% başarısız` : 'Tüm işler tamam',
  })

  signals.push({
    label: 'Aktif kullanıcı',
    value: `${h.active_users_24h} / 24s`,
    status: 'ok',
    hint: `${h.total_users} toplam`,
  })

  signals.push({
    label: 'Açık ticket',
    value: String(h.open_tickets),
    status: h.open_tickets > 10 ? 'warn' : 'ok',
  })

  return { health: h, signals }
}

export async function getRecentSystemActivity(limit = 20) {
  await requireSuperAdmin()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platform_audit_logs')
    .select('id, ts, action, actor_email, target_label, tone')
    .order('ts', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)

  return (data ?? []) as unknown as Array<{
    id: number
    ts: string
    action: string
    actor_email: string | null
    target_label: string | null
    tone: string
  }>
}
