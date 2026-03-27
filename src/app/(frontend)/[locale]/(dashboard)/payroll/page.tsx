import { getTranslations } from 'next-intl/server'
import { getPayrollRuns } from '@/lib/actions/payroll'
import { PayrollPageClient } from './PayrollPageClient'

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function PayrollPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('payroll')

  let data
  try {
    data = await getPayrollRuns({
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <PayrollPageClient
      initialData={data}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newRun: t('newRun'),
        noRuns: t('noRuns'),
        filter: t('filter'),
      }}
    />
  )
}
