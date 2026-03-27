import Stripe from 'stripe'
import type {
  PaymentProvider,
  InvoicePaymentData,
  PaymentLinkOptions,
  PaymentLinkResult,
  PaymentEvent,
  PaymentStatusResult,
  RefundResult,
} from '../types'

export class StripeInvoiceProvider implements PaymentProvider {
  private stripe: Stripe

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey)
  }

  async createPaymentLink(
    invoice: InvoicePaymentData,
    options?: PaymentLinkOptions,
  ): Promise<PaymentLinkResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['ideal', 'card', 'bancontact'],
      line_items: [
        {
          price_data: {
            currency: (invoice.currency || 'EUR').toLowerCase(),
            product_data: {
              name: `Factuur ${invoice.invoiceNumber}`,
              description: invoice.description,
            },
            unit_amount: invoice.totalIncVatCents,
          },
          quantity: 1,
        },
      ],
      customer_email: invoice.clientEmail,
      success_url: `${invoice.redirectUrl}&payment_status=success`,
      cancel_url: `${invoice.redirectUrl}&payment_status=cancelled`,
      metadata: {
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        ...invoice.metadata,
        ...options?.metadata,
      },
      locale: 'nl',
      ...(options?.expiresAt
        ? { expires_at: Math.floor(options.expiresAt.getTime() / 1000) }
        : {}),
    })

    return {
      url: session.url || '',
      externalId: session.id,
      provider: 'stripe',
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
    }
  }

  async handleWebhook(
    payload: string | Record<string, unknown>,
    signature?: string,
  ): Promise<PaymentEvent> {
    // For Stripe, the webhook handler needs the raw body and signature
    // The webhook secret is validated in the route handler
    const event = typeof payload === 'string'
      ? JSON.parse(payload) as Stripe.Event
      : payload as unknown as Stripe.Event

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        return {
          type: 'payment_paid',
          externalId: session.id,
          amountInCents: session.amount_total || undefined,
          metadata: session.metadata as Record<string, string> | undefined,
          rawEvent: event,
        }
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        return {
          type: 'payment_expired',
          externalId: session.id,
          metadata: session.metadata as Record<string, string> | undefined,
          rawEvent: event,
        }
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        return {
          type: 'refund_completed',
          externalId: charge.payment_intent as string,
          amountInCents: charge.amount_refunded,
          rawEvent: event,
        }
      }
      default:
        throw new Error(`Onbekend Stripe event type: ${event.type}`)
    }
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatusResult> {
    const session = await this.stripe.checkout.sessions.retrieve(externalId)

    let status: PaymentStatusResult['status'] = 'open'
    if (session.payment_status === 'paid') {
      status = 'paid'
    } else if (session.status === 'expired') {
      status = 'expired'
    } else if (session.status === 'open') {
      status = 'open'
    }

    return {
      status,
      paidAt: status === 'paid' ? new Date() : undefined,
      amountInCents: session.amount_total || undefined,
    }
  }

  async refundPayment(
    externalId: string,
    amountInCents?: number,
  ): Promise<RefundResult> {
    // Get the payment intent from the session
    const session = await this.stripe.checkout.sessions.retrieve(externalId)
    const paymentIntentId = session.payment_intent as string

    if (!paymentIntentId) {
      return { success: false }
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountInCents ? { amount: amountInCents } : {}),
    })

    return {
      success: refund.status === 'succeeded' || refund.status === 'pending',
      refundId: refund.id,
      amountInCents: refund.amount,
    }
  }
}
