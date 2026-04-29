import { SystemClient } from '@/components/admin/system-client'
import { getSystemHealth, getRecentSystemActivity } from '@/lib/actions/admin-system'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SistemPage() {
  const [{ health, signals }, recentActivity] = await Promise.all([
    getSystemHealth(),
    getRecentSystemActivity(20),
  ])

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <SystemClient health={health} signals={signals} recentActivity={recentActivity} />
    </div>
  )
}
