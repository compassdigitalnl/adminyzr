import { Queue } from 'bullmq'
import { getRedisConnection } from './connection'

// ----- Job data types -----

export type EmailJobData = {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  attachments?: Array<{
    filename: string
    content: string // Base64 encoded — Buffer cannot be serialized to JSON
    contentType?: string
  }>
  /** Optional metadata for email logging */
  meta?: {
    relatedCollection?: string
    relatedDocumentId?: string
    organizationId?: string
  }
}

export type PdfJobData = {
  type: 'invoice' | 'quote'
  id: string
}

export type OcrJobData = {
  purchaseInvoiceId: string
  fileUrl: string
  fileName: string
}

// ----- Queue instances (lazy) -----

let emailQueue: Queue<EmailJobData> | null = null
let pdfQueue: Queue<PdfJobData> | null = null
let ocrQueue: Queue<OcrJobData> | null = null

function getEmailQueue(): Queue<EmailJobData> | null {
  if (emailQueue) return emailQueue
  const connection = getRedisConnection()
  if (!connection) return null
  emailQueue = new Queue<EmailJobData>('email', { connection })
  return emailQueue
}

function getPdfQueue(): Queue<PdfJobData> | null {
  if (pdfQueue) return pdfQueue
  const connection = getRedisConnection()
  if (!connection) return null
  pdfQueue = new Queue<PdfJobData>('pdf', { connection })
  return pdfQueue
}

function getOcrQueue(): Queue<OcrJobData> | null {
  if (ocrQueue) return ocrQueue
  const connection = getRedisConnection()
  if (!connection) return null
  ocrQueue = new Queue<OcrJobData>('ocr', { connection })
  return ocrQueue
}

// ----- Public helpers to enqueue jobs -----

/**
 * Enqueue an email job. Returns null if Redis is not configured.
 */
export async function enqueueEmail(data: EmailJobData) {
  const queue = getEmailQueue()
  if (!queue) return null

  const job = await queue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600 }, // Keep completed jobs for 7 days
    removeOnFail: { age: 30 * 24 * 3600 },     // Keep failed jobs for 30 days
  })

  console.log(`[Queue] Email job enqueued: ${job.id} -> ${data.to}`)
  return job
}

/**
 * Enqueue a PDF generation job. Returns null if Redis is not configured.
 */
export async function enqueuePdf(data: PdfJobData) {
  const queue = getPdfQueue()
  if (!queue) return null

  const job = await queue.add('generate-pdf', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 24 * 3600 },  // Keep completed jobs for 1 day
    removeOnFail: { age: 7 * 24 * 3600 },
  })

  console.log(`[Queue] PDF job enqueued: ${job.id} -> ${data.type}/${data.id}`)
  return job
}

/**
 * Enqueue an OCR processing job. Returns null if Redis is not configured.
 */
export async function enqueueOcr(data: OcrJobData) {
  const queue = getOcrQueue()
  if (!queue) return null

  const job = await queue.add('process-ocr', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  })

  console.log(`[Queue] OCR job enqueued: ${job.id} -> ${data.purchaseInvoiceId}`)
  return job
}

// ----- Queue accessors for dashboard/status -----

export function getAllQueues() {
  return {
    email: getEmailQueue(),
    pdf: getPdfQueue(),
    ocr: getOcrQueue(),
  }
}

/**
 * Close all queue instances (for graceful shutdown).
 */
export async function closeAllQueues(): Promise<void> {
  const queues = [emailQueue, pdfQueue, ocrQueue].filter(Boolean) as Queue[]
  await Promise.all(queues.map((q) => q.close()))
  emailQueue = null
  pdfQueue = null
  ocrQueue = null
}
