'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { paymentProviderConfigSchema, updatePaymentProviderSchema } from '@/lib/payments/validation'
import { decryptApiKey } from '@/lib/payments/encryption'

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

export async function getPaymentProviders() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const { docs } = await payload.find({
    collection: 'payment-providers',
    where: {
      organization: { equals: orgId },
      deletedAt: { exists: false },
    },
    sort: '-isDefault',
    limit: 20,
  })

  // Strip API keys from response
  return docs.map((doc) => {
    const d = doc as Record<string, unknown>
    return {
      id: d.id,
      name: d.name,
      provider: d.provider,
      isDefault: d.isDefault,
      isActive: d.isActive,
      testMode: d.testMode,
      apiKeyPrefix: d.apiKeyPrefix,
      config: d.config,
      createdAt: d.createdAt,
    }
  })
}

export async function createPaymentProvider(data: {
  name: string
  provider: string
  apiKey: string
  testMode?: boolean
  webhookSecret?: string
  isDefault?: boolean
}) {
  const parsed = paymentProviderConfigSchema.safeParse(data)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const doc = await payload.create({
    collection: 'payment-providers',
    data: {
      organization: orgId,
      name: parsed.data.name,
      provider: parsed.data.provider,
      apiKey: parsed.data.apiKey,
      testMode: parsed.data.testMode,
      webhookSecret: data.webhookSecret,
      isDefault: parsed.data.isDefault,
      isActive: true,
    },
  })

  revalidatePath('/[locale]/settings', 'page')
  return { id: (doc as Record<string, unknown>).id }
}

export async function updatePaymentProvider(
  id: string,
  data: Partial<{
    name: string
    apiKey: string
    testMode: boolean
    webhookSecret: string
    isActive: boolean
  }>,
) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Verify ownership
  const existing = await payload.findByID({
    collection: 'payment-providers',
    id,
  }) as Record<string, unknown>

  const existingOrgId = typeof existing.organization === 'object'
    ? (existing.organization as Record<string, unknown>).id as string
    : existing.organization as string

  if (existingOrgId !== orgId) throw new Error('Geen toegang')

  await payload.update({
    collection: 'payment-providers',
    id,
    data: data as Record<string, unknown>,
  })

  revalidatePath('/[locale]/settings', 'page')
  return { success: true }
}

export async function deletePaymentProvider(id: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Verify ownership
  const existing = await payload.findByID({
    collection: 'payment-providers',
    id,
  }) as Record<string, unknown>

  const existingOrgId = typeof existing.organization === 'object'
    ? (existing.organization as Record<string, unknown>).id as string
    : existing.organization as string

  if (existingOrgId !== orgId) throw new Error('Geen toegang')

  // Soft delete
  await payload.update({
    collection: 'payment-providers',
    id,
    data: { deletedAt: new Date().toISOString(), isActive: false, isDefault: false },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/settings', 'page')
  return { success: true }
}

export async function setDefaultProvider(id: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Verify ownership
  const existing = await payload.findByID({
    collection: 'payment-providers',
    id,
  }) as Record<string, unknown>

  const existingOrgId = typeof existing.organization === 'object'
    ? (existing.organization as Record<string, unknown>).id as string
    : existing.organization as string

  if (existingOrgId !== orgId) throw new Error('Geen toegang')

  await payload.update({
    collection: 'payment-providers',
    id,
    data: { isDefault: true },
  })

  revalidatePath('/[locale]/settings', 'page')
  return { success: true }
}

export async function testProviderConnection(id: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const doc = await payload.findByID({
    collection: 'payment-providers',
    id,
    overrideAccess: true,
  }) as Record<string, unknown>

  const docOrgId = typeof doc.organization === 'object'
    ? (doc.organization as Record<string, unknown>).id as string
    : doc.organization as string

  if (docOrgId !== orgId) throw new Error('Geen toegang')

  const encryptedKey = doc.apiKey as string
  const apiKey = encryptedKey.startsWith('enc:')
    ? decryptApiKey(encryptedKey.slice(4))
    : encryptedKey

  const provider = doc.provider as string

  try {
    if (provider === 'mollie') {
      const { default: createMollieClient } = await import('@mollie/api-client')
      const client = createMollieClient({ apiKey })
      // Try to list payment methods — this validates the API key
      await client.methods.list()
      return { success: true, message: 'Mollie verbinding geslaagd' }
    }

    if (provider === 'stripe') {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(apiKey)
      await stripe.balance.retrieve()
      return { success: true, message: 'Stripe verbinding geslaagd' }
    }

    if (provider === 'multisafepay') {
      // Simple API test via fetch
      const baseUrl = (doc.testMode as boolean)
        ? 'https://testapi.multisafepay.com/v1/json'
        : 'https://api.multisafepay.com/v1/json'
      const res = await fetch(`${baseUrl}/gateways`, {
        headers: { 'api_key': apiKey },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { success: true, message: 'MultiSafePay verbinding geslaagd' }
    }

    return { success: false, message: 'Onbekende provider' }
  } catch (error) {
    return {
      success: false,
      message: `Verbinding mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
    }
  }
}
