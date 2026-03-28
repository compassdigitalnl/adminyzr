/**
 * Feature gating — plan-based toegangscontrole.
 *
 * Gebruik:
 *   const allowed = canUseFeature(org, 'projects')
 *   const limit = getLimit(org, 'usersPerOrg')
 *   const usage = await checkUsage(orgId, 'invoicesPerMonth')
 */

export type Plan = 'starter' | 'professional' | 'enterprise' | 'none'

export type Feature =
  | 'projects'
  | 'punchCards'
  | 'subscriptions'
  | 'bankReconciliation'
  | 'apiAccess'
  | 'bulkActions'
  | 'customEmailTemplates'
  | 'ecommerce'
  | 'payroll'
  | 'ocrProcessing'
  | 'multiCurrency'
  | 'customBranding'

export type Limit =
  | 'usersPerOrg'
  | 'invoicesPerMonth'
  | 'clientsTotal'
  | 'productsTotal'
  | 'storagePerOrgMB'

const FEATURE_MATRIX: Record<Plan, Set<Feature>> = {
  none: new Set([]),
  starter: new Set([
    'ocrProcessing',
  ]),
  professional: new Set([
    'projects',
    'punchCards',
    'subscriptions',
    'bankReconciliation',
    'apiAccess',
    'bulkActions',
    'customEmailTemplates',
    'ocrProcessing',
    'multiCurrency',
    'customBranding',
  ]),
  enterprise: new Set([
    'projects',
    'punchCards',
    'subscriptions',
    'bankReconciliation',
    'apiAccess',
    'bulkActions',
    'customEmailTemplates',
    'ecommerce',
    'payroll',
    'ocrProcessing',
    'multiCurrency',
    'customBranding',
  ]),
}

const LIMITS: Record<Plan, Record<Limit, number>> = {
  none: { usersPerOrg: 1, invoicesPerMonth: 10, clientsTotal: 10, productsTotal: 10, storagePerOrgMB: 100 },
  starter: { usersPerOrg: 1, invoicesPerMonth: 50, clientsTotal: 100, productsTotal: 50, storagePerOrgMB: 500 },
  professional: { usersPerOrg: 5, invoicesPerMonth: Infinity, clientsTotal: Infinity, productsTotal: Infinity, storagePerOrgMB: 5000 },
  enterprise: { usersPerOrg: Infinity, invoicesPerMonth: Infinity, clientsTotal: Infinity, productsTotal: Infinity, storagePerOrgMB: 50000 },
}

export function getPlan(org: Record<string, unknown>): Plan {
  const plan = (org.subscriptionPlan as string) || 'none'
  const status = (org.subscriptionStatus as string) || 'none'

  // Active or trialing subscriptions get their plan
  if (status === 'active' || status === 'trialing') {
    if (plan in FEATURE_MATRIX) return plan as Plan
  }

  return 'none'
}

export function canUseFeature(org: Record<string, unknown>, feature: Feature): boolean {
  const plan = getPlan(org)
  return FEATURE_MATRIX[plan].has(feature)
}

export function getLimit(org: Record<string, unknown>, limit: Limit): number {
  const plan = getPlan(org)
  return LIMITS[plan][limit]
}

export function getPlanFeatures(plan: Plan): Feature[] {
  return Array.from(FEATURE_MATRIX[plan])
}

export function getPlanLimits(plan: Plan): Record<Limit, number> {
  return LIMITS[plan]
}

/**
 * Check if a usage limit is reached.
 * Returns { allowed, current, limit, percentage }
 */
export async function checkUsage(
  payload: { find: Function; count: Function },
  orgId: string,
  org: Record<string, unknown>,
  type: Limit,
): Promise<{ allowed: boolean; current: number; limit: number; percentage: number }> {
  const limit = getLimit(org, type)
  let current = 0

  if (type === 'usersPerOrg') {
    const result = await payload.count({
      collection: 'users',
      where: { organization: { equals: orgId }, deletedAt: { exists: false } },
      overrideAccess: true,
    })
    current = result.totalDocs
  } else if (type === 'invoicesPerMonth') {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const result = await payload.count({
      collection: 'invoices',
      where: {
        organization: { equals: orgId },
        createdAt: { greater_than_equal: startOfMonth },
        deletedAt: { exists: false },
      },
      overrideAccess: true,
    })
    current = result.totalDocs
  } else if (type === 'clientsTotal') {
    const result = await payload.count({
      collection: 'clients',
      where: { organization: { equals: orgId }, deletedAt: { exists: false } },
      overrideAccess: true,
    })
    current = result.totalDocs
  } else if (type === 'productsTotal') {
    const result = await payload.count({
      collection: 'products',
      where: { organization: { equals: orgId }, deletedAt: { exists: false } },
      overrideAccess: true,
    })
    current = result.totalDocs
  }

  return {
    allowed: current < limit,
    current,
    limit,
    percentage: limit === Infinity ? 0 : Math.round((current / limit) * 100),
  }
}
