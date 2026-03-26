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
  return { payload, user, orgId }
}

export async function getOrganization() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')
  const org = await payload.findByID({ collection: 'organizations', id: orgId as string })
  return org as unknown as Record<string, unknown> & { id: string }
}

export type OrganizationFormData = {
  name: string
  kvkNumber?: string
  vatNumber?: string
  iban?: string
  address?: {
    street?: string
    houseNumber?: string
    postalCode?: string
    city?: string
    country?: string
  }
  contact?: {
    email?: string
    phone?: string
    website?: string
  }
  invoiceSettings?: {
    prefix?: string
    defaultPaymentTermDays?: number
    defaultVatRate?: number
    footerText?: string
  }
}

export async function updateOrganization(data: OrganizationFormData) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const result = await payload.update({
    collection: 'organizations',
    id: orgId as string,
    data,
  })

  revalidatePath('/[locale]/settings', 'page')
  return result
}

export async function getCurrentUser() {
  const { user } = await getAuthUser()
  return user as unknown as Record<string, unknown> & { id: string }
}

export async function updateProfile(data: { name?: string; phone?: string; locale?: string }) {
  const { payload, user } = await getAuthUser()

  const result = await payload.update({
    collection: 'users',
    id: user.id,
    data,
  })

  revalidatePath('/[locale]/settings', 'page')
  return result
}
