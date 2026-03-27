'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import type { Where } from 'payload'

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

export async function getEmailLog(params?: {
  search?: string
  status?: string
  direction?: string
  clientId?: string
  page?: number
  limit?: number
}) {
  const { payload, orgId } = await getAuthUser()

  const conditions: Where[] = [
    { organization: { equals: orgId } },
  ]

  if (params?.status && params.status !== 'all') {
    conditions.push({ status: { equals: params.status } })
  }

  if (params?.direction && params.direction !== 'all') {
    conditions.push({ direction: { equals: params.direction } })
  }

  if (params?.clientId) {
    conditions.push({ client: { equals: params.clientId } })
  }

  if (params?.search) {
    conditions.push({
      or: [
        { subject: { contains: params.search } },
        { to: { contains: params.search } },
      ],
    })
  }

  const result = await payload.find({
    collection: 'email-log',
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

export async function getClientEmails(clientId: string) {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.find({
    collection: 'email-log',
    where: {
      and: [
        { organization: { equals: orgId } },
        { client: { equals: clientId } },
      ],
    },
    sort: '-createdAt',
    limit: 100,
    depth: 1,
  })

  return {
    docs: result.docs as unknown as Array<Record<string, unknown> & { id: string }>,
    totalDocs: result.totalDocs,
  }
}

export async function getEmailStats() {
  const { payload, orgId } = await getAuthUser()

  const [sentResult, failedResult, bouncedResult] = await Promise.all([
    payload.find({
      collection: 'email-log',
      where: {
        and: [
          { organization: { equals: orgId } },
          { status: { equals: 'sent' } },
        ],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'email-log',
      where: {
        and: [
          { organization: { equals: orgId } },
          { status: { equals: 'failed' } },
        ],
      },
      limit: 0,
    }),
    payload.find({
      collection: 'email-log',
      where: {
        and: [
          { organization: { equals: orgId } },
          { status: { equals: 'bounced' } },
        ],
      },
      limit: 0,
    }),
  ])

  const totalSent = sentResult.totalDocs
  const totalFailed = failedResult.totalDocs
  const totalBounced = bouncedResult.totalDocs
  const total = totalSent + totalFailed + totalBounced
  const bounceRate = total > 0 ? Math.round((totalBounced / total) * 100) : 0

  return {
    totalSent,
    totalFailed,
    totalBounced,
    total,
    bounceRate,
  }
}
