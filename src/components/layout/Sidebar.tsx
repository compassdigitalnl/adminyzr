'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  FileMinus,
  Users,
  Clock,
  CreditCard,
  Package,
  FileCheck,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  FolderKanban,
  Repeat,
  Mail,
  UserCheck,
  CalendarDays,
  Banknote,
  ShoppingCart,
  Landmark,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { key: 'dashboard', href: '', icon: LayoutDashboard },
  { key: 'invoices', href: '/invoices', icon: FileText },
  { key: 'subscriptions', href: '/subscriptions', icon: Repeat },
  { key: 'orders', href: '/orders', icon: ShoppingCart },
  { key: 'bank', href: '/bank', icon: Landmark },
  { key: 'creditNotes', href: '/credit-notes', icon: FileMinus },
  { key: 'purchaseInvoices', href: '/purchase-invoices', icon: Receipt },
  { key: 'quotes', href: '/quotes', icon: FileCheck },
  { key: 'projects', href: '/projects', icon: FolderKanban },
  { key: 'emailLog', href: '/emails', icon: Mail },
  { key: 'clients', href: '/clients', icon: Users },
  { key: 'products', href: '/products', icon: Package },
  { key: 'timeTracking', href: '/time-tracking', icon: Clock },
  { key: 'punchCards', href: '/punch-cards', icon: CreditCard },
  { key: 'employees', href: '/employees', icon: UserCheck },
  { key: 'leave', href: '/leave', icon: CalendarDays },
  { key: 'payroll', href: '/payroll', icon: Banknote },
  { key: 'reports', href: '/reports', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')
  const [mobileOpen, setMobileOpen] = useState(false)

  const locale = pathname.split('/')[1] || 'nl'
  const basePath = `/${locale}`

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-header items-center justify-between border-b border-[var(--border)] px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-void)]">
            <Building2 className="h-4 w-4 text-white" strokeWidth={1.75} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            Adminyzr
          </span>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--bg-hover)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Organization info */}
      <div className="mx-3 mt-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-muted)] p-3">
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Mijn Bedrijf</p>
        <p className="text-xs text-[var(--text-muted)]">KvK: 12345678</p>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const fullHref = basePath + item.href
          const isActive = item.href === ''
            ? pathname === basePath || pathname === basePath + '/'
            : pathname.startsWith(fullHref)

          return (
            <Link
              key={item.key}
              href={fullHref || basePath}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 lg:py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-[var(--blue-bg)] text-[var(--blue)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{t(item.key)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1 h-px bg-[var(--border-light)]" />

      {/* Bottom section */}
      <div className="px-3 pb-3 space-y-0.5">
        <Link
          href={`${basePath}/settings`}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 lg:py-1.5 text-[13px] font-medium transition-colors',
            pathname.startsWith(`${basePath}/settings`)
              ? 'bg-[var(--blue-bg)] text-[var(--blue)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{t('settings')}</span>
        </Link>
        <button
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 lg:py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]"
          onClick={() => {
            fetch('/api/users/logout', { method: 'POST' }).then(() => {
              window.location.href = `/${locale}/login`
            })
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{tAuth('logout')}</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border bg-[var(--bg-card)] shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, fixed on desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] lg:w-sidebar flex-col bg-[var(--bg-card)] border-r border-[var(--border)] transition-transform duration-300',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

export function MobileMenuButton() {
  return null // Handled inside Sidebar now
}
