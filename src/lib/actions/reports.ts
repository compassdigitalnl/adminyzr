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
