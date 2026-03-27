'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

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

export async function getCreditNotes(params?: {
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
      or: [{ creditNoteNumber: { contains: params.search } }],
    })
  }

  const result = await payload.find({
    collection: 'credit-notes',
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

export async function getCreditNote(id: string) {
  const payload = await getPayloadClient()
  return payload.findByID({
    collection: 'credit-notes',
    id,
    depth: 2,
  })
}

export async function generateCreditNoteNumber() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie gevonden')

  const year = new Date().getFullYear()
  const prefix = 'CN'

  // Count existing credit notes this year to determine next number
  const existing = await payload.find({
    collection: 'credit-notes',
    where: {
      and: [
        { organization: { equals: orgId } },
        { creditNoteNumber: { contains: `${prefix}-${year}` } },
      ],
    },
    limit: 0,
  })

  const nextNum = existing.totalDocs + 1
  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`
}

export async function createCreditNoteFromInvoice(invoiceId: string, reason: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie gevonden')

  // Fetch the original invoice
  const invoice = await payload.findByID({
    collection: 'invoices',
    id: invoiceId,
    depth: 1,
  }) as Record<string, unknown>

  // Verify the invoice belongs to this organization
  const invoiceOrgId = invoice.organization && typeof invoice.organization === 'object'
    ? (invoice.organization as Record<string, unknown>).id
    : invoice.organization
  if (invoiceOrgId !== orgId) {
    throw new Error('Factuur behoort niet tot deze organisatie')
  }

  // Generate credit note number
  const year = new Date().getFullYear()
  const prefix = 'CN'
  const existing = await payload.find({
    collection: 'credit-notes',
    where: {
      and: [
        { organization: { equals: orgId } },
        { creditNoteNumber: { contains: `${prefix}-${year}` } },
      ],
    },
    limit: 0,
  })
  const nextNum = existing.totalDocs + 1
  const creditNoteNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

  // Extract client ID (may be populated object or string)
  const clientId = invoice.client && typeof invoice.client === 'object'
    ? (invoice.client as Record<string, unknown>).id
    : invoice.client

  // Amounts are stored as negatives (reversal of original invoice)
  const subtotal = invoice.subtotal as number || 0
  const vatAmount = invoice.vatAmount as number || 0
  const totalIncVat = invoice.totalIncVat as number || 0

  const creditNote = await payload.create({
    collection: 'credit-notes',
    data: {
      organization: orgId,
      creditNoteNumber,
      originalInvoice: invoiceId,
      client: clientId,
      reason,
      status: 'draft',
      totalExVat: -Math.abs(subtotal),
      totalVat: -Math.abs(vatAmount),
      totalIncVat: -Math.abs(totalIncVat),
    },
  })

  revalidatePath('/[locale]/credit-notes', 'page')
  revalidatePath('/[locale]/invoices', 'page')
  return creditNote
}

export async function updateCreditNoteStatus(id: string, status: string) {
  const { payload } = await getAuthUser()

  // Validate status transition
  const creditNote = await payload.findByID({
    collection: 'credit-notes',
    id,
  }) as Record<string, unknown>

  const currentStatus = creditNote.status as string
  const validTransitions: Record<string, string[]> = {
    draft: ['sent'],
    sent: ['finalized'],
  }

  if (!validTransitions[currentStatus]?.includes(status)) {
    throw new Error(`Ongeldige statusovergang van '${currentStatus}' naar '${status}'`)
  }

  const data: Record<string, unknown> = { status }

  // When sent, set the issuedDate
  if (status === 'sent') {
    data.issuedDate = new Date().toISOString()
  }

  const result = await payload.update({
    collection: 'credit-notes',
    id,
    data,
  })

  revalidatePath('/[locale]/credit-notes', 'page')
  return result
}

export async function deleteCreditNote(id: string) {
  const { payload } = await getAuthUser()

  // Only allow deletion of draft credit notes
  const creditNote = await payload.findByID({
    collection: 'credit-notes',
    id,
  }) as Record<string, unknown>

  if (creditNote.status !== 'draft') {
    throw new Error('Alleen concept-creditnota\'s kunnen verwijderd worden')
  }

  const result = await payload.update({
    collection: 'credit-notes',
    id,
    data: { deletedAt: new Date().toISOString() },
  })

  revalidatePath('/[locale]/credit-notes', 'page')
  return result
}
