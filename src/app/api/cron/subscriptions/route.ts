import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'

/**
 * Recurring billing / subscriptions cron endpoint.
 * Roep aan via: GET /api/cron/subscriptions?key=CRON_SECRET
 *
 * Logica:
 * - Zoek alle actieve abonnementen waarvan nextInvoiceDate <= vandaag
 * - Genereer per abonnement een factuur
 * - Als autoSend is true, markeer als 'sent'
 * - Update nextInvoiceDate, invoiceCount en lastInvoiceId
 * - Als endDate is bereikt, markeer als 'expired'
 */
export async function GET(request: NextRequest) {
  // Auth via shared secret
  const key = request.nextUrl.searchParams.get('key')
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Find all active subscriptions where nextInvoiceDate <= today
  const { docs: dueSubscriptions } = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { status: { equals: 'active' } },
        { nextInvoiceDate: { less_than_equal: todayStr } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 500,
    depth: 0,
  })

  let generatedCount = 0
  let errorCount = 0
  const errors: Array<{ subscriptionId: string; error: string }> = []

  for (const rawSub of dueSubscriptions) {
    const sub = rawSub as Record<string, unknown>

    try {
      // Get organization
      const orgId = typeof sub.organization === 'object'
        ? (sub.organization as Record<string, unknown>).id
        : sub.organization

      if (!orgId) continue

      // Generate invoice number
      const org = await payload.findByID({
        collection: 'organizations',
        id: orgId as string,
      }) as Record<string, unknown>

      const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined
      const prefix = (invoiceSettings?.prefix as string) || 'INV'
      const nextNumber = (invoiceSettings?.nextNumber as number) || 1
      const year = new Date().getFullYear()
      const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`

      // Increment the invoice counter
      await payload.update({
        collection: 'organizations',
        id: orgId as string,
        data: {
          invoiceSettings: {
            ...invoiceSettings,
            nextNumber: nextNumber + 1,
          },
        } as Record<string, unknown>,
        overrideAccess: true,
      })

      // Calculate amounts
      const amount = sub.amount as number
      const vatRateStr = sub.vatRate as string
      const vatPercent = vatRateStr === 'exempt' ? 0 : parseInt(vatRateStr)
      const vatAmount = Math.round(amount * vatPercent / 100)
      const totalIncVat = amount + vatAmount

      // Get client payment terms
      const clientId = typeof sub.client === 'object'
        ? (sub.client as Record<string, unknown>).id
        : sub.client

      let paymentTermDays = 30
      try {
        const client = await payload.findByID({
          collection: 'clients',
          id: clientId as string,
        }) as Record<string, unknown>
        if (client.paymentTermDays) paymentTermDays = client.paymentTermDays as number
      } catch {
        // Use default
      }

      const issueDate = todayStr
      const dueDateObj = new Date(now)
      dueDateObj.setDate(dueDateObj.getDate() + paymentTermDays)
      const dueDate = dueDateObj.toISOString().split('T')[0]

      const autoSend = sub.autoSend as boolean

      // Create invoice
      const invoice = await payload.create({
        collection: 'invoices',
        data: {
          organization: orgId,
          invoiceNumber,
          client: clientId,
          type: 'invoice',
          status: autoSend ? 'sent' : 'draft',
          issueDate,
          dueDate,
          reference: `Abonnement: ${sub.name as string}`,
          subtotal: amount,
          vatAmount,
          totalIncVat,
          sentAt: autoSend ? new Date().toISOString() : undefined,
        },
        overrideAccess: true,
      })

      // Create invoice item
      await payload.create({
        collection: 'invoice-items',
        data: {
          invoice: invoice.id,
          description: sub.name as string,
          quantity: 1,
          unitPrice: amount,
          vatRate: vatRateStr,
          sortOrder: 0,
          lineTotal: amount,
        },
        overrideAccess: true,
      })

      // Calculate next invoice date
      const currentNextDate = sub.nextInvoiceDate as string
      const nextDate = new Date(currentNextDate)
      const interval = sub.interval as string

      switch (interval) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
      }

      const nextInvoiceDateStr = nextDate.toISOString().split('T')[0]
      const invoiceCount = ((sub.invoiceCount as number) || 0) + 1

      // Check if subscription has expired
      const endDate = sub.endDate as string | undefined
      const hasExpired = endDate && nextDate > new Date(endDate)

      await payload.update({
        collection: 'subscriptions',
        id: rawSub.id,
        data: {
          lastInvoiceId: invoice.id,
          invoiceCount,
          nextInvoiceDate: nextInvoiceDateStr,
          ...(hasExpired ? { status: 'expired' } : {}),
        },
        overrideAccess: true,
      })

      generatedCount++
    } catch (error) {
      errorCount++
      errors.push({
        subscriptionId: String(rawSub.id),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.error(`[Subscriptions Cron] Failed for subscription ${rawSub.id}:`, error)
    }
  }

  return NextResponse.json({
    success: true,
    processed: dueSubscriptions.length,
    generated: generatedCount,
    errors: errorCount,
    errorDetails: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  })
}
