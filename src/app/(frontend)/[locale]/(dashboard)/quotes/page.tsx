import { getQuotes } from '@/lib/actions/quotes'
import { QuotesPageClient } from './QuotesPageClient'

type Props = {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function QuotesPage({ searchParams }: Props) {
  const params = await searchParams

  const data = await getQuotes({
    search: params.search,
    status: params.status,
    page: params.page ? parseInt(params.page, 10) : 1,
  })

  return (
    <QuotesPageClient
      initialData={data}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      initialPage={params.page ? parseInt(params.page, 10) : 1}
    />
  )
}
