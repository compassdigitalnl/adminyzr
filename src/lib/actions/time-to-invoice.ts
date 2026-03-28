'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

/**
 * Get unbilled time entries grouped by client
 */
export async function getUnbilledTimeByClient() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const { docs } = await payload.find({
    collection: 'time-entries',
    where: {
      organization: { equals: orgId },
      billable: { equals: true },
      billed: { equals: false },
    },
    sort: 'date',
    limit: 500,
    depth: 1,
  })

  // Group by client
  const grouped: Record<string, {
    clientId: string
    clientName: string
    entries: { id: string; description: string; date: string; duration: number }[]
    totalMinutes: number
  }> = {}

  for (const rawDoc of docs) {
    const doc = rawDoc as Record<string, unknown>
    const client = doc.client as Record<string, unknown> | undefined
    if (!client) continue

    const clientId = String(client.id)
    const clientName = (client.companyName as string) || (client.contactName as string) || 'Onbekend'

    if (!grouped[clientId]) {
      grouped[clientId] = { clientId, clientName, entries: [], totalMinutes: 0 }
    }

    grouped[clientId].entries.push({
      id: String(doc.id),
      description: (doc.description as string) || '',
      date: (doc.date as string) || '',
      duration: (doc.duration as number) || 0,
    })
    grouped[clientId].totalMinutes += (doc.duration as number) || 0
  }

  return Object.values(grouped)
}

/**
 * Convert selected time entries to an invoice
 */
export async function convertTimeToInvoice(data: {
  clientId: string
  timeEntryIds: string[]
  hourlyRateCents: number
  issueDate: string
  dueDate: string
  notes?: string
}) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  if (data.timeEntryIds.length === 0) throw new Error('Selecteer minimaal één tijdregistratie')

  // Fetch the time entries
  const { docs: entries } = await payload.find({
    collection: 'time-entries',
    where: {
      id: { in: data.timeEntryIds },
      organization: { equals: orgId },
    },
    limit: 500,
    overrideAccess: true,
  })

  // Get next invoice number
  const org = await payload.findByID({
    collection: 'organizations',
    id: orgId as string,
    overrideAccess: true,
  }) as Record<string, unknown>

  const settings = (org.invoiceSettings as Record<string, unknown>) || {}
  const prefix = (settings.prefix as string) || 'INV'
  const nextNum = ((settings.nextNumber as number) || 1)
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

  // Calculate totals
  const items = entries.map((rawEntry) => {
    const entry = rawEntry as Record<string, unknown>
    const minutes = (entry.duration as number) || 0
    const hours = minutes / 60
    const unitPrice = data.hourlyRateCents
    const lineTotal = Math.round(hours * unitPrice)
    const description = (entry.description as string) || 'Gewerkte uren'
    const date = (entry.date as string) || ''
    const dateStr = date ? new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''

    return {
      description: `${description}${dateStr ? ` (${dateStr})` : ''}`,
      quantity: parseFloat(hours.toFixed(2)),
      unitPrice,
      vatRate: '21',
      lineTotal,
      entryId: String(entry.id),
    }
  })

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const defaultVatRate = (settings.defaultVatRate as number) || 21
  const vatAmount = Math.round(subtotal * (defaultVatRate / 100))
  const totalIncVat = subtotal + vatAmount

  // Create invoice
  const invoice = await payload.create({
    collection: 'invoices',
    data: {
      organization: orgId,
      invoiceNumber,
      client: data.clientId,
      type: 'invoice',
      status: 'draft',
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal,
      vatAmount,
      totalIncVat,
      notes: data.notes,
    },
    overrideAccess: true,
  })

  const invoiceId = (invoice as Record<string, unknown>).id

  // Create invoice items
  for (let i = 0; i < items.length; i++) {
    await payload.create({
      collection: 'invoice-items',
      data: {
        organization: orgId,
        invoice: invoiceId,
        description: items[i].description,
        quantity: items[i].quantity,
        unitPrice: items[i].unitPrice,
        vatRate: items[i].vatRate,
        lineTotal: items[i].lineTotal,
        sortOrder: i + 1,
      },
      overrideAccess: true,
    })
  }

  // Mark time entries as billed
  for (const entry of entries) {
    await payload.update({
      collection: 'time-entries',
      id: entry.id as string,
      data: {
        billed: true,
        linkedInvoice: invoiceId,
      },
      overrideAccess: true,
    })
  }

  // Increment invoice number
  await payload.update({
    collection: 'organizations',
    id: orgId as string,
    data: {
      invoiceSettings: {
        ...settings,
        nextNumber: nextNum + 1,
      },
    } as Record<string, unknown>,
    overrideAccess: true,
  })

  revalidatePath('/[locale]/time-tracking', 'page')
  revalidatePath('/[locale]/invoices', 'page')

  return { invoiceId: String(invoiceId), invoiceNumber }
}
