import { getTranslations } from 'next-intl/server'
import { getEmailLog, getEmailStats } from '@/lib/actions/email-log'
import { EmailLogClient } from './EmailLogClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; direction?: string; page?: string }>
}

export default async function EmailsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('emailLog')

  let data
  try {
    data = await getEmailLog({
      search: params.search,
      status: params.status,
      direction: params.direction,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  let stats
  try {
    stats = await getEmailStats()
  } catch {
    stats = { totalSent: 0, totalFailed: 0, totalBounced: 0, total: 0, bounceRate: 0 }
  }

  return (
    <EmailLogClient
      initialData={data}
      stats={stats}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      initialDirection={params.direction || 'all'}
      translations={{
        title: t('title'),
        noEmails: t('noEmails'),
        filter: t('filter'),
      }}
    />
  )
}
