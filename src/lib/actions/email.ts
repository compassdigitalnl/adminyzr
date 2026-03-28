'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getMailTransporter, getFromAddress } from '@/lib/email/transporter'
import { invoiceEmailHtml, invoiceEmailText, type InvoiceEmailData } from '@/lib/email/templates/invoice-email'
import { getDefaultProviderForOrg } from '@/lib/payments/factory'
import { createPaymentLink } from '@/lib/actions/payments'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePdf, type InvoicePdfData } from '@/lib/pdf/invoice-template'
import React from 'react'

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

export async function sendInvoiceEmail(invoiceId: string) {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Fetch all needed data
  const invoice = await payload.findByID({
    collection: 'invoices',
    id: invoiceId,
    depth: 1,
  }) as Record<string, unknown>

  const org = await payload.findByID({
    collection: 'organizations',
    id: orgId as string,
  }) as Record<string, unknown>

  const { docs: items } = await payload.find({
    collection: 'invoice-items',
    where: { invoice: { equals: invoiceId } },
    sort: 'sortOrder',
    limit: 100,
  })

  const client = invoice.client as Record<string, unknown> | undefined
  if (!client?.email) {
    throw new Error('Klant heeft geen e-mailadres')
  }

  const clientAddress = client?.address as Record<string, string> | undefined
  const orgAddress = org.address as Record<string, string> | undefined
  const orgContact = org.contact as Record<string, string> | undefined
  const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined

  // Build PDF
  const pdfData: InvoicePdfData = {
    invoiceNumber: (invoice.invoiceNumber as string) || '',
    issueDate: (invoice.issueDate as string) || new Date().toISOString(),
    dueDate: (invoice.dueDate as string) || new Date().toISOString(),
    reference: invoice.reference as string | undefined,
    status: (invoice.type as string) || 'invoice',
    orgName: (org.name as string) || '',
    orgAddress: orgAddress
      ? [orgAddress.street, orgAddress.houseNumber, orgAddress.postalCode, orgAddress.city]
          .filter(Boolean).join(' ')
      : undefined,
    orgKvk: org.kvkNumber as string | undefined,
    orgVat: org.vatNumber as string | undefined,
    orgIban: org.iban as string | undefined,
    orgEmail: orgContact?.email,
    orgPhone: orgContact?.phone,
    clientName: (client.companyName as string) || '',
    clientAddress: clientAddress
      ? [clientAddress.street, clientAddress.houseNumber, clientAddress.postalCode, clientAddress.city]
          .filter(Boolean).join(' ')
      : undefined,
    clientKvk: client.kvkNumber as string | undefined,
    clientVat: client.vatNumber as string | undefined,
    items: items.map((item) => {
      const i = item as Record<string, unknown>
      return {
        description: (i.description as string) || '',
        quantity: (i.quantity as number) || 0,
        unitPrice: (i.unitPrice as number) || 0,
        vatRate: (i.vatRate as string) || '21',
        lineTotal: (i.lineTotal as number) || 0,
      }
    }),
    subtotal: (invoice.subtotal as number) || 0,
    vatAmount: (invoice.vatAmount as number) || 0,
    totalIncVat: (invoice.totalIncVat as number) || 0,
    notes: invoice.notes as string | undefined,
    footerText: invoiceSettings?.footerText as string | undefined,
  }

  // Generate PDF buffer
  // eslint-disable-next-line
  const pdfBuffer = await renderToBuffer(React.createElement(InvoicePdf, { data: pdfData }) as any)

  // Auto-create payment link if a provider is configured
  let paymentUrl: string | undefined
  try {
    const defaultProvider = await getDefaultProviderForOrg(orgId as string)
    if (defaultProvider) {
      const paymentResult = await createPaymentLink(invoiceId)
      paymentUrl = paymentResult.url
    }
  } catch {
    // Payment link creation failure should not block invoice sending
  }

  // Get org branding and email templates
  const branding = org.branding as Record<string, unknown> | undefined
  const emailTemplates = org.emailTemplates as Record<string, unknown> | undefined
  const logoAttachment = branding?.logo as Record<string, unknown> | undefined
  const logoUrl = logoAttachment?.url as string | undefined

  // Build email
  const emailData: InvoiceEmailData = {
    orgName: (org.name as string) || 'Adminyzr',
    clientName: (client.companyName as string) || (client.contactName as string) || '',
    invoiceNumber: (invoice.invoiceNumber as string) || '',
    issueDate: (invoice.issueDate as string) || '',
    dueDate: (invoice.dueDate as string) || '',
    totalIncVat: (invoice.totalIncVat as number) || 0,
    notes: invoice.notes as string | undefined,
    paymentUrl,
    orgLogo: logoUrl ? `${process.env.NEXT_PUBLIC_APP_URL}${logoUrl}` : undefined,
    brandColor: (branding?.primaryColor as string) || undefined,
    customGreeting: emailTemplates?.invoiceGreeting as string | undefined,
    customFooter: emailTemplates?.invoiceFooter as string | undefined,
  }

  const transporter = getMailTransporter()

  const customSubject = emailTemplates?.invoiceSubject as string | undefined
  const emailSubject = customSubject
    ? customSubject.replace('{invoiceNumber}', emailData.invoiceNumber).replace('{orgName}', emailData.orgName)
    : `Factuur ${emailData.invoiceNumber} — ${emailData.orgName}`
  const recipientEmail = client.email as string

  try {
    await transporter.sendMail({
      from: `"${emailData.orgName}" <${getFromAddress()}>`,
      to: recipientEmail,
      subject: emailSubject,
      html: invoiceEmailHtml(emailData),
      text: invoiceEmailText(emailData),
      attachments: [
        {
          filename: `${emailData.invoiceNumber}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
    })

    // Log successful email
    try {
      await payload.create({
        collection: 'email-log',
        data: {
          to: recipientEmail,
          subject: emailSubject,
          status: 'sent',
          relatedCollection: 'invoices',
          relatedDocumentId: invoiceId,
          organization: orgId,
          sentAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
    } catch {
      // Email log failure shouldn't block the operation
    }
  } catch (emailError) {
    // Log failed email
    try {
      await payload.create({
        collection: 'email-log',
        data: {
          to: recipientEmail,
          subject: emailSubject,
          status: 'failed',
          relatedCollection: 'invoices',
          relatedDocumentId: invoiceId,
          organization: orgId,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        },
        overrideAccess: true,
      })
    } catch {
      // Email log failure shouldn't block the operation
    }
    throw emailError
  }

  // Update invoice status to sent
  await payload.update({
    collection: 'invoices',
    id: invoiceId,
    data: {
      status: 'sent',
      sentAt: new Date().toISOString(),
    },
  })

  // Log the email in audit log
  try {
    await payload.create({
      collection: 'audit-log',
      data: {
        user: null,
        organization: orgId,
        action: 'send',
        collection: 'invoices',
        documentId: invoiceId,
      },
    })
  } catch {
    // Audit log failure shouldn't block the operation
  }

  revalidatePath('/[locale]/invoices', 'page')
  return { success: true }
}
