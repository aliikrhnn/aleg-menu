'use client'

import {
  Eyebrow,
  SerifTitle,
  StatusDot,
} from './primitives'
import type { SystemHealth, SystemSignal } from '@/lib/actions/admin-system'

interface SystemClientProps {
  health: SystemHealth
  signals: SystemSignal[]
  recentActivity: Array<{
    id: number
    ts: string
    action: string
    actor_email: string | null
    target_label: string | null
    tone: string
  }>
}

export function SystemClient({ health, signals, recentActivity }: SystemClientProps) {
  const dbMb = (health.db_size_bytes / 1024 / 1024).toFixed(1)
  const failureRate =
    health.print_jobs_24h > 0 ? (health.failed_jobs_24h / health.print_jobs_24h) * 100 : 0

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6 border-b border-[var(--ink)]/10 pb-6">
        <div>
          <Eyebrow>Süper Admin · Sistem</Eyebrow>
          <SerifTitle>Sistem Durumu</SerifTitle>
          <p className="mt-2 text-sm text-[var(--ink)]/70">
            Platformun anlık sağlık durumu, son 24 saat trafiği ve operasyonel sinyaller.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-[var(--ink)]/50">Veri zamanı</div>
          <div className="font-mono text-sm">
            {new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
          </div>
        </div>
      </header>

      {/* Sinyaller */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {signals.map((s) => (
          <article
            key={s.label}
            className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5"
          >
            <div className="flex items-center justify-between">
              <Eyebrow>{s.label}</Eyebrow>
              <StatusDot tone={s.status === 'danger' ? 'danger' : s.status === 'warn' ? 'warn' : 'ok'} />
            </div>
            <div className="mt-3 font-serif text-2xl text-[var(--ink)]">{s.value}</div>
            {s.hint && <div className="mt-1 text-xs text-[var(--ink)]/55">{s.hint}</div>}
          </article>
        ))}
      </section>

      {/* Detaylı 24s metrikler */}
      <section className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6">
        <Eyebrow>Son 24 saat</Eyebrow>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <BigStat
            label="Yazıcı işi"
            value={String(health.print_jobs_24h)}
            hint={
              health.failed_jobs_24h > 0
                ? `${health.failed_jobs_24h} başarısız (%${failureRate.toFixed(0)})`
                : 'Tüm işler başarılı'
            }
            tone={failureRate > 10 ? 'warn' : 'ok'}
          />
          <BigStat label="Aktif kullanıcı" value={String(health.active_users_24h)} />
          <BigStat label="Açık destek" value={String(health.open_tickets)} />
        </div>
      </section>

      {/* Genel platform istatistikleri */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SmallTile label="Toplam işletme" value={health.total_businesses} />
        <SmallTile
          label="Aktif abonelik"
          value={health.active_businesses}
          hint={`${((health.active_businesses / Math.max(health.total_businesses, 1)) * 100).toFixed(0)}%`}
        />
        <SmallTile label="Toplam kullanıcı" value={health.total_users} />
        <SmallTile
          label="DB boyutu"
          value={dbMb}
          hint="MB"
        />
      </section>

      {/* Son aktivite */}
      <section className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6">
        <header className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-3">
          <Eyebrow>Son aktivite</Eyebrow>
          <a href="/audit" className="text-xs uppercase tracking-wider text-[var(--ink)]/65 hover:text-[var(--ink)]">
            Tümünü gör →
          </a>
        </header>
        {recentActivity.length === 0 ? (
          <div className="py-12 text-center text-[var(--ink)]/55">Henüz hareket yok.</div>
        ) : (
          <ol className="mt-4 space-y-2">
            {recentActivity.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-4 rounded-xl px-3 py-2 hover:bg-[var(--cream)]"
              >
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="font-mono text-xs text-[var(--ink)]/65">{e.action}</span>
                  {e.target_label && (
                    <span className="truncate text-sm text-[var(--ink)]/85">{e.target_label}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {e.actor_email && (
                    <span className="text-xs text-[var(--ink)]/55">{e.actor_email}</span>
                  )}
                  <span className="text-xs text-[var(--ink)]/55 tabular-nums">
                    {new Date(e.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function BigStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'ok' | 'warn'
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--ink)]/55">{label}</div>
      <div className="mt-1 font-serif text-3xl text-[var(--ink)]">{value}</div>
      {hint && (
        <div
          className={`mt-1 text-xs ${
            tone === 'warn' ? 'text-amber-700' : 'text-[var(--ink)]/55'
          }`}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function SmallTile({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3 font-serif text-2xl text-[var(--ink)]">
        {typeof value === 'number' ? value : value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--ink)]/55">{hint}</div>}
    </div>
  )
}
