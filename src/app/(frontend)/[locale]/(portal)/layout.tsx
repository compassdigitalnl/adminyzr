import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getPortalClient } from '@/lib/actions/portal'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { getPayloadClient } from '@/lib/get-payload'

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
  let orgName = 'Adminyzr'
  let brandColor = '#2563EB'
  let logoUrl: string | null = null

  if (clientId) {
    const client = await getPortalClient(clientId)
    clientName = client?.companyName ?? null

    // Get org branding
    if (client?.organizationId) {
      try {
        const payload = await getPayloadClient()
        const org = await payload.findByID({
          collection: 'organizations',
          id: client.organizationId as string,
          depth: 1,
          overrideAccess: true,
        }) as Record<string, unknown>

        orgName = (org.name as string) || 'Adminyzr'
        const branding = org.branding as Record<string, unknown> | undefined
        if (branding?.primaryColor) brandColor = branding.primaryColor as string
        const logo = branding?.logo as Record<string, unknown> | undefined
        if (logo?.url) logoUrl = logo.url as string
      } catch {
        // Branding fetch failure should not break portal
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b bg-white dark:bg-gray-900 shadow-sm" style={{ borderBottomColor: brandColor }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={orgName} className="h-8 w-auto" />
            )}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('title')} &mdash; {orgName}
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
