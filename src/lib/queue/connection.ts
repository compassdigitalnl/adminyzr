import IORedis from 'ioredis'

let connection: IORedis | null = null

/**
 * Get a shared Redis (IORedis) connection for BullMQ.
 * Returns null if REDIS_URL is not configured (graceful degradation).
 */
export function getRedisConnection(): IORedis | null {
  if (!process.env.REDIS_URL) {
    return null
  }

  if (connection) {
    return connection
  }

  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  })

  connection.on('error', (err) => {
    console.error('[Queue] Redis connection error:', err.message)
  })

  connection.on('connect', () => {
    console.log('[Queue] Redis connected')
  })

  return connection
}

/**
 * Close the shared Redis connection (for graceful shutdown).
 */
export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit()
    connection = null
  }
}
