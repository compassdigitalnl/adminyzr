import { getTranslations } from 'next-intl/server'
import { getPunchCards } from '@/lib/actions/punch-cards'
import { PunchCardsPageClient } from './PunchCardsPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function PunchCardsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('punchCards')

  let punchCardsData
  try {
    punchCardsData = await getPunchCards({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    punchCardsData = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <PunchCardsPageClient
      initialData={punchCardsData}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newCard: t('newCard'),
        name: t('name'),
        client: t('client'),
        totalCredits: t('totalCredits'),
        usedCredits: t('usedCredits'),
        remaining: t('remaining'),
        unit: t('unit'),
        expiresAt: t('expiresAt'),
        noCards: t('noCards'),
      }}
    />
  )
}
