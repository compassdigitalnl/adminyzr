'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import type { Where } from 'payload'
import {
  generateSnelstartExport,
  generateTwinfieldExport,
  generateMtExport,
  type ExportInvoice,
  type ExportPurchaseInvoice,
} from '@/lib/services/accounting-export'

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

function estimateVatRate(subtotal: number, vatAmount: number): string {
  if (subtotal === 0) return '0'
  const ratio = vatAmount / subtotal
  if (ratio < 0.01) return '0'
  if (ratio < 0.15) return '9'
  return '21'
}

export async function getAccountingExport(params: {
  format: 'snelstart' | 'twinfield' | 'generic'
  periodStart: string
  periodEnd: string
}): Promise<{ data: string; filename: string; contentType: string }> {
  const { payload, orgId } = await getAuthUser()

  const invoiceWhere: Where = {
    and: [
      { organization: { equals: orgId } },
      { deletedAt: { exists: false } },
      { status: { in: ['sent', 'paid', 'overdue'] } },
      { issueDate: { greater_than_equal: params.periodStart } },
      { issueDate: { less_than_equal: params.periodEnd } },
    ],
  }

  const purchaseWhere: Where = {
    and: [
      { organization: { equals: orgId } },
      { deletedAt: { exists: false } },
      { status: { in: ['approved', 'paid'] } },
      { issueDate: { greater_than_equal: params.periodStart } },
      { issueDate: { less_than_equal: params.periodEnd } },
    ],
  }

  const [invoiceResult, purchaseResult] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: invoiceWhere,
      sort: 'issueDate',
      limit: 1000,
      depth: 1,
    }),
    payload.find({
      collection: 'purchase-invoices',
      where: purchaseWhere,
      sort: 'issueDate',
      limit: 1000,
      depth: 0,
    }),
  ])

  type Doc = Record<string, unknown>

  const invoices: ExportInvoice[] = invoiceResult.docs.map((rawDoc) => {
    const doc = rawDoc as Doc
    const client = doc.client as Doc | undefined
    const subtotal = (doc.subtotal as number) || 0
    const vatAmount = (doc.vatAmount as number) || 0
    return {
      invoiceNumber: (doc.invoiceNumber as string) || '',
      clientName: (client?.companyName as string) || (client?.contactName as string) || '',
      clientCode: (client?.id as string) || '',
      issueDate: (doc.issueDate as string) || '',
      subtotal,
      vatAmount,
      totalIncVat: (doc.totalIncVat as number) || 0,
      vatRate: estimateVatRate(subtotal, vatAmount),
      reference: (doc.reference as string) || '',
    }
  })

  const purchaseInvoices: ExportPurchaseInvoice[] = purchaseResult.docs.map((rawDoc) => {
    const doc = rawDoc as Doc
    const subtotal = (doc.subtotal as number) || 0
    const vatAmount = (doc.vatAmount as number) || 0
    return {
      invoiceNumber: (doc.invoiceNumber as string) || '',
      supplier: (doc.supplier as string) || '',
      supplierCode: (doc.supplierVatNumber as string) || '',
      issueDate: (doc.issueDate as string) || '',
      subtotal,
      vatAmount,
      totalIncVat: (doc.totalIncVat as number) || 0,
      vatRate: estimateVatRate(subtotal, vatAmount),
      category: (doc.category as string) || 'other',
    }
  })

  const period = { start: params.periodStart, end: params.periodEnd }

  switch (params.format) {
    case 'snelstart': {
      const data = generateSnelstartExport(invoices, purchaseInvoices, period)
      return {
        data,
        filename: `snelstart-export-${params.periodStart}-${params.periodEnd}.csv`,
        contentType: 'text/csv; charset=utf-8',
      }
    }
    case 'twinfield': {
      const data = generateTwinfieldExport(invoices, purchaseInvoices, period)
      return {
        data,
        filename: `twinfield-export-${params.periodStart}-${params.periodEnd}.xml`,
        contentType: 'application/xml; charset=utf-8',
      }
    }
    case 'generic': {
      const data = generateMtExport(invoices, purchaseInvoices, period)
      return {
        data,
        filename: `boekhouding-export-${params.periodStart}-${params.periodEnd}.csv`,
        contentType: 'text/csv; charset=utf-8',
      }
    }
  }
}
