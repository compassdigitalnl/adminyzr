import { getTranslations } from 'next-intl/server'
import { getDashboardStats } from '@/lib/actions/invoices'
import { DashboardClient } from './DashboardClient'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import { getDefaultProviderForOrg } from '@/lib/payments/factory'
import { getOrganization } from '@/lib/actions/settings'

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

  // Onboarding data
  let orgName = ''
  let hasPaymentProvider = false
  try {
    const org = await getOrganization()
    orgName = (org.name as string) || ''
    const orgId = org.id
    if (orgId) {
      const provider = await getDefaultProviderForOrg(orgId)
      hasPaymentProvider = provider !== null
    }
  } catch {
    // Not logged in
  }

  const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !process.env.SMTP_USER.startsWith('your-')

  return (
    <>
      <OnboardingChecklist
        orgName={orgName}
        hasClients={stats.totalClients > 0}
        hasInvoices={stats.recentInvoices.length > 0}
        hasPaymentProvider={hasPaymentProvider}
        hasSmtp={hasSmtp}
      />
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
    </>
  )
}
