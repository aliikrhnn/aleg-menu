'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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


export interface PlatformSetting {
  key: string
  value: unknown
  description: string | null
  category: string
  updated_at: string
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

async function logAudit(
  client: UntypedSupabase,
  action: string,
  targetLabel: string | null,
  meta: Record<string, unknown>,
  tone: string,
) {
  try {
    await client.rpc('log_audit', {
      p_action: action,
      p_target_type: 'platform_setting',
      p_target_id: null,
      p_target_label: targetLabel,
      p_business_id: null,
      p_meta: meta,
      p_tone: tone,
    })
  } catch (e) {
    console.error('Audit log hatası:', e)
  }
}

export async function listPlatformSettings() {
  await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PlatformSetting[]
}

export async function updatePlatformSetting(input: { key: string; value: unknown }) {
  const { user } = await requireSuperAdmin()

  const supabase = createClient() as unknown as UntypedSupabase
  const { error } = await supabase
    .from('platform_settings')
    .update({
      value: input.value as never,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', input.key)
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'settings.update', input.key, { value: input.value }, 'super')

  revalidatePath('/ayarlar')
  return { ok: true }
}
