'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
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

export type VatReportRow = {
  invoiceNumber: string
  clientName: string
  issueDate: string
  subtotal: number
  vatRate: string
  vatAmount: number
  totalIncVat: number
  status: string
}

export type VatReportSummary = {
  totalSubtotal: number
  totalVat21: number
  totalVat9: number
  totalVat0: number
  totalVatAmount: number
  totalIncVat: number
  invoiceCount: number
  rows: VatReportRow[]
}

export async function getVatReport(params: {
  periodStart: string
  periodEnd: string
}): Promise<VatReportSummary> {
  const { payload, orgId } = await getAuthUser()

  const where: Where = {
    and: [
      { organization: { equals: orgId } },
      { deletedAt: { exists: false } },
      { status: { in: ['sent', 'paid', 'overdue'] } },
      { issueDate: { greater_than_equal: params.periodStart } },
      { issueDate: { less_than_equal: params.periodEnd } },
    ],
  }

  const { docs } = await payload.find({
    collection: 'invoices',
    where,
    sort: 'issueDate',
    limit: 1000,
    depth: 1,
  })

  let totalSubtotal = 0
  let totalVat21 = 0
  let totalVat9 = 0
  let totalVat0 = 0
  let totalVatAmount = 0
  let totalIncVat = 0

  const rows: VatReportRow[] = []

  for (const rawDoc of docs) {
    const doc = rawDoc as Record<string, unknown>
    const subtotal = (doc.subtotal as number) || 0
    const vatAmount = (doc.vatAmount as number) || 0
    const total = (doc.totalIncVat as number) || 0
    const client = doc.client as Record<string, unknown> | undefined

    totalSubtotal += subtotal
    totalVatAmount += vatAmount
    totalIncVat += total

    // Estimate VAT breakdown (we'd need item-level data for precise breakdown)
    // For simplicity, assume the dominant rate based on ratio
    const vatRatio = subtotal > 0 ? vatAmount / subtotal : 0
    let vatRate = '21'
    if (vatRatio < 0.01) {
      vatRate = '0'
      totalVat0 += vatAmount
    } else if (vatRatio < 0.15) {
      vatRate = '9'
      totalVat9 += vatAmount
    } else {
      vatRate = '21'
      totalVat21 += vatAmount
    }

    rows.push({
      invoiceNumber: (doc.invoiceNumber as string) || '',
      clientName: (client?.companyName as string) || '',
      issueDate: (doc.issueDate as string) || '',
      subtotal,
      vatRate,
      vatAmount,
      totalIncVat: total,
      status: (doc.status as string) || '',
    })
  }

  return {
    totalSubtotal,
    totalVat21,
    totalVat9,
    totalVat0,
    totalVatAmount,
    totalIncVat,
    invoiceCount: rows.length,
    rows,
  }
}

export async function getRevenueStats(params: {
  year: number
}) {
  const { payload, orgId } = await getAuthUser()

  const months: { month: number; revenue: number; count: number }[] = []

  for (let m = 0; m < 12; m++) {
    const start = new Date(params.year, m, 1).toISOString()
    const end = new Date(params.year, m + 1, 0, 23, 59, 59).toISOString()

    const { docs } = await payload.find({
      collection: 'invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { status: { in: ['paid'] } },
          { paidAt: { greater_than_equal: start } },
          { paidAt: { less_than_equal: end } },
        ],
      },
      limit: 500,
    })

    const revenue = docs.reduce((sum, d) => {
      const doc = d as Record<string, unknown>
      return sum + ((doc.totalIncVat as number) || 0)
    }, 0)

    months.push({ month: m + 1, revenue, count: docs.length })
  }

  return months
}

// Cashflow: inkomsten (betaalde facturen) vs uitgaven (betaalde inkoopfacturen) per maand
export type CashflowMonth = {
  month: number
  income: number
  expenses: number
  net: number
}

export async function getCashflowStats(params: { year: number }): Promise<CashflowMonth[]> {
  const { payload, orgId } = await getAuthUser()

  const months: CashflowMonth[] = []

  for (let m = 0; m < 12; m++) {
    const start = new Date(params.year, m, 1).toISOString()
    const end = new Date(params.year, m + 1, 0, 23, 59, 59).toISOString()

    const [paidInvoices, paidPurchases] = await Promise.all([
      payload.find({
        collection: 'invoices',
        where: {
          and: [
            { organization: { equals: orgId } },
            { deletedAt: { exists: false } },
            { status: { equals: 'paid' } },
            { paidAt: { greater_than_equal: start } },
            { paidAt: { less_than_equal: end } },
          ],
        },
        limit: 500,
      }),
      payload.find({
        collection: 'purchase-invoices',
        where: {
          and: [
            { organization: { equals: orgId } },
            { deletedAt: { exists: false } },
            { status: { equals: 'paid' } },
            { paidAt: { greater_than_equal: start } },
            { paidAt: { less_than_equal: end } },
          ],
        },
        limit: 500,
      }),
    ])

    type Doc = Record<string, unknown>
    const income = paidInvoices.docs.reduce((s, d) => s + ((d as Doc).totalIncVat as number || 0), 0)
    const expenses = paidPurchases.docs.reduce((s, d) => s + ((d as Doc).totalIncVat as number || 0), 0)

    months.push({ month: m + 1, income, expenses, net: income - expenses })
  }

  return months
}

// KPI's: gemiddelde betalingstermijn, top klanten, omzetgroei
export type KpiStats = {
  avgPaymentDays: number
  topClients: { name: string; revenue: number }[]
  revenueGrowth: number // percentage vs vorig kwartaal
  totalPaidThisYear: number
  totalExpensesThisYear: number
  profitMargin: number // percentage
}

export async function getKpiStats(params: { year: number }): Promise<KpiStats> {
  const { payload, orgId } = await getAuthUser()

  const yearStart = new Date(params.year, 0, 1).toISOString()
  const yearEnd = new Date(params.year, 11, 31, 23, 59, 59).toISOString()

  const [paidInvoices, paidPurchases] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { status: { equals: 'paid' } },
          { paidAt: { greater_than_equal: yearStart } },
          { paidAt: { less_than_equal: yearEnd } },
        ],
      },
      limit: 1000,
      depth: 1,
    }),
    payload.find({
      collection: 'purchase-invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { status: { equals: 'paid' } },
          { paidAt: { greater_than_equal: yearStart } },
          { paidAt: { less_than_equal: yearEnd } },
        ],
      },
      limit: 1000,
    }),
  ])

  type Doc = Record<string, unknown>

  // Average payment days (sentAt → paidAt)
  let totalDays = 0
  let daysCount = 0
  for (const rawDoc of paidInvoices.docs) {
    const doc = rawDoc as Doc
    const sent = doc.sentAt as string | undefined
    const paid = doc.paidAt as string | undefined
    if (sent && paid) {
      const days = Math.round((new Date(paid).getTime() - new Date(sent).getTime()) / 86400000)
      if (days >= 0) {
        totalDays += days
        daysCount++
      }
    }
  }

  // Top clients by revenue
  const clientRevenue: Record<string, { name: string; revenue: number }> = {}
  for (const rawDoc of paidInvoices.docs) {
    const doc = rawDoc as Doc
    const client = doc.client as Doc | undefined
    const clientId = client?.id as string || 'unknown'
    const clientName = (client?.companyName as string) || (client?.contactName as string) || 'Onbekend'
    const total = (doc.totalIncVat as number) || 0
    if (!clientRevenue[clientId]) {
      clientRevenue[clientId] = { name: clientName, revenue: 0 }
    }
    clientRevenue[clientId].revenue += total
  }
  const topClients = Object.values(clientRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Totals
  const totalPaidThisYear = paidInvoices.docs.reduce((s, d) => s + ((d as Doc).totalIncVat as number || 0), 0)
  const totalExpensesThisYear = paidPurchases.docs.reduce((s, d) => s + ((d as Doc).totalIncVat as number || 0), 0)

  // Revenue growth: current quarter vs previous quarter
  const now = new Date()
  const currentQ = Math.floor(now.getMonth() / 3)
  const prevQ = currentQ === 0 ? 3 : currentQ - 1
  const prevQYear = currentQ === 0 ? params.year - 1 : params.year

  let currentQRevenue = 0
  let prevQRevenue = 0

  for (const rawDoc of paidInvoices.docs) {
    const doc = rawDoc as Doc
    const paidAt = doc.paidAt as string | undefined
    if (!paidAt) continue
    const paidDate = new Date(paidAt)
    const q = Math.floor(paidDate.getMonth() / 3)
    const total = (doc.totalIncVat as number) || 0
    if (q === currentQ && paidDate.getFullYear() === params.year) currentQRevenue += total
    if (q === prevQ && paidDate.getFullYear() === prevQYear) prevQRevenue += total
  }

  const revenueGrowth = prevQRevenue > 0
    ? Math.round(((currentQRevenue - prevQRevenue) / prevQRevenue) * 100)
    : 0

  const profitMargin = totalPaidThisYear > 0
    ? Math.round(((totalPaidThisYear - totalExpensesThisYear) / totalPaidThisYear) * 100)
    : 0

  return {
    avgPaymentDays: daysCount > 0 ? Math.round(totalDays / daysCount) : 0,
    topClients,
    revenueGrowth,
    totalPaidThisYear,
    totalExpensesThisYear,
    profitMargin,
  }
}
