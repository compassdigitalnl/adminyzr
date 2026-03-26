'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'

export async function generateInvoicePdf(invoiceId: string) {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  if (!orgId) throw new Error('Geen organisatie')

  // Fetch invoice with client populated
  const invoice = await payload.findByID({
    collection: 'invoices',
    id: invoiceId,
    depth: 1,
  }) as Record<string, unknown>

  // Fetch organization
  const org = await payload.findByID({
    collection: 'organizations',
    id: orgId as string,
  }) as Record<string, unknown>

  // Fetch invoice items
  const { docs: items } = await payload.find({
    collection: 'invoice-items',
    where: { invoice: { equals: invoiceId } },
    sort: 'sortOrder',
    limit: 100,
  })

  // Build client info
  const client = invoice.client as Record<string, unknown> | undefined
  const clientAddress = client?.address as Record<string, string> | undefined
  const orgAddress = org.address as Record<string, string> | undefined
  const orgContact = org.contact as Record<string, string> | undefined
  const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined

  const pdfData = {
    invoiceNumber: (invoice.invoiceNumber as string) || '',
    issueDate: (invoice.issueDate as string) || new Date().toISOString(),
    dueDate: (invoice.dueDate as string) || new Date().toISOString(),
    reference: invoice.reference as string | undefined,
    status: (invoice.type as string) || 'invoice',
    orgName: (org.name as string) || '',
    orgAddress: orgAddress
      ? [orgAddress.street, orgAddress.houseNumber, orgAddress.postalCode, orgAddress.city]
          .filter(Boolean)
          .join(' ')
      : undefined,
    orgKvk: org.kvkNumber as string | undefined,
    orgVat: org.vatNumber as string | undefined,
    orgIban: org.iban as string | undefined,
    orgEmail: orgContact?.email,
    orgPhone: orgContact?.phone,
    clientName: (client?.companyName as string) || '',
    clientAddress: clientAddress
      ? [clientAddress.street, clientAddress.houseNumber, clientAddress.postalCode, clientAddress.city]
          .filter(Boolean)
          .join(' ')
      : undefined,
    clientKvk: client?.kvkNumber as string | undefined,
    clientVat: client?.vatNumber as string | undefined,
    items: items.map((item) => {
      const i = item as Record<string, unknown>
      return {
        description: (i.description as string) || '',
        quantity: (i.quantity as number) || 0,
        unitPrice: (i.unitPrice as number) || 0,
        vatRate: (i.vatRate as string) || '21',
        lineTotal: (i.lineTotal as number) || 0,
      }
    }),
    subtotal: (invoice.subtotal as number) || 0,
    vatAmount: (invoice.vatAmount as number) || 0,
    totalIncVat: (invoice.totalIncVat as number) || 0,
    notes: invoice.notes as string | undefined,
    footerText: invoiceSettings?.footerText as string | undefined,
  }

  // Return the data - the actual PDF rendering happens in the API route
  // because @react-pdf/renderer needs to be called in a route handler
  return pdfData
}
