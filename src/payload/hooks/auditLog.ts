import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { getOrganizationId } from '../../lib/tenant'

/**
 * Logt create/update operaties naar de AuditLog collection.
 * Gebruik als afterChange hook op elke collection die geaudit moet worden.
 */
export const logAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  collection,
  previousDoc,
}) => {
  // Voorkom oneindige loop: log niet de audit-log zelf
  if (collection.slug === 'audit-log') return doc

  try {
    const changes: Record<string, { before: unknown; after: unknown }> = {}

    if (operation === 'update' && previousDoc) {
      for (const key of Object.keys(doc)) {
        if (['updatedAt', 'createdAt'].includes(key)) continue
        if (JSON.stringify(doc[key]) !== JSON.stringify(previousDoc[key])) {
          changes[key] = {
            before: previousDoc[key],
            after: doc[key],
          }
        }
      }
    }

    await req.payload.create({
      collection: 'audit-log',
      data: {
        user: req.user?.id,
        organization: getOrganizationId(req),
        action: operation === 'create' ? 'create' : 'update',
        collection: collection.slug,
        documentId: String(doc.id),
        changes: operation === 'update' ? changes : undefined,
        ipAddress: req.headers?.get?.('x-forwarded-for') || undefined,
        userAgent: req.headers?.get?.('user-agent') || undefined,
      },
      req,
    })
  } catch (error) {
    // Audit log mag nooit de hoofdoperatie blokkeren
    console.error('[AuditLog] Fout bij loggen:', error)
  }

  return doc
}

/**
 * Logt delete operaties (soft deletes).
 */
export const logAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
  collection,
}) => {
  if (collection.slug === 'audit-log') return doc

  try {
    await req.payload.create({
      collection: 'audit-log',
      data: {
        user: req.user?.id,
        organization: getOrganizationId(req),
        action: 'delete',
        collection: collection.slug,
        documentId: String(doc.id),
        ipAddress: req.headers?.get?.('x-forwarded-for') || undefined,
        userAgent: req.headers?.get?.('user-agent') || undefined,
      },
      req,
    })
  } catch (error) {
    console.error('[AuditLog] Fout bij loggen:', error)
  }

  return doc
}
