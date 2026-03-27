import { getTranslations } from 'next-intl/server'
import { getCreditNotes } from '@/lib/actions/credit-notes'
import { CreditNotesPageClient } from './CreditNotesPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function CreditNotesPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('creditNotes')

  let data
  try {
    data = await getCreditNotes({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <CreditNotesPageClient
      initialData={data}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newCreditNote: t('newCreditNote'),
        noCreditNotes: t('noCreditNotes'),
        filter: t('filter'),
      }}
    />
  )
}
