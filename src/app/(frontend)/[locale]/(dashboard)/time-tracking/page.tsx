import { getTimeEntries, getTimeStats } from '@/lib/actions/time-entries'
import { getClients } from '@/lib/actions/clients'
import { TimeTrackingPageClient } from './TimeTrackingPageClient'

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function TimeTrackingPage({ searchParams }: Props) {
  const params = await searchParams

  let entriesData
  try {
    entriesData = await getTimeEntries({
      search: params.search,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    entriesData = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  let stats
  try {
    stats = await getTimeStats()
  } catch {
    stats = { totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0 }
  }

  let clientsData
  try {
    clientsData = await getClients({ limit: 500 })
  } catch {
    clientsData = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <TimeTrackingPageClient
      initialData={entriesData}
      initialSearch={params.search || ''}
      stats={stats}
      clients={clientsData.docs}
    />
  )
}
