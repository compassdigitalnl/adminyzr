import createMollieClient, { type MollieClient, PaymentStatus as MollieStatus, Locale } from '@mollie/api-client'
import type {
  PaymentProvider,
  InvoicePaymentData,
  PaymentLinkOptions,
  PaymentLinkResult,
  PaymentEvent,
  PaymentStatusResult,
  RefundResult,
} from '../types'

export class MollieProvider implements PaymentProvider {
  private client: MollieClient

  constructor(apiKey: string) {
    this.client = createMollieClient({ apiKey })
  }

  async createPaymentLink(
    invoice: InvoicePaymentData,
    options?: PaymentLinkOptions,
  ): Promise<PaymentLinkResult> {
    const result = await this.client.payments.create({
      amount: {
        currency: invoice.currency || 'EUR',
        value: (invoice.totalIncVatCents / 100).toFixed(2),
      },
      description: `Factuur ${invoice.invoiceNumber}`,
      redirectUrl: invoice.redirectUrl,
      webhookUrl: invoice.webhookUrl,
      metadata: {
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        ...invoice.metadata,
        ...options?.metadata,
      },
      locale: Locale.nl_NL,
      ...(options?.expiresAt ? { expiresAt: options.expiresAt.toISOString() } : {}),
    })

    // The create method returns a Payment object
    const payment = result as unknown as {
      id: string
      _links: { checkout?: { href: string } }
      expiresAt?: string
    }

    return {
      url: payment._links?.checkout?.href || '',
      externalId: payment.id,
      provider: 'mollie',
      expiresAt: payment.expiresAt ? new Date(payment.expiresAt) : undefined,
    }
  }

  async handleWebhook(
    payload: string | Record<string, unknown>,
  ): Promise<PaymentEvent> {
    // Mollie sends only { id: 'tr_xxx' } in the POST body
    let paymentId: string
    if (typeof payload === 'string') {
      const params = new URLSearchParams(payload)
      paymentId = params.get('id') || ''
    } else {
      paymentId = (payload.id as string) || ''
    }

    if (!paymentId) {
      throw new Error('Geen payment ID in Mollie webhook')
    }

    // Fetch the actual payment from Mollie API (this IS the verification)
    const result = await this.client.payments.get(paymentId)
    const payment = result as unknown as {
      id: string
      status: string
      amount: { value: string }
      metadata: Record<string, string> | null
    }

    const eventType = this.mapMollieStatus(payment.status as MollieStatus)

    return {
      type: eventType,
      externalId: payment.id,
      amountInCents: Math.round(parseFloat(payment.amount.value) * 100),
      metadata: payment.metadata || undefined,
      rawEvent: payment,
    }
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatusResult> {
    const result = await this.client.payments.get(externalId)
    const payment = result as unknown as {
      status: string
      paidAt?: string
      amount: { value: string }
      method?: string
    }

    return {
      status: this.mapMollieStatusToPaymentStatus(payment.status as MollieStatus),
      paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      amountInCents: Math.round(parseFloat(payment.amount.value) * 100),
      method: payment.method,
    }
  }

  async refundPayment(
    externalId: string,
    amountInCents?: number,
  ): Promise<RefundResult> {
    const paymentResult = await this.client.payments.get(externalId)
    const payment = paymentResult as unknown as { amount: { currency: string; value: string } }

    // Determine refund amount — use provided amount or full payment amount
    const refundAmountCents = amountInCents || Math.round(parseFloat(payment.amount.value) * 100)

    const refundResult = await this.client.paymentRefunds.create({
      paymentId: externalId,
      amount: {
        currency: payment.amount.currency,
        value: (refundAmountCents / 100).toFixed(2),
      },
    })

    const refund = refundResult as unknown as { id: string; amount: { value: string } }

    return {
      success: true,
      refundId: refund.id,
      amountInCents: Math.round(parseFloat(refund.amount.value) * 100),
    }
  }

  private mapMollieStatus(status: MollieStatus): PaymentEvent['type'] {
    switch (status) {
      case MollieStatus.paid:
        return 'payment_paid'
      case MollieStatus.failed:
        return 'payment_failed'
      case MollieStatus.expired:
        return 'payment_expired'
      case MollieStatus.canceled:
        return 'payment_cancelled'
      default:
        return 'payment_failed'
    }
  }

  private mapMollieStatusToPaymentStatus(status: MollieStatus): PaymentStatusResult['status'] {
    switch (status) {
      case MollieStatus.open:
        return 'open'
      case MollieStatus.pending:
        return 'pending'
      case MollieStatus.paid:
        return 'paid'
      case MollieStatus.failed:
        return 'failed'
      case MollieStatus.expired:
        return 'expired'
      case MollieStatus.canceled:
        return 'cancelled'
      default:
        return 'pending'
    }
  }
}
