import { NextRequest, NextResponse } from 'next/server'
import { getAllQueues } from '@/lib/queue/queues'

/**
 * BullMQ Dashboard — queue status endpoint.
 * GET /api/queue/status?key=CRON_SECRET
 *
 * Returns waiting, active, completed, and failed counts per queue.
 */
export async function GET(request: NextRequest) {
  // Auth via shared secret (same as cron endpoints)
  const key = request.nextUrl.searchParams.get('key')
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const queues = getAllQueues()

  // If Redis is not configured, return a helpful message
  if (!queues.email && !queues.pdf && !queues.ocr) {
    return NextResponse.json({
      status: 'disabled',
      message: 'REDIS_URL is not configured. Queue system is inactive.',
    })
  }

  const queueNames = ['email', 'pdf', 'ocr'] as const
  const stats: Record<string, unknown> = {}

  for (const name of queueNames) {
    const queue = queues[name]
    if (!queue) {
      stats[name] = { status: 'not_initialized' }
      continue
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ])

      stats[name] = { waiting, active, completed, failed, delayed }
    } catch (err) {
      stats[name] = {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  return NextResponse.json({
    status: 'active',
    queues: stats,
    timestamp: new Date().toISOString(),
  })
}
