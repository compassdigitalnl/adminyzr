'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

export type CreateApiKeyData = {
  name: string
  scope: string[]
  expiresAt?: string
}

export async function getApiKeys() {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.find({
    collection: 'api-keys',
    where: {
      and: [
        { organization: { equals: orgId } },
        { revokedAt: { exists: false } },
      ],
    },
    sort: '-createdAt',
    limit: 50,
  })

  return result.docs as unknown as Array<Record<string, unknown> & { id: string }>
}

export async function createApiKey(data: CreateApiKeyData) {
  const { payload, user, orgId } = await getAuthUser()

  const result = await payload.create({
    collection: 'api-keys',
    data: {
      organization: orgId,
      name: data.name,
      scope: data.scope,
      expiresAt: data.expiresAt || undefined,
      createdBy: user.id,
    },
  })

  revalidatePath('/[locale]/settings', 'page')

  // Return the result with raw key (only available at creation)
  return result as Record<string, unknown>
}

export async function revokeApiKey(id: string) {
  const { payload } = await getAuthUser()

  await payload.update({
    collection: 'api-keys',
    id,
    data: {
      isActive: false,
      revokedAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/settings', 'page')
}
