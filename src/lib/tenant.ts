import type { PayloadRequest } from 'payload'

/**
 * Haal de organization ID op van de ingelogde gebruiker.
 * Gebruik dit in hooks en server-side logic.
 */
export function getOrganizationId(req: PayloadRequest): string | null {
  const user = req.user
  if (!user) return null

  if (typeof user.organization === 'object' && user.organization !== null) {
    return user.organization.id as string
  }

  return (user.organization as string) || null
}

/**
 * Gooit een error als er geen organization gevonden kan worden.
 */
export function requireOrganizationId(req: PayloadRequest): string {
  const orgId = getOrganizationId(req)
  if (!orgId) {
    throw new Error('Organization ID is vereist maar niet gevonden op de huidige gebruiker.')
  }
  return orgId
}
