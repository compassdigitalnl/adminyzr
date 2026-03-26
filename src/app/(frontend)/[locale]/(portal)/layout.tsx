import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getPortalClient } from '@/lib/actions/portal'
import { PortalHeader } from '@/components/portal/PortalHeader'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function PortalLayout({ children, params }: Props) {
  const { locale } = await params
  const t = await getTranslations('portal')
  const cookieStore = await cookies()
  const clientId = cookieStore.get('portal-client-id')?.value

  let clientName: string | null = null
  if (clientId) {
    const client = await getPortalClient(clientId)
    clientName = client?.companyName ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {t('title')} &mdash; Adminyzr
            </h1>
          </div>
          {clientName && (
            <PortalHeader clientName={clientName} locale={locale} />
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
