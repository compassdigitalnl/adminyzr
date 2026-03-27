'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type LeaveRequestFormData = {
  employee: string
  type: string
  startDate: string
  endDate: string
  totalDays?: number
  notes?: string
}

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

function calculateBusinessDays(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  let count = 0
  const current = new Date(startDate)
  while (current <= endDate) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

export async function getLeaveRequests(params?: {
  search?: string
  status?: string
  employeeId?: string
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

  if (params?.employeeId) {
    conditions.push({ employee: { equals: params.employeeId } })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'leave-requests',
    where,
    page: params?.page || 1,
    limit: params?.limit || 25,
    sort: '-startDate',
    depth: 2,
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

export async function createLeaveRequest(data: LeaveRequestFormData) {
  const { payload, orgId } = await getAuthUser()

  const totalDays = data.totalDays || calculateBusinessDays(data.startDate, data.endDate)

  const result = await payload.create({
    collection: 'leave-requests',
    data: {
      organization: orgId,
      employee: data.employee,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      status: 'pending',
      notes: data.notes || undefined,
    },
  })

  revalidatePath('/[locale]/leave', 'page')
  return result
}

export async function approveLeaveRequest(id: string) {
  const { payload, user } = await getAuthUser()

  const result = await payload.update({
    collection: 'leave-requests',
    id,
    data: {
      status: 'approved',
      approvedBy: user.id,
      approvedAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/leave', 'page')
  return result
}

export async function rejectLeaveRequest(id: string) {
  const { payload, user } = await getAuthUser()

  const result = await payload.update({
    collection: 'leave-requests',
    id,
    data: {
      status: 'rejected',
      approvedBy: user.id,
      approvedAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/leave', 'page')
  return result
}

export async function cancelLeaveRequest(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'leave-requests',
    id,
    data: {
      status: 'cancelled',
    },
  })

  revalidatePath('/[locale]/leave', 'page')
  return result
}

export async function getLeaveBalance(employeeId: string, year: number) {
  const { payload, orgId } = await getAuthUser()

  // Get employee to determine hours/week (for pro-rata calculation)
  const employee = await payload.findByID({
    collection: 'employees',
    id: employeeId,
    depth: 0,
  })

  // NL standard: 20 vacation days for fulltime (40h/week)
  const hoursPerWeek = (employee.hoursPerWeek as number) || 40
  const fulltimeHours = 40
  const baseVacationDays = 20
  const entitledDays = Math.round((hoursPerWeek / fulltimeHours) * baseVacationDays)

  // Count approved vacation days for this year
  const startOfYear = `${year}-01-01T00:00:00.000Z`
  const endOfYear = `${year}-12-31T23:59:59.999Z`

  const leaveResult = await payload.find({
    collection: 'leave-requests',
    where: {
      and: [
        { organization: { equals: orgId } },
        { employee: { equals: employeeId } },
        { type: { equals: 'vacation' } },
        { status: { equals: 'approved' } },
        { startDate: { greater_than_equal: startOfYear } },
        { startDate: { less_than_equal: endOfYear } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 100,
    depth: 0,
  })

  const usedDays = leaveResult.docs.reduce((sum, req) => {
    return sum + ((req.totalDays as number) || 0)
  }, 0)

  return {
    entitled: entitledDays,
    used: usedDays,
    remaining: entitledDays - usedDays,
    year,
  }
}
