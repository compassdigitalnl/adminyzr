'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Filter, Play, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  createPayrollRun,
  processPayrollRun,
  markPayrollPaid,
} from '@/lib/actions/payroll'
import { formatCents, formatDateShort } from '@/lib/utils'

type PayrollRun = Record<string, unknown> & {
  id: string
  period?: string
  status?: string
  processedAt?: string
  paidAt?: string
  totalGross?: number
  totalNet?: number
  totalTax?: number
  notes?: string
}

type PayrollData = {
  docs: PayrollRun[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PayrollPageClientProps = {
  initialData: PayrollData
  initialStatus: string
  translations: {
    title: string
    newRun: string
    noRuns: string
    filter: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  draft: { variant: 'outline', labelKey: 'draft' },
  processed: { variant: 'warning', labelKey: 'processed' },
  paid: { variant: 'success', labelKey: 'paid' },
}

export function PayrollPageClient({
  initialData,
  initialStatus,
  translations,
}: PayrollPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('payroll')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newPeriod, setNewPeriod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleStatusFilter(value: string) {
    setStatusFilter(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      if (value && value !== 'all') {
        params.set('status', value)
      } else {
        params.delete('status')
      }
      params.delete('page')
      router.push(`?${params.toString()}`)
    })
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      params.set('page', String(page))
      router.push(`?${params.toString()}`)
    })
  }

  async function handleCreateRun(e: React.FormEvent) {
    e.preventDefault()
    if (!newPeriod) return
    setLoading(true)
    setError('')

    try {
      await createPayrollRun(newPeriod)
      setShowNewDialog(false)
      setNewPeriod('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleProcess(id: string) {
    if (!confirm(t('processConfirm'))) return
    try {
      await processPayrollRun(id)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : tc('error'))
    }
  }

  async function handleMarkPaid(id: string) {
    if (!confirm(t('markPaidConfirm'))) return
    try {
      await markPayrollPaid(id)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : tc('error'))
    }
  }

  // Default period to current month
  function getDefaultPeriod(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setNewPeriod(getDefaultPeriod()); setShowNewDialog(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newRun}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
            <SelectItem value="processed">{t('status.processed')}</SelectItem>
            <SelectItem value="paid">{t('status.paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('period')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {t('totalGross')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {t('totalTax')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {t('totalNet')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('processedAt')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noRuns}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((run) => {
                  const statusInfo = STATUS_BADGE[run.status || 'draft'] || STATUS_BADGE.draft
                  return (
                    <tr key={run.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium font-mono">{run.period || '\u2014'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusInfo.variant}>
                          {t(`status.${statusInfo.labelKey}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {run.totalGross ? formatCents(run.totalGross) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {run.totalTax ? formatCents(run.totalTax) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                        {run.totalNet ? formatCents(run.totalNet) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {run.processedAt ? formatDateShort(run.processedAt) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {run.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={t('process')}
                              onClick={() => handleProcess(run.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {run.status === 'processed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title={t('markPaid')}
                              onClick={() => handleMarkPaid(run.id)}
                            >
                              <Banknote className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {initialData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {tc('showing', { count: initialData.totalDocs })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasPrevPage || isPending}
                onClick={() => handlePageChange((initialData.page || 1) - 1)}
              >
                {tc('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasNextPage || isPending}
                onClick={() => handlePageChange((initialData.page || 1) + 1)}
              >
                {tc('next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Run Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('newRun')}</DialogTitle>
            <DialogDescription>{t('newRunDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRun} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="period">{t('period')} *</Label>
              <Input
                id="period"
                type="month"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tc('loading') : tc('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
