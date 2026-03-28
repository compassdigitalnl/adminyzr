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

type ImportResult = {
  imported: number
  skipped: number
  errors: { row: number; error: string }[]
}

/**
 * Import clients from CSV
 * Expected columns: Bedrijfsnaam, Contactpersoon, Email, Telefoon, KvK-nummer, BTW-nummer, Straat, Huisnummer, Postcode, Plaats
 */
export async function importClients(formData: FormData): Promise<ImportResult> {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const file = formData.get('file') as File
  if (!file) throw new Error('Geen bestand')

  const content = await file.text()
  const rows = parseCSV(content)

  if (rows.length < 2) throw new Error('Bestand is leeg')

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    if (cols.length < 2 || cols.every((c) => !c.trim())) continue

    const companyName = getCol(headers, cols, ['bedrijfsnaam', 'company', 'naam', 'name'])
    const contactName = getCol(headers, cols, ['contactpersoon', 'contact', 'contactnaam'])
    const email = getCol(headers, cols, ['email', 'e-mail', 'emailadres'])

    if (!companyName && !contactName) {
      result.errors.push({ row: i + 1, error: 'Bedrijfsnaam of contactpersoon is verplicht' })
      continue
    }

    // Duplicate check on email
    if (email) {
      const { docs } = await payload.find({
        collection: 'clients',
        where: {
          organization: { equals: orgId },
          email: { equals: email },
          deletedAt: { exists: false },
        },
        limit: 1,
        overrideAccess: true,
      })
      if (docs.length > 0) {
        result.skipped++
        continue
      }
    }

    try {
      await payload.create({
        collection: 'clients',
        data: {
          organization: orgId,
          companyName: companyName || undefined,
          contactName: contactName || undefined,
          email: email || undefined,
          phone: getCol(headers, cols, ['telefoon', 'phone', 'tel']) || undefined,
          kvkNumber: getCol(headers, cols, ['kvk', 'kvk-nummer', 'kvknummer']) || undefined,
          vatNumber: getCol(headers, cols, ['btw', 'btw-nummer', 'btwnummer', 'vat']) || undefined,
          address: {
            street: getCol(headers, cols, ['straat', 'street', 'adres']) || undefined,
            houseNumber: getCol(headers, cols, ['huisnummer', 'nummer', 'housenumber']) || undefined,
            postalCode: getCol(headers, cols, ['postcode', 'zip', 'postal']) || undefined,
            city: getCol(headers, cols, ['plaats', 'stad', 'city']) || undefined,
            country: getCol(headers, cols, ['land', 'country']) || 'NL',
          },
        },
        overrideAccess: true,
      })
      result.imported++
    } catch (err) {
      result.errors.push({ row: i + 1, error: err instanceof Error ? err.message : 'Onbekende fout' })
    }
  }

  revalidatePath('/[locale]/clients', 'page')
  return result
}

/**
 * Import products from CSV
 * Expected columns: Naam, SKU, Omschrijving, Prijs (excl. BTW), BTW-tarief
 */
export async function importProducts(formData: FormData): Promise<ImportResult> {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const file = formData.get('file') as File
  if (!file) throw new Error('Geen bestand')

  const content = await file.text()
  const rows = parseCSV(content)

  if (rows.length < 2) throw new Error('Bestand is leeg')

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    if (cols.length < 2 || cols.every((c) => !c.trim())) continue

    const name = getCol(headers, cols, ['naam', 'name', 'product', 'productnaam'])
    if (!name) {
      result.errors.push({ row: i + 1, error: 'Productnaam is verplicht' })
      continue
    }

    // Duplicate check on SKU
    const sku = getCol(headers, cols, ['sku', 'artikelnummer', 'code'])
    if (sku) {
      const { docs } = await payload.find({
        collection: 'products',
        where: {
          organization: { equals: orgId },
          sku: { equals: sku },
          deletedAt: { exists: false },
        },
        limit: 1,
        overrideAccess: true,
      })
      if (docs.length > 0) {
        result.skipped++
        continue
      }
    }

    const priceStr = getCol(headers, cols, ['prijs', 'price', 'unitprice', 'prijs excl. btw'])
    const priceCents = priceStr
      ? Math.round(parseFloat(priceStr.replace(',', '.').replace(/[€\s]/g, '')) * 100)
      : 0

    const vatStr = getCol(headers, cols, ['btw', 'btw-tarief', 'vat', 'btw%'])
    let vatRate = '21'
    if (vatStr) {
      const v = parseInt(vatStr)
      if (v === 9) vatRate = '9'
      else if (v === 0) vatRate = '0'
    }

    try {
      await payload.create({
        collection: 'products',
        data: {
          organization: orgId,
          name,
          sku: sku || undefined,
          description: getCol(headers, cols, ['omschrijving', 'description', 'beschrijving']) || undefined,
          unitPrice: priceCents,
          vatRate,
          isActive: true,
        },
        overrideAccess: true,
      })
      result.imported++
    } catch (err) {
      result.errors.push({ row: i + 1, error: err instanceof Error ? err.message : 'Onbekende fout' })
    }
  }

  revalidatePath('/[locale]/products', 'page')
  return result
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseCSV(content: string): string[][] {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.map((line) => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  })
}

function getCol(headers: string[], cols: string[], aliases: string[]): string {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias))
    if (idx !== -1 && cols[idx]) return cols[idx].trim()
  }
  return ''
}
