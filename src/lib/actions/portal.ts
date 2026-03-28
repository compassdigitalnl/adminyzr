'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { revalidatePath } from 'next/cache'

export async function getPortalInvoices(clientId: string) {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'invoices',
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { in: ['sent', 'paid', 'overdue'] } },
        { deletedAt: { exists: false } },
      ],
    },
    sort: '-issueDate',
    limit: 100,
    depth: 0,
  })

  return result.docs.map((doc) => {
    const inv = doc as Record<string, unknown>
    return {
      id: String(doc.id),
      invoiceNumber: inv.invoiceNumber as string,
      issueDate: inv.issueDate as string,
      dueDate: inv.dueDate as string,
      totalIncVat: inv.totalIncVat as number,
      status: inv.status as string,
    }
  })
}

export async function getPortalQuotes(clientId: string) {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'quotes',
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { in: ['sent', 'accepted', 'rejected'] } },
        { deletedAt: { exists: false } },
      ],
    },
    sort: '-issueDate',
    limit: 100,
    depth: 0,
  })

  return result.docs.map((doc) => {
    const q = doc as Record<string, unknown>
    return {
      id: String(doc.id),
      quoteNumber: q.quoteNumber as string,
      issueDate: q.issueDate as string,
      validUntil: q.validUntil as string,
      totalIncVat: q.totalIncVat as number,
      status: q.status as string,
    }
  })
}

export async function acceptPortalQuote(clientId: string, quoteId: string) {
  const payload = await getPayloadClient()

  // Verify the quote belongs to this client
  const quote = await payload.findByID({
    collection: 'quotes',
    id: quoteId,
    depth: 0,
  })

  const quoteData = quote as Record<string, unknown>
  const quoteClientId = typeof quoteData.client === 'object' && quoteData.client !== null
    ? (quoteData.client as Record<string, unknown>).id
    : quoteData.client

  if (quoteClientId !== clientId) {
    throw new Error('Unauthorized')
  }

  if (quoteData.status !== 'sent') {
    throw new Error('Quote cannot be accepted in its current status')
  }

  await payload.update({
    collection: 'quotes',
    id: quoteId,
    data: { status: 'accepted' },
  })

  revalidatePath('/[locale]/portal/quotes', 'page')
  return { success: true }
}

export async function rejectPortalQuote(clientId: string, quoteId: string) {
  const payload = await getPayloadClient()

  // Verify the quote belongs to this client
  const quote = await payload.findByID({
    collection: 'quotes',
    id: quoteId,
    depth: 0,
  })

  const quoteData = quote as Record<string, unknown>
  const quoteClientId = typeof quoteData.client === 'object' && quoteData.client !== null
    ? (quoteData.client as Record<string, unknown>).id
    : quoteData.client

  if (quoteClientId !== clientId) {
    throw new Error('Unauthorized')
  }

  if (quoteData.status !== 'sent') {
    throw new Error('Quote cannot be rejected in its current status')
  }

  await payload.update({
    collection: 'quotes',
    id: quoteId,
    data: { status: 'rejected' },
  })

  revalidatePath('/[locale]/portal/quotes', 'page')
  return { success: true }
}

export async function getPortalClient(clientId: string) {
  const payload = await getPayloadClient()

  try {
    const client = await payload.findByID({
      collection: 'clients',
      id: clientId,
      depth: 0,
    })

    const data = client as Record<string, unknown>
    const orgId = typeof data.organization === 'object'
      ? (data.organization as Record<string, unknown>).id
      : data.organization
    return {
      id: client.id,
      companyName: data.companyName as string,
      contactName: data.contactName as string | undefined,
      email: data.email as string,
      organizationId: orgId,
    }
  } catch {
    return null
  }
}
