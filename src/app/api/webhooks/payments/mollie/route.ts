import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'
import { getPaymentProvider } from '@/lib/payments/factory'
import { processPaymentEvent } from '@/lib/payments/webhook-handler'

export async function POST(request: NextRequest) {
  const payload = await getPayloadClient()
  const body = await request.text()

  // Extract payment ID from body
  const params = new URLSearchParams(body)
  const molliePaymentId = params.get('id')

  if (!molliePaymentId) {
    await logWebhook(payload, 400, 'Missing payment ID')
    return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
  }

  try {
    // Find the transaction by external ID to get org context
    const { docs } = await payload.find({
      collection: 'transactions',
      where: {
        externalId: { equals: molliePaymentId },
        providerType: { equals: 'mollie' },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      await logWebhook(payload, 404, `Transaction not found: ${molliePaymentId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const transaction = docs[0] as Record<string, unknown>
    const orgId = typeof transaction.organization === 'object'
      ? (transaction.organization as Record<string, unknown>).id as string
      : transaction.organization as string
    const providerId = typeof transaction.paymentProvider === 'object'
      ? (transaction.paymentProvider as Record<string, unknown>).id as string
      : transaction.paymentProvider as string

    // Get the Mollie provider with the org's API key
    const { provider } = await getPaymentProvider(orgId, providerId)

    // Handle webhook — fetches payment from Mollie API (verification)
    const event = await provider.handleWebhook(body)

    // Process the payment event (update transaction + invoice)
    await processPaymentEvent(event, molliePaymentId)

    // Log successful webhook
    await logWebhook(payload, 200, undefined, orgId, { paymentId: molliePaymentId, eventType: event.type })

    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Mollie webhook error:', errorMessage)
    await logWebhook(payload, 500, errorMessage)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function logWebhook(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  statusCode: number,
  error?: string,
  organizationId?: string,
  data?: Record<string, unknown>,
) {
  try {
    await payload.create({
      collection: 'webhook-log',
      data: {
        direction: 'incoming',
        source: 'mollie',
        method: 'POST',
        url: '/api/webhooks/payments/mollie',
        statusCode,
        ...(error ? { error } : {}),
        ...(organizationId ? { organization: organizationId } : {}),
        ...(data ? { requestBody: data } : {}),
      },
      overrideAccess: true,
    })
  } catch {
    // Logging failure should not break the webhook
  }
}
