import type { Access } from 'payload'

/**
 * Geeft toegang als de gebruiker ingelogd is.
 */
export const isAuthenticated: Access = ({ req: { user } }) => {
  return Boolean(user)
}
