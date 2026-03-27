import { getTranslations } from 'next-intl/server'
import { getSubscriptions } from '@/lib/actions/subscriptions'
import { getClients } from '@/lib/actions/clients'
import { SubscriptionsPageClient } from './SubscriptionsPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('subscriptions')

  let data
  try {
    data = await getSubscriptions({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  let clients: Array<Record<string, unknown> & { id: string }> = []
  try {
    const clientsData = await getClients({ limit: 100 })
    clients = clientsData.docs
  } catch {
    clients = []
  }

  return (
    <SubscriptionsPageClient
      initialData={data}
      clients={clients}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newSubscription: t('newSubscription'),
        noSubscriptions: t('noSubscriptions'),
        filter: t('filter'),
      }}
    />
  )
}
