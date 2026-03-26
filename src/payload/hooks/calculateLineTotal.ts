import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Berekent lineTotal voor InvoiceItems.
 * lineTotal = quantity * unitPrice (alles in centen).
 */
export const calculateLineTotal: CollectionBeforeValidateHook = async ({
  data,
}) => {
  if (!data) return data

  const quantity = data.quantity ?? 0
  const unitPrice = data.unitPrice ?? 0

  return {
    ...data,
    lineTotal: Math.round(quantity * unitPrice),
  }
}
