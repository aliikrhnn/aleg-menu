'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSuperAdminUser } from '@/lib/auth/super-admin'
import { logAdminAction } from '@/lib/admin/audit'

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

export async function listAdminTeam() {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_admin_super_admins_list')
    .select('*')
    .order('admin_since', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as AdminTeamMember[]
}

export async function inviteSuperAdmin(input: { email: string; fullName: string }) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()

  // Önce kullanıcı zaten var mı?
  const { data: existing } = await supabase.rpc('lookup_user_by_email', { p_email: input.email.trim().toLowerCase() })

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

  await logAdminAction({
    action: 'super_admin.add',
    target_type: 'super_admin',
    target_id: userId,
    target_label: input.email,
    tone: 'super',
  })

  revalidatePath('/kullanicilar')
  return { ok: true }
}

export async function removeSuperAdmin(userId: string) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')
  if (admin.user_id === userId) throw new Error('Kendi adminliğinizi kaldıramazsınız')

  const supabase = await createClient()

  // En az bir super admin kalmalı
  const { count } = await supabase.from('super_admins').select('*', { count: 'exact', head: true })
  if ((count ?? 0) <= 1) throw new Error('En az bir süper admin kalmalı')

  const { error } = await supabase.from('super_admins').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'super_admin.remove',
    target_type: 'super_admin',
    target_id: userId,
    tone: 'danger',
  })

  revalidatePath('/kullanicilar')
  return { ok: true }
}
