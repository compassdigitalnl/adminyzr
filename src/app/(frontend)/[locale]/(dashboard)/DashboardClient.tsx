'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'

type Invoice = Record<string, unknown> & {
  id: string
  invoiceNumber?: string
  client?: { id: string; companyName: string } | string
  status?: string
  totalIncVat?: number
  issueDate?: string
}

type DashboardStats = {
  revenueThisMonth: number
  outstandingTotal: number
  overdueTotal: number
  overdueCount: number
  totalClients: number
  recentInvoices: Invoice[]
}

type Props = {
  stats: DashboardStats
  translations: {
    title: string
    welcome: string
    revenue: string
    outstanding: string
    overdue: string
    totalClients: string
    recentInvoices: string
    recentActivity: string
    noInvoices: string
    viewAll: string
  }
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ElementType
  subtitle?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  sent: { variant: 'default', label: 'Verstuurd' },
  paid: { variant: 'success', label: 'Betaald' },
  overdue: { variant: 'destructive', label: 'Te laat' },
  cancelled: { variant: 'secondary', label: 'Geannuleerd' },
}

export function DashboardClient({ stats, translations }: Props) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'nl'

  function getClientName(client: Invoice['client']): string {
    if (typeof client === 'object' && client !== null) return client.companyName
    return String(client)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <p className="mt-1 text-muted-foreground">{translations.welcome}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={translations.revenue}
          value={formatCents(stats.revenueThisMonth)}
          icon={TrendingUp}
        />
        <StatCard
          title={translations.outstanding}
          value={formatCents(stats.outstandingTotal)}
          icon={FileText}
        />
        <StatCard
          title={translations.overdue}
          value={formatCents(stats.overdueTotal)}
          icon={AlertCircle}
          subtitle={stats.overdueCount > 0 ? `${stats.overdueCount} facturen` : undefined}
        />
        <StatCard
          title={translations.totalClients}
          value={String(stats.totalClients)}
          icon={Users}
        />
      </div>

      {/* Recent invoices */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{translations.recentInvoices}</h2>
          <Link href={`/${locale}/invoices`}>
            <Button variant="ghost" size="sm">{translations.viewAll}</Button>
          </Link>
        </div>
        <div className="p-6">
          {stats.recentInvoices.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              {translations.noInvoices}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentInvoices.map((inv) => {
                const statusInfo = STATUS_BADGE[inv.status || 'draft'] || STATUS_BADGE.draft
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-mono font-medium">{inv.invoiceNumber || '—'}</p>
                      <p className="text-sm text-muted-foreground">{inv.client ? getClientName(inv.client) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">{formatCents(inv.totalIncVat || 0)}</p>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
