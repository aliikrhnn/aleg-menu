'use server'

import { createClient } from '@/lib/supabase/server'

// Untyped Supabase client - Database tipinde henüz olmayan tablolar (support_tickets, 
// platform_announcements, platform_settings) için tip kontrolünü esnetir.
// Yeni tablolar Database types'a eklendiğinde bu cast kaldırılabilir.
type UntypedSupabase = {
  from: (table: string) => {
    select: (cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => UntypedQuery
    insert: (values: Record<string, unknown>, opts?: Record<string, unknown>) => UntypedQuery
    update: (values: Record<string, unknown>) => UntypedQuery
    delete: () => UntypedQuery
    upsert: (values: Record<string, unknown>) => UntypedQuery
  }
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }>
  }
}
type UntypedQuery = {
  select: (cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => UntypedQuery
  insert: (values: Record<string, unknown>) => UntypedQuery
  update: (values: Record<string, unknown>) => UntypedQuery
  delete: () => UntypedQuery
  eq: (col: string, val: unknown) => UntypedQuery
  neq: (col: string, val: unknown) => UntypedQuery
  gt: (col: string, val: unknown) => UntypedQuery
  gte: (col: string, val: unknown) => UntypedQuery
  lt: (col: string, val: unknown) => UntypedQuery
  lte: (col: string, val: unknown) => UntypedQuery
  is: (col: string, val: unknown) => UntypedQuery
  in: (col: string, val: unknown[]) => UntypedQuery
  or: (filter: string) => UntypedQuery
  ilike: (col: string, val: string) => UntypedQuery
  order: (col: string, opts?: { ascending?: boolean }) => UntypedQuery
  limit: (n: number) => UntypedQuery
  range: (from: number, to: number) => UntypedQuery
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: <T>(resolve: (val: { data: unknown; count: number | null; error: { message: string } | null }) => T) => Promise<T>
}


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
  const supabase = createClient() as unknown as UntypedSupabase
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
  const supabase = createClient() as unknown as UntypedSupabase
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
  const supabase = createClient() as unknown as UntypedSupabase
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
