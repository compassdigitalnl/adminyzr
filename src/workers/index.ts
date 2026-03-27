/**
 * BullMQ Worker Entry Point
 *
 * Run in development:  npm run worker
 * Run in production:   node dist/workers/index.js
 *
 * This process runs independently from the Next.js app and handles
 * background jobs (email, PDF, OCR) via BullMQ + Redis.
 */

import { startWorkers, stopWorkers } from '@/lib/queue/workers'
import { closeRedisConnection } from '@/lib/queue/connection'
import { closeAllQueues } from '@/lib/queue/queues'

async function main() {
  console.log('=== Adminyzr Worker Process ===')
  console.log(`PID: ${process.pid}`)
  console.log(`Node: ${process.version}`)
  console.log(`REDIS_URL: ${process.env.REDIS_URL ? '(configured)' : '(not set)'}`)
  console.log('')

  if (!process.env.REDIS_URL) {
    console.error('[Worker] REDIS_URL is not configured. Exiting.')
    process.exit(1)
  }

  startWorkers()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`)

    try {
      await stopWorkers()
      await closeAllQueues()
      await closeRedisConnection()
      console.log('[Worker] Shutdown complete.')
      process.exit(0)
    } catch (err) {
      console.error('[Worker] Error during shutdown:', err)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Keep the process alive
  console.log('[Worker] Waiting for jobs...')
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err)
  process.exit(1)
})
