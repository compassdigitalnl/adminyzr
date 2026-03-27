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

export type SearchResult = {
  id: string
  type: string
  title: string
  subtitle?: string
  href: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []

  const { payload, orgId } = await getAuthUser()
  if (!orgId) return []

  const results: SearchResult[] = []
  const limit = 5

  // Search in parallel across collections
  const [invoices, clients, products, quotes, purchaseInvoices] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          {
            or: [
              { invoiceNumber: { contains: query } },
              { reference: { contains: query } },
            ],
          },
        ],
      },
      limit,
      depth: 1,
    }).catch(() => ({ docs: [] })),

    payload.find({
      collection: 'clients',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          {
            or: [
              { companyName: { contains: query } },
              { contactName: { contains: query } },
              { email: { contains: query } },
            ],
          },
        ],
      },
      limit,
      depth: 0,
    }).catch(() => ({ docs: [] })),

    payload.find({
      collection: 'products',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          {
            or: [
              { name: { contains: query } },
              { sku: { contains: query } },
            ],
          },
        ],
      },
      limit,
      depth: 0,
    }).catch(() => ({ docs: [] })),

    payload.find({
      collection: 'quotes',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          { quoteNumber: { contains: query } },
        ],
      },
      limit,
      depth: 1,
    }).catch(() => ({ docs: [] })),

    payload.find({
      collection: 'purchase-invoices',
      where: {
        and: [
          { organization: { equals: orgId } },
          { deletedAt: { exists: false } },
          {
            or: [
              { supplier: { contains: query } },
              { invoiceNumber: { contains: query } },
            ],
          },
        ],
      },
      limit,
      depth: 0,
    }).catch(() => ({ docs: [] })),
  ])

  // Map to search results
  for (const doc of invoices.docs) {
    const d = doc as Record<string, unknown>
    const client = d.client as Record<string, unknown> | undefined
    results.push({
      id: String(d.id),
      type: 'Factuur',
      title: d.invoiceNumber as string,
      subtitle: (client?.companyName as string) || (client?.contactName as string),
      href: `/invoices`,
    })
  }

  for (const doc of clients.docs) {
    const d = doc as Record<string, unknown>
    results.push({
      id: String(d.id),
      type: 'Klant',
      title: (d.companyName as string) || (d.contactName as string) || '',
      subtitle: d.email as string,
      href: `/clients`,
    })
  }

  for (const doc of products.docs) {
    const d = doc as Record<string, unknown>
    results.push({
      id: String(d.id),
      type: 'Product',
      title: (d.name as string) || '',
      subtitle: d.sku as string,
      href: `/products`,
    })
  }

  for (const doc of quotes.docs) {
    const d = doc as Record<string, unknown>
    results.push({
      id: String(d.id),
      type: 'Offerte',
      title: (d.quoteNumber as string) || '',
      subtitle: undefined,
      href: `/quotes`,
    })
  }

  for (const doc of purchaseInvoices.docs) {
    const d = doc as Record<string, unknown>
    results.push({
      id: String(d.id),
      type: 'Inkoopfactuur',
      title: (d.supplier as string) || '',
      subtitle: d.invoiceNumber as string,
      href: `/purchase-invoices`,
    })
  }

  return results
}
