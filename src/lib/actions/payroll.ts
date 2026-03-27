'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

// NL tax rates (simplified estimates)
const LOONHEFFING_RATE = 0.3707 // 37.07%
const SOCIAL_SECURITY_RATE = 0.2765 // 27.65%

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  if (!orgId) throw new Error('Geen organisatie gevonden')

  return { payload, user, orgId: orgId as string }
}

export async function calculatePayroll(grossSalary: number, bonus = 0, deductions = 0) {
  const totalGross = grossSalary + bonus - deductions
  const taxDeduction = Math.round(totalGross * LOONHEFFING_RATE)
  const socialSecurity = Math.round(totalGross * SOCIAL_SECURITY_RATE)
  const netSalary = totalGross - taxDeduction - socialSecurity

  return {
    grossSalary,
    bonus,
    deductions,
    totalGross,
    taxDeduction,
    socialSecurity,
    netSalary,
  }
}

export async function getPayrollRuns(params?: {
  status?: string
  page?: number
  limit?: number
}) {
  const { payload, orgId } = await getAuthUser()

  const conditions: Where[] = [
    { organization: { equals: orgId } },
    { deletedAt: { exists: false } },
  ]

  if (params?.status && params.status !== 'all') {
    conditions.push({ status: { equals: params.status } })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'payroll-runs',
    where,
    page: params?.page || 1,
    limit: params?.limit || 25,
    sort: '-period',
    depth: 1,
  })

  return {
    docs: result.docs as unknown as Array<Record<string, unknown> & { id: string }>,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  }
}

export async function getPayrollEntries(payrollRunId: string) {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.find({
    collection: 'payroll-entries',
    where: {
      and: [
        { organization: { equals: orgId } },
        { payrollRun: { equals: payrollRunId } },
      ],
    },
    limit: 200,
    sort: 'employee',
    depth: 2,
  })

  return result.docs as unknown as Array<Record<string, unknown> & { id: string }>
}

export async function createPayrollRun(period: string) {
  const { payload, orgId } = await getAuthUser()

  // Check if a run already exists for this period
  const existing = await payload.find({
    collection: 'payroll-runs',
    where: {
      and: [
        { organization: { equals: orgId } },
        { period: { equals: period } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    throw new Error('Er bestaat al een salarisrun voor deze periode')
  }

  const result = await payload.create({
    collection: 'payroll-runs',
    data: {
      organization: orgId,
      period,
      status: 'draft',
      totalGross: 0,
      totalNet: 0,
      totalTax: 0,
    },
  })

  revalidatePath('/[locale]/payroll', 'page')
  return result
}

export async function processPayrollRun(id: string) {
  const { payload, orgId } = await getAuthUser()

  // Get the run
  const run = await payload.findByID({
    collection: 'payroll-runs',
    id,
    depth: 0,
  })

  if (run.status !== 'draft') {
    throw new Error('Alleen conceptruns kunnen verwerkt worden')
  }

  // Get all active employees
  const employees = await payload.find({
    collection: 'employees',
    where: {
      and: [
        { organization: { equals: orgId } },
        { isActive: { equals: true } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 500,
    depth: 0,
  })

  let totalGross = 0
  let totalNet = 0
  let totalTax = 0

  // Create payroll entry for each active employee
  for (const emp of employees.docs) {
    const grossSalary = (emp.salary as number) || 0
    if (grossSalary === 0) continue // Skip employees without salary

    const calc = await calculatePayroll(grossSalary)

    await payload.create({
      collection: 'payroll-entries',
      data: {
        organization: orgId,
        payrollRun: id,
        employee: emp.id,
        period: run.period as string,
        grossSalary: calc.grossSalary,
        taxDeduction: calc.taxDeduction,
        socialSecurity: calc.socialSecurity,
        netSalary: calc.netSalary,
        hoursWorked: (emp.hoursPerWeek as number) ? ((emp.hoursPerWeek as number) * 4.33) : undefined,
        bonus: 0,
        deductions: 0,
      },
    })

    totalGross += calc.grossSalary
    totalNet += calc.netSalary
    totalTax += calc.taxDeduction + calc.socialSecurity
  }

  // Update the run
  await payload.update({
    collection: 'payroll-runs',
    id,
    data: {
      status: 'processed',
      processedAt: new Date().toISOString(),
      totalGross,
      totalNet,
      totalTax,
    },
  })

  revalidatePath('/[locale]/payroll', 'page')
  return { totalGross, totalNet, totalTax, employeeCount: employees.docs.length }
}

export async function markPayrollPaid(id: string) {
  const { payload } = await getAuthUser()

  const run = await payload.findByID({
    collection: 'payroll-runs',
    id,
    depth: 0,
  })

  if (run.status !== 'processed') {
    throw new Error('Alleen verwerkte runs kunnen als betaald worden gemarkeerd')
  }

  const result = await payload.update({
    collection: 'payroll-runs',
    id,
    data: {
      status: 'paid',
      paidAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/payroll', 'page')
  return result
}
