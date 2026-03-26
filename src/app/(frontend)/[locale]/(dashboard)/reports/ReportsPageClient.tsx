'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, TrendingUp, Receipt, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import type { VatReportSummary } from '@/lib/actions/reports'

type Props = {
  vatReport: VatReportSummary | null
  revenueStats: { month: number; revenue: number; count: number }[] | null
  periodStart: string
  periodEnd: string
  year: number
  translations: { title: string }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

export function ReportsPageClient({
  vatReport,
  revenueStats,
  periodStart,
  periodEnd,
  year,
  translations,
}: Props) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('reports')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()
  const [start, setStart] = useState(periodStart)
  const [end, setEnd] = useState(periodEnd)

  function handlePeriodChange() {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      params.set('start', start)
      params.set('end', end)
      router.push(`?${params.toString()}`)
    })
  }

  const maxRevenue = revenueStats
    ? Math.max(...revenueStats.map((m) => m.revenue), 1)
    : 1

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{translations.title}</h1>

      {/* Period selector */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <Label>{t('periodStart')}</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('periodEnd')}</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button onClick={handlePeriodChange} disabled={isPending}>
            {t('generate')}
          </Button>
          <a href={`/api/reports/vat-export?start=${start}&end=${end}`}>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('exportCsv')}
            </Button>
          </a>
        </div>
      </div>

      {/* BTW Summary */}
      {vatReport && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('invoiceCount')}</p>
                  <p className="text-2xl font-bold">{vatReport.invoiceCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tc('subtotal')}</p>
                  <p className="text-2xl font-bold">{formatCents(vatReport.totalSubtotal)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2">
                  <Calculator className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tc('vat')}</p>
                  <p className="text-2xl font-bold">{formatCents(vatReport.totalVatAmount)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <div>
                <p className="text-sm text-muted-foreground">{tc('total')}</p>
                <p className="text-2xl font-bold">{formatCents(vatReport.totalIncVat)}</p>
              </div>
            </div>
          </div>

          {/* VAT breakdown */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{t('vatBreakdown')}</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">BTW 21%</p>
                <p className="text-xl font-bold">{formatCents(vatReport.totalVat21)}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">BTW 9%</p>
                <p className="text-xl font-bold">{formatCents(vatReport.totalVat9)}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">BTW 0% / Vrijgesteld</p>
                <p className="text-xl font-bold">{formatCents(vatReport.totalVat0)}</p>
              </div>
            </div>
          </div>

          {/* Invoice table */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{t('invoiceDetails')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('invoiceNumber')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('client')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('date')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc('subtotal')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc('vat')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vatReport.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {t('noData')}
                      </td>
                    </tr>
                  ) : (
                    vatReport.rows.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{row.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm">{row.clientName}</td>
                        <td className="px-4 py-3 text-sm">{row.issueDate.split('T')[0]}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{formatCents(row.subtotal)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCents(row.vatAmount)}
                          <Badge variant="outline" className="ml-1 text-[10px]">{row.vatRate}%</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-medium">{formatCents(row.totalIncVat)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Revenue chart (simple bar chart) */}
      {revenueStats && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{t('revenueYear', { year })}</h2>
          <div className="flex items-end gap-2 h-48">
            {revenueStats.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {m.revenue > 0 ? formatCents(m.revenue) : ''}
                </span>
                <div
                  className="w-full rounded-t bg-primary/80 transition-all min-h-[2px]"
                  style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, 1)}%` }}
                />
                <span className="text-xs text-muted-foreground">{MONTH_NAMES[m.month - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
