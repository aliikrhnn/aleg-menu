'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  Eyebrow,
  SerifTitle,
  SerifNum,
  Pill,
  StatusDot,
  FilterChip,
  SearchInput,
} from './primitives'
import type {
  AdminSupportTicket,
  AdminSupportMetrics,
  SupportTicketStatus,
  SupportTicketPriority,
} from '@/lib/actions/admin-support'

type StatusFilter = SupportTicketStatus | 'all'
type PriorityFilter = SupportTicketPriority | 'all'
type AssigneeFilter = 'all' | 'me' | 'unassigned'

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

// StatusDot kısıtlı tone destekliyor
const STATUS_DOT_TONE: Record<SupportTicketStatus, 'ok' | 'warn' | 'danger' | 'super' | 'muted'> = {
  open: 'warn',
  in_progress: 'super',
  waiting_user: 'warn',
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

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Genel',
  billing: 'Fatura',
  technical: 'Teknik',
  feature_request: 'Öneri',
  bug: 'Hata',
  account: 'Hesap',
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} sa`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} gün`
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

interface SupportTicketsClientProps {
  initialItems: AdminSupportTicket[]
  metrics: AdminSupportMetrics
}

export function SupportTicketsClient({ initialItems, metrics }: SupportTicketsClientProps) {
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all')

  const filtered = useMemo(() => {
    return initialItems.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (assigneeFilter === 'unassigned' && t.assignee_id !== null) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (
          !(
            t.subject?.toLowerCase().includes(q) ||
            t.ticket_no?.toLowerCase().includes(q) ||
            t.reporter_email?.toLowerCase().includes(q) ||
            t.business_name?.toLowerCase().includes(q)
          )
        )
          return false
      }
      return true
    })
  }, [initialItems, search, statusFilter, priorityFilter, assigneeFilter])

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6 border-b border-[var(--ink)]/10 pb-6">
        <div>
          <Eyebrow>Süper Admin · Destek</Eyebrow>
          <SerifTitle>Destek talepleri</SerifTitle>
          <p className="mt-2 text-sm text-[var(--ink)]/70">
            Müşteri yardım taleplerini yönet, ata, çöz.
          </p>
        </div>
      </header>

      {/* Metrik şeritleri */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Açık" value={metrics.open_count} tone="warn" />
        <MetricCard label="İşlemde" value={metrics.in_progress_count} tone="super" />
        <MetricCard label="Acil" value={metrics.urgent_count} tone="danger" hint="Açık + acil" />
        <MetricCard
          label="Çözüldü · 7g"
          value={metrics.resolved_7d}
          tone="ok"
          hint={
            metrics.avg_resolution_hours != null
              ? `Ort. ${metrics.avg_resolution_hours} sa çözüm`
              : 'Henüz veri yok'
          }
        />
      </section>

      {/* Filtre çubuğu */}
      <section className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => startTransition(() => setSearch(v))}
            placeholder="Konu, ticket no, e-posta, işletme..."
          />
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="Tümü"
              value="all"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterChip
              label="Açık"
              value="open"
              active={statusFilter === 'open'}
              onClick={() => setStatusFilter('open')}
            />
            <FilterChip
              label="İşlemde"
              value="in_progress"
              active={statusFilter === 'in_progress'}
              onClick={() => setStatusFilter('in_progress')}
            />
            <FilterChip
              label="Bekliyor"
              value="waiting_user"
              active={statusFilter === 'waiting_user'}
              onClick={() => setStatusFilter('waiting_user')}
            />
            <FilterChip
              label="Çözüldü"
              value="resolved"
              active={statusFilter === 'resolved'}
              onClick={() => setStatusFilter('resolved')}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--ink)]/10 pt-3">
          <FilterChip
            label="Tüm öncelikler"
            value="all"
            active={priorityFilter === 'all'}
            onClick={() => setPriorityFilter('all')}
          />
          <FilterChip
            label="Acil"
            value="urgent"
            active={priorityFilter === 'urgent'}
            onClick={() => setPriorityFilter('urgent')}
          />
          <FilterChip
            label="Yüksek"
            value="high"
            active={priorityFilter === 'high'}
            onClick={() => setPriorityFilter('high')}
          />
          <span className="mx-1 h-6 w-px bg-[var(--ink)]/10" aria-hidden />
          <FilterChip
            label="Tüm atamalar"
            value="all"
            active={assigneeFilter === 'all'}
            onClick={() => setAssigneeFilter('all')}
          />
          <FilterChip
            label="Atanmamış"
            value="unassigned"
            active={assigneeFilter === 'unassigned'}
            onClick={() => setAssigneeFilter('unassigned')}
          />
          <FilterChip
            label="Bende"
            value="me"
            active={assigneeFilter === 'me'}
            onClick={() => setAssigneeFilter('me')}
          />
        </div>
      </section>

      {/* Liste */}
      <section className="overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)]">
        <header className="flex items-center justify-between border-b border-[var(--ink)]/10 bg-[var(--cream)] px-6 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink)]/55">
            {filtered.length} / {initialItems.length} talep
          </div>
        </header>
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[var(--ink)]/55">
            Filtreyle eşleşen talep yok.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ink)]/10">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/destek/${t.id}`}
                  className="flex flex-col gap-3 px-6 py-4 transition hover:bg-[var(--cream)]/60 sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <StatusDot tone={STATUS_DOT_TONE[t.status]} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)]/45">
                          {t.ticket_no}
                        </span>
                        <span className="font-medium text-[var(--ink)] truncate">{t.subject}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink)]/60">
                        <span>{t.reporter_name ?? t.reporter_email}</span>
                        {t.business_name && (
                          <>
                            <span className="text-[var(--ink)]/30">·</span>
                            <span className="font-medium text-[var(--ink)]/75">
                              {t.business_name}
                            </span>
                          </>
                        )}
                        <span className="text-[var(--ink)]/30">·</span>
                        <span>{CATEGORY_LABEL[t.category] ?? t.category}</span>
                        {t.message_count > 0 && (
                          <>
                            <span className="text-[var(--ink)]/30">·</span>
                            <span>{t.message_count} mesaj</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Pill>
                    <Pill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Pill>
                    <span className="ml-2 text-xs text-[var(--ink)]/55 tabular-nums">
                      {formatRelative(t.last_reply_at)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive'
  hint?: string
}) {
  // StatusDot gold/olive desteklemiyor - sadeleştir
  const dotTone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' =
    tone === 'gold' || tone === 'olive' ? 'super' : tone
  return (
    <div className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5">
      <div className="flex items-center gap-2">
        <StatusDot tone={dotTone} />
        <Eyebrow>{label}</Eyebrow>
      </div>
      <div className="mt-3">
        <SerifNum>{value}</SerifNum>
      </div>
      {hint && <div className="mt-2 text-xs text-[var(--ink)]/55">{hint}</div>}
    </div>
  )
}
