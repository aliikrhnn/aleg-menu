'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Untyped Supabase client - Database tipinde henüz olmayan tablolar (support_tickets, 
// platform_announcements, platform_settings) için tip kontrolünü esnetir.
// Yeni tablolar Database types'a eklendiğinde bu cast kaldırılabilir.
type UntypedSupabase = {
  from: (table: string) => {
    select: (cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => UntypedQuery
    insert: (values: Record<string, unknown>, opts?: Record<string, unknown>) => UntypedQuery
    update: (values: Record<string, unknown>) => UntypedQuery
    delete: () => UntypedQuery
    upsert: (values: Record<string, unknown>) => UntypedQuery
  }
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }>
  }
}
type UntypedQuery = {
  select: (cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => UntypedQuery
  insert: (values: Record<string, unknown>) => UntypedQuery
  update: (values: Record<string, unknown>) => UntypedQuery
  delete: () => UntypedQuery
  eq: (col: string, val: unknown) => UntypedQuery
  neq: (col: string, val: unknown) => UntypedQuery
  gt: (col: string, val: unknown) => UntypedQuery
  gte: (col: string, val: unknown) => UntypedQuery
  lt: (col: string, val: unknown) => UntypedQuery
  lte: (col: string, val: unknown) => UntypedQuery
  is: (col: string, val: unknown) => UntypedQuery
  in: (col: string, val: unknown[]) => UntypedQuery
  or: (filter: string) => UntypedQuery
  ilike: (col: string, val: string) => UntypedQuery
  order: (col: string, opts?: { ascending?: boolean }) => UntypedQuery
  limit: (n: number) => UntypedQuery
  range: (from: number, to: number) => UntypedQuery
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: <T>(resolve: (val: { data: unknown; count: number | null; error: { message: string } | null }) => T) => Promise<T>
}


type Json = Record<string, unknown>

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SupportTicketCategory =
  | 'general'
  | 'billing'
  | 'technical'
  | 'feature_request'
  | 'bug'
  | 'account'

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

// Permission check
async function requireSuperAdmin() {
  const supabase = createClient() as unknown as UntypedSupabase
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

// Audit helper
async function logAudit(
  client: UntypedSupabase,
  action: string,
  targetId: string | null,
  targetLabel: string | null,
  businessId: string | null,
  meta: Record<string, unknown>,
  tone: string,
) {
  try {
    await client.rpc('log_audit', {
      p_action: action,
      p_target_type: 'support_ticket',
      p_target_id: targetId,
      p_target_label: targetLabel,
      p_business_id: businessId,
      p_meta: meta,
      p_tone: tone,
    })
  } catch (e) {
    console.error('Audit log hatası:', e)
  }
}

// LISTE
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
  const { user } = await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
  const { q, status = 'all', priority = 'all', category = 'all', assignee = 'all', limit = 100, offset = 0 } = params

  let query = supabase.from('v_admin_support_tickets_list').select('*', { count: 'exact' })

  if (status !== 'all') query = query.eq('status', status)
  if (priority !== 'all') query = query.eq('priority', priority)
  if (category !== 'all') query = query.eq('category', category)
  if (assignee === 'me') query = query.eq('assignee_id', user.id)
  if (assignee === 'unassigned') query = query.is('assignee_id', null)

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(
      `subject.ilike.${term},ticket_no.ilike.${term},reporter_email.ilike.${term},business_name.ilike.${term}`,
    )
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
  await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
  const { data, error } = await supabase.from('v_admin_support_metrics').select('*').single()
  if (error) throw new Error(error.message)
  return data as unknown as AdminSupportMetrics
}

export async function getSupportTicket(id: string) {
  await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
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
  const { user, admin } = await requireSuperAdmin()
  if (!input.body.trim()) throw new Error('Mesaj boş olamaz')

  const supabase = createClient() as unknown as UntypedSupabase
  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: input.ticketId,
    author_id: user.id,
    author_email: user.email,
    author_name: admin.full_name ?? user.email,
    author_type: 'admin',
    body: input.body.trim(),
    is_internal: input.isInternal ?? false,
  })
  if (error) throw new Error(error.message)

  if (!input.isInternal) {
    await logAudit(supabase, 'support.reply', input.ticketId, null, null, { internal: false }, 'muted')
  }

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function updateSupportTicketStatus(input: {
  ticketId: string
  status: SupportTicketStatus
}) {
  await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
  const patch: Record<string, unknown> = { status: input.status }
  if (input.status === 'resolved') patch.resolved_at = new Date().toISOString()
  if (input.status === 'closed') patch.closed_at = new Date().toISOString()

  const { error } = await supabase.from('support_tickets').update(patch).eq('id', input.ticketId)
  if (error) throw new Error(error.message)

  await logAudit(
    supabase,
    'support.status_change',
    input.ticketId,
    null,
    null,
    { status: input.status },
    input.status === 'resolved' || input.status === 'closed' ? 'ok' : 'muted',
  )

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function assignSupportTicket(input: {
  ticketId: string
  assigneeId: string | null
}) {
  await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
  const { error } = await supabase
    .from('support_tickets')
    .update({ assignee_id: input.assigneeId })
    .eq('id', input.ticketId)
  if (error) throw new Error(error.message)

  await logAudit(supabase, 'support.assign', input.ticketId, null, null, { assignee_id: input.assigneeId }, 'muted')

  revalidatePath(`/destek/${input.ticketId}`)
  revalidatePath('/destek')
  return { ok: true }
}

export async function updateSupportTicketPriority(input: {
  ticketId: string
  priority: SupportTicketPriority
}) {
  await requireSuperAdmin()
  const supabase = createClient() as unknown as UntypedSupabase
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority: input.priority })
    .eq('id', input.ticketId)
  if (error) throw new Error(error.message)

  await logAudit(
    supabase,
    'support.priority_change',
    input.ticketId,
    null,
    null,
    { priority: input.priority },
    input.priority === 'urgent' ? 'warn' : 'muted',
  )

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
  const { user, admin } = await requireSuperAdmin()
  if (!input.subject.trim() || !input.body.trim()) throw new Error('Konu ve mesaj zorunlu')

  const supabase = createClient() as unknown as UntypedSupabase

  const { data: noData, error: noErr } = await (
    supabase.rpc as unknown as (
      fn: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: string | null; error: { message: string } | null }>
  )('generate_support_ticket_no')
  if (noErr) throw new Error(noErr.message)

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
    author_id: user.id,
    author_email: user.email,
    author_name: admin.full_name ?? user.email,
    author_type: 'admin',
    body: input.body.trim(),
    is_internal: false,
  })

  await logAudit(
    supabase,
    'support.create',
    ticketRow.id,
    null,
    input.businessId ?? null,
    { ticket_no: noData, on_behalf: input.reporterEmail },
    'muted',
  )

  revalidatePath('/destek')
  return { ok: true, ticketId: ticketRow.id }
}
