'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type ProductFormData = {
  name: string
  description?: string
  unitPrice: number // in centen
  unit: 'piece' | 'hour' | 'day' | 'month' | 'credit'
  vatRate: '21' | '9' | '0' | 'exempt'
  isActive?: boolean
}

export async function getProducts(params?: {
  search?: string
  page?: number
  limit?: number
  activeOnly?: boolean
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

  if (params?.activeOnly) {
    conditions.push({ isActive: { equals: true } })
  }

  if (params?.search) {
    conditions.push({
      or: [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'products',
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

export async function getProduct(id: string) {
  const payload = await getPayloadClient()
  return payload.findByID({ collection: 'products', id })
}

export async function createProduct(data: ProductFormData) {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization

  const result = await payload.create({
    collection: 'products',
    data: {
      ...data,
      organization: orgId,
    },
  })

  revalidatePath('/[locale]/products', 'page')
  return result
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  const payload = await getPayloadClient()

  const result = await payload.update({
    collection: 'products',
    id,
    data,
  })

  revalidatePath('/[locale]/products', 'page')
  return result
}

export async function deleteProduct(id: string) {
  const payload = await getPayloadClient()

  const result = await payload.update({
    collection: 'products',
    id,
    data: { deletedAt: new Date().toISOString() },
  })

  revalidatePath('/[locale]/products', 'page')
  return result
}
