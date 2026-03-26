import type { Access } from 'payload'

/**
 * Geeft toegang als de gebruiker role 'owner' of 'admin' heeft.
 */
export const isAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  return user.role === 'owner' || user.role === 'admin'
}

/**
 * Geeft toegang als de gebruiker role 'owner' heeft.
 */
export const isOwner: Access = ({ req: { user } }) => {
  if (!user) return false
  return user.role === 'owner'
}
