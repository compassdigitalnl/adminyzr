import { getTranslations } from 'next-intl/server'
import { getEmployees } from '@/lib/actions/employees'
import { EmployeesPageClient } from './EmployeesPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function EmployeesPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('employees')

  let data
  try {
    data = await getEmployees({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <EmployeesPageClient
      initialData={data}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newEmployee: t('newEmployee'),
        noEmployees: t('noEmployees'),
        filter: t('filter'),
      }}
    />
  )
}
