'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Eyebrow,
  SerifTitle,
  Pill,
  SearchInput,
  FilterChip,
} from './primitives'
import type { AdminAuditLogEntry } from '@/lib/actions/admin-audit'

interface AuditClientProps {
  initialItems: AdminAuditLogEntry[]
  actionTypes: string[]
}

const TONE_LABEL: Record<string, string> = {
  ok: 'Başarılı',
  warn: 'Uyarı',
  danger: 'Tehlikeli',
  super: 'Süper',
  muted: 'Bilgi',
  gold: 'Önemli',
  olive: 'Kayıt',
}

export function AuditClient({ initialItems, actionTypes }: AuditClientProps) {
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [toneFilter, setToneFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return initialItems.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false
      if (toneFilter !== 'all' && entry.tone !== toneFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (
          !(
            entry.action?.toLowerCase().includes(q) ||
            entry.actor_email?.toLowerCase().includes(q) ||
            entry.target_label?.toLowerCase().includes(q) ||
            entry.business_name?.toLowerCase().includes(q)
          )
        )
          return false
      }
      return true
    })
  }, [initialItems, search, actionFilter, toneFilter])

  // Tarih bazlı gruplama
  const groups = useMemo(() => {
    const map = new Map<string, AdminAuditLogEntry[]>()
    for (const e of filtered) {
      const day = new Date(e.ts).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      })
      const arr = map.get(day) ?? []
      arr.push(e)
      map.set(day, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6 border-b border-[var(--ink)]/10 pb-6">
        <div>
          <Eyebrow>Süper Admin · Audit</Eyebrow>
          <SerifTitle as="h1">Hareket Kaydı</SerifTitle>
          <p className="mt-2 text-sm text-[var(--ink)]/70">
            Platform üzerinde yapılan tüm yönetim hareketlerinin tam günlüğü.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => startTransition(() => setSearch(v))}
            placeholder="Aksiyon, e-posta, işletme..."
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-full border border-[var(--ink)]/15 bg-[var(--paper)] px-4 py-2 text-sm focus:border-[var(--ink)]/40 focus:outline-none"
          >
            <option value="all">Tüm aksiyonlar</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--ink)]/10 pt-3">
          <FilterChip active={toneFilter === 'all'} onClick={() => setToneFilter('all')}>
            Tüm önem
          </FilterChip>
          {(['danger', 'warn', 'super', 'gold', 'ok', 'muted', 'olive'] as const).map((t) => (
            <FilterChip key={t} active={toneFilter === t} onClick={() => setToneFilter(t)}>
              {TONE_LABEL[t] ?? t}
            </FilterChip>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--ink)]/15 bg-[var(--paper)] px-6 py-16 text-center text-[var(--ink)]/55">
            Filtreyle eşleşen kayıt yok.
          </div>
        ) : (
          groups.map(([day, entries]) => (
            <div key={day}>
              <h3 className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--ink)]/50">{day}</h3>
              <ol className="space-y-2 border-l border-[var(--ink)]/10 pl-5">
                {entries.map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      className={`absolute -left-[27px] top-2 inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--paper)] ${toneBg(e.tone)}`}
                    />
                    <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-[var(--ink)]/85">{e.action}</span>
                          <Pill tone={e.tone}>{TONE_LABEL[e.tone] ?? e.tone}</Pill>
                        </div>
                        <span className="text-xs text-[var(--ink)]/55 tabular-nums">
                          {new Date(e.ts).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm text-[var(--ink)]/85">
                        {e.target_label && (
                          <span className="font-medium">{e.target_label}</span>
                        )}
                        {e.business_name && (
                          <>
                            {e.target_label && <span className="text-[var(--ink)]/30"> · </span>}
                            <span className="text-[var(--ink)]/65">{e.business_name}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[var(--ink)]/55">
                        {e.is_system ? (
                          <span>Sistem</span>
                        ) : (
                          <span>{e.actor_name ?? e.actor_email ?? '?'}</span>
                        )}
                        {e.ip_address && (
                          <>
                            <span className="text-[var(--ink)]/30"> · </span>
                            <span className="font-mono">{e.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function toneBg(tone: string): string {
  switch (tone) {
    case 'danger':
      return 'bg-red-500'
    case 'warn':
      return 'bg-amber-500'
    case 'super':
      return 'bg-indigo-500'
    case 'gold':
      return 'bg-yellow-500'
    case 'ok':
      return 'bg-emerald-500'
    case 'olive':
      return 'bg-stone-500'
    default:
      return 'bg-stone-300'
  }
}
