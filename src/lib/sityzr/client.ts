/**
 * Sityzr API Client
 *
 * Integreert Adminyzr als white-label module binnen Sityzr tenants.
 * Sityzr kan via deze client facturatie-data opvragen en aanmaken.
 */

const SITYZR_API_URL = process.env.SITYZR_API_URL || ''
const SITYZR_API_KEY = process.env.SITYZR_API_KEY || ''

type SityzrRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
}

async function sityzrFetch<T>(path: string, options?: SityzrRequestOptions): Promise<T> {
  if (!SITYZR_API_URL || !SITYZR_API_KEY) {
    throw new Error('Sityzr integratie is niet geconfigureerd')
  }

  const res = await fetch(`${SITYZR_API_URL}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Authorization': `Bearer ${SITYZR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    throw new Error(`Sityzr API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

/**
 * Sync tenant data from Sityzr to Adminyzr.
 */
export async function syncTenantFromSityzr(sityzrTenantId: string) {
  return sityzrFetch<{ id: string; name: string; domain: string }>(`/api/tenants/${sityzrTenantId}`)
}

/**
 * Push invoice data to Sityzr (for displaying in Sityzr dashboard).
 */
export async function pushInvoiceToSityzr(sityzrTenantId: string, invoiceData: {
  invoiceNumber: string
  clientName: string
  totalIncVat: number
  status: string
  pdfUrl?: string
}) {
  return sityzrFetch(`/api/tenants/${sityzrTenantId}/invoices`, {
    method: 'POST',
    body: invoiceData,
  })
}

/**
 * Verify an incoming Sityzr webhook signature.
 */
export function verifySityzrWebhook(payload: string, signature: string): boolean {
  const secret = process.env.SITYZR_WEBHOOK_SECRET || ''
  if (!secret) return false

  // HMAC-SHA256 verification
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
