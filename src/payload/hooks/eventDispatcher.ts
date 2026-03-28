import type { CollectionAfterChangeHook } from 'payload'
import { getOrganizationId } from '../../lib/tenant'
import { dispatchWebhook, type WebhookEventType } from '../../lib/webhook-dispatcher'

/**
 * Event dispatcher hook — triggers webhooks en notifications bij collection changes.
 * Voeg toe als afterChange hook naast logAfterChange.
 */

// Map collection + operation/status change → webhook event
function getWebhookEvent(
  slug: string,
  operation: string,
  doc: Record<string, unknown>,
  previousDoc?: Record<string, unknown>,
): WebhookEventType | null {
  if (slug === 'invoices') {
    if (operation === 'create') return 'invoice.created'
    if (operation === 'update' && previousDoc) {
      const oldStatus = previousDoc.status as string
      const newStatus = doc.status as string
      if (oldStatus !== newStatus) {
        if (newStatus === 'sent') return 'invoice.sent'
        if (newStatus === 'paid') return 'invoice.paid'
        if (newStatus === 'overdue') return 'invoice.overdue'
      }
    }
  }

  if (slug === 'clients') {
    if (operation === 'create') return 'client.created'
    if (operation === 'update') return 'client.updated'
  }

  if (slug === 'quotes') {
    if (operation === 'update' && previousDoc) {
      const newStatus = doc.status as string
      const oldStatus = previousDoc.status as string
      if (oldStatus !== newStatus) {
        if (newStatus === 'accepted') return 'quote.accepted'
        if (newStatus === 'rejected') return 'quote.rejected'
      }
    }
  }

  if (slug === 'transactions') {
    if (operation === 'update' && doc.status === 'paid') {
      return 'payment.received'
    }
  }

  if (slug === 'purchase-invoices') {
    if (operation === 'create') return 'purchase_invoice.created'
  }

  return null
}

// Map webhook event → notification
function getNotification(
  event: WebhookEventType,
  doc: Record<string, unknown>,
): { title: string; message?: string; type: string; link?: string } | null {
  switch (event) {
    case 'invoice.paid':
      return {
        title: `Factuur ${doc.invoiceNumber || ''} is betaald`,
        type: 'payment',
        link: '/invoices',
      }
    case 'invoice.overdue':
      return {
        title: `Factuur ${doc.invoiceNumber || ''} is verlopen`,
        type: 'warning',
        link: '/invoices',
      }
    case 'payment.received':
      return {
        title: 'Betaling ontvangen',
        message: `Bedrag: €${((doc.amountInCents as number) / 100).toFixed(2)}`,
        type: 'payment',
        link: '/bank',
      }
    case 'quote.accepted':
      return {
        title: `Offerte ${doc.quoteNumber || ''} geaccepteerd`,
        type: 'success',
        link: '/quotes',
      }
    case 'purchase_invoice.created':
      return {
        title: `Nieuwe inkoopfactuur: ${doc.supplier || 'Onbekend'}`,
        type: 'invoice',
        link: '/purchase-invoices',
      }
    default:
      return null
  }
}

export const dispatchEvents: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  collection,
  previousDoc,
}) => {
  // Skip collections that don't produce events
  const eventCollections = ['invoices', 'clients', 'quotes', 'transactions', 'purchase-invoices']
  if (!eventCollections.includes(collection.slug)) return doc

  try {
    const orgId = getOrganizationId(req) || (
      typeof doc.organization === 'object'
        ? (doc.organization as Record<string, unknown>).id as string
        : doc.organization as string
    )

    if (!orgId) return doc

    const event = getWebhookEvent(collection.slug, operation, doc, previousDoc)
    if (!event) return doc

    // Dispatch webhook (fire and forget)
    dispatchWebhook(String(orgId), event, {
      id: doc.id,
      collection: collection.slug,
      ...doc,
    }).catch(() => {})

    // Create notification
    const notification = getNotification(event, doc)
    if (notification) {
      req.payload.create({
        collection: 'notifications',
        data: {
          organization: orgId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          relatedCollection: collection.slug,
          relatedDocumentId: String(doc.id),
        },
        overrideAccess: true,
      }).catch(() => {})
    }
  } catch {
    // Event dispatch should never break the main operation
  }

  return doc
}
