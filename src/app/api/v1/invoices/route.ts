import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, hasScope } from '@/lib/api-key-auth'
import { getPayloadClient } from '@/lib/get-payload'
import type { Where } from 'payload'

export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) {
    return NextResponse.json({ error: 'Unauthorized — provide a valid API key via Bearer token' }, { status: 401 })
  }

  if (!hasScope(apiKey, 'invoices:read')) {
    return NextResponse.json({ error: 'Forbidden — missing invoices:read scope' }, { status: 403 })
  }

  const payload = await getPayloadClient()
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
  const status = searchParams.get('status')

  const where: Where = {
    and: [
      { organization: { equals: apiKey.organizationId } },
      { deletedAt: { exists: false } },
      ...(status ? [{ status: { equals: status } }] : []),
    ],
  }

  const result = await payload.find({
    collection: 'invoices',
    where,
    page,
    limit,
    sort: '-createdAt',
    depth: 1,
  })

  return NextResponse.json({
    data: result.docs,
    meta: {
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      hasNextPage: result.hasNextPage,
    },
  })
}
