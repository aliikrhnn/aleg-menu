'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AdminTeamMember {
  user_id: string
  full_name: string | null
  email: string
  user_created_at: string
  last_sign_in_at: string | null
  admin_since: string
  actions_30d: number
  open_tickets: number
}

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
      p_target_type: 'super_admin',
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

export async function listAdminTeam() {
  await requireSuperAdmin()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_admin_super_admins_list')
    .select('*')
    .order('admin_since', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as AdminTeamMember[]
}

export async function inviteSuperAdmin(input: { email: string; fullName: string }) {
  await requireSuperAdmin()

  const supabase = createClient()

  // Kullanıcı zaten var mı diye email'le ara - lookup_user_by_email RPC
  const { data: existing } = await supabase.rpc('lookup_user_by_email', {
    p_email: input.email.trim().toLowerCase(),
  })

  let userId: string | null = null
  if (existing && typeof existing === 'string') {
    userId = existing as string
  }

  if (!userId) {
    throw new Error(
      'Bu e-posta için henüz bir kullanıcı yok. Önce kullanıcıyı Supabase Dashboard üzerinden oluşturup sonra burada admin olarak ekleyin.',
    )
  }

  const { error } = await supabase
    .from('super_admins')
    .insert({ user_id: userId, full_name: input.fullName.trim() })
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'super_admin.add', userId, input.email, {}, 'super')

  revalidatePath('/kullanicilar')
  return { ok: true }
}

export async function removeSuperAdmin(userId: string) {
  const { user } = await requireSuperAdmin()
  if (user.id === userId) throw new Error('Kendi adminliğinizi kaldıramazsınız')

  const supabase = createClient()

  const { count } = await supabase.from('super_admins').select('*', { count: 'exact', head: true })
  if ((count ?? 0) <= 1) throw new Error('En az bir süper admin kalmalı')

  const { error } = await supabase.from('super_admins').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'super_admin.remove', userId, null, {}, 'danger')

  revalidatePath('/kullanicilar')
  return { ok: true }
}
