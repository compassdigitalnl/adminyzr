import { getTranslations } from 'next-intl/server'
import { getVatReport, getRevenueStats, getCashflowStats, getKpiStats } from '@/lib/actions/reports'
import { ReportsPageClient } from './ReportsPageClient'

type Props = {
  searchParams: Promise<{ start?: string; end?: string; year?: string }>
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('reports')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const quarterStart = new Date(currentYear, currentQuarter * 3, 1).toISOString().split('T')[0]
  const quarterEnd = new Date(currentYear, (currentQuarter + 1) * 3, 0).toISOString().split('T')[0]

  const start = params.start || quarterStart
  const end = params.end || quarterEnd
  const year = parseInt(params.year || String(currentYear))

  let vatReport = null
  let revenueStats = null
  let cashflowStats = null
  let kpiStats = null

  try {
    [vatReport, revenueStats, cashflowStats, kpiStats] = await Promise.all([
      getVatReport({ periodStart: start, periodEnd: end }),
      getRevenueStats({ year }),
      getCashflowStats({ year }),
      getKpiStats({ year }),
    ])
  } catch {
    // Not logged in or error
  }

  return (
    <ReportsPageClient
      vatReport={vatReport}
      revenueStats={revenueStats}
      cashflowStats={cashflowStats}
      kpiStats={kpiStats}
      periodStart={start}
      periodEnd={end}
      year={year}
      translations={{
        title: t('title'),
      }}
    />
  )
}
