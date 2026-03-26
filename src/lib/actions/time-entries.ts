'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type TimeEntryFormData = {
  client: string
  punchCard?: string
  description: string
  date: string
  duration: number // minuten
  billable?: boolean
}

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization
  return { payload, user, orgId }
}

export async function getTimeEntries(params?: {
  search?: string
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
}) {
  const { payload, orgId } = await getAuthUser()

  const conditions: Where[] = [
    { organization: { equals: orgId } },
  ]

  if (params?.dateFrom) {
    conditions.push({ date: { greater_than_equal: params.dateFrom } })
  }
  if (params?.dateTo) {
    conditions.push({ date: { less_than_equal: params.dateTo } })
  }
  if (params?.search) {
    conditions.push({
      or: [{ description: { contains: params.search } }],
    })
  }

  const result = await payload.find({
    collection: 'time-entries',
    where: { and: conditions },
    page: params?.page || 1,
    limit: params?.limit || 50,
    sort: '-date',
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

export async function getTimeStats() {
  const { payload, orgId } = await getAuthUser()

  // This week
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
  startOfWeek.setHours(0, 0, 0, 0)

  const thisWeek = await payload.find({
    collection: 'time-entries',
    where: {
      and: [
        { organization: { equals: orgId } },
        { date: { greater_than_equal: startOfWeek.toISOString() } },
      ],
    },
    limit: 500,
  })

  type EntryDoc = Record<string, unknown>
  const entries = thisWeek.docs as unknown as EntryDoc[]
  const totalMinutes = entries.reduce((sum, e) => sum + ((e.duration as number) || 0), 0)
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + ((e.duration as number) || 0), 0)

  return {
    totalMinutes,
    billableMinutes,
    nonBillableMinutes: totalMinutes - billableMinutes,
  }
}

export async function createTimeEntry(data: TimeEntryFormData) {
  const { payload, user, orgId } = await getAuthUser()

  const result = await payload.create({
    collection: 'time-entries',
    data: {
      organization: orgId,
      user: user.id,
      client: data.client,
      punchCard: data.punchCard || undefined,
      description: data.description,
      date: data.date,
      duration: data.duration,
      billable: data.billable ?? true,
    },
  })

  // If linked to punch card, update used credits
  if (data.punchCard) {
    const card = await payload.findByID({ collection: 'punch-cards', id: data.punchCard }) as Record<string, unknown>
    const usedCredits = ((card.usedCredits as number) || 0) + data.duration
    const totalCredits = (card.totalCredits as number) || 0

    await payload.update({
      collection: 'punch-cards',
      id: data.punchCard,
      data: {
        usedCredits,
        status: usedCredits >= totalCredits ? 'depleted' : 'active',
      },
    })
  }

  revalidatePath('/[locale]/time-tracking', 'page')
  return result
}

export async function updateTimeEntry(id: string, data: Partial<TimeEntryFormData>) {
  const payload = await getPayloadClient()
  const result = await payload.update({
    collection: 'time-entries',
    id,
    data,
  })
  revalidatePath('/[locale]/time-tracking', 'page')
  return result
}

export async function deleteTimeEntry(id: string) {
  const payload = await getPayloadClient()
  await payload.delete({ collection: 'time-entries', id })
  revalidatePath('/[locale]/time-tracking', 'page')
}
