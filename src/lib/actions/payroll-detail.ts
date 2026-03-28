'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  return { payload, user, orgId }
}

/**
 * Get payroll run with all entries (per-employee breakdown)
 */
export async function getPayrollRunDetail(id: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const run = await payload.findByID({
    collection: 'payroll-runs',
    id,
    depth: 0,
  }) as Record<string, unknown>

  // Get entries for this run
  const { docs: entries } = await payload.find({
    collection: 'payroll-entries',
    where: {
      payrollRun: { equals: id },
    },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  const entryRows = entries.map((rawEntry) => {
    const entry = rawEntry as Record<string, unknown>
    const employee = entry.employee as Record<string, unknown> | undefined
    return {
      id: String(entry.id),
      employeeName: (employee?.name as string) || 'Onbekend',
      employeeId: employee ? String(employee.id) : '',
      grossSalary: (entry.grossSalary as number) || 0,
      bonus: (entry.bonus as number) || 0,
      deductions: (entry.deductions as number) || 0,
      loonheffing: (entry.loonheffing as number) || 0,
      socialSecurity: (entry.socialSecurity as number) || 0,
      netSalary: (entry.netSalary as number) || 0,
    }
  })

  return {
    run: {
      id: String(run.id),
      period: (run.period as string) || '',
      status: (run.status as string) || 'draft',
      totalGross: (run.totalGross as number) || 0,
      totalTax: (run.totalTax as number) || 0,
      totalNet: (run.totalNet as number) || 0,
      processedAt: run.processedAt as string | null,
      paidAt: run.paidAt as string | null,
    },
    entries: entryRows,
  }
}
