import { AuditClient } from '@/components/admin/audit-client'
import { listAuditLogs, listAuditActionTypes } from '@/lib/actions/admin-audit'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const [{ items }, actionTypes] = await Promise.all([
    listAuditLogs({ limit: 200 }),
    listAuditActionTypes(),
  ])

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <AuditClient initialItems={items} actionTypes={actionTypes} />
    </div>
  )
}
