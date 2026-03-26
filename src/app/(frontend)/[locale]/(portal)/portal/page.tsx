import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getPortalInvoices, getPortalQuotes } from '@/lib/actions/portal'
import { PortalRequestForm } from '@/components/portal/PortalRequestForm'
import { PortalDashboard } from '@/components/portal/PortalDashboard'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function PortalPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('portal')
  const cookieStore = await cookies()
  const clientId = cookieStore.get('portal-client-id')?.value

  if (!clientId) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            {t('welcome')}
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            {t('enterEmail')}
          </p>
          <PortalRequestForm />
        </div>
      </div>
    )
  }

  const [invoices, quotes] = await Promise.all([
    getPortalInvoices(clientId),
    getPortalQuotes(clientId),
  ])

  return (
    <PortalDashboard
      invoiceCount={invoices.length}
      quoteCount={quotes.length}
      locale={locale}
    />
  )
}
