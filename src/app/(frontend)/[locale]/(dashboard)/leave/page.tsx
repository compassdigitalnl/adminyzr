import { getTranslations } from 'next-intl/server'
import { getLeaveRequests } from '@/lib/actions/leave-requests'
import { getEmployees } from '@/lib/actions/employees'
import { LeavePageClient } from './LeavePageClient'

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function LeavePage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('leave')

  let data
  try {
    data = await getLeaveRequests({
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  let employees: Array<Record<string, unknown> & { id: string }> = []
  try {
    const empData = await getEmployees({ status: 'active', limit: 200 })
    employees = empData.docs
  } catch {
    employees = []
  }

  return (
    <LeavePageClient
      initialData={data}
      employees={employees}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newRequest: t('newRequest'),
        noRequests: t('noRequests'),
        filter: t('filter'),
      }}
    />
  )
}
