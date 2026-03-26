'use server'

import { getPayloadClient } from '@/lib/get-payload'
import crypto from 'crypto'

export async function requestPortalAccess(email: string) {
  const payload = await getPayloadClient()

  // Always return success to not reveal if email exists
  try {
    const result = await payload.find({
      collection: 'clients',
      where: {
        and: [
          { email: { equals: email } },
          { deletedAt: { exists: false } },
        ],
      },
      limit: 1,
    })

    if (result.docs.length > 0) {
      const client = result.docs[0]
      const token = crypto.randomUUID()
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await payload.update({
        collection: 'clients',
        id: client.id,
        data: {
          portalToken: token,
          portalTokenExpiry: expiry.toISOString(),
        },
      })

      // In production, send an email with the magic link.
      // For now, log the token so it can be used in development.
      console.log(`[Portal] Magic link token for ${email}: ${token}`)
    }
  } catch (error) {
    // Swallow errors to not reveal information
    console.error('[Portal] Error in requestPortalAccess:', error)
  }

  return { success: true }
}

export async function verifyPortalToken(token: string) {
  const payload = await getPayloadClient()

  try {
    const result = await payload.find({
      collection: 'clients',
      where: {
        and: [
          { portalToken: { equals: token } },
          { portalTokenExpiry: { greater_than: new Date().toISOString() } },
          { deletedAt: { exists: false } },
        ],
      },
      limit: 1,
      depth: 1,
    })

    if (result.docs.length === 0) {
      return null
    }

    const client = result.docs[0]

    // Clear the token after use (single-use)
    await payload.update({
      collection: 'clients',
      id: client.id,
      data: {
        portalToken: '',
        portalTokenExpiry: undefined,
      } as Record<string, unknown>,
    })

    return {
      id: client.id,
      companyName: (client as Record<string, unknown>).companyName as string,
      contactName: (client as Record<string, unknown>).contactName as string | undefined,
      email: (client as Record<string, unknown>).email as string,
    }
  } catch (error) {
    console.error('[Portal] Error in verifyPortalToken:', error)
    return null
  }
}
