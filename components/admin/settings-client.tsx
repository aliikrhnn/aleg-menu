'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eyebrow, SerifTitle } from './primitives'
import { updatePlatformSetting, type PlatformSetting } from '@/lib/actions/admin-settings'

interface SettingsClientProps {
  settings: PlatformSetting[]
}

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Genel',
  subscription: 'Abonelik',
  system: 'Sistem',
  features: 'Özellikler',
}

export function SettingsClient({ settings }: SettingsClientProps) {
  // Kategori bazlı grupla
  const groups = settings.reduce<Record<string, PlatformSetting[]>>((acc, s) => {
    const cat = s.category ?? 'general'
    ;(acc[cat] = acc[cat] ?? []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--ink)]/10 pb-6">
        <Eyebrow>Süper Admin · Ayarlar</Eyebrow>
        <SerifTitle as="h1">Platform Ayarları</SerifTitle>
        <p className="mt-2 text-sm text-[var(--ink)]/70">
          Platform genelinde geçerli yapılandırma. Her değişiklik audit log&apos;a yazılır.
        </p>
      </header>

      {Object.entries(groups).map(([cat, items]) => (
        <section
          key={cat}
          className="overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)]"
        >
          <header className="border-b border-[var(--ink)]/10 bg-[var(--cream)] px-6 py-4">
            <div className="font-serif text-xl text-[var(--ink)]">
              {CATEGORY_LABEL[cat] ?? cat}
            </div>
          </header>
          <ul className="divide-y divide-[var(--ink)]/10">
            {items.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SettingRow({ setting }: { setting: PlatformSetting }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(JSON.stringify(setting.value))
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    setError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(draft)
    } catch {
      setError('Geçerli JSON girin (örn: 30, "TRY", true)')
      return
    }
    startTransition(async () => {
      try {
        await updatePlatformSetting({ key: setting.key, value: parsed })
        setEditing(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      }
    })
  }

  const isBoolean = typeof setting.value === 'boolean'

  if (isBoolean) {
    return (
      <li className="flex items-center justify-between gap-6 px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm text-[var(--ink)]/85">{setting.key}</div>
          {setting.description && (
            <div className="mt-1 text-xs text-[var(--ink)]/60">{setting.description}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await updatePlatformSetting({ key: setting.key, value: !setting.value })
              router.refresh()
            })
          }}
          disabled={isPending}
          className={`relative h-7 w-12 rounded-full transition ${
            setting.value ? 'bg-[var(--ink)]' : 'bg-[var(--ink)]/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-[var(--paper)] shadow transition-transform ${
              setting.value ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </li>
    )
  }

  return (
    <li className="px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm text-[var(--ink)]/85">{setting.key}</div>
          {setting.description && (
            <div className="mt-1 text-xs text-[var(--ink)]/60">{setting.description}</div>
          )}
        </div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <code className="rounded-xl bg-[var(--cream)] px-3 py-1.5 font-mono text-xs">
              {JSON.stringify(setting.value)}
            </code>
            <button
              onClick={() => {
                setDraft(JSON.stringify(setting.value))
                setEditing(true)
              }}
              className="rounded-full border border-[var(--ink)]/15 px-4 py-1.5 text-xs hover:bg-[var(--cream)]"
            >
              Düzenle
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="w-72 rounded-2xl border border-[var(--ink)]/15 bg-[var(--paper)] px-3 py-1.5 font-mono text-xs focus:border-[var(--ink)]/40 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false)
                  setError(null)
                }}
                className="rounded-full border border-[var(--ink)]/15 px-4 py-1.5 text-xs hover:bg-[var(--cream)]"
              >
                İptal
              </button>
              <button
                onClick={save}
                disabled={isPending}
                className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-medium text-[var(--paper)] disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
            {error && <div className="text-xs text-red-700">{error}</div>}
          </div>
        )}
      </div>
    </li>
  )
}
