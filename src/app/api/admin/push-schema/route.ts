import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayloadClient()

  const collections = ['projects', 'api-keys', 'subscriptions', 'employees', 'leave-requests', 'payroll-runs', 'payroll-entries', 'orders']
  const results: Record<string, string> = {}

  for (const col of collections) {
    try {
      const r = await payload.find({ collection: col as never, limit: 0 })
      results[col] = `ok (${r.totalDocs} docs)`
    } catch (e: unknown) {
      results[col] = `error: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  return NextResponse.json({ status: 'schema pushed', collections: results })
}
