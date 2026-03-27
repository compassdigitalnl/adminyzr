'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type ProjectFormData = {
  name: string
  client?: string
  description?: string
  status?: string
  priority?: string
  startDate?: string
  deadline?: string
  budget?: number // in centen
  tags?: string[]
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

export async function getProjects(params?: {
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
      or: [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'projects',
    where,
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

export async function getProject(id: string) {
  const { payload } = await getAuthUser()
  return payload.findByID({ collection: 'projects', id, depth: 1 })
}

export async function createProject(data: ProjectFormData) {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.create({
    collection: 'projects',
    data: {
      organization: orgId,
      name: data.name,
      client: data.client || undefined,
      description: data.description,
      status: data.status || 'planning',
      priority: data.priority || 'medium',
      startDate: data.startDate || undefined,
      deadline: data.deadline || undefined,
      budget: data.budget || 0,
      tags: data.tags?.map((tag) => ({ tag })) || [],
    },
  })

  revalidatePath('/[locale]/projects', 'page')
  return result
}

export async function updateProject(id: string, data: ProjectFormData) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'projects',
    id,
    data: {
      name: data.name,
      client: data.client || undefined,
      description: data.description,
      status: data.status || 'planning',
      priority: data.priority || 'medium',
      startDate: data.startDate || undefined,
      deadline: data.deadline || undefined,
      budget: data.budget || 0,
      tags: data.tags?.map((tag) => ({ tag })) || [],
    },
  })

  revalidatePath('/[locale]/projects', 'page')
  return result
}

export async function updateProjectStatus(id: string, status: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'projects',
    id,
    data: {
      status,
    },
  })

  revalidatePath('/[locale]/projects', 'page')
  return result
}

export async function deleteProject(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'projects',
    id,
    data: {
      deletedAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/projects', 'page')
  return result
}
