import { NextRequest, NextResponse } from 'next/server'
import { simpleParser } from 'mailparser'
import { getPayloadClient } from '@/lib/get-payload'
import { processInvoiceOcr } from '@/lib/services/ocr'

/**
 * Inbound email webhook voor inkoopfacturen.
 *
 * Ondersteunt drie inbound methodes:
 *
 * 1. AWS SES via SNS — per-tenant catch-all op {slug}@inbox.adminyzr.io
 *    SES slaat de mail op in S3, SNS stuurt notificatie naar dit endpoint.
 *    Tenant wordt bepaald aan de hand van het ontvangstadres (To-header).
 *
 * 2. Raw email (RFC 2822) — directe POST met de volledige email als body.
 *
 * 3. Multipart form-data — POST met file + metadata velden.
 *
 * POST /api/webhooks/email?key=CRON_SECRET
 */

const INBOUND_EMAIL_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || 'inbox.adminyzr.io'

export async function POST(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const contentType = request.headers.get('content-type') || ''

  try {
    // ── SNS message handling ──────────────────────────────────────────────
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      const body = await request.text()
      let snsMessage: Record<string, unknown>

      try {
        snsMessage = JSON.parse(body)
      } catch {
        // Not JSON — treat as raw email (legacy path)
        return handleRawEmail(payload, body, request.nextUrl.searchParams.get('org') || '')
      }

      // SNS SubscriptionConfirmation — auto-confirm
      if (snsMessage.Type === 'SubscriptionConfirmation') {
        const subscribeUrl = snsMessage.SubscribeURL as string
        if (subscribeUrl) {
          await fetch(subscribeUrl)
        }
        return NextResponse.json({ confirmed: true })
      }

      // SNS Notification — parse the SES email event
      if (snsMessage.Type === 'Notification') {
        const message = typeof snsMessage.Message === 'string'
          ? JSON.parse(snsMessage.Message)
          : snsMessage.Message

        return handleSesNotification(payload, message)
      }

      // Fallback: try as raw email
      return handleRawEmail(payload, body, request.nextUrl.searchParams.get('org') || '')
    }

    // ── Multipart form-data handling (existing path) ──────────────────────
    if (contentType.includes('multipart/form-data')) {
      return handleFormData(payload, request)
    }

    // ── Raw email body (existing path) ────────────────────────────────────
    const rawBody = await request.text()
    return handleRawEmail(payload, rawBody, request.nextUrl.searchParams.get('org') || '')
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Email webhook error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Extract org slug from a recipient address like "acme@inbox.adminyzr.io"
 */
function extractSlugFromRecipient(recipients: string[]): string | null {
  for (const addr of recipients) {
    const email = addr.toLowerCase().trim()
    const match = email.match(new RegExp(`^([a-z0-9][a-z0-9-]*)@${INBOUND_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`))
    if (match) return match[1]
  }
  return null
}

/**
 * Resolve organization ID from a slug
 */
async function resolveOrgBySlug(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  slug: string,
): Promise<string | null> {
  const { docs } = await payload.find({
    collection: 'organizations',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs.length > 0 ? String((docs[0] as Record<string, unknown>).id) : null
}

/**
 * Resolve organization by sender email (fallback — looks up in clients)
 */
async function resolveOrgBySender(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  senderEmail: string,
): Promise<string | null> {
  if (!senderEmail) return null
  const { docs } = await payload.find({
    collection: 'clients',
    where: { email: { equals: senderEmail } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (docs.length > 0) {
    const client = docs[0] as Record<string, unknown>
    return typeof client.organization === 'object'
      ? String((client.organization as Record<string, unknown>).id)
      : String(client.organization)
  }
  return null
}

/**
 * Handle AWS SES notification (via SNS)
 *
 * SES event contains mail headers and either the content inline or a reference
 * to an S3 object where the raw email is stored.
 */
async function handleSesNotification(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  message: Record<string, unknown>,
) {
  const mail = message.mail as Record<string, unknown> | undefined
  const receipt = message.receipt as Record<string, unknown> | undefined

  if (!mail) {
    return NextResponse.json({ error: 'Geen mail object in SES notificatie' }, { status: 400 })
  }

  // Get recipients for tenant matching
  const recipients: string[] = (mail.destination as string[]) || []
  const slug = extractSlugFromRecipient(recipients)

  let organizationId = ''
  if (slug) {
    organizationId = (await resolveOrgBySlug(payload, slug)) || ''
  }

  // Parse the raw email content if available
  const content = message.content as string | undefined

  if (!content) {
    // No inline content — SES was configured with S3 action only.
    // We need to fetch from S3 bucket. For now log and inform.
    const senderEmail = extractSenderFromSesHeaders(mail)
    await logEmail(payload, senderEmail, `SES notification (no content)`, 'failed', 'E-mail content niet beschikbaar — controleer SES configuratie (gebruik SNS content notificatie)', organizationId)
    return NextResponse.json({ error: 'Email content niet beschikbaar. Configureer SES om content mee te sturen via SNS.' }, { status: 400 })
  }

  // Parse the raw email
  const parsed = await simpleParser(content)
  const senderEmail = typeof parsed.from?.value?.[0]?.address === 'string' ? parsed.from.value[0].address : ''
  const subject = parsed.subject || ''

  // Fallback org resolution via sender email
  if (!organizationId) {
    organizationId = (await resolveOrgBySender(payload, senderEmail)) || ''
  }

  if (!organizationId) {
    await logEmail(payload, senderEmail, subject, 'failed', `Organisatie niet gevonden voor ontvanger: ${recipients.join(', ')}`, '')
    return NextResponse.json({ error: 'Organisatie niet gevonden' }, { status: 400 })
  }

  // Check for spam/virus (SES provides these verdicts)
  if (receipt) {
    const spamVerdict = (receipt.spamVerdict as Record<string, string>)?.status
    const virusVerdict = (receipt.virusVerdict as Record<string, string>)?.status
    if (spamVerdict === 'FAIL' || virusVerdict === 'FAIL') {
      await logEmail(payload, senderEmail, subject, 'failed', `Geblokkeerd: spam=${spamVerdict}, virus=${virusVerdict}`, organizationId)
      return NextResponse.json({ error: 'Email geblokkeerd door spam/virus filter' }, { status: 400 })
    }
  }

  // Find PDF attachment
  const pdfAttachment = parsed.attachments?.find(
    (a) => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'),
  )

  if (!pdfAttachment) {
    await logEmail(payload, senderEmail, subject, 'failed', 'Geen PDF-bijlage gevonden', organizationId)
    return NextResponse.json({ error: 'Geen PDF-bijlage gevonden in de email' }, { status: 400 })
  }

  return processAndCreateInvoice(payload, pdfAttachment.content, pdfAttachment.filename || 'invoice.pdf', senderEmail, subject, organizationId)
}

function extractSenderFromSesHeaders(mail: Record<string, unknown>): string {
  const headers = mail.commonHeaders as Record<string, unknown> | undefined
  if (headers?.from) {
    const from = headers.from as string[]
    return from[0] || ''
  }
  return (mail.source as string) || ''
}

/**
 * Handle multipart/form-data uploads (existing path)
 */
async function handleFormData(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  request: NextRequest,
) {
  const formData = await request.formData()
  let organizationId = (formData.get('organizationId') as string) || ''
  const file = formData.get('file') as File | null
  const rawEmail = formData.get('email') as string | null

  let fileBuffer: Buffer | null = null
  let fileName = 'invoice.pdf'
  let senderEmail = ''
  let subject = ''

  if (rawEmail) {
    const parsed = await simpleParser(rawEmail)
    senderEmail = typeof parsed.from?.value?.[0]?.address === 'string' ? parsed.from.value[0].address : ''
    subject = parsed.subject || ''

    // Check To-address for tenant matching
    if (!organizationId) {
      const toAddresses = parsed.to
        ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap((t) =>
            t.value.map((v) => v.address || ''),
          )
        : []
      const slug = extractSlugFromRecipient(toAddresses)
      if (slug) {
        organizationId = (await resolveOrgBySlug(payload, slug)) || ''
      }
    }

    const pdfAttachment = parsed.attachments?.find(
      (a) => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'),
    )
    if (pdfAttachment) {
      fileBuffer = pdfAttachment.content
      fileName = pdfAttachment.filename || 'invoice.pdf'
    }
  } else if (file) {
    fileBuffer = Buffer.from(await file.arrayBuffer())
    fileName = file.name
    senderEmail = (formData.get('from') as string) || ''
    subject = (formData.get('subject') as string) || ''
  }

  if (!fileBuffer) {
    await logEmail(payload, senderEmail, subject, 'failed', 'Geen PDF-bijlage gevonden', organizationId)
    return NextResponse.json({ error: 'Geen PDF-bijlage gevonden in de email' }, { status: 400 })
  }

  if (!organizationId) {
    organizationId = (await resolveOrgBySender(payload, senderEmail)) || ''
  }

  if (!organizationId) {
    await logEmail(payload, senderEmail, subject, 'failed', 'Kan organisatie niet bepalen', '')
    return NextResponse.json({ error: 'Organisatie niet gevonden. Geef organizationId mee.' }, { status: 400 })
  }

  return processAndCreateInvoice(payload, fileBuffer, fileName, senderEmail, subject, organizationId)
}

/**
 * Handle raw email body (existing path)
 */
async function handleRawEmail(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  rawBody: string,
  orgParam: string,
) {
  let organizationId = orgParam

  const parsed = await simpleParser(rawBody)
  const senderEmail = typeof parsed.from?.value?.[0]?.address === 'string' ? parsed.from.value[0].address : ''
  const subject = parsed.subject || ''

  // Check To-address for tenant matching
  if (!organizationId) {
    const toAddresses = parsed.to
      ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap((t) =>
          t.value.map((v) => v.address || ''),
        )
      : []
    const slug = extractSlugFromRecipient(toAddresses)
    if (slug) {
      organizationId = (await resolveOrgBySlug(payload, slug)) || ''
    }
  }

  const pdfAttachment = parsed.attachments?.find(
    (a) => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'),
  )

  if (!pdfAttachment) {
    await logEmail(payload, senderEmail, subject, 'failed', 'Geen PDF-bijlage gevonden', organizationId)
    return NextResponse.json({ error: 'Geen PDF-bijlage gevonden in de email' }, { status: 400 })
  }

  if (!organizationId) {
    organizationId = (await resolveOrgBySender(payload, senderEmail)) || ''
  }

  if (!organizationId) {
    await logEmail(payload, senderEmail, subject, 'failed', 'Kan organisatie niet bepalen', '')
    return NextResponse.json({ error: 'Organisatie niet gevonden. Geef organizationId mee.' }, { status: 400 })
  }

  return processAndCreateInvoice(payload, pdfAttachment.content, pdfAttachment.filename || 'invoice.pdf', senderEmail, subject, organizationId)
}

/**
 * Process PDF via OCR and create purchase invoice
 */
async function processAndCreateInvoice(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  fileBuffer: Buffer,
  fileName: string,
  senderEmail: string,
  subject: string,
  organizationId: string,
) {
  const ocrResult = await processInvoiceOcr(fileBuffer, fileName)

  const purchaseInvoice = await payload.create({
    collection: 'purchase-invoices',
    data: {
      organization: organizationId,
      supplier: ocrResult.data.supplier || senderEmail || 'Onbekende leverancier',
      supplierVatNumber: ocrResult.data.supplierVatNumber,
      supplierIban: ocrResult.data.supplierIban,
      invoiceNumber: ocrResult.data.invoiceNumber,
      issueDate: ocrResult.data.issueDate,
      dueDate: ocrResult.data.dueDate,
      subtotal: ocrResult.data.subtotal || 0,
      vatAmount: ocrResult.data.vatAmount || 0,
      totalIncVat: ocrResult.data.totalIncVat || 0,
      currency: ocrResult.data.currency || 'EUR',
      status: 'pending_review',
      notes: `Via email van ${senderEmail}${subject ? `: ${subject}` : ''}`,
      ocrConfidence: ocrResult.confidence,
      ocrConfidenceScore: ocrResult.confidenceScore,
      ocrProcessedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  await logEmail(payload, senderEmail, subject, 'sent', undefined, organizationId, String((purchaseInvoice as Record<string, unknown>).id))

  return NextResponse.json({
    success: true,
    purchaseInvoiceId: (purchaseInvoice as Record<string, unknown>).id,
    ocrConfidence: ocrResult.confidence,
    supplier: ocrResult.data.supplier,
  })
}

async function logEmail(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  from: string,
  subject: string,
  status: string,
  error?: string,
  organizationId?: string,
  purchaseInvoiceId?: string,
) {
  try {
    await payload.create({
      collection: 'email-log',
      data: {
        to: 'inbound',
        subject: subject || `Email van ${from}`,
        status,
        direction: 'incoming',
        relatedCollection: purchaseInvoiceId ? 'purchase-invoices' : undefined,
        relatedDocumentId: purchaseInvoiceId,
        ...(organizationId ? { organization: organizationId } : {}),
        ...(error ? { error } : {}),
        sentAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
  } catch {
    // Log failure should not break processing
  }
}
