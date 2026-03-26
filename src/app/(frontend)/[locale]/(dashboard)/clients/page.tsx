import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/actions/clients'
import { ClientsPageClient } from './ClientsPageClient'

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function ClientsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('clients')

  let clientsData
  try {
    clientsData = await getClients({
      search: params.search,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    clientsData = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <ClientsPageClient
      initialData={clientsData}
      initialSearch={params.search || ''}
      translations={{
        title: t('title'),
        newClient: t('newClient'),
        companyName: t('companyName'),
        contactName: t('contactName'),
        email: t('email'),
        phone: t('phone'),
        noClients: t('noClients'),
      }}
    />
  )
}
