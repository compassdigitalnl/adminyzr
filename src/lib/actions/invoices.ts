'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type InvoiceItemFormData = {
  product?: string
  description: string
  quantity: number
  unitPrice: number // in centen
  vatRate: '21' | '9' | '0' | 'exempt'
}

export type InvoiceFormData = {
  client: string
  type?: 'invoice' | 'credit_note'
  issueDate: string
  dueDate: string
  reference?: string
  notes?: string
  items: InvoiceItemFormData[]
}

export async function getInvoices(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}) {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization

  const conditions: Where[] = [
    { organization: { equals: orgId } },
    { deletedAt: { exists: false } },
  ]

  if (params?.status && params.status !== 'all') {
    conditions.push({ status: { equals: params.status } })
  }

  if (params?.search) {
    conditions.push({
      or: [
        { invoiceNumber: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'invoices',
    where,
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

export async function getInvoice(id: string) {
  const payload = await getPayloadClient()
  return payload.findByID({
    collection: 'invoices',
    id,
    depth: 2,
  })
}

export async function getInvoiceItems(invoiceId: string) {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'invoice-items',
    where: {
      invoice: { equals: invoiceId },
    },
    sort: 'sortOrder',
    limit: 100,
    depth: 1,
  })
  return result.docs
}

async function generateInvoiceNumber(payload: Awaited<ReturnType<typeof getPayloadClient>>, orgId: string) {
  const org = await payload.findByID({
    collection: 'organizations',
    id: orgId,
  }) as Record<string, unknown>

  const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined
  const prefix = (invoiceSettings?.prefix as string) || 'INV'
  const nextNumber = (invoiceSettings?.nextNumber as number) || 1
  const year = new Date().getFullYear()

  const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`

  // Increment the counter
  await payload.update({
    collection: 'organizations',
    id: orgId,
    data: {
      invoiceSettings: {
        ...invoiceSettings,
        nextNumber: nextNumber + 1,
      },
    } as Record<string, unknown>,
  })

  return invoiceNumber
}

export async function createInvoice(data: InvoiceFormData) {
  // Feature gate: check invoice limit
  const { requireWithinLimit } = await import('@/lib/check-feature')
  await requireWithinLimit('invoicesPerMonth')

  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  if (!orgId) throw new Error('Geen organisatie gevonden')

  const invoiceNumber = await generateInvoiceNumber(payload, orgId as string)

  // Create the invoice first
  const invoice = await payload.create({
    collection: 'invoices',
    data: {
      organization: orgId,
      invoiceNumber,
      client: data.client,
      type: data.type || 'invoice',
      status: 'draft',
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      reference: data.reference,
      notes: data.notes,
      subtotal: 0,
      vatAmount: 0,
      totalIncVat: 0,
    },
  })

  // Create invoice items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    await payload.create({
      collection: 'invoice-items',
      data: {
        invoice: invoice.id,
        product: item.product || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        sortOrder: i,
        lineTotal: 0, // will be calculated by hook
      },
    })
  }

  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}

export async function updateInvoice(id: string, data: InvoiceFormData) {
  const payload = await getPayloadClient()

  // Only draft invoices can be edited
  const existing = await payload.findByID({ collection: 'invoices', id }) as Record<string, unknown>
  if (existing.status !== 'draft') {
    throw new Error('Alleen concept-facturen kunnen bewerkt worden')
  }

  // Update invoice fields
  await payload.update({
    collection: 'invoices',
    id,
    data: {
      client: data.client,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      reference: data.reference,
      notes: data.notes,
    },
  })

  // Delete existing items and recreate
  const { docs: existingItems } = await payload.find({
    collection: 'invoice-items',
    where: { invoice: { equals: id } },
    limit: 100,
  })

  for (const item of existingItems) {
    await payload.delete({ collection: 'invoice-items', id: item.id as string })
  }

  // Create new items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    await payload.create({
      collection: 'invoice-items',
      data: {
        invoice: id,
        product: item.product || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        sortOrder: i,
        lineTotal: 0,
      },
    })
  }

  revalidatePath('/[locale]/invoices', 'page')
  return { success: true }
}

export async function duplicateInvoice(id: string) {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  if (!orgId) throw new Error('Geen organisatie')

  // Fetch original invoice + items
  const original = await payload.findByID({ collection: 'invoices', id, depth: 0 }) as Record<string, unknown>
  const { docs: originalItems } = await payload.find({
    collection: 'invoice-items',
    where: { invoice: { equals: id } },
    sort: 'sortOrder',
    limit: 100,
  })

  const invoiceNumber = await generateInvoiceNumber(payload, orgId as string)
  const today = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  // Create duplicate as draft
  const duplicate = await payload.create({
    collection: 'invoices',
    data: {
      organization: orgId,
      invoiceNumber,
      client: original.client,
      type: 'invoice',
      status: 'draft',
      issueDate: today,
      dueDate,
      reference: original.reference,
      notes: original.notes,
      subtotal: 0,
      vatAmount: 0,
      totalIncVat: 0,
    },
  })

  // Copy line items
  for (let i = 0; i < originalItems.length; i++) {
    const item = originalItems[i] as Record<string, unknown>
    await payload.create({
      collection: 'invoice-items',
      data: {
        invoice: duplicate.id,
        product: item.product || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        sortOrder: i,
        lineTotal: 0,
      },
    })
  }

  revalidatePath('/[locale]/invoices', 'page')
  return { invoiceId: String(duplicate.id), invoiceNumber }
}

export async function updateInvoiceStatus(id: string, status: string) {
  const payload = await getPayloadClient()

  const data: Record<string, unknown> = { status }

  if (status === 'sent') {
    data.sentAt = new Date().toISOString()
  }
  if (status === 'paid') {
    data.paidAt = new Date().toISOString()
  }

  const result = await payload.update({
    collection: 'invoices',
    id,
    data,
  })

  revalidatePath('/[locale]/invoices', 'page')
  return result
}

export async function deleteInvoice(id: string) {
  const payload = await getPayloadClient()

  // Only allow deletion of draft invoices
  const invoice = await payload.findByID({ collection: 'invoices', id }) as Record<string, unknown>
  if (invoice.status !== 'draft') {
    throw new Error('Alleen conceptfacturen kunnen verwijderd worden')
  }

  const result = await payload.update({
    collection: 'invoices',
    id,
    data: { deletedAt: new Date().toISOString() },
  })

  revalidatePath('/[locale]/invoices', 'page')
  return result
}

export async function getDashboardStats() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization

  const baseWhere: Where = {
    and: [
      { organization: { equals: orgId } },
      { deletedAt: { exists: false } },
    ],
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Fetch counts and actual data in one pass
  const [paidInvoices, outstandingInvoices, overdueInvoices, totalClients] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { status: { equals: 'paid' } },
          { paidAt: { greater_than: startOfMonth } },
        ],
      },
      limit: 100,
    }),
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { status: { in: ['sent'] } },
        ],
      },
      limit: 100,
    }),
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { status: { equals: 'overdue' } },
        ],
      },
      limit: 100,
    }),
    payload.find({
      collection: 'clients',
      where: baseWhere,
      limit: 0,
    }),
  ])

  type InvDoc = Record<string, unknown>
  const revenueThisMonth = paidInvoices.docs.reduce((sum, inv) => sum + ((inv as InvDoc).totalIncVat as number || 0), 0)
  const outstandingTotal = outstandingInvoices.docs.reduce((sum, inv) => sum + ((inv as InvDoc).totalIncVat as number || 0), 0)
  const overdueTotal = overdueInvoices.docs.reduce((sum, inv) => sum + ((inv as InvDoc).totalIncVat as number || 0), 0)

  // Recent invoices
  const recentInvoices = await payload.find({
    collection: 'invoices',
    where: baseWhere,
    sort: '-createdAt',
    limit: 5,
    depth: 1,
  })

  return {
    revenueThisMonth,
    outstandingTotal,
    overdueTotal,
    overdueCount: overdueInvoices.totalDocs,
    totalClients: totalClients.totalDocs,
    recentInvoices: recentInvoices.docs as unknown as Array<Record<string, unknown> & { id: string }>,
  }
}
