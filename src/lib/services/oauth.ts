/**
 * OAuth2 SSO helpers for Google and Microsoft.
 * Uses standard OAuth2 Authorization Code flow with fetch — no external libraries.
 */

// ---------------------------------------------------------------------------
// Google OAuth2
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

function getGoogleRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3600'
  return `${appUrl}/api/auth/callback/google`
}

export function getGoogleAuthUrl(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function getGoogleTokens(code: string): Promise<{
  access_token: string
  id_token?: string
  refresh_token?: string
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${body}`)
  }

  return res.json()
}

export async function getGoogleUser(accessToken: string): Promise<{
  id: string
  email: string
  name: string
  picture?: string
}> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Google userinfo failed: ${res.status}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Microsoft OAuth2
// ---------------------------------------------------------------------------

function getMicrosoftTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID || 'common'
}

function getMicrosoftAuthUrl(): string {
  return `https://login.microsoftonline.com/${getMicrosoftTenantId()}/oauth2/v2.0/authorize`
}

function getMicrosoftTokenUrl(): string {
  return `https://login.microsoftonline.com/${getMicrosoftTenantId()}/oauth2/v2.0/token`
}

const MICROSOFT_GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me'

function getMicrosoftRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3600'
  return `${appUrl}/api/auth/callback/microsoft`
}

export function getMicrosoftConsentUrl(): string | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  if (!clientId) return null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getMicrosoftRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
    prompt: 'select_account',
  })

  return `${getMicrosoftAuthUrl()}?${params.toString()}`
}

export async function getMicrosoftTokens(code: string): Promise<{
  access_token: string
  id_token?: string
  refresh_token?: string
}> {
  const res = await fetch(getMicrosoftTokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: getMicrosoftRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Microsoft token exchange failed: ${res.status} ${body}`)
  }

  return res.json()
}

export async function getMicrosoftUser(accessToken: string): Promise<{
  id: string
  email: string
  name: string
  picture?: string
}> {
  const res = await fetch(MICROSOFT_GRAPH_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Microsoft Graph /me failed: ${res.status}`)
  }

  const data = await res.json()

  return {
    id: data.id,
    email: data.mail || data.userPrincipalName,
    name: data.displayName || '',
    picture: undefined, // Microsoft Graph doesn't return a direct URL in /me
  }
}
