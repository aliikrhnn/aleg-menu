'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eyebrow,
  SerifTitle,
  SerifNum,
} from './primitives'
import { inviteSuperAdmin, removeSuperAdmin, type AdminTeamMember } from '@/lib/actions/admin-users'

interface AdminUsersClientProps {
  members: AdminTeamMember[]
  currentUserId: string
}

export function AdminUsersClient({ members, currentUserId }: AdminUsersClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onInvite = () => {
    setError(null)
    setPending(true)
    startTransition(async () => {
      try {
        await inviteSuperAdmin({ email: inviteEmail, fullName: inviteName })
        setInviteEmail('')
        setInviteName('')
        setShowInvite(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      } finally {
        setPending(false)
      }
    })
  }

  const onRemove = (userId: string) => {
    if (!confirm('Bu adminin yetkisini kaldırmak istiyor musun?')) return
    startTransition(async () => {
      try {
        await removeSuperAdmin(userId)
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6 border-b border-[var(--ink)]/10 pb-6">
        <div>
          <Eyebrow>Süper Admin · Ekip</Eyebrow>
          <SerifTitle as="h1">Yönetim ekibi</SerifTitle>
          <p className="mt-2 text-sm text-[var(--ink)]/70">
            Platformu yönetmeye yetkili kişiler. {members.length} aktif admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--paper)]"
        >
          + Admin ekle
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SmallStat label="Aktif admin" value={members.length} />
        <SmallStat
          label="30g hareket"
          value={members.reduce((s, m) => s + m.actions_30d, 0)}
        />
        <SmallStat
          label="Açık ticket"
          value={members.reduce((s, m) => s + m.open_tickets, 0)}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)]">
        <ul className="divide-y divide-[var(--ink)]/10">
          {members.map((m) => {
            const isMe = m.user_id === currentUserId
            const lastSeen = m.last_sign_in_at
              ? formatRelative(m.last_sign_in_at)
              : 'Hiç giriş yok'
            return (
              <li
                key={m.user_id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:gap-8"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cream)] font-serif text-lg text-[var(--ink)]">
                    {(m.full_name ?? m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-medium text-[var(--ink)]">
                        {m.full_name ?? m.email}
                      </h3>
                      {isMe && (
                        <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--paper)]">
                          Sen
                        </span>
                      )}
                    </div>
                    {m.full_name && (
                      <div className="text-sm text-[var(--ink)]/60">{m.email}</div>
                    )}
                    <div className="mt-1 text-xs text-[var(--ink)]/50">
                      Son giriş: {lastSeen} · {new Date(m.admin_since).getFullYear()}'den beri admin
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-right sm:flex sm:items-center sm:gap-8">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--ink)]/50">
                      30g hareket
                    </div>
                    <div className="font-serif text-lg text-[var(--ink)]">{m.actions_30d}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--ink)]/50">
                      Açık ticket
                    </div>
                    <div className="font-serif text-lg text-[var(--ink)]">{m.open_tickets}</div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => onRemove(m.user_id)}
                      className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-red-700 hover:bg-red-50"
                    >
                      Kaldır
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowInvite(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-4">
              <SerifTitle as="h2">Admin ekle</SerifTitle>
              <button
                onClick={() => setShowInvite(false)}
                className="text-2xl text-[var(--ink)]/60 hover:text-[var(--ink)]"
              >
                ×
              </button>
            </header>

            <p className="mt-3 text-xs text-[var(--ink)]/65">
              Kullanıcının önce Supabase&apos;de kayıtlı olması gerekir. Burada sadece super admin
              yetkisi atanır.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                onInvite()
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--ink)]/55">
                  E-posta
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-2.5 text-sm focus:border-[var(--ink)]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--ink)]/55">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-2.5 text-sm focus:border-[var(--ink)]/40 focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-[var(--ink)]/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-full border border-[var(--ink)]/15 px-5 py-2.5 text-sm hover:bg-[var(--cream)]"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={pending || !inviteEmail.trim() || !inviteName.trim()}
                  className="rounded-full bg-[var(--ink)] px-6 py-2.5 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
                >
                  {pending ? 'Ekleniyor…' : 'Admin yap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3">
        <SerifNum>{value}</SerifNum>
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} sa önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} gün önce`
  return d.toLocaleDateString('tr-TR')
}
