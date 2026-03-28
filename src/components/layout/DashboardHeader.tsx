'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Sun, Moon, User, FileText, Users, Package, FileCheck, Receipt, CheckCheck } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { globalSearch, type SearchResult } from '@/lib/actions/search'
import { getNotifications, markNotificationRead, markAllRead } from '@/lib/actions/notifications'

const TYPE_ICONS: Record<string, typeof FileText> = {
  Factuur: FileText,
  Klant: Users,
  Product: Package,
  Offerte: FileCheck,
  Inkoopfactuur: Receipt,
}

export function DashboardHeader() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
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
    <header className="sticky top-0 z-30 flex h-header items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 lg:px-6">
      <div className="hidden lg:block">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Dashboard</h2>
      </div>
      {/* Spacer for mobile hamburger button */}
      <div className="w-10 lg:hidden" />

      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div ref={searchRef} className="relative min-w-0 w-full max-w-[280px]">
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
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-[15px] w-[15px] text-[var(--text-secondary)]" strokeWidth={1.75} />
          ) : (
            <Moon className="h-[15px] w-[15px] text-[var(--text-secondary)]" strokeWidth={1.75} />
          )}
        </button>

        {/* Avatar */}
        <button className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--bg-void)] text-[11px] font-semibold text-white transition-all hover:ring-2 hover:ring-[var(--blue)]/50">
          <User className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async () => {
    try {
      const result = await getNotifications()
      setNotifications(result.docs as Record<string, unknown>[])
      setUnreadCount(result.unreadCount)
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000) // Poll every minute
    return () => clearInterval(interval)
  }, [loadNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleMarkAllRead() {
    await markAllRead()
    loadNotifications()
  }

  async function handleClick(notif: Record<string, unknown>) {
    if (!notif.isRead) {
      await markNotificationRead(notif.id as string)
      loadNotifications()
    }
    if (notif.link) {
      setOpen(false)
      window.location.href = `/nl${notif.link}`
    }
  }

  const TYPE_COLORS: Record<string, string> = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    payment: 'bg-green-500',
    invoice: 'bg-blue-500',
  }

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] transition-colors hover:bg-[var(--bg-hover)]"
      >
        <Bell className="h-[15px] w-[15px] text-[var(--text-secondary)]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--blue)] text-[9px] font-bold text-white ring-2 ring-[var(--bg-card)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border bg-white shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-sm font-medium">Meldingen</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Alles gelezen
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Geen meldingen
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id as string}
                  onClick={() => handleClick(notif)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-0 ${
                    !notif.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[notif.type as string] || 'bg-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{notif.title as string}</div>
                    {notif.message ? (
                      <div className="text-xs text-gray-500 truncate">{String(notif.message)}</div>
                    ) : null}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(notif.createdAt as string).toLocaleDateString('nl-NL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
