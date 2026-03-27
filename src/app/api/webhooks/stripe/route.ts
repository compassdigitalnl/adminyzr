import { NextRequest, NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe'
import { getPayloadClient } from '@/lib/get-payload'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    // Log unsigned request
    try {
      const p = await getPayloadClient()
      await p.create({
        collection: 'webhook-log',
        data: {
          direction: 'incoming',
          source: 'stripe',
          method: 'POST',
          url: '/api/webhooks/stripe',
          statusCode: 400,
          error: 'Missing signature',
        },
        overrideAccess: true,
      })
    } catch {
      // Logging failure should not break the webhook
    }
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripeClient = getStripeClient()
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', errorMessage)
    // Log invalid signature
    try {
      const p = await getPayloadClient()
      await p.create({
        collection: 'webhook-log',
        data: {
          direction: 'incoming',
          source: 'stripe',
          method: 'POST',
          url: '/api/webhooks/stripe',
          statusCode: 400,
          error: `Invalid signature: ${errorMessage}`,
        },
        overrideAccess: true,
      })
    } catch {
      // Logging failure should not break the webhook
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await getPayloadClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.organizationId
        const plan = session.metadata?.plan

        if (organizationId && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id

          await payload.update({
            collection: 'organizations',
            id: organizationId,
            data: {
              stripeCustomerId: session.customer as string,
              subscriptionId,
              subscriptionStatus: 'active',
              subscriptionPlan: plan || 'starter',
            } as Record<string, unknown>,
            overrideAccess: true,
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id

        // Find the organization by Stripe customer ID
        const orgs = await payload.find({
          collection: 'organizations',
          where: {
            stripeCustomerId: { equals: customerId },
          },
          limit: 1,
          overrideAccess: true,
        })

        if (orgs.docs.length > 0) {
          const org = orgs.docs[0]
          let status: string = 'none'

          switch (subscription.status) {
            case 'active':
              status = 'active'
              break
            case 'trialing':
              status = 'trialing'
              break
            case 'past_due':
              status = 'past_due'
              break
            case 'canceled':
            case 'unpaid':
              status = 'canceled'
              break
            default:
              status = 'none'
          }

          await payload.update({
            collection: 'organizations',
            id: org.id as string,
            data: {
              subscriptionId: subscription.id,
              subscriptionStatus: status,
            } as Record<string, unknown>,
            overrideAccess: true,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id

        const orgs = await payload.find({
          collection: 'organizations',
          where: {
            stripeCustomerId: { equals: customerId },
          },
          limit: 1,
          overrideAccess: true,
        })

        if (orgs.docs.length > 0) {
          const org = orgs.docs[0]
          await payload.update({
            collection: 'organizations',
            id: org.id as string,
            data: {
              subscriptionStatus: 'canceled',
              subscriptionId: '',
            } as Record<string, unknown>,
            overrideAccess: true,
          })
        }
        break
      }
    }
  } catch (error) {
    console.error('Stripe webhook processing error:', error)
    // Log failed webhook processing
    try {
      await payload.create({
        collection: 'webhook-log',
        data: {
          direction: 'incoming',
          source: 'stripe',
          method: 'POST',
          url: '/api/webhooks/stripe',
          requestBody: event as unknown as Record<string, unknown>,
          statusCode: 500,
          error: error instanceof Error ? error.message : 'Webhook processing failed',
        },
        overrideAccess: true,
      })
    } catch {
      // Logging failure should not break the webhook
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  // Log successful webhook processing
  try {
    // Try to extract organization ID from event metadata
    let organizationId: string | undefined
    const eventObj = event.data.object as unknown as Record<string, unknown>
    const metadata = eventObj.metadata as Record<string, string> | undefined
    if (metadata?.organizationId) {
      organizationId = metadata.organizationId
    } else if (eventObj.customer) {
      // Try to find org by Stripe customer ID
      const customerId = typeof eventObj.customer === 'string' ? eventObj.customer : undefined
      if (customerId) {
        const orgs = await payload.find({
          collection: 'organizations',
          where: { stripeCustomerId: { equals: customerId } },
          limit: 1,
          overrideAccess: true,
        })
        if (orgs.docs.length > 0) {
          organizationId = orgs.docs[0].id as string
        }
      }
    }

    await payload.create({
      collection: 'webhook-log',
      data: {
        direction: 'incoming',
        source: 'stripe',
        method: 'POST',
        url: '/api/webhooks/stripe',
        requestBody: event as unknown as Record<string, unknown>,
        statusCode: 200,
        ...(organizationId ? { organization: organizationId } : {}),
      },
      overrideAccess: true,
    })
  } catch {
    // Logging failure should not break the webhook
  }

  return NextResponse.json({ received: true })
}
