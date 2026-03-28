'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, MoreHorizontal, Send, CheckCircle, FileText, Trash2 } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteForm } from '@/components/quotes/QuoteForm'
import { updateQuoteStatus, convertQuoteToInvoice, deleteQuote } from '@/lib/actions/quotes'
import { getClients } from '@/lib/actions/clients'
import { formatCents, formatDateShort } from '@/lib/utils'

type QuoteDoc = Record<string, unknown> & { id: string }

type QuotesData = {
  docs: QuoteDoc[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type ClientOption = {
  id: string
  companyName: string
  contactName?: string
}

const STATUS_BADGE_VARIANT: Record<string, 'secondary' | 'default' | 'success' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  sent: 'default',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'outline',
}

type QuotesPageClientProps = {
  initialData: QuotesData
  initialSearch: string
  initialStatus: string
  initialPage: number
}

export function QuotesPageClient({
  initialData,
  initialSearch,
  initialStatus,
  initialPage,
}: QuotesPageClientProps) {
  const t = useTranslations('quotes')
  const tc = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [data] = useState<QuotesData>(initialData)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [page] = useState(initialPage)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openActions, setOpenActions] = useState<string | null>(null)

  // Fetch clients for the form
  useEffect(() => {
    async function fetchClients() {
      try {
        const result = await getClients({ limit: 100 })
        setClients(
          result.docs.map((c) => ({
            id: c.id,
            companyName: (c.companyName as string) || '',
            contactName: (c.contactName as string) || undefined,
          }))
        )
      } catch {
        // silently fail
      }
    }
    fetchClients()
  }, [])

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const current = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(params)) {
        if (value && value !== 'all' && value !== '1' && value !== '') {
          current.set(key, value)
        } else {
          current.delete(key)
        }
      }
      router.push(`?${current.toString()}`)
    },
    [router, searchParams]
  )

  function handleSearch(value: string) {
    setSearch(value)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateUrl({ search, page: '1' })
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    updateUrl({ status: value, page: '1' })
  }

  function handlePageChange(newPage: number) {
    updateUrl({ page: String(newPage) })
  }

  async function handleMarkSent(id: string) {
    setActionLoading(id)
    try {
      await updateQuoteStatus(id, 'sent')
      router.refresh()
    } catch {
      // handle error silently
    } finally {
      setActionLoading(null)
      setOpenActions(null)
    }
  }

  async function handleMarkAccepted(id: string) {
    setActionLoading(id)
    try {
      await updateQuoteStatus(id, 'accepted')
      router.refresh()
    } catch {
      // handle error silently
    } finally {
      setActionLoading(null)
      setOpenActions(null)
    }
  }

  async function handleConvertToInvoice(id: string) {
    setActionLoading(id)
    try {
      await convertQuoteToInvoice(id)
      router.refresh()
    } catch {
      // handle error silently
    } finally {
      setActionLoading(null)
      setOpenActions(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    setActionLoading(id)
    try {
      await deleteQuote(id)
      router.refresh()
    } catch {
      // handle error silently
    } finally {
      setActionLoading(null)
      setOpenActions(null)
    }
  }

  function handleFormSuccess() {
    setDialogOpen(false)
    router.refresh()
  }

  function getClientName(quote: QuoteDoc): string {
    const client = quote.client
    if (typeof client === 'object' && client !== null) {
      const c = client as Record<string, unknown>
      return (c.companyName as string) || ''
    }
    return String(client || '')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newQuote')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tc('search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </form>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tc('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
            <SelectItem value="sent">{t('status.sent')}</SelectItem>
            <SelectItem value="accepted">{t('status.accepted')}</SelectItem>
            <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
            <SelectItem value="expired">{t('status.expired')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {tc('showing', { count: data.totalDocs })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.docs.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              {t('noQuotes')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('quoteNumber')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('client')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('issueDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('validUntil')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tc('amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tc('status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tc('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.docs.map((quote) => {
                    const quoteStatus = (quote.status as string) || 'draft'
                    return (
                      <tr key={quote.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`${pathname}/${quote.id}`)}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          {(quote.quoteNumber as string) || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {getClientName(quote)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {quote.issueDate ? formatDateShort(quote.issueDate as string) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {quote.validUntil ? formatDateShort(quote.validUntil as string) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          {formatCents((quote.totalIncVat as number) || 0)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Badge variant={STATUS_BADGE_VARIANT[quoteStatus] || 'secondary'}>
                            {t(`status.${quoteStatus}` as 'status.draft' | 'status.sent' | 'status.accepted' | 'status.rejected' | 'status.expired')}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setOpenActions(openActions === quote.id ? null : quote.id)
                              }
                              disabled={actionLoading === quote.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            {openActions === quote.id && (
                              <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border bg-popover py-1 shadow-lg">
                                {quoteStatus === 'draft' && (
                                  <button
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => handleMarkSent(quote.id)}
                                  >
                                    <Send className="h-4 w-4" />
                                    {t('markSent')}
                                  </button>
                                )}
                                {quoteStatus === 'sent' && (
                                  <button
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => handleMarkAccepted(quote.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    {t('markAccepted')}
                                  </button>
                                )}
                                {quoteStatus === 'accepted' && !quote.convertedToInvoice && (
                                  <button
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => handleConvertToInvoice(quote.id)}
                                  >
                                    <FileText className="h-4 w-4" />
                                    {t('convertToInvoice')}
                                  </button>
                                )}
                                {quoteStatus === 'draft' && (
                                  <button
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-destructive hover:bg-accent"
                                    onClick={() => handleDelete(quote.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {tc('delete')}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc('page', { current: data.page || page, total: data.totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasPrevPage}
              onClick={() => handlePageChange((data.page || page) - 1)}
            >
              {tc('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasNextPage}
              onClick={() => handlePageChange((data.page || page) + 1)}
            >
              {tc('next')}
            </Button>
          </div>
        </div>
      )}

      {/* New Quote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('newQuote')}</DialogTitle>
            <DialogDescription>{t('title')}</DialogDescription>
          </DialogHeader>
          <QuoteForm
            clients={clients}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
