import type { Access } from 'payload'

/**
 * Filtert queries zodat alleen documenten van de eigen organisatie worden getoond.
 * Admins in de Payload admin UI krijgen volledige toegang.
 */
export const tenantIsolation: Access = ({ req: { user } }) => {
  if (!user) return false

  // Payload super-admins (owner role) in admin panel krijgen alles te zien
  // voor debugging. In de frontend is het altijd gefilterd.
  if (user.role === 'owner') return true

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization

  if (!orgId) return false

  return {
    organization: {
      equals: orgId,
    },
  }
}

/**
 * Variant voor collections waar het organization veld optioneel is (bijv. AuditLog).
 */
export const tenantIsolationOptional: Access = ({ req: { user } }) => {
  if (!user) return false

  if (user.role === 'owner') return true

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization

  if (!orgId) return false

  return {
    or: [
      { organization: { equals: orgId } },
      { organization: { exists: false } },
    ],
  }
}
