import { NextRequest, NextResponse } from 'next/server'
import { getAccountingExport } from '@/lib/actions/accounting-export'

/**
 * Accounting export endpoint.
 * GET /api/reports/accounting-export?format=snelstart&start=2026-01-01&end=2026-03-31
 */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') as
    | 'snelstart'
    | 'twinfield'
    | 'generic'
    | null
  const start = request.nextUrl.searchParams.get('start')
  const end = request.nextUrl.searchParams.get('end')

  if (!format || !['snelstart', 'twinfield', 'generic'].includes(format)) {
    return NextResponse.json(
      { error: 'format parameter is verplicht (snelstart, twinfield, generic)' },
      { status: 400 },
    )
  }

  if (!start || !end) {
    return NextResponse.json(
      { error: 'start en end parameters zijn verplicht' },
      { status: 400 },
    )
  }

  try {
    const result = await getAccountingExport({
      format,
      periodStart: start,
      periodEnd: end,
    })

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export mislukt' },
      { status: 500 },
    )
  }
}
