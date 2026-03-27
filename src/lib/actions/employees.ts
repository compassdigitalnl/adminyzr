'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type EmployeeFormData = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
  department?: string
  employmentType?: string
  startDate: string
  endDate?: string
  hoursPerWeek?: number
  salary?: number // in centen
  bsn?: string
  address?: {
    street?: string
    houseNumber?: string
    postalCode?: string
    city?: string
    country?: string
  }
  emergencyContact?: {
    name?: string
    phone?: string
    relation?: string
  }
  notes?: string
  isActive?: boolean
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

export async function getEmployees(params?: {
  search?: string
  status?: string
  department?: string
  page?: number
  limit?: number
}) {
  const { payload, orgId } = await getAuthUser()

  const conditions: Where[] = [
    { organization: { equals: orgId } },
    { deletedAt: { exists: false } },
  ]

  if (params?.status === 'active') {
    conditions.push({ isActive: { equals: true } })
  } else if (params?.status === 'inactive') {
    conditions.push({ isActive: { equals: false } })
  }

  if (params?.department && params.department !== 'all') {
    conditions.push({ department: { equals: params.department } })
  }

  if (params?.search) {
    conditions.push({
      or: [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
        { position: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'employees',
    where,
    page: params?.page || 1,
    limit: params?.limit || 25,
    sort: 'lastName',
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

export async function getEmployee(id: string) {
  const { payload } = await getAuthUser()
  return payload.findByID({ collection: 'employees', id, depth: 1 })
}

export async function createEmployee(data: EmployeeFormData) {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.create({
    collection: 'employees',
    data: {
      organization: orgId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      position: data.position || undefined,
      department: data.department || undefined,
      employmentType: data.employmentType || 'fulltime',
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      hoursPerWeek: data.hoursPerWeek || undefined,
      salary: data.salary || undefined,
      bsn: data.bsn || undefined,
      address: data.address || undefined,
      emergencyContact: data.emergencyContact || undefined,
      notes: data.notes || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  })

  revalidatePath('/[locale]/employees', 'page')
  return result
}

export async function updateEmployee(id: string, data: EmployeeFormData) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'employees',
    id,
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      position: data.position || undefined,
      department: data.department || undefined,
      employmentType: data.employmentType || 'fulltime',
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      hoursPerWeek: data.hoursPerWeek || undefined,
      salary: data.salary || undefined,
      bsn: data.bsn || undefined,
      address: data.address || undefined,
      emergencyContact: data.emergencyContact || undefined,
      notes: data.notes || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  })

  revalidatePath('/[locale]/employees', 'page')
  return result
}

export async function deleteEmployee(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'employees',
    id,
    data: {
      deletedAt: new Date().toISOString(),
      isActive: false,
    },
  })

  revalidatePath('/[locale]/employees', 'page')
  return result
}
