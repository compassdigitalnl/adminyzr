import type { Access } from 'payload'

type Role = 'owner' | 'admin' | 'accountant' | 'member' | 'viewer'

/**
 * Factory: geeft toegang als de gebruiker een van de opgegeven rollen heeft.
 */
export const hasRole = (...roles: Role[]): Access => {
  return ({ req: { user } }) => {
    if (!user) return false
    return roles.includes(user.role as Role)
  }
}

/**
 * Combineert rolcheck met tenant isolation.
 * Gebruiker moet de juiste rol hebben EN binnen eigen organisatie zoeken.
 */
export const hasRoleInTenant = (...roles: Role[]): Access => {
  return ({ req: { user } }) => {
    if (!user) return false
    if (!roles.includes(user.role as Role)) return false

    const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
    if (!orgId) return false

    return {
      organization: {
        equals: orgId,
      },
    }
  }
}
