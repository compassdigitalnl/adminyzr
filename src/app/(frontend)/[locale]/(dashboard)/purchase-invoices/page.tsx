import { getTranslations } from 'next-intl/server'
import { getPurchaseInvoices } from '@/lib/actions/purchase-invoices'
import { getOrganization } from '@/lib/actions/settings'
import { PurchaseInvoicesPageClient } from './PurchaseInvoicesPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function PurchaseInvoicesPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('purchaseInvoices')

  let data
  try {
    data = await getPurchaseInvoices({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  // Build inbox email address from org slug + domain
  let inboxEmail = ''
  const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN
  if (inboundDomain) {
    try {
      const org = await getOrganization()
      if (org.slug) {
        inboxEmail = `${org.slug}@${inboundDomain}`
      }
    } catch {
      // Not logged in or no org
    }
  }

  return (
    <PurchaseInvoicesPageClient
      initialData={data}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      inboxEmail={inboxEmail}
      translations={{
        title: t('title'),
        newInvoice: t('newInvoice'),
        noInvoices: t('noInvoices'),
        filter: t('filter'),
      }}
    />
  )
}
