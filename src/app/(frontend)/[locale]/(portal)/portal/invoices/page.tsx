import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getPortalInvoices } from '@/lib/actions/portal'
import { PortalInvoiceTable } from '@/components/portal/PortalInvoiceTable'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function PortalInvoicesPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('portal')
  const cookieStore = await cookies()
  const clientId = cookieStore.get('portal-client-id')?.value

  if (!clientId) {
    redirect(`/${locale}/portal`)
  }

  const invoices = await getPortalInvoices(clientId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">{t('invoices')}</h2>
        <a
          href={`/${locale}/portal`}
          className="text-sm text-blue-600 hover:underline"
        >
          {t('backToPortal')}
        </a>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">{t('noInvoices')}</p>
        </div>
      ) : (
        <PortalInvoiceTable invoices={invoices} />
      )}
    </div>
  )
}
