'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Users, Package, FileCheck, Receipt, BarChart3, Settings,
  Clock, CreditCard, FolderKanban, Landmark, Search, Plus,
} from 'lucide-react'
import { globalSearch, type SearchResult } from '@/lib/actions/search'

const QUICK_ACTIONS = [
  { id: 'new-invoice', label: 'Nieuwe factuur', icon: Plus, href: '/invoices', category: 'Acties' },
  { id: 'new-client', label: 'Nieuwe klant', icon: Plus, href: '/clients', category: 'Acties' },
  { id: 'new-quote', label: 'Nieuwe offerte', icon: Plus, href: '/quotes', category: 'Acties' },
]

const NAV_ITEMS = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: BarChart3, href: '', category: 'Navigatie' },
  { id: 'nav-invoices', label: 'Facturen', icon: FileText, href: '/invoices', category: 'Navigatie' },
  { id: 'nav-clients', label: 'Klanten', icon: Users, href: '/clients', category: 'Navigatie' },
  { id: 'nav-products', label: 'Producten', icon: Package, href: '/products', category: 'Navigatie' },
  { id: 'nav-quotes', label: 'Offertes', icon: FileCheck, href: '/quotes', category: 'Navigatie' },
  { id: 'nav-purchase', label: 'Inkoopfacturen', icon: Receipt, href: '/purchase-invoices', category: 'Navigatie' },
  { id: 'nav-time', label: 'Urenregistratie', icon: Clock, href: '/time-tracking', category: 'Navigatie' },
  { id: 'nav-projects', label: 'Projecten', icon: FolderKanban, href: '/projects', category: 'Navigatie' },
  { id: 'nav-bank', label: 'Bank & afletteren', icon: Landmark, href: '/bank', category: 'Navigatie' },
  { id: 'nav-reports', label: 'Rapportage', icon: BarChart3, href: '/reports', category: 'Navigatie' },
  { id: 'nav-settings', label: 'Instellingen', icon: Settings, href: '/settings', category: 'Navigatie' },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  // Filter nav items and actions based on query
  const filteredActions = query
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS

  const filteredNav = query
    ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS

  const allItems = [
    ...filteredActions.map((a) => ({ ...a, type: 'action' as const })),
    ...searchResults.map((r) => ({
      id: `search-${r.type}-${r.id}`,
      label: r.title,
      subtitle: r.subtitle,
      icon: Search,
      href: r.href,
      category: `Zoekresultaten (${r.type})`,
      type: 'search' as const,
    })),
    ...filteredNav.map((n) => ({ ...n, type: 'nav' as const })),
  ]

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSearchResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search with debounce
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    setLoading(true)
    try {
      const results = await globalSearch(q)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelectedIndex(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 250)
  }

  function handleSelect(item: (typeof allItems)[0]) {
    setOpen(false)
    router.push(`/nl${item.href}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(allItems[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-x-0 top-[20%] mx-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-xl border bg-[var(--bg-card)] shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Zoeken of navigeren..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Zoeken...</div>
            )}
            {allItems.length === 0 && query.length >= 2 && !loading && (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                Geen resultaten voor &ldquo;{query}&rdquo;
              </div>
            )}
            {(() => {
              let lastCategory = ''
              return allItems.map((item, i) => {
                const showCategory = item.category !== lastCategory
                lastCategory = item.category
                const Icon = item.icon
                return (
                  <div key={item.id}>
                    {showCategory && (
                      <div className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        {item.category}
                      </div>
                    )}
                    <button
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        i === selectedIndex
                          ? 'bg-[var(--blue-bg)] text-[var(--blue)]'
                          : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="truncate">{item.label}</span>
                      {'subtitle' in item && item.subtitle && (
                        <span className="ml-auto text-xs text-[var(--text-muted)] truncate">{item.subtitle}</span>
                      )}
                    </button>
                  </div>
                )
              })
            })()}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2 text-[10px] text-[var(--text-muted)] flex items-center gap-4">
            <span><kbd className="font-mono">↑↓</kbd> navigeren</span>
            <span><kbd className="font-mono">↵</kbd> openen</span>
            <span><kbd className="font-mono">esc</kbd> sluiten</span>
          </div>
        </div>
      </div>
    </div>
  )
}
