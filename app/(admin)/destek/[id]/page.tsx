import { notFound } from 'next/navigation'
import { SupportDetailClient } from '@/components/admin/support-detail-client'
import { getSupportTicket } from '@/lib/actions/admin-support'
import { getSuperAdminUser } from '@/lib/auth/super-admin'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DestekDetailPage({ params }: PageProps) {
  const { id } = await params
  const admin = await getSuperAdminUser()
  if (!admin) notFound()

  let ticketData
  try {
    ticketData = await getSupportTicket(id)
  } catch {
    notFound()
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <SupportDetailClient
        ticket={ticketData.ticket}
        messages={ticketData.messages}
        currentUserId={admin.user_id}
      />
    </div>
  )
}
