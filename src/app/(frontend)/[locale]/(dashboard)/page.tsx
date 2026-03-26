import { getTranslations } from 'next-intl/server'
import { getDashboardStats } from '@/lib/actions/invoices'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')

  let stats
  try {
    stats = await getDashboardStats()
  } catch {
    stats = {
      revenueThisMonth: 0,
      outstandingTotal: 0,
      overdueTotal: 0,
      overdueCount: 0,
      totalClients: 0,
      recentInvoices: [],
    }
  }

  return (
    <DashboardClient
      stats={stats}
      translations={{
        title: t('title'),
        welcome: t('welcome'),
        revenue: t('revenue'),
        outstanding: t('outstanding'),
        overdue: t('overdue'),
        totalClients: t('totalClients'),
        recentInvoices: t('recentInvoices'),
        recentActivity: t('recentActivity'),
        noInvoices: t('noInvoices'),
        viewAll: t('viewAll'),
      }}
    />
  )
}
