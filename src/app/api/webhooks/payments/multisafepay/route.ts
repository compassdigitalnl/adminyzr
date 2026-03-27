import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'
import { getPaymentProvider } from '@/lib/payments/factory'
import { processPaymentEvent } from '@/lib/payments/webhook-handler'

// MultiSafePay sends notifications as GET requests
export async function GET(request: NextRequest) {
  return handleWebhook(request)
}

// Also support POST
export async function POST(request: NextRequest) {
  return handleWebhook(request)
}

async function handleWebhook(request: NextRequest) {
  const payload = await getPayloadClient()

  // MSP sends transactionid as query parameter
  const transactionId = request.nextUrl.searchParams.get('transactionid')

  if (!transactionId) {
    await logWebhook(payload, 400, 'Missing transactionid')
    return NextResponse.json({ error: 'Missing transactionid' }, { status: 400 })
  }

  try {
    // Find the transaction by external ID
    const { docs } = await payload.find({
      collection: 'transactions',
      where: {
        externalId: { equals: transactionId },
        providerType: { equals: 'multisafepay' },
      },
      limit: 1,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      await logWebhook(payload, 404, `Transaction not found: ${transactionId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const transaction = docs[0] as Record<string, unknown>
    const orgId = typeof transaction.organization === 'object'
      ? (transaction.organization as Record<string, unknown>).id as string
      : transaction.organization as string
    const providerId = typeof transaction.paymentProvider === 'object'
      ? (transaction.paymentProvider as Record<string, unknown>).id as string
      : transaction.paymentProvider as string

    // Get the MSP provider with the org's API key
    const { provider } = await getPaymentProvider(orgId, providerId)

    // Handle webhook — fetches order status from MSP API (verification)
    const event = await provider.handleWebhook({ transactionid: transactionId })

    // Process the payment event
    await processPaymentEvent(event, transactionId)

    await logWebhook(payload, 200, undefined, orgId, {
      transactionId,
      eventType: event.type,
    })

    // MSP expects "OK" as response
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('MultiSafePay webhook error:', errorMessage)
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
        source: 'multisafepay',
        method: 'GET',
        url: '/api/webhooks/payments/multisafepay',
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
