import { NextRequest, NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe'
import { getPayloadClient } from '@/lib/get-payload'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
