import { getEmployee } from '@/lib/actions/employees'
import { EmployeeDetailClient } from './EmployeeDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function EmployeeDetailPage({ params }: Props) {
  const { id, locale } = await params
  let employee: Record<string, unknown> | null = null
  try { employee = await getEmployee(id) as Record<string, unknown> } catch { /* */ }
  if (!employee) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Medewerker niet gevonden.</p></div>
  return <EmployeeDetailClient employee={employee} locale={locale} />
}
