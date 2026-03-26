import type { CollectionBeforeValidateHook } from 'payload'
import { getOrganizationId } from '../../lib/tenant'

/**
 * Zet automatisch de organization op basis van de ingelogde gebruiker.
 * Voorkomt dat een gebruiker data voor een andere tenant kan aanmaken.
 */
export const setOrganization: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (!data) return data

  // Alleen bij aanmaken of als organization niet gezet is
  if (operation === 'create' || !data.organization) {
    const orgId = getOrganizationId(req)
    if (orgId) {
      return {
        ...data,
        organization: orgId,
      }
    }
  }

  return data
}
