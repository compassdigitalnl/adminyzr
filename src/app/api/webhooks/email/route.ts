import { NextRequest, NextResponse } from 'next/server'
import { simpleParser } from 'mailparser'
import { getPayloadClient } from '@/lib/get-payload'
import { processInvoiceOcr } from '@/lib/services/ocr'

/**
 * Inbound email webhook voor inkoopfacturen.
 *
 * Forward een email met factuurbijlage naar dit endpoint.
 * Het PDF-bestand wordt automatisch verwerkt via OCR en een
 * inkoopfactuur wordt aangemaakt.
 *
 * POST /api/webhooks/email?key=CRON_SECRET
 *
 * Body: Raw email (RFC 2822) of multipart/form-data met:
 *   - email: raw email content
 *   - file: PDF bijlage (fallback als geen raw email)
 *   - organizationId: organisatie ID
 */
export async function POST(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const contentType = request.headers.get('content-type') || ''

  try {
    let fileBuffer: Buffer | null = null
    let fileName = 'invoice.pdf'
    let senderEmail = ''
    let subject = ''
    let organizationId = ''

    if (contentType.includes('multipart/form-data')) {
      // Form data upload (simpler integration)
      const formData = await request.formData()
      organizationId = formData.get('organizationId') as string || ''
      const file = formData.get('file') as File | null
      const rawEmail = formData.get('email') as string | null

      if (rawEmail) {
        // Parse the raw email
        const parsed = await simpleParser(rawEmail)
        senderEmail = typeof parsed.from?.value?.[0]?.address === 'string' ? parsed.from.value[0].address : ''
        subject = parsed.subject || ''

        // Find PDF attachments
        const pdfAttachment = parsed.attachments?.find(
          (a) => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf')
        )
        if (pdfAttachment) {
          fileBuffer = pdfAttachment.content
          fileName = pdfAttachment.filename || 'invoice.pdf'
        }
      } else if (file) {
        fileBuffer = Buffer.from(await file.arrayBuffer())
        fileName = file.name
        senderEmail = formData.get('from') as string || ''
        subject = formData.get('subject') as string || ''
      }
    } else {
      // Raw email body
      const rawBody = await request.text()
      organizationId = request.nextUrl.searchParams.get('org') || ''

      const parsed = await simpleParser(rawBody)
      senderEmail = typeof parsed.from?.value?.[0]?.address === 'string' ? parsed.from.value[0].address : ''
      subject = parsed.subject || ''

      const pdfAttachment = parsed.attachments?.find(
        (a) => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf')
      )
      if (pdfAttachment) {
        fileBuffer = pdfAttachment.content
        fileName = pdfAttachment.filename || 'invoice.pdf'
      }
    }

    if (!fileBuffer) {
      await logEmail(payload, senderEmail, subject, 'failed', 'Geen PDF-bijlage gevonden', organizationId)
      return NextResponse.json({ error: 'Geen PDF-bijlage gevonden in de email' }, { status: 400 })
    }

    if (!organizationId) {
      // Try to find org by sender email in clients
      const { docs } = await payload.find({
        collection: 'clients',
        where: { email: { equals: senderEmail } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (docs.length > 0) {
        const client = docs[0] as Record<string, unknown>
        organizationId = typeof client.organization === 'object'
          ? (client.organization as Record<string, unknown>).id as string
          : client.organization as string
      }
    }

    if (!organizationId) {
      await logEmail(payload, senderEmail, subject, 'failed', 'Kan organisatie niet bepalen', '')
      return NextResponse.json({ error: 'Organisatie niet gevonden. Geef organizationId mee.' }, { status: 400 })
    }

    // Process OCR
    const ocrResult = await processInvoiceOcr(fileBuffer, fileName)

    // Create purchase invoice
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

    // Log email
    await logEmail(payload, senderEmail, subject, 'sent', undefined, organizationId, String((purchaseInvoice as Record<string, unknown>).id))

    return NextResponse.json({
      success: true,
      purchaseInvoiceId: (purchaseInvoice as Record<string, unknown>).id,
      ocrConfidence: ocrResult.confidence,
      supplier: ocrResult.data.supplier,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Email webhook error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
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
