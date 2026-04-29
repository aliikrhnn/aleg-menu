'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface CommandItem {
  id: string
  type: 'page' | 'business' | 'action'
  label: string
  hint?: string
  href?: string
  action?: () => void
  group: string
  shortcut?: string
}

interface CommandPaletteProps {
  businesses: Array<{ id: string; name: string; slug: string }>
}

const NAV_PAGES: CommandItem[] = [
  { id: 'p-dashboard', type: 'page', label: 'Dashboard', hint: 'Ana sayfa', href: '/', group: 'Sayfalar', shortcut: '⌘1' },
  { id: 'p-businesses', type: 'page', label: 'İşletmeler', href: '/isletmeler', group: 'Sayfalar', shortcut: '⌘2' },
  { id: 'p-pending', type: 'page', label: 'Bekleyen kayıtlar', href: '/isletmeler/bekleyen', group: 'Sayfalar' },
  { id: 'p-plans', type: 'page', label: 'Planlar', href: '/planlar', group: 'Sayfalar' },
  { id: 'p-invoices', type: 'page', label: 'Faturalar', href: '/faturalar', group: 'Sayfalar', shortcut: '⌘3' },
  { id: 'p-payments', type: 'page', label: 'Ödemeler', href: '/odemeler', group: 'Sayfalar' },
  { id: 'p-overdue', type: 'page', label: 'Vadesi geçen faturalar', href: '/odemeler/bekleyen', group: 'Sayfalar' },
  { id: 'p-support', type: 'page', label: 'Destek talepleri', href: '/destek', group: 'Sayfalar', shortcut: '⌘4' },
  { id: 'p-notifications', type: 'page', label: 'Duyurular', href: '/bildirimler', group: 'Sayfalar' },
  { id: 'p-users', type: 'page', label: 'Yönetim ekibi', href: '/kullanicilar', group: 'Sayfalar' },
  { id: 'p-audit', type: 'page', label: 'Hareket kaydı (audit)', href: '/audit', group: 'Sayfalar' },
  { id: 'p-system', type: 'page', label: 'Sistem durumu', href: '/sistem', group: 'Sayfalar' },
  { id: 'p-settings', type: 'page', label: 'Platform ayarları', href: '/ayarlar', group: 'Sayfalar' },
]

const QUICK_ACTIONS: CommandItem[] = [
  {
    id: 'a-new-announcement',
    type: 'action',
    label: 'Yeni duyuru oluştur',
    href: '/bildirimler?new=1',
    group: 'Hızlı eylemler',
  },
  {
    id: 'a-add-admin',
    type: 'action',
    label: 'Yeni admin ekle',
    href: '/kullanicilar?new=1',
    group: 'Hızlı eylemler',
  },
  {
    id: 'a-pending-invoices',
    type: 'action',
    label: 'Vadesi geçen faturaları gör',
    href: '/odemeler/bekleyen',
    group: 'Hızlı eylemler',
  },
]

export function CommandPalette({ businesses }: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Klavye kısayolu: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((s) => !s)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const allItems = useMemo<CommandItem[]>(() => {
    const businessItems: CommandItem[] = businesses.map((b) => ({
      id: `b-${b.id}`,
      type: 'business',
      label: b.name,
      hint: b.slug,
      href: `/isletmeler/${b.id}`,
      group: 'İşletmeler',
    }))
    return [...NAV_PAGES, ...QUICK_ACTIONS, ...businessItems]
  }, [businesses])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return allItems.filter((i) => i.group !== 'İşletmeler')
    }
    const q = query.toLowerCase()
    return allItems.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.hint?.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q),
    )
  }, [allItems, query])

  // Grup bazlı düzenle
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const item of filtered) {
      const arr = map.get(item.group) ?? []
      arr.push(item)
      map.set(item.group, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const flatList = useMemo(() => grouped.flatMap(([, items]) => items), [grouped])

  useEffect(() => {
    if (activeIdx >= flatList.length) setActiveIdx(0)
  }, [flatList.length, activeIdx])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % Math.max(flatList.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + flatList.length) % Math.max(flatList.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatList[activeIdx]
      if (item) executeItem(item)
    }
  }

  const executeItem = (item: CommandItem) => {
    setOpen(false)
    if (item.href) router.push(item.href)
    else if (item.action) item.action()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-2.5 text-xs text-[var(--ink)]/65 shadow-lg shadow-[var(--ink)]/5 hover:bg-[var(--cream)] sm:flex"
        aria-label="Komut menüsünü aç"
      >
        <span>Komut menüsü</span>
        <kbd className="rounded border border-[var(--ink)]/15 bg-[var(--cream)] px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-[var(--paper)] shadow-2xl shadow-[var(--ink)]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--ink)]/10 px-5 py-4">
          <span className="text-[var(--ink)]/35">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIdx(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Komut, sayfa veya işletme ara..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--ink)]/40"
          />
          <kbd className="rounded border border-[var(--ink)]/15 bg-[var(--cream)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink)]/65">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {grouped.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm text-[var(--ink)]/55">
              Eşleşen sonuç yok.
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-4 last:mb-0">
                <div className="mb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]/45">
                  {group}
                </div>
                <ul>
                  {items.map((item) => {
                    const idx = flatList.indexOf(item)
                    const isActive = idx === activeIdx
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => executeItem(item)}
                          className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                            isActive ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--cream)]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                isActive
                                  ? 'bg-[var(--paper)]/15 text-[var(--paper)]'
                                  : 'bg-[var(--cream)] text-[var(--ink)]/65'
                              } font-mono text-[10px]`}
                            >
                              {iconFor(item.type)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate">{item.label}</div>
                              {item.hint && (
                                <div
                                  className={`truncate text-xs ${
                                    isActive ? 'text-[var(--paper)]/60' : 'text-[var(--ink)]/55'
                                  }`}
                                >
                                  {item.hint}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.shortcut && (
                            <kbd
                              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                                isActive
                                  ? 'border-[var(--paper)]/30 text-[var(--paper)]/80'
                                  : 'border-[var(--ink)]/15 text-[var(--ink)]/55'
                              }`}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--ink)]/10 bg-[var(--cream)] px-5 py-2.5 text-[10px] text-[var(--ink)]/55">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑↓</kbd> gez
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> aç
            </span>
            <span>
              <kbd className="font-mono">esc</kbd> kapat
            </span>
          </div>
          <span className="font-mono">{flatList.length} sonuç</span>
        </footer>
      </div>
    </div>
  )
}

function iconFor(type: CommandItem['type']): string {
  switch (type) {
    case 'page':
      return '◧'
    case 'business':
      return '◇'
    case 'action':
      return '⊕'
    default:
      return '•'
  }
}
