'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eyebrow,
  SerifTitle,
  Pill,
  FilterChip,
} from './primitives'
import {
  createAnnouncement,
  publishAnnouncement,
  cancelAnnouncement,
  deleteAnnouncement,
} from '@/lib/actions/admin-notifications'
import type {
  AdminAnnouncement,
  AnnouncementCategory,
  AnnouncementStatus,
} from '@/lib/actions/admin-notifications'

const STATUS_TONE: Record<AnnouncementStatus, 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive'> = {
  draft: 'muted',
  scheduled: 'gold',
  published: 'super',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  draft: 'Taslak',
  scheduled: 'Planlı',
  published: 'Yayında',
  cancelled: 'İptal',
}

const CATEGORY_TONE: Record<AnnouncementCategory, 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive'> = {
  info: 'muted',
  feature: 'super',
  maintenance: 'gold',
  warning: 'warn',
  critical: 'danger',
}

const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  info: 'Bilgi',
  feature: 'Yeni özellik',
  maintenance: 'Bakım',
  warning: 'Uyarı',
  critical: 'Kritik',
}

type StatusFilter = AnnouncementStatus | 'all'

const STATUS_FILTER_OPTIONS: StatusFilter[] = ['all', 'draft', 'scheduled', 'published', 'cancelled']
const CATEGORY_OPTIONS: AnnouncementCategory[] = ['info', 'feature', 'maintenance', 'warning', 'critical']

interface NotificationsClientProps {
  initialItems: AdminAnnouncement[]
}

export function NotificationsClient({ initialItems }: NotificationsClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = initialItems.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6 border-b border-[var(--ink)]/10 pb-6">
        <div>
          <Eyebrow>Süper Admin · Bildirimler</Eyebrow>
          <SerifTitle>Duyurular &amp; Bildirimler</SerifTitle>
          <p className="mt-2 text-sm text-[var(--ink)]/70">
            İşletmelere sistem duyuruları, yeni özellik haberleri ve bakım planları gönder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--paper)]"
        >
          + Yeni duyuru
        </button>
      </header>

      <section className="flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((s) => (
          <FilterChip
            key={s}
            label={s === 'all' ? 'Tümü' : STATUS_LABEL[s]}
            value={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--ink)]/15 bg-[var(--paper)] px-6 py-16 text-center text-[var(--ink)]/55">
          Bu filtreyle eşleşen duyuru yok.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onPublish={() => {
                startTransition(async () => {
                  await publishAnnouncement(a.id)
                  router.refresh()
                })
              }}
              onCancel={() => {
                startTransition(async () => {
                  await cancelAnnouncement(a.id)
                  router.refresh()
                })
              }}
              onDelete={() => {
                if (!confirm('Duyuruyu kalıcı olarak silmek istiyor musun?')) return
                startTransition(async () => {
                  await deleteAnnouncement(a.id)
                  router.refresh()
                })
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAnnouncementModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function AnnouncementCard({
  announcement: a,
  onPublish,
  onCancel,
  onDelete,
}: {
  announcement: AdminAnnouncement
  onPublish: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const readPct = a.recipient_count > 0 ? Math.round((a.read_count / a.recipient_count) * 100) : 0

  return (
    <article className="rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Pill tone={CATEGORY_TONE[a.category]}>{CATEGORY_LABEL[a.category]}</Pill>
            <Pill tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Pill>
            <span className="text-xs text-[var(--ink)]/55">{a.target_label}</span>
          </div>
          <h3 className="mt-3 font-serif text-xl text-[var(--ink)]">{a.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/75">{a.body}</p>

          {(a.cta_label || a.cta_url) && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/10 bg-[var(--cream)] px-3 py-1.5 text-xs">
              <span className="font-medium">{a.cta_label}</span>
              <span className="text-[var(--ink)]/45">·</span>
              <span className="text-[var(--ink)]/60">{a.cta_url}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {a.status === 'draft' && (
            <button
              onClick={onPublish}
              className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--paper)]"
            >
              Yayınla
            </button>
          )}
          {(a.status === 'published' || a.status === 'scheduled') && (
            <button
              onClick={onCancel}
              className="rounded-full border border-[var(--ink)]/15 px-4 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-[var(--cream)]"
            >
              İptal
            </button>
          )}
          {(a.status === 'draft' || a.status === 'cancelled') && (
            <button
              onClick={onDelete}
              className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-red-700 hover:bg-red-50"
            >
              Sil
            </button>
          )}
        </div>
      </header>

      <footer className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--ink)]/10 pt-4 text-xs text-[var(--ink)]/55">
        <span>
          {a.created_by_name ?? '?'} · {new Date(a.created_at).toLocaleDateString('tr-TR')}
        </span>
        {a.publish_at && <span>Yayın: {new Date(a.publish_at).toLocaleString('tr-TR')}</span>}
        {a.expires_at && <span>Bitiş: {new Date(a.expires_at).toLocaleString('tr-TR')}</span>}
        {a.status === 'published' && a.recipient_count > 0 && (
          <span>
            <span className="font-medium text-[var(--ink)]">{a.read_count}</span>/
            {a.recipient_count} okudu ({readPct}%)
          </span>
        )}
      </footer>
    </article>
  )
}

function CreateAnnouncementModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('info')
  const [publishNow, setPublishNow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = () => {
    setError(null)
    setPending(true)
    startTransition(async () => {
      try {
        await createAnnouncement({
          title,
          body,
          category,
          targetType: 'all',
          publishNow,
        })
        onCreated()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      } finally {
        setPending(false)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--ink)]/10 pb-4">
          <SerifTitle>Yeni duyuru</SerifTitle>
          <button onClick={onClose} className="text-2xl text-[var(--ink)]/60 hover:text-[var(--ink)]">
            ×
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--ink)]/55">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-2.5 text-sm focus:border-[var(--ink)]/40 focus:outline-none"
              placeholder="Örn: Yeni: AI menü asistanı"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--ink)]/55">İçerik</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              required
              className="mt-1 w-full resize-none rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-3 text-sm leading-relaxed focus:border-[var(--ink)]/40 focus:outline-none"
              placeholder="İşletmelere ne anlatmak istiyorsun?"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--ink)]/55">Kategori</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <FilterChip
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  value={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-[var(--cream)] px-4 py-3">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">
              <span className="font-medium">Hemen yayınla.</span>
              <span className="ml-1 text-[var(--ink)]/65">
                İşaretlemezsen taslak olarak kaydedilir.
              </span>
            </span>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--ink)]/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--ink)]/15 px-5 py-2.5 text-sm hover:bg-[var(--cream)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={pending || !title.trim() || !body.trim()}
              className="rounded-full bg-[var(--ink)] px-6 py-2.5 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
            >
              {pending ? 'Kaydediliyor…' : publishNow ? 'Yayınla' : 'Taslak kaydet'}
            </button>
          </div>
        </form>

        <div className="absolute -inset-px -z-10 rounded-3xl bg-[var(--ink)]/5 blur-md" aria-hidden />
      </div>
    </div>
  )
}
