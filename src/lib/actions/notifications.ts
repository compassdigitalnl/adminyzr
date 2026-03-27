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

export async function getNotifications() {
  const { payload, user, orgId } = await getAuthUser()
  if (!orgId) return { docs: [], unreadCount: 0 }

  const { docs } = await payload.find({
    collection: 'notifications',
    where: {
      and: [
        { organization: { equals: orgId } },
        {
          or: [
            { user: { equals: user.id } },
            { user: { exists: false } },
          ],
        },
      ],
    },
    sort: '-createdAt',
    limit: 20,
  })

  const unreadCount = docs.filter((d) => !(d as Record<string, unknown>).isRead).length

  return { docs, unreadCount }
}

export async function markNotificationRead(id: string) {
  const { payload } = await getAuthUser()

  await payload.update({
    collection: 'notifications',
    id,
    data: { isRead: true },
  })
}

export async function markAllRead() {
  const { payload, user, orgId } = await getAuthUser()
  if (!orgId) return

  const { docs } = await payload.find({
    collection: 'notifications',
    where: {
      organization: { equals: orgId },
      isRead: { equals: false },
      or: [
        { user: { equals: user.id } },
        { user: { exists: false } },
      ],
    },
    limit: 100,
  })

  for (const doc of docs) {
    await payload.update({
      collection: 'notifications',
      id: doc.id as string,
      data: { isRead: true },
    })
  }
}

// Helper to create notifications from server-side code
export async function createNotification(data: {
  organizationId: string
  userId?: string
  title: string
  message?: string
  type?: string
  link?: string
  relatedCollection?: string
  relatedDocumentId?: string
}) {
  const payload = await getPayloadClient()

  await payload.create({
    collection: 'notifications',
    data: {
      organization: data.organizationId,
      user: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link,
      relatedCollection: data.relatedCollection,
      relatedDocumentId: data.relatedDocumentId,
    },
    overrideAccess: true,
  })
}
