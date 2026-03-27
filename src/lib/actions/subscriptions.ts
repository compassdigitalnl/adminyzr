'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

export type SubscriptionFormData = {
  client: string
  name: string
  description?: string
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  amount: number // in centen
  vatRate: '21' | '9' | '0' | 'exempt'
  startDate: string
  endDate?: string
  autoSend?: boolean
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

function calculateNextInvoiceDate(startDate: string, interval: string): string {
  const date = new Date(startDate)
  switch (interval) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  return date.toISOString().split('T')[0]
}

export async function getSubscriptions(params?: {
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
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'subscriptions',
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

export async function createSubscription(data: SubscriptionFormData) {
  const { payload, orgId } = await getAuthUser()

  const nextInvoiceDate = data.startDate

  const result = await payload.create({
    collection: 'subscriptions',
    data: {
      organization: orgId,
      client: data.client,
      name: data.name,
      description: data.description,
      status: 'active',
      interval: data.interval,
      amount: data.amount,
      vatRate: data.vatRate,
      startDate: data.startDate,
      nextInvoiceDate,
      endDate: data.endDate || undefined,
      autoSend: data.autoSend !== undefined ? data.autoSend : true,
      invoiceCount: 0,
    },
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  return result
}

export async function updateSubscription(id: string, data: Partial<SubscriptionFormData>) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'subscriptions',
    id,
    data,
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  return result
}

export async function cancelSubscription(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'subscriptions',
    id,
    data: { status: 'cancelled' },
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  return result
}

export async function pauseSubscription(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'subscriptions',
    id,
    data: { status: 'paused' },
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  return result
}

export async function resumeSubscription(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'subscriptions',
    id,
    data: { status: 'active' },
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  return result
}

export async function generateSubscriptionInvoice(subscriptionId: string) {
  const { payload, orgId } = await getAuthUser()

  const sub = await payload.findByID({
    collection: 'subscriptions',
    id: subscriptionId,
    depth: 0,
  }) as Record<string, unknown>

  if (!sub || sub.status !== 'active') {
    throw new Error('Abonnement is niet actief')
  }

  // Generate invoice number
  const org = await payload.findByID({
    collection: 'organizations',
    id: orgId,
  }) as Record<string, unknown>

  const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined
  const prefix = (invoiceSettings?.prefix as string) || 'INV'
  const nextNumber = (invoiceSettings?.nextNumber as number) || 1
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`

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

  // Calculate amounts
  const amount = sub.amount as number
  const vatRateStr = sub.vatRate as string
  const vatPercent = vatRateStr === 'exempt' ? 0 : parseInt(vatRateStr)
  const vatAmount = Math.round(amount * vatPercent / 100)
  const totalIncVat = amount + vatAmount

  // Get client payment terms for due date
  const clientId = typeof sub.client === 'object' ? (sub.client as Record<string, unknown>).id : sub.client
  let paymentTermDays = 30
  try {
    const client = await payload.findByID({ collection: 'clients', id: clientId as string }) as Record<string, unknown>
    if (client.paymentTermDays) paymentTermDays = client.paymentTermDays as number
  } catch {
    // Use default
  }

  const issueDate = new Date().toISOString().split('T')[0]
  const dueDateObj = new Date()
  dueDateObj.setDate(dueDateObj.getDate() + paymentTermDays)
  const dueDate = dueDateObj.toISOString().split('T')[0]

  const autoSend = sub.autoSend as boolean

  // Create invoice
  const invoice = await payload.create({
    collection: 'invoices',
    data: {
      organization: orgId,
      invoiceNumber,
      client: clientId,
      type: 'invoice',
      status: autoSend ? 'sent' : 'draft',
      issueDate,
      dueDate,
      reference: `Abonnement: ${sub.name as string}`,
      subtotal: amount,
      vatAmount,
      totalIncVat,
      sentAt: autoSend ? new Date().toISOString() : undefined,
    },
    overrideAccess: true,
  })

  // Create invoice item
  await payload.create({
    collection: 'invoice-items',
    data: {
      invoice: invoice.id,
      description: sub.name as string,
      quantity: 1,
      unitPrice: amount,
      vatRate: vatRateStr,
      sortOrder: 0,
      lineTotal: amount,
    },
    overrideAccess: true,
  })

  // Update subscription
  const nextInvoiceDate = calculateNextInvoiceDate(
    sub.nextInvoiceDate as string,
    sub.interval as string,
  )
  const invoiceCount = ((sub.invoiceCount as number) || 0) + 1

  // Check if subscription has expired
  const endDate = sub.endDate as string | undefined
  const hasExpired = endDate && new Date(nextInvoiceDate) > new Date(endDate)

  await payload.update({
    collection: 'subscriptions',
    id: subscriptionId,
    data: {
      lastInvoiceId: invoice.id,
      invoiceCount,
      nextInvoiceDate,
      ...(hasExpired ? { status: 'expired' } : {}),
    },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}

export async function deleteSubscription(id: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'subscriptions',
    id,
    data: { deletedAt: new Date().toISOString() },
  })

  revalidatePath('/[locale]/subscriptions', 'page')
  return result
}
