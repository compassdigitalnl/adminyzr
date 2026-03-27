import { getPayloadClient } from '@/lib/get-payload'
import { decryptApiKey } from './encryption'
import { MollieProvider } from './providers/mollie'
import { StripeInvoiceProvider } from './providers/stripe'
import { MultiSafePayProvider } from './providers/multisafepay'
import type { PaymentProvider, ProviderType } from './types'

export async function getPaymentProvider(
  organizationId: string,
  providerIdOverride?: string,
): Promise<{ provider: PaymentProvider; providerId: string; providerType: ProviderType }> {
  const payload = await getPayloadClient()

  let providerDoc: Record<string, unknown>

  if (providerIdOverride) {
    providerDoc = await payload.findByID({
      collection: 'payment-providers',
      id: providerIdOverride,
      overrideAccess: true,
    }) as Record<string, unknown>
  } else {
    // Find default active provider for organization
    const { docs } = await payload.find({
      collection: 'payment-providers',
      where: {
        organization: { equals: organizationId },
        isDefault: { equals: true },
        isActive: { equals: true },
        deletedAt: { exists: false },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      throw new Error('Geen actieve betaalprovider geconfigureerd')
    }

    providerDoc = docs[0] as Record<string, unknown>
  }

  const encryptedKey = providerDoc.apiKey as string
  const apiKey = encryptedKey.startsWith('enc:')
    ? decryptApiKey(encryptedKey.slice(4))
    : encryptedKey

  const providerType = providerDoc.provider as ProviderType
  const providerId = providerDoc.id as string

  const provider = createProvider(providerType, apiKey)

  return { provider, providerId, providerType }
}

export async function getDefaultProviderForOrg(
  organizationId: string,
): Promise<{ id: string; provider: ProviderType } | null> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'payment-providers',
    where: {
      organization: { equals: organizationId },
      isDefault: { equals: true },
      isActive: { equals: true },
      deletedAt: { exists: false },
    },
    limit: 1,
    overrideAccess: true,
  })

  if (docs.length === 0) return null

  const doc = docs[0] as Record<string, unknown>
  return {
    id: doc.id as string,
    provider: doc.provider as ProviderType,
  }
}

function createProvider(type: ProviderType, apiKey: string): PaymentProvider {
  switch (type) {
    case 'mollie':
      return new MollieProvider(apiKey)
    case 'stripe':
      return new StripeInvoiceProvider(apiKey)
    case 'multisafepay':
      return new MultiSafePayProvider(apiKey)
    default:
      throw new Error(`Onbekende provider: ${type}`)
  }
}
