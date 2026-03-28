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

export async function bulkUpdateStatus(
  collection: string,
  ids: string[],
  status: string,
) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')
  if (ids.length === 0) throw new Error('Geen items geselecteerd')

  let updated = 0
  for (const id of ids) {
    try {
      await payload.update({
        collection: collection as 'invoices',
        id,
        data: { status } as Record<string, unknown>,
        overrideAccess: true,
      })
      updated++
    } catch {
      // Skip items that fail (e.g. immutable invoices)
    }
  }

  revalidatePath('/[locale]', 'layout')
  return { updated, total: ids.length }
}

export async function bulkDelete(
  collection: string,
  ids: string[],
) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')
  if (ids.length === 0) throw new Error('Geen items geselecteerd')

  let deleted = 0
  for (const id of ids) {
    try {
      // Soft delete
      await payload.update({
        collection: collection as 'clients',
        id,
        data: { deletedAt: new Date().toISOString() },
        overrideAccess: true,
      })
      deleted++
    } catch {
      // Skip
    }
  }

  revalidatePath('/[locale]', 'layout')
  return { deleted, total: ids.length }
}

export async function bulkExportCsv(
  collection: string,
  ids: string[],
) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const { docs } = await payload.find({
    collection: collection as 'invoices',
    where: {
      organization: { equals: orgId },
      id: { in: ids },
    },
    limit: ids.length,
    depth: 1,
    overrideAccess: true,
  })

  // Convert to CSV based on collection type
  const rows: string[][] = []
  let headers: string[] = []

  if (collection === 'invoices') {
    headers = ['Factuurnummer', 'Klant', 'Status', 'Factuurdatum', 'Vervaldatum', 'Subtotaal', 'BTW', 'Totaal']
    for (const rawDoc of docs) {
      const doc = rawDoc as Record<string, unknown>
      const client = doc.client as Record<string, unknown> | undefined
      rows.push([
        (doc.invoiceNumber as string) || '',
        (client?.companyName as string) || '',
        (doc.status as string) || '',
        ((doc.issueDate as string) || '').split('T')[0],
        ((doc.dueDate as string) || '').split('T')[0],
        ((doc.subtotal as number) / 100).toFixed(2),
        ((doc.vatAmount as number) / 100).toFixed(2),
        ((doc.totalIncVat as number) / 100).toFixed(2),
      ])
    }
  } else if (collection === 'clients') {
    headers = ['Bedrijfsnaam', 'Contact', 'Email', 'Telefoon', 'KvK', 'BTW-nummer']
    for (const rawDoc of docs) {
      const doc = rawDoc as Record<string, unknown>
      rows.push([
        (doc.companyName as string) || '',
        (doc.contactName as string) || '',
        (doc.email as string) || '',
        (doc.phone as string) || '',
        (doc.kvkNumber as string) || '',
        (doc.vatNumber as string) || '',
      ])
    }
  }

  const csv = [
    headers.join(';'),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(';')),
  ].join('\n')

  return csv
}
