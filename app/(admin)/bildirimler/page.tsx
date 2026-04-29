import { NotificationsClient } from '@/components/admin/notifications-client'
import { listAnnouncements } from '@/lib/actions/admin-notifications'

export const dynamic = 'force-dynamic'

export default async function BildirimlerPage() {
  const { items } = await listAnnouncements({ limit: 200 })

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <NotificationsClient initialItems={items} />
    </div>
  )
}
