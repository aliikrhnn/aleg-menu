import { AdminUsersClient } from '@/components/admin/admin-users-client'
import { listAdminTeam } from '@/lib/actions/admin-users'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function KullanicilarPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()
  const members = await listAdminTeam()

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <AdminUsersClient members={members} currentUserId={user.id} />
    </div>
  )
}
