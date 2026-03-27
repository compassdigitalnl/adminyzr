/**
 * Queue system barrel export.
 *
 * Usage:
 *   import { enqueueEmail, enqueuePdf, enqueueOcr } from '@/lib/queue'
 *
 * All enqueue functions return null when REDIS_URL is not configured,
 * allowing the app to gracefully degrade to synchronous processing.
 */

export { getRedisConnection, closeRedisConnection } from './connection'
export {
  enqueueEmail,
  enqueuePdf,
  enqueueOcr,
  getAllQueues,
  closeAllQueues,
  type EmailJobData,
  type PdfJobData,
  type OcrJobData,
} from './queues'
export { startWorkers, stopWorkers } from './workers'
