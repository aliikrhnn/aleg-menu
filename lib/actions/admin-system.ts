'use server'

import { createClient } from '@/lib/supabase/server'
import { getSuperAdminUser } from '@/lib/auth/super-admin'

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

export async function getSystemHealth() {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { data, error } = await supabase.from('v_admin_system_health').select('*').single()
  if (error) throw new Error(error.message)
  const h = data as unknown as SystemHealth

  // Türetilmiş sinyaller
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
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
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
