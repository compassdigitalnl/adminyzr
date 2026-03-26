import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

const VAT_RATES: Record<string, number> = {
  '21': 0.21,
  '9': 0.09,
  '0': 0,
  'exempt': 0,
}

/**
 * Herberekent subtotal, vatAmount en totalIncVat op de gekoppelde factuur
 * wanneer een InvoiceItem wordt aangemaakt, gewijzigd of verwijderd.
 */
async function recalculate(invoiceId: string | number | { id: string }, req: any) {
  const id = typeof invoiceId === 'object' ? invoiceId.id : String(invoiceId)

  const { docs: items } = await req.payload.find({
    collection: 'invoice-items',
    where: {
      invoice: { equals: id },
    },
    limit: 500,
    req,
  })

  let subtotal = 0
  let vatAmount = 0

  for (const item of items) {
    const lineTotal = item.lineTotal ?? 0
    subtotal += lineTotal

    const vatRateKey = String(item.vatRate ?? '21')
    const vatRate = VAT_RATES[vatRateKey] ?? 0.21
    vatAmount += Math.round(lineTotal * vatRate)
  }

  const totalIncVat = subtotal + vatAmount

  await req.payload.update({
    collection: 'invoices',
    id,
    data: {
      subtotal,
      vatAmount,
      totalIncVat,
    },
    req,
  })
}

/**
 * Hook voor afterChange op InvoiceItems.
 */
export const recalculateInvoiceAfterItemChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  if (doc.invoice) {
    await recalculate(doc.invoice, req)
  }
  return doc
}

/**
 * Hook voor afterDelete op InvoiceItems.
 */
export const recalculateInvoiceAfterItemDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  if (doc.invoice) {
    await recalculate(doc.invoice, req)
  }
  return doc
}
