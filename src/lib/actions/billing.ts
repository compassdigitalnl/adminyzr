'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { getStripeClient, PLANS, type PlanKey } from '@/lib/stripe'

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization
  return { payload, user, orgId }
}

export async function createCheckoutSession(plan: string): Promise<{ url: string | null; error?: string }> {
  try {
    const { payload, user, orgId } = await getAuthUser()
    if (!orgId) throw new Error('Geen organisatie')

    const planKey = plan as PlanKey
    const planConfig = PLANS[planKey]
    if (!planConfig) {
      return { url: null, error: 'Invalid plan' }
    }

    // Get the organization to check for existing Stripe customer
    const org = await payload.findByID({
      collection: 'organizations',
      id: orgId as string,
    })

    const orgData = org as unknown as Record<string, unknown>
    let stripeCustomerId = orgData.stripeCustomerId as string | undefined

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customer = await getStripeClient().customers.create({
        email: user.email,
        name: orgData.name as string,
        metadata: {
          organizationId: orgId as string,
          userId: user.id,
        },
      })
      stripeCustomerId = customer.id

      // Save the Stripe customer ID to the organization
      await payload.update({
        collection: 'organizations',
        id: orgId as string,
        data: {
          stripeCustomerId: customer.id,
        } as Record<string, unknown>,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3600'

    const session = await getStripeClient().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/nl/settings?billing=success`,
      cancel_url: `${appUrl}/nl/settings?billing=cancelled`,
      metadata: {
        organizationId: orgId as string,
        plan: planKey,
      },
    })

    return { url: session.url }
  } catch (error) {
    console.error('Checkout session error:', error)
    return { url: null, error: 'Failed to create checkout session' }
  }
}

export async function createPortalSession(): Promise<{ url: string | null; error?: string }> {
  try {
    const { payload, orgId } = await getAuthUser()
    if (!orgId) throw new Error('Geen organisatie')

    const org = await payload.findByID({
      collection: 'organizations',
      id: orgId as string,
    })

    const orgData = org as unknown as Record<string, unknown>
    const stripeCustomerId = orgData.stripeCustomerId as string | undefined

    if (!stripeCustomerId) {
      return { url: null, error: 'No Stripe customer found' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3600'

    const session = await getStripeClient().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/nl/settings`,
    })

    return { url: session.url }
  } catch (error) {
    console.error('Portal session error:', error)
    return { url: null, error: 'Failed to create portal session' }
  }
}

export async function getSubscriptionStatus(): Promise<{
  status: string
  plan: string | null
  currentPeriodEnd: string | null
}> {
  try {
    const { payload, orgId } = await getAuthUser()
    if (!orgId) throw new Error('Geen organisatie')

    const org = await payload.findByID({
      collection: 'organizations',
      id: orgId as string,
    })

    const orgData = org as unknown as Record<string, unknown>

    return {
      status: (orgData.subscriptionStatus as string) || 'none',
      plan: (orgData.subscriptionPlan as string) || null,
      currentPeriodEnd: null,
    }
  } catch {
    return { status: 'none', plan: null, currentPeriodEnd: null }
  }
}
