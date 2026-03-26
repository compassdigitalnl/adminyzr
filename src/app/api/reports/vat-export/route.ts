import { NextRequest, NextResponse } from 'next/server'
import { getVatReport } from '@/lib/actions/reports'

/**
 * CSV export van BTW-rapport.
 * GET /api/reports/vat-export?start=2026-01-01&end=2026-03-31
 */
export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get('start')
  const end = request.nextUrl.searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start en end parameters zijn verplicht' }, { status: 400 })
  }

  try {
    const report = await getVatReport({ periodStart: start, periodEnd: end })

    // Build CSV
    const headers = ['Factuurnummer', 'Klant', 'Factuurdatum', 'Subtotaal', 'BTW-tarief', 'BTW-bedrag', 'Totaal incl. BTW', 'Status']
    const rows = report.rows.map((r) => [
      r.invoiceNumber,
      `"${r.clientName}"`,
      r.issueDate.split('T')[0],
      (r.subtotal / 100).toFixed(2),
      `${r.vatRate}%`,
      (r.vatAmount / 100).toFixed(2),
      (r.totalIncVat / 100).toFixed(2),
      r.status,
    ].join(';'))

    // Summary rows
    rows.push('')
    rows.push(`Totaal;;;;;${(report.totalVatAmount / 100).toFixed(2)};${(report.totalIncVat / 100).toFixed(2)};`)
    rows.push(`BTW 21%:;;;;;${(report.totalVat21 / 100).toFixed(2)};;`)
    rows.push(`BTW 9%:;;;;;${(report.totalVat9 / 100).toFixed(2)};;`)
    rows.push(`BTW 0%:;;;;;${(report.totalVat0 / 100).toFixed(2)};;`)

    const csv = [headers.join(';'), ...rows].join('\n')

    const filename = `btw-rapport-${start}-${end}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export mislukt' },
      { status: 500 }
    )
  }
}
