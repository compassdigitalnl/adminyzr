import { getPayloadClient } from '@/lib/get-payload'
import crypto from 'crypto'
import type { NextRequest } from 'next/server'

export type ApiKeyContext = {
  organizationId: string
  scopes: string[]
  keyId: string
}

/**
 * Validate an API key from request headers.
 * Returns the API key context if valid, null otherwise.
 *
 * Usage:
 *   const apiKey = await validateApiKey(request)
 *   if (!apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyContext | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ak_')) return null

  const rawKey = authHeader.replace('Bearer ', '')
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'api-keys',
    where: {
      and: [
        { keyHash: { equals: keyHash } },
        { isActive: { equals: true } },
        { revokedAt: { exists: false } },
      ],
    },
    limit: 1,
  })

  if (docs.length === 0) return null

  const apiKey = docs[0] as Record<string, unknown>

  // Check expiration
  const expiresAt = apiKey.expiresAt as string | undefined
  if (expiresAt && new Date(expiresAt) < new Date()) return null

  // Update last used timestamp and usage count
  await payload.update({
    collection: 'api-keys',
    id: apiKey.id as string,
    data: {
      lastUsedAt: new Date().toISOString(),
      usageCount: ((apiKey.usageCount as number) || 0) + 1,
    },
  })

  const org = apiKey.organization as Record<string, unknown> | string
  const organizationId = typeof org === 'object' ? (org.id as string) : org

  return {
    organizationId,
    scopes: (apiKey.scope as string[]) || [],
    keyId: apiKey.id as string,
  }
}

/**
 * Check if an API key has a specific scope.
 */
export function hasScope(context: ApiKeyContext, scope: string): boolean {
  return context.scopes.includes('full:access') || context.scopes.includes(scope)
}
