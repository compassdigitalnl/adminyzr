import { getEmployee } from '@/lib/actions/employees'
import { getEmployeeStats } from '@/lib/actions/reporting'
import { EmployeeDetailClient } from './EmployeeDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function EmployeeDetailPage({ params }: Props) {
  const { id, locale } = await params
  let employee: Record<string, unknown> | null = null
  let stats: Awaited<ReturnType<typeof getEmployeeStats>> | null = null

  try {
    employee = await getEmployee(id) as Record<string, unknown>
    stats = await getEmployeeStats(id)
  } catch { /* */ }

  if (!employee) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Medewerker niet gevonden.</p></div>
  return <EmployeeDetailClient employee={employee} locale={locale} stats={stats} />
}
