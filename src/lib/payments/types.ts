export type ProviderType = 'mollie' | 'stripe' | 'multisafepay'

export type PaymentStatus =
  | 'open'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded'

export interface InvoicePaymentData {
  invoiceId: string
  invoiceNumber: string
  totalIncVatCents: number
  currency: string
  description: string
  clientEmail: string
  clientName: string
  redirectUrl: string
  webhookUrl: string
  locale?: string
  metadata?: Record<string, string>
}

export interface PaymentLinkOptions {
  expiresAt?: Date
  methods?: string[]
  metadata?: Record<string, string>
}

export interface PaymentLinkResult {
  url: string
  externalId: string
  provider: ProviderType
  expiresAt?: Date
}

export interface PaymentEvent {
  type:
    | 'payment_paid'
    | 'payment_failed'
    | 'payment_expired'
    | 'payment_cancelled'
    | 'refund_completed'
  externalId: string
  amountInCents?: number
  metadata?: Record<string, string>
  rawEvent: unknown
}

export interface PaymentStatusResult {
  status: PaymentStatus
  paidAt?: Date
  amountInCents?: number
  method?: string
}

export interface RefundResult {
  success: boolean
  refundId?: string
  amountInCents?: number
}

export interface PaymentProvider {
  createPaymentLink(
    invoice: InvoicePaymentData,
    options?: PaymentLinkOptions,
  ): Promise<PaymentLinkResult>

  handleWebhook(
    payload: string | Record<string, unknown>,
    signature?: string,
  ): Promise<PaymentEvent>

  getPaymentStatus(externalId: string): Promise<PaymentStatusResult>

  refundPayment(
    externalId: string,
    amountInCents?: number,
  ): Promise<RefundResult>
}
