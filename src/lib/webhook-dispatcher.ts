import crypto from 'crypto'
import { getPayloadClient } from '@/lib/get-payload'

export type WebhookEventType =
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'client.created'
  | 'client.updated'
  | 'payment.received'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'purchase_invoice.created'

/**
 * Dispatch a webhook event to all subscribed endpoints for an organization.
 * Runs asynchronously — does not block the caller.
 */
export async function dispatchWebhook(
  organizationId: string,
  event: WebhookEventType,
  data: Record<string, unknown>,
) {
  try {
    const payload = await getPayloadClient()

    // Find active subscriptions for this event
    const { docs } = await payload.find({
      collection: 'webhook-subscriptions',
      where: {
        organization: { equals: organizationId },
        isActive: { equals: true },
        events: { contains: event },
        deletedAt: { exists: false },
      },
      limit: 50,
      overrideAccess: true,
    })

    if (docs.length === 0) return

    const eventPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    const body = JSON.stringify(eventPayload)

    // Send to all subscribers (fire and forget with retry)
    for (const rawSub of docs) {
      const sub = rawSub as Record<string, unknown>
      deliverWebhook(
        payload,
        sub.id as string,
        sub.url as string,
        sub.secret as string,
        body,
        event,
        organizationId,
      ).catch(() => {
        // Delivery failures are logged, don't propagate
      })
    }
  } catch {
    // Dispatcher failure should never break the calling operation
  }
}

async function deliverWebhook(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  subscriptionId: string,
  url: string,
  secret: string,
  body: string,
  event: string,
  organizationId: string,
  attempt = 1,
) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  const maxRetries = 3
  const retryDelays = [0, 5000, 30000] // 0s, 5s, 30s

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': `${Date.now()}-${attempt}`,
        'User-Agent': 'Adminyzr-Webhooks/1.0',
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (response.ok) {
      // Success — update last delivery time and reset fail count
      await payload.update({
        collection: 'webhook-subscriptions',
        id: subscriptionId,
        data: { lastDeliveryAt: new Date().toISOString(), failCount: 0 },
        overrideAccess: true,
      })

      // Log successful delivery
      await payload.create({
        collection: 'webhook-log',
        data: {
          direction: 'outgoing',
          source: 'webhook-dispatcher',
          method: 'POST',
          url,
          statusCode: response.status,
          organization: organizationId,
          requestBody: { event, attempt },
        },
        overrideAccess: true,
      })
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    // Log failure
    await payload.create({
      collection: 'webhook-log',
      data: {
        direction: 'outgoing',
        source: 'webhook-dispatcher',
        method: 'POST',
        url,
        statusCode: 0,
        error: error instanceof Error ? error.message : 'Delivery failed',
        organization: organizationId,
        requestBody: { event, attempt },
      },
      overrideAccess: true,
    }).catch(() => {})

    // Retry
    if (attempt < maxRetries) {
      const delay = retryDelays[attempt] || 30000
      setTimeout(
        () => deliverWebhook(payload, subscriptionId, url, secret, body, event, organizationId, attempt + 1),
        delay,
      )
    } else {
      // Max retries reached — increment fail count
      const sub = await payload.findByID({
        collection: 'webhook-subscriptions',
        id: subscriptionId,
        overrideAccess: true,
      }) as Record<string, unknown>

      const failCount = ((sub.failCount as number) || 0) + 1

      await payload.update({
        collection: 'webhook-subscriptions',
        id: subscriptionId,
        data: {
          failCount,
          // Auto-disable after 10 consecutive failures
          ...(failCount >= 10 ? { isActive: false } : {}),
        },
        overrideAccess: true,
      })
    }
  }
}
