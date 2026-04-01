import { Worker, Job } from 'bullmq'
import { getRedisConnection } from './connection'
import type { EmailJobData, PdfJobData, OcrJobData } from './queues'

const workers: Worker[] = []

// ----- Email Worker -----

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, html, text, from, attachments } = job.data

  // Dynamic import to avoid loading nodemailer at module level
  const nodemailer = await import('nodemailer')
  const createTransport = nodemailer.default?.createTransport ?? nodemailer.createTransport

  const transporter = createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.eu-central-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  })

  const mailAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, 'base64'),
    contentType: att.contentType,
  }))

  await transporter.sendMail({
    from: from || `"Adminyzr" <${process.env.MAIL_FROM || 'noreply@adminyzr.com'}>`,
    to,
    subject,
    html,
    text,
    attachments: mailAttachments,
  })

  console.log(`[Worker:email] Sent email to ${to} — subject: "${subject}"`)

  // Log successful email in database if metadata is present
  if (job.data.meta) {
    try {
      const { getPayloadClient } = await import('@/lib/get-payload')
      const payload = await getPayloadClient()
      await payload.create({
        collection: 'email-log',
        data: {
          to,
          subject,
          status: 'sent',
          relatedCollection: job.data.meta.relatedCollection,
          relatedDocumentId: job.data.meta.relatedDocumentId,
          organization: job.data.meta.organizationId,
          sentAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
    } catch (logErr) {
      console.warn('[Worker:email] Failed to log email:', logErr)
    }
  }
}

// ----- PDF Worker -----

async function processPdfJob(job: Job<PdfJobData>): Promise<void> {
  const { type, id } = job.data

  console.log(`[Worker:pdf] Generating ${type} PDF for ${id}`)

  const { getPayloadClient } = await import('@/lib/get-payload')
  const payload = await getPayloadClient()

  if (type === 'invoice') {
    // Fetch invoice data
    const invoice = await payload.findByID({
      collection: 'invoices',
      id,
      depth: 1,
    }) as Record<string, unknown>

    const orgId = typeof invoice.organization === 'object'
      ? (invoice.organization as Record<string, unknown>).id
      : invoice.organization

    if (!orgId) throw new Error(`Invoice ${id} has no organization`)

    const org = await payload.findByID({
      collection: 'organizations',
      id: orgId as string,
    }) as Record<string, unknown>

    const { docs: items } = await payload.find({
      collection: 'invoice-items',
      where: { invoice: { equals: id } },
      sort: 'sortOrder',
      limit: 100,
    })

    const client = invoice.client as Record<string, unknown> | undefined
    const clientAddress = client?.address as Record<string, string> | undefined
    const orgAddress = org.address as Record<string, string> | undefined
    const orgContact = org.contact as Record<string, string> | undefined
    const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined

    const pdfData = {
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
      clientName: (client?.companyName as string) || '',
      clientAddress: clientAddress
        ? [clientAddress.street, clientAddress.houseNumber, clientAddress.postalCode, clientAddress.city]
            .filter(Boolean).join(' ')
        : undefined,
      clientKvk: client?.kvkNumber as string | undefined,
      clientVat: client?.vatNumber as string | undefined,
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

    // Store the result so the caller can retrieve it
    await job.updateProgress(100)
    return job.updateData({ ...job.data, result: pdfData } as PdfJobData)
  }

  // Quote PDF generation can be added here
  console.log(`[Worker:pdf] Type "${type}" not yet implemented`)
}

// ----- OCR Worker -----

async function processOcrJob(job: Job<OcrJobData>): Promise<void> {
  const { purchaseInvoiceId, fileUrl, fileName } = job.data

  console.log(`[Worker:ocr] Processing OCR for purchase invoice ${purchaseInvoiceId}`)

  // Fetch the file
  const absoluteUrl = fileUrl.startsWith('http')
    ? fileUrl
    : `${process.env.NEXT_PUBLIC_APP_URL}${fileUrl}`

  const response = await fetch(absoluteUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  // Process with OCR
  const { processInvoiceOcr } = await import('@/lib/services/ocr')
  const ocrResult = await processInvoiceOcr(buffer, fileName)

  // Update the purchase invoice with OCR results
  const { getPayloadClient } = await import('@/lib/get-payload')
  const payload = await getPayloadClient()

  const purchaseInvoice = await payload.findByID({
    collection: 'purchase-invoices',
    id: purchaseInvoiceId,
  }) as Record<string, unknown>

  await payload.update({
    collection: 'purchase-invoices',
    id: purchaseInvoiceId,
    data: {
      supplier: ocrResult.data.supplier || purchaseInvoice.supplier,
      supplierVatNumber: ocrResult.data.supplierVatNumber || purchaseInvoice.supplierVatNumber,
      supplierIban: ocrResult.data.supplierIban || purchaseInvoice.supplierIban,
      invoiceNumber: ocrResult.data.invoiceNumber || purchaseInvoice.invoiceNumber,
      issueDate: ocrResult.data.issueDate || purchaseInvoice.issueDate,
      dueDate: ocrResult.data.dueDate || purchaseInvoice.dueDate,
      subtotal: ocrResult.data.subtotal ?? purchaseInvoice.subtotal,
      vatAmount: ocrResult.data.vatAmount ?? purchaseInvoice.vatAmount,
      totalIncVat: ocrResult.data.totalIncVat ?? purchaseInvoice.totalIncVat,
      ocrConfidence: ocrResult.confidence,
      ocrConfidenceScore: ocrResult.confidenceScore,
      ocrProcessedAt: new Date().toISOString(),
    },
  })

  console.log(
    `[Worker:ocr] OCR complete for ${purchaseInvoiceId} — confidence: ${ocrResult.confidence} (${ocrResult.confidenceScore}%)`,
  )
}

// ----- Start all workers -----

export function startWorkers(): void {
  const connection = getRedisConnection()
  if (!connection) {
    console.warn('[Workers] REDIS_URL not configured — workers not started')
    return
  }

  console.log('[Workers] Starting BullMQ workers...')

  // Email worker — concurrency 5
  const emailWorker = new Worker<EmailJobData>('email', processEmailJob, {
    connection,
    concurrency: 5,
  })
  emailWorker.on('completed', (job) => {
    console.log(`[Worker:email] Job ${job.id} completed`)
  })
  emailWorker.on('failed', (job, err) => {
    console.error(`[Worker:email] Job ${job?.id} failed:`, err.message)
  })
  workers.push(emailWorker)

  // PDF worker — concurrency 2 (memory intensive)
  const pdfWorker = new Worker<PdfJobData>('pdf', processPdfJob, {
    connection,
    concurrency: 2,
  })
  pdfWorker.on('completed', (job) => {
    console.log(`[Worker:pdf] Job ${job.id} completed`)
  })
  pdfWorker.on('failed', (job, err) => {
    console.error(`[Worker:pdf] Job ${job?.id} failed:`, err.message)
  })
  workers.push(pdfWorker)

  // OCR worker — concurrency 1 (API rate limited)
  const ocrWorker = new Worker<OcrJobData>('ocr', processOcrJob, {
    connection,
    concurrency: 1,
  })
  ocrWorker.on('completed', (job) => {
    console.log(`[Worker:ocr] Job ${job.id} completed`)
  })
  ocrWorker.on('failed', (job, err) => {
    console.error(`[Worker:ocr] Job ${job?.id} failed:`, err.message)
  })
  workers.push(ocrWorker)

  console.log('[Workers] All workers started (email: 5, pdf: 2, ocr: 1)')
}

/**
 * Gracefully close all running workers.
 */
export async function stopWorkers(): Promise<void> {
  console.log('[Workers] Stopping all workers...')
  await Promise.all(workers.map((w) => w.close()))
  workers.length = 0
  console.log('[Workers] All workers stopped')
}
