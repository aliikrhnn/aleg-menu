'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eyebrow,
  SerifTitle,
  Pill,
  StatusDot,
} from './primitives'
import {
  replySupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
  assignSupportTicket,
} from '@/lib/actions/admin-support'
import type {
  AdminSupportTicket,
  AdminSupportMessage,
  SupportTicketStatus,
  SupportTicketPriority,
} from '@/lib/actions/admin-support'

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Açık',
  in_progress: 'İşlemde',
  waiting_user: 'Bekliyor',
  resolved: 'Çözüldü',
  closed: 'Kapalı',
}

const STATUS_TONE: Record<SupportTicketStatus, 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive'> = {
  open: 'warn',
  in_progress: 'super',
  waiting_user: 'gold',
  resolved: 'ok',
  closed: 'muted',
}

const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
}

const PRIORITY_TONE: Record<SupportTicketPriority, 'ok' | 'warn' | 'danger' | 'muted'> = {
  low: 'muted',
  normal: 'muted',
  high: 'warn',
  urgent: 'danger',
}

interface SupportDetailClientProps {
  ticket: AdminSupportTicket
  messages: AdminSupportMessage[]
  currentUserId: string
}

export function SupportDetailClient({
  ticket,
  messages,
  currentUserId,
}: SupportDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onReply = () => {
    if (!reply.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await replySupportTicket({
          ticketId: ticket.id,
          body: reply,
          isInternal,
        })
        setReply('')
        setIsInternal(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  const onStatus = (status: SupportTicketStatus) => {
    startTransition(async () => {
      try {
        await updateSupportTicketStatus({ ticketId: ticket.id, status })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  const onPriority = (priority: SupportTicketPriority) => {
    startTransition(async () => {
      try {
        await updateSupportTicketPriority({ ticketId: ticket.id, priority })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  const onAssignToMe = () => {
    startTransition(async () => {
      try {
        await assignSupportTicket({ ticketId: ticket.id, assigneeId: currentUserId })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  const onUnassign = () => {
    startTransition(async () => {
      try {
        await assignSupportTicket({ ticketId: ticket.id, assigneeId: null })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--ink)]/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/destek"
            className="text-xs uppercase tracking-[0.18em] text-[var(--ink)]/50 hover:text-[var(--ink)]"
          >
            ← Tüm talepler
          </Link>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink)]/50">
              {ticket.ticket_no}
            </span>
            <Pill tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Pill>
            <Pill tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Pill>
          </div>
          <SerifTitle as="h1" className="mt-3">
            {ticket.subject}
          </SerifTitle>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink)]/65">
            <span>{ticket.reporter_name ?? ticket.reporter_email}</span>
            {ticket.business_name && (
              <>
                <span className="text-[var(--ink)]/30">·</span>
                <Link
                  href={`/isletmeler/${ticket.business_id}`}
                  className="font-medium text-[var(--ink)] hover:underline"
                >
                  {ticket.business_name}
                </Link>
              </>
            )}
            <span className="text-[var(--ink)]/30">·</span>
            <span>{new Date(ticket.created_at).toLocaleString('tr-TR')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ticket.assignee_id === currentUserId ? (
            <button
              type="button"
              onClick={onUnassign}
              disabled={isPending}
              className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-[var(--ink)]/70 hover:bg-[var(--cream)]"
            >
              Üzerimden al
            </button>
          ) : (
            <button
              type="button"
              onClick={onAssignToMe}
              disabled={isPending}
              className="rounded-full border border-[var(--ink)]/15 px-4 py-2 text-xs font-medium uppercase tracking-wider hover:bg-[var(--cream)]"
            >
              Bana ata
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Sol: konuşma */}
        <section className="space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} currentUserId={currentUserId} />
          ))}

          {/* Yanıt formu */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onReply()
            }}
            className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--ink)]/10 pb-3">
              <Eyebrow>Yanıt yaz</Eyebrow>
              <label className="flex items-center gap-2 text-xs text-[var(--ink)]/65">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--ink)]/20"
                />
                İç not (sadece adminler)
              </label>
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={6}
              placeholder={isInternal ? 'Sadece admin ekibinin göreceği bir not...' : 'Yanıtınızı yazın...'}
              className={`mt-3 w-full resize-none rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-4 text-sm leading-relaxed focus:border-[var(--ink)]/40 focus:outline-none ${
                isInternal ? 'bg-amber-50' : ''
              }`}
            />
            {error && (
              <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mt-3 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isPending || !reply.trim()}
                className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
              >
                {isPending ? 'Gönderiliyor…' : isInternal ? 'İç not bırak' : 'Yanıt gönder'}
              </button>
            </div>
          </form>
        </section>

        {/* Sağ: durum/öncelik panelleri */}
        <aside className="space-y-5">
          <SidePanel title="Durum">
            <div className="space-y-2">
              {(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as SupportTicketStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatus(s)}
                    disabled={isPending || ticket.status === s}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm transition ${
                      ticket.status === s
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                        : 'border-[var(--ink)]/10 hover:bg-[var(--cream)]'
                    }`}
                  >
                    <StatusDot tone={STATUS_TONE[s]} />
                    {STATUS_LABEL[s]}
                  </button>
                ),
              )}
            </div>
          </SidePanel>

          <SidePanel title="Öncelik">
            <div className="grid grid-cols-2 gap-2">
              {(['low', 'normal', 'high', 'urgent'] as SupportTicketPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPriority(p)}
                  disabled={isPending || ticket.priority === p}
                  className={`rounded-2xl border px-3 py-2 text-xs font-medium uppercase tracking-wider transition ${
                    ticket.priority === p
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                      : 'border-[var(--ink)]/10 hover:bg-[var(--cream)]'
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </SidePanel>

          <SidePanel title="Atanan">
            <div className="text-sm">
              {ticket.assignee_email ? (
                <div>
                  <div className="font-medium">{ticket.assignee_name ?? ticket.assignee_email}</div>
                  {ticket.assignee_name && (
                    <div className="mt-0.5 text-xs text-[var(--ink)]/55">{ticket.assignee_email}</div>
                  )}
                </div>
              ) : (
                <div className="text-[var(--ink)]/55">Atanmamış</div>
              )}
            </div>
          </SidePanel>

          <SidePanel title="Detay">
            <dl className="space-y-2 text-sm">
              <DetailRow label="Kategori" value={ticket.category} />
              <DetailRow label="E-posta" value={ticket.reporter_email} />
              <DetailRow
                label="Açılış"
                value={new Date(ticket.created_at).toLocaleString('tr-TR')}
              />
              <DetailRow
                label="Son yanıt"
                value={new Date(ticket.last_reply_at).toLocaleString('tr-TR')}
              />
              {ticket.resolved_at && (
                <DetailRow
                  label="Çözüm"
                  value={new Date(ticket.resolved_at).toLocaleString('tr-TR')}
                />
              )}
            </dl>
          </SidePanel>
        </aside>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  currentUserId,
}: {
  message: AdminSupportMessage
  currentUserId: string
}) {
  const isAdmin = message.author_type === 'admin'
  const isMine = isAdmin && message.author_id === currentUserId
  const isInternal = message.is_internal

  return (
    <article
      className={`rounded-3xl border p-5 ${
        isInternal
          ? 'border-amber-300/50 bg-amber-50'
          : isAdmin
          ? 'border-[var(--ink)]/15 bg-[var(--cream)]'
          : 'border-[var(--ink)]/10 bg-[var(--paper)]'
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--ink)]/10 pb-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-[var(--ink)]">
            {message.author_name ?? message.author_email ?? 'Sistem'}
          </span>
          {isInternal && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-900">
              İç not
            </span>
          )}
          {isMine && (
            <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--paper)]">
              Sen
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--ink)]/50">
          {new Date(message.created_at).toLocaleString('tr-TR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </header>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]/90">
        {message.body}
      </div>
    </article>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--ink)]/55">{label}</dt>
      <dd className="text-right text-[var(--ink)]">{value}</dd>
    </div>
  )
}
