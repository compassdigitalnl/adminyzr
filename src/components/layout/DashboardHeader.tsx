'use client'

import { Bell, Search, HelpCircle, User } from 'lucide-react'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-header items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-6">
      {/* Left: Page title */}
      <div>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Dashboard</h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Zoeken..."
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] pl-8 pr-3 text-[13px] transition-colors hover:border-[var(--blue)] focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          />
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
