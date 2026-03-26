import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'
import { getMailTransporter, getFromAddress } from '@/lib/email/transporter'
import { reminderEmailHtml, reminderEmailText } from '@/lib/email/templates/reminder-email'

/**
 * Betalingsherinneringen cron endpoint.
 * Roep aan via: GET /api/cron/reminders?key=CRON_SECRET
 *
 * Logica:
 * - Zoek alle facturen met status 'sent' waarvan dueDate verstreken is
 * - Update status naar 'overdue'
 * - Stuur herinnering per email (dag 1, 7, 14 na vervaldatum)
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

  // 1. Mark sent invoices as overdue if past due date
  const { docs: newlyOverdue } = await payload.find({
    collection: 'invoices',
    where: {
      and: [
        { status: { equals: 'sent' } },
        { dueDate: { less_than: todayStr } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 500,
  })

  for (const inv of newlyOverdue) {
    await payload.update({
      collection: 'invoices',
      id: inv.id,
      data: { status: 'overdue' },
    })
  }

  // 2. Send reminders for overdue invoices
  // Reminder schedule: day 1, 7, 14 after due date
  const REMINDER_DAYS = [1, 7, 14]

  const { docs: overdueInvoices } = await payload.find({
    collection: 'invoices',
    where: {
      and: [
        { status: { equals: 'overdue' } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 500,
    depth: 1, // populate client
  })

  let sentCount = 0

  for (const rawInv of overdueInvoices) {
    const inv = rawInv as Record<string, unknown>
    const dueDate = new Date(inv.dueDate as string)
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
    const remindersSent = (inv.remindersSent as number) || 0

    // Check if we should send a reminder today
    const nextReminderDay = REMINDER_DAYS[remindersSent]
    if (!nextReminderDay || daysPastDue < nextReminderDay) continue

    // Get client email
    const client = inv.client as Record<string, unknown> | undefined
    if (!client?.email) continue

    // Get organization
    const orgId = typeof inv.organization === 'object'
      ? (inv.organization as Record<string, unknown>).id
      : inv.organization
    if (!orgId) continue

    let org: Record<string, unknown>
    try {
      org = await payload.findByID({
        collection: 'organizations',
        id: orgId as string,
      }) as Record<string, unknown>
    } catch {
      continue
    }

    // Send reminder
    try {
      const transporter = getMailTransporter()
      const emailData = {
        orgName: (org.name as string) || 'Adminyzr',
        clientName: (client.companyName as string) || (client.contactName as string) || '',
        invoiceNumber: (inv.invoiceNumber as string) || '',
        issueDate: (inv.issueDate as string) || '',
        dueDate: (inv.dueDate as string) || '',
        totalIncVat: (inv.totalIncVat as number) || 0,
        daysPastDue,
        reminderNumber: remindersSent + 1,
      }

      await transporter.sendMail({
        from: `"${emailData.orgName}" <${getFromAddress()}>`,
        to: client.email as string,
        subject: `Herinnering: Factuur ${emailData.invoiceNumber} — ${emailData.orgName}`,
        html: reminderEmailHtml(emailData),
        text: reminderEmailText(emailData),
      })

      // Update reminder count
      await payload.update({
        collection: 'invoices',
        id: rawInv.id,
        data: { remindersSent: remindersSent + 1 },
      })

      sentCount++
    } catch (error) {
      console.error(`[Reminders] Failed to send reminder for invoice ${inv.invoiceNumber}:`, error)
    }
  }

  return NextResponse.json({
    success: true,
    markedOverdue: newlyOverdue.length,
    remindersSent: sentCount,
    timestamp: now.toISOString(),
  })
}
