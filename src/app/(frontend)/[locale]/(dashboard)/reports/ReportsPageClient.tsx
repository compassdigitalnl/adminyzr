'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Download,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calculator,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
  FileDown,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import type { VatReportSummary, CashflowMonth, KpiStats } from '@/lib/actions/reports'

type Props = {
  vatReport: VatReportSummary | null
  revenueStats: { month: number; revenue: number; count: number }[] | null
  cashflowStats: CashflowMonth[] | null
  kpiStats: KpiStats | null
  periodStart: string
  periodEnd: string
  year: number
  translations: { title: string }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

function centsToEuros(cents: number) {
  return cents / 100
}

function formatEuros(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(centsToEuros(cents))
}

export function ReportsPageClient({
  vatReport,
  revenueStats,
  cashflowStats,
  kpiStats,
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

  // Prepare chart data
  const revenueChartData = revenueStats?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    revenue: centsToEuros(m.revenue),
    count: m.count,
  })) ?? []

  const cashflowChartData = cashflowStats?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    income: centsToEuros(m.income),
    expenses: centsToEuros(m.expenses),
    net: centsToEuros(m.net),
  })) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{translations.title}</h1>

      {/* KPI Cards */}
      {kpiStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                <p className="text-2xl font-bold">{formatEuros(kpiStats.totalPaidThisYear)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalExpenses')}</p>
                <p className="text-2xl font-bold">{formatEuros(kpiStats.totalExpensesThisYear)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profitMargin')}</p>
                <p className="text-2xl font-bold">{kpiStats.profitMargin}%</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('avgPaymentDays')}</p>
                <p className="text-2xl font-bold">
                  {kpiStats.avgPaymentDays} {t('days')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue growth + top clients */}
      {kpiStats && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Revenue growth */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">{t('revenueGrowth')}</h2>
            <div className="flex items-center gap-2">
              {kpiStats.revenueGrowth >= 0 ? (
                <ArrowUpRight className="h-8 w-8 text-green-500" />
              ) : (
                <ArrowDownRight className="h-8 w-8 text-red-500" />
              )}
              <span
                className={`text-4xl font-bold ${kpiStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {kpiStats.revenueGrowth > 0 ? '+' : ''}
                {kpiStats.revenueGrowth}%
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t('vsLastQuarter')}</p>
          </div>

          {/* Top clients */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">{t('topClients')}</h2>
            {kpiStats.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              <div className="space-y-3">
                {kpiStats.topClients.map((client, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[200px]">{client.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">{formatEuros(client.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Chart (recharts) */}
      {revenueChartData.length > 0 && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{t('revenueYear', { year })}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatEuros(Number(value) * 100), t('revenue')]}
                labelClassName="font-medium"
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cashflow Chart */}
      {cashflowChartData.length > 0 && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{t('cashflow')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cashflowChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    income: t('income'),
                    expenses: t('expenses'),
                    net: t('netResult'),
                  }
                  return [formatEuros(Number(value) * 100), labels[String(name)] || String(name)]
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    income: t('income'),
                    expenses: t('expenses'),
                    net: t('netResult'),
                  }
                  return labels[value] || value
                }}
              />
              <Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              <Area type="monotone" dataKey="net" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Period selector + VAT Report */}
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

      {/* Accounting Export */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t('accountingExport')}</h2>
          <p className="text-sm text-muted-foreground">{t('accountingExportDescription')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/reports/accounting-export?format=snelstart&start=${start}&end=${end}`}>
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t('exportSnelstart')}
            </Button>
          </a>
          <a href={`/api/reports/accounting-export?format=twinfield&start=${start}&end=${end}`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              {t('exportTwinfield')}
            </Button>
          </a>
          <a href={`/api/reports/accounting-export?format=generic&start=${start}&end=${end}`}>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              {t('exportGeneric')}
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
    </div>
  )
}
