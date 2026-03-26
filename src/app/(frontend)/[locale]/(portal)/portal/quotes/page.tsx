import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getPortalQuotes } from '@/lib/actions/portal'
import { PortalQuoteTable } from '@/components/portal/PortalQuoteTable'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function PortalQuotesPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('portal')
  const cookieStore = await cookies()
  const clientId = cookieStore.get('portal-client-id')?.value

  if (!clientId) {
    redirect(`/${locale}/portal`)
  }

  const quotes = await getPortalQuotes(clientId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">{t('quotes')}</h2>
        <a
          href={`/${locale}/portal`}
          className="text-sm text-blue-600 hover:underline"
        >
          {t('backToPortal')}
        </a>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">{t('noQuotes')}</p>
        </div>
      ) : (
        <PortalQuoteTable quotes={quotes} clientId={clientId} />
      )}
    </div>
  )
}
