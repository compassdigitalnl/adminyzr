'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type PunchCardFormData = {
  name: string
  client: string
  unit: 'hour' | 'credit' | 'task'
  totalCredits: number
  expiresAt?: string
  alertThreshold?: number
}

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

export async function getPunchCards(params?: {
  search?: string
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

  if (params?.search) {
    conditions.push({
      or: [{ name: { contains: params.search } }],
    })
  }

  const result = await payload.find({
    collection: 'punch-cards',
    where: { and: conditions },
    page: params?.page || 1,
    limit: params?.limit || 25,
    sort: '-createdAt',
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

export async function createPunchCard(data: PunchCardFormData) {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.create({
    collection: 'punch-cards',
    data: {
      organization: orgId,
      name: data.name,
      client: data.client,
      unit: data.unit,
      totalCredits: data.totalCredits,
      usedCredits: 0,
      status: 'active',
      expiresAt: data.expiresAt || undefined,
      alertThreshold: data.alertThreshold ?? 20,
    },
  })

  revalidatePath('/[locale]/punch-cards', 'page')
  return result
}

export async function updatePunchCard(id: string, data: Partial<PunchCardFormData>) {
  const payload = await getPayloadClient()
  const result = await payload.update({
    collection: 'punch-cards',
    id,
    data,
  })
  revalidatePath('/[locale]/punch-cards', 'page')
  return result
}

export async function deletePunchCard(id: string) {
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'punch-cards',
    id,
    data: { deletedAt: new Date().toISOString() },
  })
  revalidatePath('/[locale]/punch-cards', 'page')
}
