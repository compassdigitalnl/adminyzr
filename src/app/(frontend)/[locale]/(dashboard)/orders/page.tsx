import { getTranslations } from 'next-intl/server'
import { getOrders } from '@/lib/actions/orders'
import { OrdersPageClient } from './OrdersPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('orders')

  let data
  try {
    data = await getOrders({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <OrdersPageClient
      initialData={data}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        noOrders: t('noOrders'),
        filter: t('filter'),
      }}
    />
  )
}
