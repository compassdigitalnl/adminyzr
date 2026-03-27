'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { parseMT940, parseCSV, type ParsedTransaction } from '@/lib/bank/mt940-parser'
import { findBestMatch } from '@/lib/bank/matching-engine'

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

// ─── Bank Accounts ──────────────────────────────────────────────────────────

export async function getBankAccounts() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const { docs } = await payload.find({
    collection: 'bank-accounts',
    where: {
      organization: { equals: orgId },
      deletedAt: { exists: false },
    },
    sort: '-isDefault',
    limit: 20,
  })

  return docs
}

export async function createBankAccount(data: {
  name: string
  iban?: string
  bankName?: string
  isDefault?: boolean
}) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const doc = await payload.create({
    collection: 'bank-accounts',
    data: {
      organization: orgId,
      name: data.name,
      iban: data.iban,
      bankName: data.bankName,
      isDefault: data.isDefault,
    },
  })

  revalidatePath('/[locale]/bank', 'page')
  return { id: (doc as Record<string, unknown>).id }
}

export async function deleteBankAccount(id: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  await payload.update({
    collection: 'bank-accounts',
    id,
    data: { deletedAt: new Date().toISOString(), isDefault: false },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/bank', 'page')
}

// ─── Import ─────────────────────────────────────────────────────────────────

export async function importBankStatement(formData: FormData) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const file = formData.get('file') as File | null
  const bankAccountId = formData.get('bankAccountId') as string | null

  if (!file) throw new Error('Geen bestand geüpload')
  if (!bankAccountId) throw new Error('Selecteer een bankrekening')

  const content = await file.text()
  const fileName = file.name.toLowerCase()

  // Parse based on file type
  let parseResult
  if (fileName.endsWith('.sta') || fileName.endsWith('.mt940') || content.includes(':20:') || content.includes(':60F:')) {
    parseResult = parseMT940(content)
  } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    // Detect delimiter
    const firstLine = content.split('\n')[0]
    const delimiter = firstLine.includes(';') ? ';' : ','
    parseResult = parseCSV(content, delimiter)
  } else {
    throw new Error('Ongeldig bestandsformaat. Upload een MT940 (.sta) of CSV bestand.')
  }

  // Deduplicate — skip transactions that already exist
  const existingIds = new Set<string>()
  if (parseResult.transactions.length > 0) {
    const externalIds = parseResult.transactions
      .map((t) => t.externalId)
      .filter(Boolean) as string[]

    if (externalIds.length > 0) {
      const { docs: existing } = await payload.find({
        collection: 'bank-transactions',
        where: {
          organization: { equals: orgId },
          externalId: { in: externalIds },
        },
        limit: 1000,
        overrideAccess: true,
      })

      existing.forEach((doc) => {
        const d = doc as Record<string, unknown>
        if (d.externalId) existingIds.add(d.externalId as string)
      })
    }
  }

  // Insert new transactions
  let imported = 0
  let skipped = 0

  for (const tx of parseResult.transactions) {
    if (tx.externalId && existingIds.has(tx.externalId)) {
      skipped++
      continue
    }

    await payload.create({
      collection: 'bank-transactions',
      data: {
        organization: orgId,
        bankAccount: bankAccountId,
        date: tx.date,
        amountInCents: tx.amountInCents,
        currency: tx.currency,
        description: tx.description,
        counterpartyName: tx.counterpartyName,
        counterpartyIban: tx.counterpartyIban,
        reference: tx.reference,
        externalId: tx.externalId,
        status: 'unmatched',
      },
      overrideAccess: true,
    })
    imported++
  }

  // Update last synced date
  await payload.update({
    collection: 'bank-accounts',
    id: bankAccountId,
    data: { lastSyncedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/bank', 'page')

  return {
    imported,
    skipped,
    errors: parseResult.errors,
    total: parseResult.transactions.length,
  }
}

// ─── Reconciliatie ──────────────────────────────────────────────────────────

export async function autoReconcile() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Get unmatched transactions (only positive = incoming payments)
  const { docs: unmatchedTx } = await payload.find({
    collection: 'bank-transactions',
    where: {
      organization: { equals: orgId },
      status: { equals: 'unmatched' },
      amountInCents: { greater_than: 0 },
    },
    limit: 500,
    overrideAccess: true,
  })

  // Get open invoices (sent + overdue)
  const { docs: openInvoices } = await payload.find({
    collection: 'invoices',
    where: {
      organization: { equals: orgId },
      status: { in: ['sent', 'overdue'] },
      deletedAt: { exists: false },
    },
    depth: 1,
    limit: 500,
    overrideAccess: true,
  })

  // Build candidate list
  const candidates = openInvoices.map((inv) => {
    const i = inv as Record<string, unknown>
    const client = i.client as Record<string, unknown> | undefined
    return {
      invoiceId: String(i.id),
      invoiceNumber: (i.invoiceNumber as string) || '',
      totalIncVat: (i.totalIncVat as number) || 0,
      clientName: (client?.companyName as string) || (client?.contactName as string),
      clientIban: client?.iban as string | undefined,
      type: 'invoice' as const,
    }
  })

  let matched = 0

  for (const rawTx of unmatchedTx) {
    const tx = rawTx as Record<string, unknown>

    const match = findBestMatch(
      {
        amountInCents: tx.amountInCents as number,
        description: (tx.description as string) || '',
        counterpartyName: tx.counterpartyName as string | undefined,
        counterpartyIban: tx.counterpartyIban as string | undefined,
        reference: tx.reference as string | undefined,
      },
      candidates,
    )

    if (match && match.confidence >= 60) {
      // Update transaction
      await payload.update({
        collection: 'bank-transactions',
        id: tx.id as string,
        data: {
          status: 'auto_matched',
          matchedInvoice: match.invoiceId,
          matchConfidence: match.confidence,
        },
        overrideAccess: true,
      })

      // Update invoice to paid
      await payload.update({
        collection: 'invoices',
        id: match.invoiceId,
        data: {
          status: 'paid',
          paidAt: (tx.date as string) || new Date().toISOString(),
        },
        overrideAccess: true,
      })

      // Remove from candidates (don't match same invoice twice)
      const idx = candidates.findIndex((c) => c.invoiceId === match.invoiceId)
      if (idx !== -1) candidates.splice(idx, 1)

      matched++
    }
  }

  revalidatePath('/[locale]/bank', 'page')
  return { matched, total: unmatchedTx.length }
}

export async function manualMatch(transactionId: string, invoiceId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const tx = await payload.findByID({
    collection: 'bank-transactions',
    id: transactionId,
  }) as Record<string, unknown>

  const txOrgId = typeof tx.organization === 'object'
    ? (tx.organization as Record<string, unknown>).id as string
    : tx.organization as string
  if (txOrgId !== orgId) throw new Error('Geen toegang')

  // Update transaction
  await payload.update({
    collection: 'bank-transactions',
    id: transactionId,
    data: {
      status: 'manual_matched',
      matchedInvoice: invoiceId,
      matchConfidence: 100,
    },
    overrideAccess: true,
  })

  // Update invoice to paid
  await payload.update({
    collection: 'invoices',
    id: invoiceId,
    data: {
      status: 'paid',
      paidAt: (tx.date as string) || new Date().toISOString(),
    },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/bank', 'page')
}

export async function unmatchTransaction(transactionId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const tx = await payload.findByID({
    collection: 'bank-transactions',
    id: transactionId,
    depth: 0,
  }) as Record<string, unknown>

  const txOrgId = typeof tx.organization === 'object'
    ? (tx.organization as Record<string, unknown>).id as string
    : tx.organization as string
  if (txOrgId !== orgId) throw new Error('Geen toegang')

  await payload.update({
    collection: 'bank-transactions',
    id: transactionId,
    data: {
      status: 'unmatched',
      matchedInvoice: null,
      matchedPurchaseInvoice: null,
      matchConfidence: null,
    },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/bank', 'page')
}

export async function ignoreTransaction(transactionId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  await payload.update({
    collection: 'bank-transactions',
    id: transactionId,
    data: { status: 'ignored' },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/bank', 'page')
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getBankTransactions(filters?: {
  status?: string
  bankAccountId?: string
  page?: number
}) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const conditions: Record<string, unknown> = {
    organization: { equals: orgId },
  }

  if (filters?.status) {
    conditions.status = { equals: filters.status }
  }
  if (filters?.bankAccountId) {
    conditions.bankAccount = { equals: filters.bankAccountId }
  }

  const { docs, totalPages, totalDocs } = await payload.find({
    collection: 'bank-transactions',
    where: conditions as Where,
    sort: '-date',
    limit: 50,
    page: filters?.page || 1,
    depth: 1,
  })

  return { docs, totalPages, totalDocs }
}

export async function getReconciliationStats() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const [unmatched, autoMatched, manualMatched, ignored] = await Promise.all([
    payload.count({ collection: 'bank-transactions', where: { organization: { equals: orgId }, status: { equals: 'unmatched' } }, overrideAccess: true }),
    payload.count({ collection: 'bank-transactions', where: { organization: { equals: orgId }, status: { equals: 'auto_matched' } }, overrideAccess: true }),
    payload.count({ collection: 'bank-transactions', where: { organization: { equals: orgId }, status: { equals: 'manual_matched' } }, overrideAccess: true }),
    payload.count({ collection: 'bank-transactions', where: { organization: { equals: orgId }, status: { equals: 'ignored' } }, overrideAccess: true }),
  ])

  return {
    unmatched: unmatched.totalDocs,
    autoMatched: autoMatched.totalDocs,
    manualMatched: manualMatched.totalDocs,
    ignored: ignored.totalDocs,
    total: unmatched.totalDocs + autoMatched.totalDocs + manualMatched.totalDocs + ignored.totalDocs,
  }
}
