import { getTranslations } from 'next-intl/server'
import { getInvoices } from '@/lib/actions/invoices'
import { InvoicesPageClient } from './InvoicesPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function InvoicesPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('invoices')

  let invoicesData
  try {
    invoicesData = await getInvoices({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    invoicesData = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <InvoicesPageClient
      initialData={invoicesData}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newInvoice: t('newInvoice'),
        noInvoices: t('noInvoices'),
        filter: t('filter'),
        export: t('export'),
      }}
    />
  )
}
