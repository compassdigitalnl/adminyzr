import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'

export async function GET() {
  const checks: Record<string, { status: string; ms?: number; error?: string }> = {}
  const start = Date.now()

  // Database check
  try {
    const dbStart = Date.now()
    const payload = await getPayloadClient()
    await payload.find({ collection: 'users', limit: 0, overrideAccess: true })
    checks.database = { status: 'ok', ms: Date.now() - dbStart }
  } catch (err) {
    checks.database = { status: 'error', error: err instanceof Error ? err.message : 'Connection failed' }
  }

  // Redis check (optional)
  if (process.env.REDIS_URL) {
    checks.redis = { status: 'configured' }
  } else {
    checks.redis = { status: 'not_configured' }
  }

  // SMTP check
  if (process.env.SMTP_HOST && process.env.SMTP_USER && !process.env.SMTP_USER.startsWith('your-')) {
    checks.smtp = { status: 'configured' }
  } else {
    checks.smtp = { status: 'not_configured' }
  }

  // Storage check
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) {
    checks.storage = { status: 'configured' }
  } else {
    checks.storage = { status: 'not_configured' }
  }

  const allOk = Object.values(checks).every((c) => c.status !== 'error')

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalMs: Date.now() - start,
    checks,
  }, { status: allOk ? 200 : 503 })
}
