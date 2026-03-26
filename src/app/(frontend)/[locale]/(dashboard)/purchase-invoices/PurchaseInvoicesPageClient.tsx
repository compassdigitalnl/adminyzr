'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Filter, Check, X, Banknote, Pencil, Trash2 } from 'lucide-react'
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
  approvePurchaseInvoice,
  rejectPurchaseInvoice,
  markPurchaseInvoicePaid,
  deletePurchaseInvoice,
} from '@/lib/actions/purchase-invoices'
import { PurchaseInvoiceForm } from '@/components/purchase-invoices/PurchaseInvoiceForm'
import { formatCents, formatDateShort } from '@/lib/utils'

type PurchaseInvoice = Record<string, unknown> & {
  id: string
  supplier?: string
  supplierVatNumber?: string
  supplierIban?: string
  invoiceNumber?: string
  status?: string
  issueDate?: string
  dueDate?: string
  subtotal?: number
  vatAmount?: number
  totalIncVat?: number
  category?: string
  notes?: string
}

type PurchaseInvoicesData = {
  docs: PurchaseInvoice[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PurchaseInvoicesPageClientProps = {
  initialData: PurchaseInvoicesData
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newInvoice: string
    noInvoices: string
    filter: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  pending_review: { variant: 'warning', labelKey: 'pending_review' },
  approved: { variant: 'success', labelKey: 'approved' },
  rejected: { variant: 'destructive', labelKey: 'rejected' },
  paid: { variant: 'default', labelKey: 'paid' },
}

const CATEGORY_KEYS: Record<string, string> = {
  operations: 'operations',
  software: 'software',
  hosting: 'hosting',
  marketing: 'marketing',
  office: 'office',
  travel: 'travel',
  other: 'other',
}

export function PurchaseInvoicesPageClient({
  initialData,
  initialSearch,
  initialStatus,
  translations,
}: PurchaseInvoicesPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('purchaseInvoices')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [showForm, setShowForm] = useState(false)
  const [editInvoice, setEditInvoice] = useState<PurchaseInvoice | null>(null)

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

  async function handleApprove(id: string) {
    await approvePurchaseInvoice(id)
    router.refresh()
  }

  async function handleReject(id: string) {
    await rejectPurchaseInvoice(id)
    router.refresh()
  }

  async function handleMarkPaid(id: string) {
    await markPurchaseInvoicePaid(id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await deletePurchaseInvoice(id)
    router.refresh()
  }

  function handleEdit(invoice: PurchaseInvoice) {
    setEditInvoice(invoice)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditInvoice(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setEditInvoice(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newInvoice}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`${t('supplier')}, ${t('invoiceNumber')}...`}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="pending_review">{t('status.pending_review')}</SelectItem>
            <SelectItem value="approved">{t('status.approved')}</SelectItem>
            <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
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
                  {t('supplier')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('invoiceNumber')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('issueDate')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('dueDate')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('amount')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {t('category')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noInvoices}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((invoice) => {
                  const statusInfo = STATUS_BADGE[invoice.status || 'pending_review'] || STATUS_BADGE.pending_review
                  const categoryKey = CATEGORY_KEYS[invoice.category || 'other'] || 'other'
                  return (
                    <tr key={invoice.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{invoice.supplier || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">{invoice.invoiceNumber || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.issueDate ? formatDateShort(invoice.issueDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.dueDate ? formatDateShort(invoice.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatCents(invoice.totalIncVat || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">{t(`categories.${categoryKey}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusInfo.variant}>{t(`status.${statusInfo.labelKey}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {invoice.status === 'pending_review' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                title={t('approve')}
                                onClick={() => handleApprove(invoice.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                title={t('reject')}
                                onClick={() => handleReject(invoice.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {invoice.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t('markPaid')}
                              onClick={() => handleMarkPaid(invoice.id)}
                            >
                              <Banknote className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={tc('edit')}
                            onClick={() => handleEdit(invoice)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title={tc('delete')}
                            onClick={() => handleDelete(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Form Dialog */}
      <PurchaseInvoiceForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editData={editInvoice || undefined}
      />
    </div>
  )
}
