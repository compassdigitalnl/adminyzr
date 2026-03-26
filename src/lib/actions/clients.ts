'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type ClientFormData = {
  type: 'business' | 'individual'
  companyName: string
  contactName?: string
  email: string
  phone?: string
  kvkNumber?: string
  vatNumber?: string
  address?: {
    street?: string
    houseNumber?: string
    postalCode?: string
    city?: string
    country?: string
  }
  paymentTermDays?: number
  notes?: string
}

export async function getClients(params?: {
  search?: string
  page?: number
  limit?: number
}) {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization

  const conditions: Where[] = [
    { organization: { equals: orgId } },
    { deletedAt: { exists: false } },
  ]

  if (params?.search) {
    conditions.push({
      or: [
        { companyName: { contains: params.search } },
        { contactName: { contains: params.search } },
        { email: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'clients',
    where,
    page: params?.page || 1,
    limit: params?.limit || 25,
    sort: '-createdAt',
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

export async function getClient(id: string) {
  const payload = await getPayloadClient()
  return payload.findByID({ collection: 'clients', id })
}

export async function createClient(data: ClientFormData) {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization

  const result = await payload.create({
    collection: 'clients',
    data: {
      ...data,
      organization: orgId,
    },
  })

  revalidatePath('/[locale]/clients', 'page')
  return result
}

export async function updateClient(id: string, data: Partial<ClientFormData>) {
  const payload = await getPayloadClient()

  const result = await payload.update({
    collection: 'clients',
    id,
    data,
  })

  revalidatePath('/[locale]/clients', 'page')
  return result
}

export async function deleteClient(id: string) {
  const payload = await getPayloadClient()

  const result = await payload.update({
    collection: 'clients',
    id,
    data: { deletedAt: new Date().toISOString() },
  })

  revalidatePath('/[locale]/clients', 'page')
  return result
}
