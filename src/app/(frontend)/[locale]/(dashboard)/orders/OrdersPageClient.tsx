'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, FileText, ExternalLink } from 'lucide-react'
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
import { convertOrderToInvoice, updateOrderStatus } from '@/lib/actions/orders'

type Order = Record<string, unknown> & {
  id: string
  externalOrderId?: string
  customerName?: string
  customerEmail?: string
  status?: string
  orderDate?: string
  totalIncVat?: number
  invoice?: Record<string, unknown> & { id: string; invoiceNumber?: string }
  client?: Record<string, unknown> & { id: string; companyName?: string }
}

type OrdersData = {
  docs: Order[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type OrdersPageClientProps = {
  initialData: OrdersData
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    noOrders: string
    filter: string
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('nl-NL')
}

export function OrdersPageClient({
  initialData,
  initialSearch,
  initialStatus,
  translations,
}: OrdersPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const tc = useTranslations('common')
  const t = useTranslations('orders')
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [converting, setConverting] = useState<string | null>(null)

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

  async function handleConvertToInvoice(orderId: string) {
    if (!confirm(t('convertConfirm'))) return
    setConverting(orderId)
    try {
      await convertOrderToInvoice(orderId)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : tc('error'))
    } finally {
      setConverting(null)
    }
  }

  async function handleStatusUpdate(orderId: string, newStatus: string) {
    try {
      await updateOrderStatus(orderId, newStatus)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : tc('error'))
    }
  }

  function getStatusBadge(statusVal: string | undefined) {
    switch (statusVal) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{t('status.pending')}</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{t('status.processing')}</Badge>
      case 'invoiced':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t('status.invoiced')}</Badge>
      case 'shipped':
        return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{t('status.shipped')}</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{t('status.completed')}</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('status.cancelled')}</Badge>
      default:
        return <Badge variant="outline">{statusVal}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
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
            <SelectItem value="pending">{t('status.pending')}</SelectItem>
            <SelectItem value="processing">{t('status.processing')}</SelectItem>
            <SelectItem value="invoiced">{t('status.invoiced')}</SelectItem>
            <SelectItem value="shipped">{t('status.shipped')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
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
                  {t('orderId')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('customer')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('orderDate')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('total')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('invoice')}
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
                    {translations.noOrders}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium font-mono text-sm">{order.externalOrderId || '\u2014'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        {order.customerName || (order.client && typeof order.client === 'object' ? order.client.companyName : null) || '\u2014'}
                      </div>
                      {order.customerEmail && (
                        <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {order.totalIncVat != null ? formatCents(order.totalIncVat) : '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.invoice && typeof order.invoice === 'object' ? (
                        <span className="inline-flex items-center gap-1 text-blue-600">
                          <ExternalLink className="h-3 w-3" />
                          {order.invoice.invoiceNumber || t('invoiceLinked')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(order.status === 'pending' || order.status === 'processing') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={converting === order.id}
                            onClick={() => handleConvertToInvoice(order.id)}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            {t('createInvoice')}
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleStatusUpdate(order.id, 'completed')}
                          >
                            {t('markCompleted')}
                          </Button>
                        )}
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
    </div>
  )
}
