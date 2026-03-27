'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import crypto from 'crypto'

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  return { payload, user }
}

/**
 * Generate a new TOTP secret and QR code for setup.
 * Returns the secret (to store) and QR code data URL (to display).
 */
export async function setupTwoFactor(): Promise<{
  secret: string
  qrCodeDataUrl: string
  otpauthUrl: string
}> {
  const { user } = await getAuthUser()

  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: 'Adminyzr',
    label: (user.email as string) || 'user',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })

  const otpauthUrl = totp.toString()
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

  return {
    secret: secret.base32,
    qrCodeDataUrl,
    otpauthUrl,
  }
}

/**
 * Verify TOTP code and enable 2FA for the user.
 */
export async function enableTwoFactor(secret: string, token: string): Promise<{ success: boolean; error?: string; backupCodes?: string[] }> {
  const { payload, user } = await getAuthUser()

  const totp = new OTPAuth.TOTP({
    issuer: 'Adminyzr',
    label: (user.email as string) || 'user',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  const delta = totp.validate({ token, window: 1 })

  if (delta === null) {
    return { success: false, error: 'Ongeldige verificatiecode' }
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  )

  // Store secret, enable 2FA, and save backup codes
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(backupCodes),
    },
  })

  return { success: true, backupCodes }
}

/**
 * Regenerate backup codes.
 */
export async function regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
  const { payload, user } = await getAuthUser()

  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  )

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      twoFactorBackupCodes: JSON.stringify(backupCodes),
    },
  })

  return { backupCodes }
}

/**
 * Disable 2FA for the current user.
 */
export async function disableTwoFactor(): Promise<{ success: boolean }> {
  const { payload, user } = await getAuthUser()

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      twoFactorSecret: '',
      twoFactorEnabled: false,
    },
  })

  return { success: true }
}

/**
 * Verify a TOTP code against the user's stored secret.
 */
export async function verifyTwoFactorCode(userId: string, token: string): Promise<boolean> {
  const payload = await getPayloadClient()

  const user = await payload.findByID({
    collection: 'users',
    id: userId,
  }) as Record<string, unknown>

  const secret = user.twoFactorSecret as string
  if (!secret) return false

  const totp = new OTPAuth.TOTP({
    issuer: 'Adminyzr',
    label: (user.email as string) || 'user',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  const delta = totp.validate({ token, window: 1 })
  if (delta !== null) return true

  // Check backup codes
  const backupCodesJson = user.twoFactorBackupCodes as string
  if (backupCodesJson) {
    try {
      const backupCodes = JSON.parse(backupCodesJson) as string[]
      const codeIndex = backupCodes.indexOf(token.toUpperCase())
      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1)
        await payload.update({
          collection: 'users',
          id: userId,
          data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
          overrideAccess: true,
        })
        return true
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  return false
}
