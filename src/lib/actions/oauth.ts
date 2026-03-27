'use server'

import { getGoogleAuthUrl, getMicrosoftConsentUrl } from '@/lib/services/oauth'

/**
 * Returns the OAuth consent URLs for configured providers.
 * Only returns a URL when the corresponding env vars are set.
 */
export async function getOAuthUrls(): Promise<{
  googleUrl: string | null
  microsoftUrl: string | null
}> {
  return {
    googleUrl: getGoogleAuthUrl(),
    microsoftUrl: getMicrosoftConsentUrl(),
  }
}
