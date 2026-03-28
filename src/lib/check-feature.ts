'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { canUseFeature, getLimit, checkUsage, type Feature, type Limit } from '@/lib/feature-gates'

/**
 * Server action to check if the current org can use a feature.
 * Use in server components and actions before rendering/executing gated features.
 */
export async function requireFeature(feature: Feature): Promise<void> {
  const org = await getCurrentOrg()
  if (!org) return // No org = skip check (e.g. during setup)

  if (!canUseFeature(org, feature)) {
    throw new Error(`Deze functie is niet beschikbaar in je huidige abonnement. Upgrade naar een hoger plan.`)
  }
}

/**
 * Check feature availability without throwing.
 */
export async function isFeatureAvailable(feature: Feature): Promise<boolean> {
  const org = await getCurrentOrg()
  if (!org) return true
  return canUseFeature(org, feature)
}

/**
 * Check usage limit and throw if exceeded.
 */
export async function requireWithinLimit(limit: Limit): Promise<void> {
  const org = await getCurrentOrg()
  if (!org) return

  const payload = await getPayloadClient()
  const orgId = typeof org.id === 'object' ? String(org.id) : String(org.id)
  const usage = await checkUsage(payload as unknown as { find: Function; count: Function }, orgId, org, limit)

  if (!usage.allowed) {
    throw new Error(
      `Limiet bereikt: ${usage.current}/${usage.limit === Infinity ? '∞' : usage.limit}. Upgrade je abonnement voor meer capaciteit.`
    )
  }
}

/**
 * Get usage stats for display in UI.
 */
export async function getUsageStats(): Promise<Record<string, { current: number; limit: number; percentage: number }>> {
  const org = await getCurrentOrg()
  if (!org) return {}

  const payload = await getPayloadClient()
  const orgId = String(org.id)

  const limits: Limit[] = ['usersPerOrg', 'invoicesPerMonth', 'clientsTotal', 'productsTotal']
  const stats: Record<string, { current: number; limit: number; percentage: number }> = {}

  for (const limit of limits) {
    const usage = await checkUsage(payload as unknown as { find: Function; count: Function }, orgId, org, limit)
    stats[limit] = { current: usage.current, limit: usage.limit, percentage: usage.percentage }
  }

  return stats
}

/**
 * Get list of features available for current org's plan.
 */
export async function getAvailableFeatures(): Promise<Record<Feature, boolean>> {
  const org = await getCurrentOrg()
  const features: Feature[] = [
    'projects', 'punchCards', 'subscriptions', 'bankReconciliation',
    'apiAccess', 'bulkActions', 'customEmailTemplates', 'ecommerce',
    'payroll', 'ocrProcessing', 'multiCurrency', 'customBranding',
  ]

  const result: Record<string, boolean> = {}
  for (const f of features) {
    result[f] = org ? canUseFeature(org, f) : true
  }
  return result as Record<Feature, boolean>
}

async function getCurrentOrg(): Promise<Record<string, unknown> | null> {
  try {
    const payload = await getPayloadClient()
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return null

    const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
    if (!user) return null

    const orgId = user.organization && typeof user.organization === 'object'
      ? (user.organization as Record<string, unknown>).id
      : user.organization
    if (!orgId) return null

    return await payload.findByID({
      collection: 'organizations',
      id: orgId as string,
      overrideAccess: true,
    }) as Record<string, unknown>
  } catch {
    return null
  }
}
