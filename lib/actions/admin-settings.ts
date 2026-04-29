'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PlatformSetting {
  key: string
  value: unknown
  description: string | null
  category: string
  updated_at: string
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

async function logAudit(
  client: ReturnType<typeof createClient>,
  action: string,
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
  const supabase = createClient()
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

  const supabase = createClient()
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
