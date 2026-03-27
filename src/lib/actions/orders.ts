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
  if (!orgId) throw new Error('Geen organisatie gevonden')

  return { payload, user, orgId: orgId as string }
}

export async function getOrders(params?: {
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
        { externalOrderId: { contains: params.search } },
        { customerName: { contains: params.search } },
        { customerEmail: { contains: params.search } },
      ],
    })
  }

  const where: Where = { and: conditions }

  const result = await payload.find({
    collection: 'orders',
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

export async function getOrder(id: string) {
  const { payload } = await getAuthUser()

  const order = await payload.findByID({
    collection: 'orders',
    id,
    depth: 2,
  })

  return order as unknown as Record<string, unknown> & { id: string }
}

export async function updateOrderStatus(id: string, status: string) {
  const { payload } = await getAuthUser()

  const result = await payload.update({
    collection: 'orders',
    id,
    data: { status },
  })

  revalidatePath('/[locale]/orders', 'page')
  return result
}

export async function convertOrderToInvoice(orderId: string) {
  const { payload, orgId } = await getAuthUser()

  // Fetch the order
  const order = await payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 1,
  }) as Record<string, unknown>

  if (!order) throw new Error('Bestelling niet gevonden')

  const orderStatus = order.status as string
  if (orderStatus !== 'pending' && orderStatus !== 'processing') {
    throw new Error('Alleen bestellingen met status "In afwachting" of "In verwerking" kunnen gefactureerd worden')
  }

  // Check if already invoiced
  if (order.invoice) {
    throw new Error('Deze bestelling is al gefactureerd')
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

  // Resolve client ID — use linked client or find/create by email
  let clientId: string | undefined
  const orderClient = order.client
  if (orderClient && typeof orderClient === 'object') {
    clientId = (orderClient as Record<string, unknown>).id as string
  } else if (typeof orderClient === 'string') {
    clientId = orderClient
  }

  // If no client linked, try to find by email
  if (!clientId && order.customerEmail) {
    const existingClients = await payload.find({
      collection: 'clients',
      where: {
        and: [
          { organization: { equals: orgId } },
          { email: { equals: order.customerEmail as string } },
          { deletedAt: { exists: false } },
        ],
      },
      limit: 1,
    })

    if (existingClients.docs.length > 0) {
      clientId = existingClients.docs[0].id as string
    } else {
      // Create a new client
      const newClient = await payload.create({
        collection: 'clients',
        data: {
          organization: orgId,
          type: 'individual',
          companyName: (order.customerName as string) || (order.customerEmail as string),
          contactName: order.customerName as string || undefined,
          email: order.customerEmail as string,
        },
      })
      clientId = newClient.id as string
    }
  }

  if (!clientId) {
    throw new Error('Geen klant gevonden of gekoppeld aan deze bestelling')
  }

  // Calculate payment term
  const defaultPaymentTermDays = (invoiceSettings?.defaultPaymentTermDays as number) || 30
  const now = new Date()
  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + defaultPaymentTermDays)

  // Create invoice
  const invoice = await payload.create({
    collection: 'invoices',
    data: {
      organization: orgId,
      invoiceNumber,
      client: clientId,
      type: 'invoice',
      status: 'draft',
      issueDate: now.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      reference: `Order ${order.externalOrderId as string}`,
      notes: order.notes as string || undefined,
      subtotal: (order.subtotal as number) || 0,
      vatAmount: (order.vatAmount as number) || 0,
      totalIncVat: (order.totalIncVat as number) || 0,
    },
  })

  // Create invoice items from order items
  const orderItems = (order.items as Array<Record<string, unknown>>) || []
  for (let i = 0; i < orderItems.length; i++) {
    const item = orderItems[i]
    const quantity = (item.quantity as number) || 1
    const unitPrice = (item.unitPrice as number) || 0
    const lineTotal = quantity * unitPrice

    // Map numeric vatRate to the select value
    const vatRateNum = item.vatRate as number
    let vatRateSelect: string = '21'
    if (vatRateNum === 9) vatRateSelect = '9'
    else if (vatRateNum === 0) vatRateSelect = '0'
    else if (vatRateNum === 21) vatRateSelect = '21'

    await payload.create({
      collection: 'invoice-items',
      data: {
        invoice: invoice.id,
        description: (item.name as string) || 'Product',
        quantity,
        unitPrice,
        vatRate: vatRateSelect,
        sortOrder: i,
        lineTotal,
      },
    })
  }

  // Update order: link invoice and set status to invoiced
  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      invoice: invoice.id,
      status: 'invoiced',
      client: clientId,
    },
  })

  revalidatePath('/[locale]/orders', 'page')
  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}
