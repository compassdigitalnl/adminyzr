import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayloadClient } from '@/lib/get-payload'
import { decryptApiKey } from '@/lib/payments/encryption'
import { StripeInvoiceProvider } from '@/lib/payments/providers/stripe'
import { processPaymentEvent } from '@/lib/payments/webhook-handler'

export async function POST(request: NextRequest) {
  const payload = await getPayloadClient()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    await logWebhook(payload, 400, 'Missing signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    // Parse event without verification first to extract metadata
    const rawEvent = JSON.parse(body) as Stripe.Event
    const eventObj = rawEvent.data.object as unknown as Record<string, unknown>
    const metadata = eventObj.metadata as Record<string, string> | undefined
    const invoiceId = metadata?.invoiceId

    if (!invoiceId) {
      await logWebhook(payload, 400, 'Missing invoiceId in metadata')
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
    }

    // Find transaction to get org context and webhook secret
    const { docs } = await payload.find({
      collection: 'transactions',
      where: {
        invoice: { equals: invoiceId },
        providerType: { equals: 'stripe' },
      },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      await logWebhook(payload, 404, `Transaction not found for invoice: ${invoiceId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const transaction = docs[0] as Record<string, unknown>
    const orgId = typeof transaction.organization === 'object'
      ? (transaction.organization as Record<string, unknown>).id as string
      : transaction.organization as string

    // Get the provider's webhook secret for signature verification
    const providerDoc = transaction.paymentProvider as Record<string, unknown>
    const webhookSecret = providerDoc?.webhookSecret as string | undefined

    if (webhookSecret) {
      // Verify the signature using the org-specific webhook secret
      const encryptedKey = providerDoc.apiKey as string
      const apiKey = encryptedKey.startsWith('enc:')
        ? decryptApiKey(encryptedKey.slice(4))
        : encryptedKey

      const stripe = new Stripe(apiKey)
      try {
        stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch {
        await logWebhook(payload, 400, 'Invalid signature', orgId)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    // Process the event
    const provider = new StripeInvoiceProvider('')  // API key not needed for event parsing
    const event = await provider.handleWebhook(rawEvent as unknown as Record<string, unknown>)

    await processPaymentEvent(event, transaction.externalId as string)

    await logWebhook(payload, 200, undefined, orgId, {
      eventType: rawEvent.type,
      invoiceId,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stripe payment webhook error:', errorMessage)
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
        source: 'stripe-payments',
        method: 'POST',
        url: '/api/webhooks/payments/stripe',
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
