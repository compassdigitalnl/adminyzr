'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2, Pause, Play, XCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubscriptionForm } from './SubscriptionForm'
import {
  deleteSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  generateSubscriptionInvoice,
} from '@/lib/actions/subscriptions'

type Subscription = Record<string, unknown> & {
  id: string
  name?: string
  client?: Record<string, unknown> & { id: string; companyName?: string }
  status?: string
  interval?: string
  amount?: number
  vatRate?: string
  startDate?: string
  nextInvoiceDate?: string
  endDate?: string
  autoSend?: boolean
  invoiceCount?: number
  description?: string
}

type SubscriptionsData = {
  docs: Subscription[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type Client = Record<string, unknown> & { id: string; companyName?: string }

type SubscriptionsPageClientProps = {
  initialData: SubscriptionsData
  clients: Client[]
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newSubscription: string
    noSubscriptions: string
    filter: string
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('nl-NL')
}

export function SubscriptionsPageClient({
  initialData,
  clients,
  initialSearch,
  initialStatus,
  translations,
}: SubscriptionsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParamsHook = useSearchParams()
  const tc = useTranslations('common')
  const t = useTranslations('subscriptions')
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editSubscription, setEditSubscription] = useState<Subscription | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)

  function handleSearch(value: string) {
    setSearch(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.delete('page')
      router.push(`?${params.toString()}`)
    })
  }

  function handleStatusFilter(value: string) {
    setStatus(value)
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

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await deleteSubscription(id)
    router.refresh()
  }

  async function handlePause(id: string) {
    await pauseSubscription(id)
    router.refresh()
  }

  async function handleResume(id: string) {
    await resumeSubscription(id)
    router.refresh()
  }

  async function handleCancel(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await cancelSubscription(id)
    router.refresh()
  }

  async function handleGenerateInvoice(id: string) {
    if (!confirm(t('generateInvoiceConfirm'))) return
    try {
      await generateSubscriptionInvoice(id)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : tc('error'))
    }
  }

  function handleEdit(subscription: Subscription) {
    setEditSubscription(subscription)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditSubscription(null)
      router.refresh()
    }
  }

  function getStatusBadge(statusVal: string | undefined) {
    switch (statusVal) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t('status.active')}</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{t('status.paused')}</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('status.cancelled')}</Badge>
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{t('status.expired')}</Badge>
      default:
        return <Badge variant="outline">{statusVal}</Badge>
    }
  }

  function getIntervalLabel(interval: string | undefined) {
    switch (interval) {
      case 'weekly': return t('intervalWeekly')
      case 'monthly': return t('intervalMonthly')
      case 'quarterly': return t('intervalQuarterly')
      case 'yearly': return t('intervalYearly')
      default: return interval || '—'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setEditSubscription(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newSubscription}
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={tc('search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="paused">{t('status.paused')}</SelectItem>
            <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
            <SelectItem value="expired">{t('status.expired')}</SelectItem>
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
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('client')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('interval')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('amount')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('nextInvoiceDate')}
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
                    {translations.noSubscriptions}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((sub) => (
                  <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`${pathname}/${sub.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{sub.name || '—'}</span>
                      {sub.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {sub.client && typeof sub.client === 'object'
                        ? sub.client.companyName || '—'
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getIntervalLabel(sub.interval)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {sub.amount ? formatCents(sub.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(sub.nextInvoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sub.status === 'active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t('generateInvoice')}
                              onClick={() => handleGenerateInvoice(sub.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t('pause')}
                              onClick={() => handlePause(sub.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {sub.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={t('resume')}
                            onClick={() => handleResume(sub.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {(sub.status === 'active' || sub.status === 'paused') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title={t('cancel')}
                            onClick={() => handleCancel(sub.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(sub)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(sub.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Form Dialog */}
      <SubscriptionForm
        open={showForm}
        onOpenChange={handleCloseForm}
        clients={clients}
        editData={editSubscription || undefined}
      />
    </div>
  )
}
