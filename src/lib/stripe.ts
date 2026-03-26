import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is niet geconfigureerd')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

export const PLANS = {
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    name: 'Starter',
    features: ['1 gebruiker', '50 facturen/maand'],
  },
  professional: {
    priceId: process.env.STRIPE_PRICE_PRO || '',
    name: 'Professional',
    features: ['5 gebruikers', 'Onbeperkt facturen', 'Strippenkaarten'],
  },
  enterprise: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    name: 'Enterprise',
    features: ['Onbeperkt gebruikers', 'Alles', 'Prioriteit support'],
  },
} as const

export type PlanKey = keyof typeof PLANS
