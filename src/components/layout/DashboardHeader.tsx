'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, HelpCircle, User, FileText, Users, Package, FileCheck, Receipt } from 'lucide-react'
import { globalSearch, type SearchResult } from '@/lib/actions/search'

const TYPE_ICONS: Record<string, typeof FileText> = {
  Factuur: FileText,
  Klant: Users,
  Product: Package,
  Offerte: FileCheck,
  Inkoopfactuur: Receipt,
}

export function DashboardHeader() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await globalSearch(q)
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    setShowResults(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSearch(value), 300)
  }

  function handleSelect(result: SearchResult) {
    setShowResults(false)
    setQuery('')
    router.push(`/nl${result.href}`)
  }

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-header items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-6">
      <div>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Dashboard</h2>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div ref={searchRef} className="relative min-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            placeholder="Zoeken in facturen, klanten, producten..."
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] pl-8 pr-3 text-[13px] transition-colors hover:border-[var(--blue)] focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          />

          {/* Search results dropdown */}
          {showResults && (query.length >= 2) && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-white shadow-lg overflow-hidden z-50">
              {loading ? (
                <div className="px-4 py-3 text-xs text-gray-400">Zoeken...</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400">Geen resultaten voor &ldquo;{query}&rdquo;</div>
              ) : (
                <ul>
                  {results.map((r) => {
                    const Icon = TYPE_ICONS[r.type] || FileText
                    return (
                      <li key={`${r.type}-${r.id}`}>
                        <button
                          onClick={() => handleSelect(r)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                        >
                          <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{r.title}</span>
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{r.type}</span>
                            </div>
                            {r.subtitle && (
                              <div className="text-xs text-gray-400 truncate">{r.subtitle}</div>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]">
          <Bell className="h-[15px] w-[15px] text-[var(--text-secondary)]" strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--blue)] ring-2 ring-[var(--bg-card)]" />
        </button>

        {/* Help */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]">
          <HelpCircle className="h-[15px] w-[15px] text-[var(--text-secondary)]" strokeWidth={1.75} />
        </button>

        {/* Avatar */}
        <button className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--bg-void)] text-[11px] font-semibold text-white transition-all hover:ring-2 hover:ring-[var(--blue)]/50">
          <User className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
