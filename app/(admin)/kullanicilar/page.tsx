import { AdminUsersClient } from '@/components/admin/admin-users-client'
import { listAdminTeam } from '@/lib/actions/admin-users'
import { getSuperAdminUser } from '@/lib/auth/super-admin'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function KullanicilarPage() {
  const admin = await getSuperAdminUser()
  if (!admin) notFound()
  const members = await listAdminTeam()

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <AdminUsersClient members={members} currentUserId={admin.user_id} />
    </div>
  )
}
