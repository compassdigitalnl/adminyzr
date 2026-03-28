import { getPayrollRunDetail } from '@/lib/actions/payroll-detail'
import { PayrollDetailClient } from './PayrollDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function PayrollDetailPage({ params }: Props) {
  const { id, locale } = await params
  let data: Awaited<ReturnType<typeof getPayrollRunDetail>> | null = null
  try { data = await getPayrollRunDetail(id) } catch { /* */ }
  if (!data) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Verloning niet gevonden.</p></div>
  return <PayrollDetailClient data={data} locale={locale} />
}
