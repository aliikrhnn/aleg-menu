'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSuperAdminUser } from '@/lib/auth/super-admin'
import { logAdminAction } from '@/lib/admin/audit'

export interface PlatformSetting {
  key: string
  value: unknown
  description: string | null
  category: string
  updated_at: string
}

export async function listPlatformSettings() {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PlatformSetting[]
}

export async function updatePlatformSetting(input: { key: string; value: unknown }) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { error } = await supabase
    .from('platform_settings')
    .update({ value: input.value as never, updated_by: admin.user_id, updated_at: new Date().toISOString() })
    .eq('key', input.key)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'settings.update',
    target_type: 'platform_setting',
    target_label: input.key,
    tone: 'super',
    meta: { value: input.value },
  })

  revalidatePath('/ayarlar')
  return { ok: true }
}
