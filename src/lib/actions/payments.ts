'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPaymentProvider, getDefaultProviderForOrg } from '@/lib/payments/factory'
import { createPaymentLinkSchema, refundPaymentSchema } from '@/lib/payments/validation'
import type { InvoicePaymentData } from '@/lib/payments/types'

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

export async function createPaymentLink(invoiceId: string) {
  const parsed = createPaymentLinkSchema.safeParse({ invoiceId })
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Get invoice with client data
  const invoice = await payload.findByID({
    collection: 'invoices',
    id: invoiceId,
    depth: 1,
  }) as Record<string, unknown>

  const invoiceOrg = typeof invoice.organization === 'object'
    ? (invoice.organization as Record<string, unknown>).id as string
    : invoice.organization as string

  if (invoiceOrg !== orgId) throw new Error('Geen toegang')

  // Get payment provider
  const { provider, providerId, providerType } = await getPaymentProvider(orgId as string)

  const client = invoice.client as Record<string, unknown>
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3600'

  const invoiceData: InvoicePaymentData = {
    invoiceId,
    invoiceNumber: invoice.invoiceNumber as string,
    totalIncVatCents: invoice.totalIncVat as number,
    currency: 'EUR',
    description: `Factuur ${invoice.invoiceNumber}`,
    clientEmail: client?.email as string || '',
    clientName: (client?.companyName as string) || (client?.contactName as string) || '',
    redirectUrl: `${appUrl}/nl/portal/invoices?payment=complete&invoice=${invoiceId}`,
    webhookUrl: `${appUrl}/api/webhooks/payments/${providerType}`,
    locale: 'nl_NL',
  }

  // Create payment link via provider
  const result = await provider.createPaymentLink(invoiceData)

  // Create transaction record
  await payload.create({
    collection: 'transactions',
    data: {
      organization: orgId,
      invoice: invoiceId,
      paymentProvider: providerId,
      providerType,
      externalId: result.externalId,
      status: 'open',
      amountInCents: invoice.totalIncVat as number,
      currency: 'EUR',
      paymentUrl: result.url,
    },
    overrideAccess: true,
  })

  // Update invoice with payment link
  await payload.update({
    collection: 'invoices',
    id: invoiceId,
    data: {
      paymentUrl: result.url,
      paymentProvider: providerId,
      paymentExternalId: result.externalId,
    },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/invoices', 'page')
  return { url: result.url, externalId: result.externalId }
}

export async function getPaymentStatus(invoiceId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Get latest transaction for this invoice
  const { docs } = await payload.find({
    collection: 'transactions',
    where: {
      invoice: { equals: invoiceId },
      organization: { equals: orgId },
    },
    sort: '-createdAt',
    limit: 1,
  })

  if (docs.length === 0) return null

  const transaction = docs[0] as Record<string, unknown>
  return {
    status: transaction.status,
    paidAt: transaction.paidAt,
    amountInCents: transaction.amountInCents,
    paymentUrl: transaction.paymentUrl,
    providerType: transaction.providerType,
    externalId: transaction.externalId,
  }
}

export async function refundPayment(transactionId: string, amountInCents?: number) {
  const parsed = refundPaymentSchema.safeParse({ transactionId, amountInCents })
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const transaction = await payload.findByID({
    collection: 'transactions',
    id: transactionId,
  }) as Record<string, unknown>

  const txOrgId = typeof transaction.organization === 'object'
    ? (transaction.organization as Record<string, unknown>).id as string
    : transaction.organization as string

  if (txOrgId !== orgId) throw new Error('Geen toegang')
  if (transaction.status !== 'paid') throw new Error('Alleen betaalde transacties kunnen worden terugbetaald')

  const providerId = typeof transaction.paymentProvider === 'object'
    ? (transaction.paymentProvider as Record<string, unknown>).id as string
    : transaction.paymentProvider as string

  const { provider } = await getPaymentProvider(orgId as string, providerId)

  const result = await provider.refundPayment(
    transaction.externalId as string,
    amountInCents,
  )

  if (result.success) {
    await payload.update({
      collection: 'transactions',
      id: transactionId,
      data: {
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundAmountInCents: result.amountInCents,
        refundExternalId: result.refundId,
      },
      overrideAccess: true,
    })
  }

  revalidatePath('/[locale]/invoices', 'page')
  return result
}

export async function getTransactionsForInvoice(invoiceId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const { docs } = await payload.find({
    collection: 'transactions',
    where: {
      invoice: { equals: invoiceId },
      organization: { equals: orgId },
    },
    sort: '-createdAt',
    limit: 50,
  })

  return docs
}

export async function hasPaymentProvider() {
  const { orgId } = await getAuthUser()
  if (!orgId) return false

  const result = await getDefaultProviderForOrg(orgId as string)
  return result !== null
}
