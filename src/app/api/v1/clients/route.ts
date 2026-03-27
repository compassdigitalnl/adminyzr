import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, hasScope } from '@/lib/api-key-auth'
import { getPayloadClient } from '@/lib/get-payload'
import type { Where } from 'payload'

export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasScope(apiKey, 'clients:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await getPayloadClient()
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
  const search = searchParams.get('search')

  const where: Where = {
    and: [
      { organization: { equals: apiKey.organizationId } },
      { deletedAt: { exists: false } },
      ...(search ? [{ or: [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { email: { contains: search } },
      ] }] : []),
    ],
  }

  const result = await payload.find({ collection: 'clients', where, page, limit, sort: '-createdAt', depth: 0 })

  return NextResponse.json({
    data: result.docs,
    meta: { totalDocs: result.totalDocs, totalPages: result.totalPages, page: result.page, hasNextPage: result.hasNextPage },
  })
}

export async function POST(request: NextRequest) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasScope(apiKey, 'clients:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await getPayloadClient()
  const body = await request.json()

  const doc = await payload.create({
    collection: 'clients',
    data: { ...body, organization: apiKey.organizationId },
    overrideAccess: true,
  })

  return NextResponse.json({ data: doc }, { status: 201 })
}
