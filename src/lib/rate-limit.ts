/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, use Redis-based rate limiting.
 */

type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 300_000)

export type RateLimitConfig = {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 20 }, // 20 per 15 min
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
  ocr: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  webhook: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
}

export function checkRateLimit(
  identifier: string,
  type: keyof typeof DEFAULTS = 'api',
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = DEFAULTS[type] || DEFAULTS.api
  const key = `${type}:${identifier}`
  const now = Date.now()

  let entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs }
    store.set(key, entry)
  }

  entry.count++

  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  }
}

export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>, type: keyof typeof DEFAULTS = 'api') {
  const config = DEFAULTS[type] || DEFAULTS.api
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
