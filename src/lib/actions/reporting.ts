'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'

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
 * Invoice aging report — overdue facturen in buckets
 */
export async function getInvoiceAgingReport() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const { docs } = await payload.find({
    collection: 'invoices',
    where: {
      organization: { equals: orgId },
      status: { in: ['sent', 'overdue'] },
      deletedAt: { exists: false },
    },
    sort: 'dueDate',
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })

  const now = new Date()
  const buckets = {
    current: { count: 0, total: 0, invoices: [] as Record<string, unknown>[] },
    '1_30': { count: 0, total: 0, invoices: [] as Record<string, unknown>[] },
    '31_60': { count: 0, total: 0, invoices: [] as Record<string, unknown>[] },
    '61_90': { count: 0, total: 0, invoices: [] as Record<string, unknown>[] },
    '90_plus': { count: 0, total: 0, invoices: [] as Record<string, unknown>[] },
  }

  for (const rawDoc of docs) {
    const doc = rawDoc as Record<string, unknown>
    const dueDate = new Date(doc.dueDate as string)
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
    const amount = (doc.totalIncVat as number) || 0
    const client = doc.client as Record<string, unknown> | undefined

    const entry = {
      id: doc.id,
      invoiceNumber: doc.invoiceNumber,
      clientName: (client?.companyName as string) || (client?.contactName as string) || '—',
      totalIncVat: amount,
      dueDate: doc.dueDate,
      daysPastDue: Math.max(0, daysPastDue),
    }

    if (daysPastDue <= 0) {
      buckets.current.count++
      buckets.current.total += amount
      buckets.current.invoices.push(entry)
    } else if (daysPastDue <= 30) {
      buckets['1_30'].count++
      buckets['1_30'].total += amount
      buckets['1_30'].invoices.push(entry)
    } else if (daysPastDue <= 60) {
      buckets['31_60'].count++
      buckets['31_60'].total += amount
      buckets['31_60'].invoices.push(entry)
    } else if (daysPastDue <= 90) {
      buckets['61_90'].count++
      buckets['61_90'].total += amount
      buckets['61_90'].invoices.push(entry)
    } else {
      buckets['90_plus'].count++
      buckets['90_plus'].total += amount
      buckets['90_plus'].invoices.push(entry)
    }
  }

  const totalOutstanding = Object.values(buckets).reduce((sum, b) => sum + b.total, 0)

  return { buckets, totalOutstanding, totalInvoices: docs.length }
}

/**
 * Klant statement — alle facturen + betalingen voor één klant
 */
export async function getClientStatement(clientId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Get client info
  const client = await payload.findByID({
    collection: 'clients',
    id: clientId,
    depth: 0,
  }) as Record<string, unknown>

  // Get all invoices for this client
  const { docs: invoices } = await payload.find({
    collection: 'invoices',
    where: {
      organization: { equals: orgId },
      client: { equals: clientId },
      deletedAt: { exists: false },
      status: { not_equals: 'draft' },
    },
    sort: '-issueDate',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  // Get all quotes for this client
  const { docs: quotes } = await payload.find({
    collection: 'quotes',
    where: {
      organization: { equals: orgId },
      client: { equals: clientId },
      deletedAt: { exists: false },
    },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Calculate totals
  let totalInvoiced = 0
  let totalPaid = 0
  let totalOutstanding = 0

  const invoiceRows = invoices.map((rawInv) => {
    const inv = rawInv as Record<string, unknown>
    const amount = (inv.totalIncVat as number) || 0
    totalInvoiced += amount
    if (inv.status === 'paid') totalPaid += amount
    if (inv.status === 'sent' || inv.status === 'overdue') totalOutstanding += amount

    return {
      id: String(inv.id),
      invoiceNumber: inv.invoiceNumber as string,
      issueDate: inv.issueDate as string,
      dueDate: inv.dueDate as string,
      totalIncVat: amount,
      status: inv.status as string,
      paidAt: inv.paidAt as string | null,
    }
  })

  return {
    client: {
      id: String(client.id),
      companyName: (client.companyName as string) || '',
      contactName: (client.contactName as string) || '',
      email: (client.email as string) || '',
    },
    invoices: invoiceRows,
    quotes: quotes.map((q) => {
      const quote = q as Record<string, unknown>
      return {
        id: String(quote.id),
        quoteNumber: quote.quoteNumber as string,
        totalIncVat: (quote.totalIncVat as number) || 0,
        status: quote.status as string,
      }
    }),
    totals: {
      invoiced: totalInvoiced,
      paid: totalPaid,
      outstanding: totalOutstanding,
    },
    invoiceCount: invoices.length,
    quoteCount: quotes.length,
  }
}

/**
 * Get related data for a project (time entries, budget usage)
 */
export async function getProjectStats(projectId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Get time entries for this project
  const { docs: timeEntries } = await payload.find({
    collection: 'time-entries',
    where: {
      organization: { equals: orgId },
      project: { equals: projectId },
    },
    sort: '-date',
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })

  let totalMinutes = 0
  let billableMinutes = 0
  const entriesByUser: Record<string, { name: string; minutes: number }> = {}

  for (const rawEntry of timeEntries) {
    const entry = rawEntry as Record<string, unknown>
    const minutes = (entry.duration as number) || 0
    totalMinutes += minutes
    if (entry.billable) billableMinutes += minutes

    const user = entry.user as Record<string, unknown> | undefined
    const userName = (user?.name as string) || 'Onbekend'
    const userId = String(user?.id || 'unknown')
    if (!entriesByUser[userId]) entriesByUser[userId] = { name: userName, minutes: 0 }
    entriesByUser[userId].minutes += minutes
  }

  return {
    totalMinutes,
    billableMinutes,
    totalHours: totalMinutes / 60,
    billableHours: billableMinutes / 60,
    entryCount: timeEntries.length,
    entriesByUser: Object.values(entriesByUser),
    recentEntries: timeEntries.slice(0, 10).map((e) => {
      const entry = e as Record<string, unknown>
      return {
        id: String(entry.id),
        description: (entry.description as string) || '',
        date: (entry.date as string) || '',
        duration: (entry.duration as number) || 0,
        billable: !!entry.billable,
      }
    }),
  }
}

/**
 * Get related data for an employee (leave requests, time entries)
 */
export async function getEmployeeStats(employeeId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Get the employee's user account
  const employee = await payload.findByID({
    collection: 'employees',
    id: employeeId,
    depth: 0,
  }) as Record<string, unknown>

  const userId = employee.user ? (typeof employee.user === 'object' ? (employee.user as Record<string, unknown>).id : employee.user) : null

  // Get leave requests
  const { docs: leaveRequests } = await payload.find({
    collection: 'leave-requests',
    where: {
      organization: { equals: orgId },
      employee: { equals: employeeId },
    },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  let approvedDays = 0
  let pendingDays = 0

  for (const rawReq of leaveRequests) {
    const req = rawReq as Record<string, unknown>
    const days = (req.days as number) || 0
    if (req.status === 'approved') approvedDays += days
    if (req.status === 'pending') pendingDays += days
  }

  // Get time entries if user linked
  let totalMinutes = 0
  let thisMonthMinutes = 0
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  if (userId) {
    const { docs: timeEntries } = await payload.find({
      collection: 'time-entries',
      where: {
        organization: { equals: orgId },
        user: { equals: userId },
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    for (const rawEntry of timeEntries) {
      const entry = rawEntry as Record<string, unknown>
      const minutes = (entry.duration as number) || 0
      totalMinutes += minutes
      if ((entry.date as string) >= startOfMonth) thisMonthMinutes += minutes
    }
  }

  return {
    leaveRequests: leaveRequests.map((r) => {
      const req = r as Record<string, unknown>
      return {
        id: String(req.id),
        type: req.type as string,
        startDate: req.startDate as string,
        endDate: req.endDate as string,
        days: (req.days as number) || 0,
        status: req.status as string,
      }
    }),
    leaveSummary: {
      approvedDays,
      pendingDays,
      totalRequests: leaveRequests.length,
    },
    timeSummary: {
      totalHours: totalMinutes / 60,
      thisMonthHours: thisMonthMinutes / 60,
    },
  }
}
