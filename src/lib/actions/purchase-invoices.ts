'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type PurchaseInvoiceFormData = {
  supplier: string
  supplierVatNumber?: string
  supplierIban?: string
  invoiceNumber?: string
  issueDate?: string
  dueDate?: string
  subtotal: number // in centen
  vatAmount: number // in centen
  totalIncVat: number // in centen
  category?: string
  notes?: string
}

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) throw new Error('Niet ingelogd')

  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')

  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  if (!orgId) throw new Error('Geen organisatie gevonden')

  return { payload, user, orgId: orgId as string }
}

export async function getPurchaseInvoices(params?: {
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
      or: [
        { supplier: { contains: params.search } },
        { invoiceNumber: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'purchase-invoices',
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

export async function createPurchaseInvoice(data: PurchaseInvoiceFormData) {
  const { payload, orgId } = await getAuthUser()

  const result = await payload.create({
    collection: 'purchase-invoices',
    data: {
      organization: orgId,
      supplier: data.supplier,
      supplierVatNumber: data.supplierVatNumber,
      supplierIban: data.supplierIban,
      invoiceNumber: data.invoiceNumber,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal: data.subtotal,
      vatAmount: data.vatAmount,
      totalIncVat: data.totalIncVat,
      category: data.category || 'other',
      notes: data.notes,
      status: 'pending_review',
    },
  })

  revalidatePath('/[locale]/purchase-invoices', 'page')
  return result
}

export async function updatePurchaseInvoice(id: string, data: PurchaseInvoiceFormData) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'purchase-invoices',
    id,
    data: {
      supplier: data.supplier,
      supplierVatNumber: data.supplierVatNumber,
      supplierIban: data.supplierIban,
      invoiceNumber: data.invoiceNumber,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal: data.subtotal,
      vatAmount: data.vatAmount,
      totalIncVat: data.totalIncVat,
      category: data.category || 'other',
      notes: data.notes,
    },
  })

  revalidatePath('/[locale]/purchase-invoices', 'page')
  return result
}

export async function approvePurchaseInvoice(id: string) {
  const { payload, user } = await getAuthUser()

  const result = await payload.update({
    collection: 'purchase-invoices',
    id,
    data: {
      status: 'approved',
      approvedBy: user.id,
      approvedAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/purchase-invoices', 'page')
  return result
}

export async function rejectPurchaseInvoice(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'purchase-invoices',
    id,
    data: {
      status: 'rejected',
    },
  })

  revalidatePath('/[locale]/purchase-invoices', 'page')
  return result
}

export async function markPurchaseInvoicePaid(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'purchase-invoices',
    id,
    data: {
      status: 'paid',
      paidAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/purchase-invoices', 'page')
  return result
}

export async function deletePurchaseInvoice(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'purchase-invoices',
    id,
    data: {
      deletedAt: new Date().toISOString(),
    },
  })

  revalidatePath('/[locale]/purchase-invoices', 'page')
  return result
}
