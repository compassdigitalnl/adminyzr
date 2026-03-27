'use server'

import crypto from 'crypto'
import { getPayloadClient } from '@/lib/get-payload'
import { getMailTransporter, getFromAddress } from '@/lib/email/transporter'
import { magicLinkEmailHtml, magicLinkEmailText } from '@/lib/email/templates/magic-link-email'

const MAGIC_LINK_EXPIRY_MINUTES = 15

/**
 * Hash a token using SHA-256 so we never store the raw token in the database.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Request a magic link for passwordless login.
 * Always returns success to avoid leaking whether the email exists.
 */
export async function requestMagicLink(email: string): Promise<{ success: boolean }> {
  try {
    const payload = await getPayloadClient()

    // Find user by email
    const result = await payload.find({
      collection: 'users',
      where: {
        and: [
          { email: { equals: email.toLowerCase().trim() } },
          { deletedAt: { exists: false } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (result.docs.length > 0) {
      const user = result.docs[0]

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(token)
      const expiry = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000)

      // Store the hash + expiry on the user record
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          magicLinkHash: tokenHash,
          magicLinkExpiry: expiry.toISOString(),
        },
        overrideAccess: true,
      })

      // Build the magic link URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3600'
      const magicLinkUrl = `${appUrl}/api/auth/magic-link/verify?token=${token}`

      // Send the email
      const transporter = getMailTransporter()
      const emailData = {
        magicLinkUrl,
        expiresInMinutes: MAGIC_LINK_EXPIRY_MINUTES,
      }

      await transporter.sendMail({
        from: `"Adminyzr" <${getFromAddress()}>`,
        to: email.toLowerCase().trim(),
        subject: 'Inloggen bij Adminyzr',
        html: magicLinkEmailHtml(emailData),
        text: magicLinkEmailText(emailData),
      })
    }
  } catch (error) {
    // Swallow errors to not reveal information
    console.error('[MagicLink] Error in requestMagicLink:', error)
  }

  // Always return success
  return { success: true }
}

/**
 * Verify a magic link token.
 * Hashes the token, finds the matching user, checks expiry, and clears the fields.
 * Returns the user on success, or null on failure.
 */
export async function verifyMagicLink(token: string): Promise<{
  id: string
  email: string
} | null> {
  try {
    const payload = await getPayloadClient()
    const tokenHash = hashToken(token)

    // Find user with matching hash that hasn't expired
    const result = await payload.find({
      collection: 'users',
      where: {
        and: [
          { magicLinkHash: { equals: tokenHash } },
          { magicLinkExpiry: { greater_than: new Date().toISOString() } },
          { deletedAt: { exists: false } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (result.docs.length === 0) {
      return null
    }

    const user = result.docs[0]

    // Clear the magic link fields (single-use)
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        magicLinkHash: '',
        magicLinkExpiry: undefined,
      } as Record<string, unknown>,
      overrideAccess: true,
    })

    return {
      id: String(user.id),
      email: user.email as string,
    }
  } catch (error) {
    console.error('[MagicLink] Error in verifyMagicLink:', error)
    return null
  }
}
