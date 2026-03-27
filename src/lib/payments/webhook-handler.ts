import { getPayloadClient } from '@/lib/get-payload'
import type { PaymentEvent, PaymentStatus } from './types'

// Status progression — never regress
const STATUS_PRIORITY: Record<PaymentStatus, number> = {
  open: 0,
  pending: 1,
  paid: 10,
  failed: 5,
  expired: 5,
  cancelled: 5,
  refunded: 11,
}

function mapEventToTransactionStatus(eventType: PaymentEvent['type']): PaymentStatus {
  switch (eventType) {
    case 'payment_paid':
      return 'paid'
    case 'payment_failed':
      return 'failed'
    case 'payment_expired':
      return 'expired'
    case 'payment_cancelled':
      return 'cancelled'
    case 'refund_completed':
      return 'refunded'
  }
}

export async function processPaymentEvent(
  event: PaymentEvent,
  transactionExternalId: string,
): Promise<void> {
  const payload = await getPayloadClient()

  // Find the transaction by external ID
  const { docs } = await payload.find({
    collection: 'transactions',
    where: {
      externalId: { equals: transactionExternalId },
    },
    limit: 1,
    overrideAccess: true,
  })

  if (docs.length === 0) {
    console.error(`Transaction niet gevonden voor externalId: ${transactionExternalId}`)
    return
  }

  const transaction = docs[0] as Record<string, unknown>
  const currentStatus = transaction.status as PaymentStatus
  const newStatus = mapEventToTransactionStatus(event.type)

  // Don't regress status
  if (STATUS_PRIORITY[newStatus] <= STATUS_PRIORITY[currentStatus]) {
    return
  }

  const now = new Date().toISOString()

  // Update transaction
  const transactionUpdate: Record<string, unknown> = {
    status: newStatus,
  }

  if (newStatus === 'paid') {
    transactionUpdate.paidAt = now
  } else if (newStatus === 'failed') {
    transactionUpdate.failedAt = now
  } else if (newStatus === 'refunded') {
    transactionUpdate.refundedAt = now
    if (event.amountInCents) {
      transactionUpdate.refundAmountInCents = event.amountInCents
    }
  }

  await payload.update({
    collection: 'transactions',
    id: transaction.id as string,
    data: transactionUpdate,
    overrideAccess: true,
  })

  // Update linked invoice status
  const invoiceId = typeof transaction.invoice === 'object'
    ? (transaction.invoice as Record<string, unknown>).id as string
    : transaction.invoice as string

  if (newStatus === 'paid') {
    await payload.update({
      collection: 'invoices',
      id: invoiceId,
      data: {
        status: 'paid',
        paidAt: now,
      },
      overrideAccess: true,
    })
  }

  // Create audit log entry
  const orgId = typeof transaction.organization === 'object'
    ? (transaction.organization as Record<string, unknown>).id as string
    : transaction.organization as string

  try {
    await payload.create({
      collection: 'audit-log',
      data: {
        organization: orgId,
        action: 'payment',
        collection: 'invoices',
        documentId: invoiceId,
        details: {
          provider: transaction.providerType,
          externalId: transactionExternalId,
          status: newStatus,
          amountInCents: event.amountInCents,
        },
      },
      overrideAccess: true,
    })
  } catch {
    // Audit log failure should not break payment processing
  }
}
