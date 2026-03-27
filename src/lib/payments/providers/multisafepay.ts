import type {
  PaymentProvider,
  InvoicePaymentData,
  PaymentLinkOptions,
  PaymentLinkResult,
  PaymentEvent,
  PaymentStatusResult,
  RefundResult,
} from '../types'

const API_BASE = 'https://api.multisafepay.com/v1/json'
const TEST_API_BASE = 'https://testapi.multisafepay.com/v1/json'

export class MultiSafePayProvider implements PaymentProvider {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, testMode = false) {
    this.apiKey = apiKey
    this.baseUrl = testMode ? TEST_API_BASE : API_BASE
  }

  async createPaymentLink(
    invoice: InvoicePaymentData,
    options?: PaymentLinkOptions,
  ): Promise<PaymentLinkResult> {
    const orderId = `inv-${invoice.invoiceId}-${Date.now()}`

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'api_key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'redirect',
        order_id: orderId,
        currency: invoice.currency || 'EUR',
        amount: invoice.totalIncVatCents,
        description: `Factuur ${invoice.invoiceNumber}`,
        payment_options: {
          notification_url: invoice.webhookUrl,
          redirect_url: invoice.redirectUrl,
          cancel_url: `${invoice.redirectUrl}&payment_status=cancelled`,
        },
        customer: {
          email: invoice.clientEmail,
          locale: invoice.locale || 'nl_NL',
        },
        var1: invoice.invoiceId,
        var2: invoice.invoiceNumber,
        ...(options?.metadata || {}),
      }),
    })

    const data = await response.json() as Record<string, unknown>

    if (!data.success) {
      const errorInfo = data.error_info as string || 'Onbekende fout'
      throw new Error(`MultiSafePay fout: ${errorInfo}`)
    }

    const responseData = data.data as Record<string, unknown>

    return {
      url: responseData.payment_url as string,
      externalId: orderId,
      provider: 'multisafepay',
    }
  }

  async handleWebhook(
    payload: string | Record<string, unknown>,
  ): Promise<PaymentEvent> {
    // MultiSafePay sends a notification with transactionid
    let transactionId: string

    if (typeof payload === 'string') {
      const params = new URLSearchParams(payload)
      transactionId = params.get('transactionid') || ''
    } else {
      transactionId = (payload.transactionid as string) || (payload.order_id as string) || ''
    }

    if (!transactionId) {
      throw new Error('Geen transaction ID in MultiSafePay webhook')
    }

    // Fetch the order status from MSP API (verification)
    const status = await this.getPaymentStatus(transactionId)

    const eventType = this.mapStatusToEventType(status.status)

    return {
      type: eventType,
      externalId: transactionId,
      amountInCents: status.amountInCents,
      rawEvent: { transactionId, status },
    }
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatusResult> {
    const response = await fetch(`${this.baseUrl}/orders/${externalId}`, {
      headers: { 'api_key': this.apiKey },
    })

    const data = await response.json() as Record<string, unknown>

    if (!data.success) {
      throw new Error(`MultiSafePay status fout: ${(data.error_info as string) || 'Onbekend'}`)
    }

    const order = data.data as Record<string, unknown>
    const mspStatus = order.status as string

    return {
      status: this.mapMspStatus(mspStatus),
      paidAt: mspStatus === 'completed' ? new Date() : undefined,
      amountInCents: order.amount as number | undefined,
      method: order.payment_details
        ? ((order.payment_details as Record<string, unknown>).type as string)
        : undefined,
    }
  }

  async refundPayment(
    externalId: string,
    amountInCents?: number,
  ): Promise<RefundResult> {
    const body: Record<string, unknown> = {}

    if (amountInCents) {
      body.amount = amountInCents
      body.currency = 'EUR'
    }

    const response = await fetch(`${this.baseUrl}/orders/${externalId}/refunds`, {
      method: 'POST',
      headers: {
        'api_key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json() as Record<string, unknown>

    if (!data.success) {
      return {
        success: false,
      }
    }

    const refundData = data.data as Record<string, unknown>
    return {
      success: true,
      refundId: refundData.refund_id as string,
      amountInCents: amountInCents || undefined,
    }
  }

  private mapStatusToEventType(status: PaymentStatusResult['status']): PaymentEvent['type'] {
    switch (status) {
      case 'paid':
        return 'payment_paid'
      case 'failed':
        return 'payment_failed'
      case 'expired':
        return 'payment_expired'
      case 'cancelled':
        return 'payment_cancelled'
      case 'refunded':
        return 'refund_completed'
      default:
        return 'payment_failed'
    }
  }

  private mapMspStatus(mspStatus: string): PaymentStatusResult['status'] {
    switch (mspStatus) {
      case 'completed':
        return 'paid'
      case 'initialized':
      case 'uncleared':
        return 'pending'
      case 'declined':
        return 'failed'
      case 'expired':
        return 'expired'
      case 'void':
      case 'cancelled':
        return 'cancelled'
      case 'refunded':
        return 'refunded'
      default:
        return 'open'
    }
  }
}
