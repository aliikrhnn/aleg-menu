import { SupportTicketsClient } from '@/components/admin/support-list-client'
import { listSupportTickets, getSupportMetrics } from '@/lib/actions/admin-support'

export const dynamic = 'force-dynamic'

export default async function DestekPage() {
  const [{ items }, metrics] = await Promise.all([
    listSupportTickets({ limit: 200 }),
    getSupportMetrics(),
  ])

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <SupportTicketsClient initialItems={items} metrics={metrics} />
    </div>
  )
}
