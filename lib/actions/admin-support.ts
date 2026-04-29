'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSuperAdminUser } from '@/lib/auth/super-admin'
import { logAdminAction } from '@/lib/admin/audit'

type Json = Record<string, unknown>

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SupportTicketCategory = 'general' | 'billing' | 'technical' | 'feature_request' | 'bug' | 'account'

export interface AdminSupportTicket {
  id: string
  ticket_no: string
  subject: string
  category: SupportTicketCategory
  priority: SupportTicketPriority
  status: SupportTicketStatus
  business_id: string | null
  business_name: string | null
  business_slug: string | null
  reporter_email: string
  reporter_name: string | null
  assignee_id: string | null
  assignee_email: string | null
  assignee_name: string | null
  created_at: string
  updated_at: string
  last_reply_at: string
  resolved_at: string | null
  message_count: number
  age_hours: number
}

export interface AdminSupportMessage {
  id: string
  ticket_id: string
  author_id: string | null
  author_email: string | null
  author_name: string | null
  author_type: 'user' | 'admin' | 'system'
  body: string
  is_internal: boolean
  attachments: Json
  created_at: string
}

export interface AdminSupportMetrics {
  open_count: number
  in_progress_count: number
  waiting_count: number
  urgent_count: number
  resolved_7d: number
  created_7d: number
  avg_resolution_hours: number | null
}

interface ListSupportTicketsParams {
  q?: string
  status?: SupportTicketStatus | 'all'
  priority?: SupportTicketPriority | 'all'
  category?: SupportTicketCategory | 'all'
  assignee?: 'me' | 'unassigned' | 'all'
  limit?: number
  offset?: number
}

export async function listSupportTickets(params: ListSupportTicketsParams = {}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { q, status = 'all', priority = 'all', category = 'all', assignee = 'all', limit = 100, offset = 0 } = params

  let query = supabase.from('v_admin_support_tickets_list').select('*', { count: 'exact' })

  if (status !== 'all') query = query.eq('status', status)
  if (priority !== 'all') query = query.eq('priority', priority)
  if (category !== 'all') query = query.eq('category', category)
  if (assignee === 'me') query = query.eq('assignee_id', admin.user_id)
  if (assignee === 'unassigned') query = query.is('assignee_id', null)

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(`subject.ilike.${term},ticket_no.ilike.${term},reporter_email.ilike.${term},business_name.ilike.${term}`)
  }

  query = query.order('last_reply_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return {
    items: (data ?? []) as unknown as AdminSupportTicket[],
    total: count ?? 0,
  }
}

export async function getSupportMetrics(): Promise<AdminSupportMetrics> {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { data, error } = await supabase.from('v_admin_support_metrics').select('*').single()
  if (error) throw new Error(error.message)
  return data as unknown as AdminSupportMetrics
}

export async function getSupportTicket(id: string) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { data: ticket, error: tErr } = await supabase
    .from('v_admin_support_tickets_list')
    .select('*')
    .eq('id', id)
    .single()
  if (tErr) throw new Error(tErr.message)

  const { data: messages, error: mErr } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })
  if (mErr) throw new Error(mErr.message)

  return {
    ticket: ticket as unknown as AdminSupportTicket,
    messages: (messages ?? []) as unknown as AdminSupportMessage[],
  }
}

export async function replySupportTicket(input: {
  ticketId: string
  body: string
  isInternal?: boolean
}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')
  if (!input.body.trim()) throw new Error('Mesaj boş olamaz')

  const supabase = await createClient()
  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: input.ticketId,
    author_id: admin.user_id,
    author_email: admin.email,
    author_name: admin.full_name ?? admin.email,
    author_type: 'admin',
    body: input.body.trim(),
    is_internal: input.isInternal ?? false,
  })
  if (error) throw new Error(error.message)

  // İç notlar için audit kaydı atma — gürültü olur
  if (!input.isInternal) {
    await logAdminAction({
      action: 'support.reply',
      target_type: 'support_ticket',
      target_id: input.ticketId,
      tone: 'muted',
      meta: { internal: false },
    })
  }

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function updateSupportTicketStatus(input: {
  ticketId: string
  status: SupportTicketStatus
}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const patch: Record<string, unknown> = { status: input.status }
  if (input.status === 'resolved') patch.resolved_at = new Date().toISOString()
  if (input.status === 'closed') patch.closed_at = new Date().toISOString()

  const { error } = await supabase.from('support_tickets').update(patch).eq('id', input.ticketId)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'support.status_change',
    target_type: 'support_ticket',
    target_id: input.ticketId,
    tone: input.status === 'resolved' || input.status === 'closed' ? 'ok' : 'muted',
    meta: { status: input.status },
  })

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function assignSupportTicket(input: {
  ticketId: string
  assigneeId: string | null
}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { error } = await supabase
    .from('support_tickets')
    .update({ assignee_id: input.assigneeId })
    .eq('id', input.ticketId)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'support.assign',
    target_type: 'support_ticket',
    target_id: input.ticketId,
    tone: 'muted',
    meta: { assignee_id: input.assigneeId },
  })

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function updateSupportTicketPriority(input: {
  ticketId: string
  priority: SupportTicketPriority
}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')

  const supabase = await createClient()
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority: input.priority })
    .eq('id', input.ticketId)
  if (error) throw new Error(error.message)

  await logAdminAction({
    action: 'support.priority_change',
    target_type: 'support_ticket',
    target_id: input.ticketId,
    tone: input.priority === 'urgent' ? 'warn' : 'muted',
    meta: { priority: input.priority },
  })

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function createSupportTicketAsAdmin(input: {
  businessId?: string | null
  reporterEmail: string
  reporterName?: string
  subject: string
  category?: SupportTicketCategory
  priority?: SupportTicketPriority
  body: string
}) {
  const admin = await getSuperAdminUser()
  if (!admin) throw new Error('UNAUTHORIZED')
  if (!input.subject.trim() || !input.body.trim()) throw new Error('Konu ve mesaj zorunlu')

  const supabase = await createClient()

  // Ticket no
  const { data: noData, error: noErr } = await supabase.rpc('generate_support_ticket_no')
  if (noErr) throw new Error(noErr.message)

  // Business name snapshot
  let businessName: string | null = null
  if (input.businessId) {
    const { data: b } = await supabase.from('businesses').select('name').eq('id', input.businessId).single()
    businessName = (b as { name: string } | null)?.name ?? null
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      ticket_no: noData,
      business_id: input.businessId ?? null,
      business_name_snapshot: businessName,
      reporter_email: input.reporterEmail,
      reporter_name: input.reporterName ?? null,
      subject: input.subject.trim(),
      category: input.category ?? 'general',
      priority: input.priority ?? 'normal',
      status: 'open',
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const ticketRow = ticket as unknown as { id: string }

  await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketRow.id,
    author_id: admin.user_id,
    author_email: admin.email,
    author_name: admin.full_name ?? admin.email,
    author_type: 'admin',
    body: input.body.trim(),
    is_internal: false,
  })

  await logAdminAction({
    action: 'support.create',
    target_type: 'support_ticket',
    target_id: ticketRow.id,
    tone: 'muted',
    meta: { ticket_no: noData, on_behalf: input.reporterEmail },
  })

  revalidatePath('/destek')
  return { ok: true, ticketId: ticketRow.id }
}
