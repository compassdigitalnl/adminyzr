'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type QuoteLineItem = {
  description: string
  quantity: number
  unitPrice: number
  vatRate: '21' | '9' | '0' | 'exempt'
}

export type QuoteFormData = {
  client: string
  issueDate: string
  validUntil: string
  notes?: string
  items: QuoteLineItem[]
}

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  return { payload, user, orgId }
}

export async function getQuotes(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}) {
  const { payload, orgId } = await getAuthUser()

  const conditions: Where[] = [
    { organization: { equals: orgId } },
    { deletedAt: { exists: false } },
  ]

  if (params?.status && params.status !== 'all') {
    conditions.push({ status: { equals: params.status } })
  }

  if (params?.search) {
    conditions.push({
      or: [{ quoteNumber: { contains: params.search } }],
    })
  }

  const result = await payload.find({
    collection: 'quotes',
    where: { and: conditions },
    page: params?.page || 1,
    limit: params?.limit || 25,
    sort: '-createdAt',
    depth: 1,
  })

  return {
    docs: result.docs as unknown as Array<Record<string, unknown> & { id: string }>,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  }
}

const VAT_RATES: Record<string, number> = { '21': 0.21, '9': 0.09, '0': 0, exempt: 0 }

async function generateQuoteNumber(payload: Awaited<ReturnType<typeof getPayloadClient>>, orgId: string) {
  const org = await payload.findByID({ collection: 'organizations', id: orgId }) as Record<string, unknown>
  const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined
  const prefix = (invoiceSettings?.prefix as string) || 'INV'
  const quotePrefix = prefix.replace('INV', 'OFF')
  const year = new Date().getFullYear()

  // Count existing quotes this year to determine number
  const existing = await payload.find({
    collection: 'quotes',
    where: {
      and: [
        { organization: { equals: orgId } },
        { quoteNumber: { contains: `${quotePrefix}-${year}` } },
      ],
    },
    limit: 0,
  })

  const nextNum = existing.totalDocs + 1
  return `${quotePrefix}-${year}-${String(nextNum).padStart(4, '0')}`
}

export async function createQuote(data: QuoteFormData) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const quoteNumber = await generateQuoteNumber(payload, orgId as string)

  let subtotal = 0
  let vatAmount = 0
  for (const item of data.items) {
    const line = Math.round(item.quantity * item.unitPrice)
    subtotal += line
    vatAmount += Math.round(line * (VAT_RATES[item.vatRate] ?? 0.21))
  }

  const result = await payload.create({
    collection: 'quotes',
    data: {
      organization: orgId,
      quoteNumber,
      client: data.client,
      status: 'draft',
      issueDate: data.issueDate,
      validUntil: data.validUntil,
      notes: data.notes,
      subtotal,
      vatAmount,
      totalIncVat: subtotal + vatAmount,
    },
  })

  revalidatePath('/[locale]/quotes', 'page')
  return result
}

export async function updateQuote(id: string, data: QuoteFormData) {
  const { payload } = await getAuthUser()

  const existing = await payload.findByID({ collection: 'quotes', id }) as Record<string, unknown>
  if (existing.status !== 'draft') {
    throw new Error('Alleen concept-offertes kunnen bewerkt worden')
  }

  // Update quote fields
  await payload.update({
    collection: 'quotes',
    id,
    data: {
      client: data.client,
      issueDate: data.issueDate,
      validUntil: data.validUntil,
      notes: data.notes,
      // Recalculate totals
      subtotal: data.items.reduce((sum, i) => sum + Math.round(i.quantity * i.unitPrice), 0),
      vatAmount: data.items.reduce((sum, i) => {
        const rates: Record<string, number> = { '21': 0.21, '9': 0.09, '0': 0, 'exempt': 0 }
        return sum + Math.round(Math.round(i.quantity * i.unitPrice) * (rates[i.vatRate] || 0.21))
      }, 0),
      totalIncVat: data.items.reduce((sum, i) => {
        const rates: Record<string, number> = { '21': 0.21, '9': 0.09, '0': 0, 'exempt': 0 }
        const lineTotal = Math.round(i.quantity * i.unitPrice)
        return sum + lineTotal + Math.round(lineTotal * (rates[i.vatRate] || 0.21))
      }, 0),
      items: data.items.map((item, idx) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        sortOrder: idx,
      })),
    },
  })

  revalidatePath('/[locale]/quotes', 'page')
  return { success: true }
}

export async function updateQuoteStatus(id: string, status: string) {
  const payload = await getPayloadClient()
  const result = await payload.update({
    collection: 'quotes',
    id,
    data: { status },
  })
  revalidatePath('/[locale]/quotes', 'page')
  return result
}

export async function convertQuoteToInvoice(quoteId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const quote = await payload.findByID({ collection: 'quotes', id: quoteId }) as Record<string, unknown>

  if (quote.status !== 'accepted') {
    throw new Error('Alleen geaccepteerde offertes kunnen omgezet worden naar facturen')
  }

  // Generate invoice number
  const org = await payload.findByID({ collection: 'organizations', id: orgId as string }) as Record<string, unknown>
  const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined
  const prefix = (invoiceSettings?.prefix as string) || 'INV'
  const nextNumber = (invoiceSettings?.nextNumber as number) || 1
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`

  await payload.update({
    collection: 'organizations',
    id: orgId as string,
    data: { invoiceSettings: { ...invoiceSettings, nextNumber: nextNumber + 1 } } as Record<string, unknown>,
  })

  const now = new Date()
  const dueDate = new Date(now.getTime() + 30 * 86400000)

  const invoice = await payload.create({
    collection: 'invoices',
    data: {
      organization: orgId,
      invoiceNumber,
      client: quote.client,
      type: 'invoice',
      status: 'draft',
      issueDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      subtotal: quote.subtotal,
      vatAmount: quote.vatAmount,
      totalIncVat: quote.totalIncVat,
      notes: quote.notes,
      linkedQuote: quoteId,
    },
  })

  await payload.update({
    collection: 'quotes',
    id: quoteId,
    data: { convertedToInvoice: invoice.id },
  })

  revalidatePath('/[locale]/quotes', 'page')
  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}

export async function deleteQuote(id: string) {
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'quotes',
    id,
    data: { deletedAt: new Date().toISOString() },
  })
  revalidatePath('/[locale]/quotes', 'page')
}
