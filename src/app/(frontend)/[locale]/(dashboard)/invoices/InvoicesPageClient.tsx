'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Filter, Send, Check, Download, Pencil, Trash2, Bell, MoreHorizontal, Copy, FileMinus } from 'lucide-react'
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
import { updateInvoiceStatus, deleteInvoice } from '@/lib/actions/invoices'
import { sendInvoiceEmail } from '@/lib/actions/email'
import { formatCents, formatDateShort } from '@/lib/utils'
import Link from 'next/link'

type Invoice = Record<string, unknown> & {
  id: string
  invoiceNumber?: string
  client?: { id: string; companyName: string } | string
  type?: string
  status?: string
  issueDate?: string
  dueDate?: string
  subtotal?: number
  vatAmount?: number
  totalIncVat?: number
}

type InvoicesData = {
  docs: Invoice[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type InvoicesPageClientProps = {
  initialData: InvoicesData
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newInvoice: string
    noInvoices: string
    filter: string
    export: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  sent: { variant: 'default', label: 'Verstuurd' },
  paid: { variant: 'success', label: 'Betaald' },
  overdue: { variant: 'destructive', label: 'Te laat' },
  cancelled: { variant: 'outline', label: 'Geannuleerd' },
}

export function InvoicesPageClient({
  initialData,
  initialSearch,
  initialStatus,
  translations,
}: InvoicesPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('invoices')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

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

  async function handleMarkSent(id: string) {
    try {
      await sendInvoiceEmail(id)
    } catch {
      // Fallback: if email fails, still mark as sent
      await updateInvoiceStatus(id, 'sent')
    }
    router.refresh()
  }

  async function handleMarkPaid(id: string) {
    await updateInvoiceStatus(id, 'paid')
    router.refresh()
  }

  async function handleSendReminder(id: string) {
    try {
      await sendInvoiceEmail(id)
    } catch {
      // Ignore
    }
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) return
    await deleteInvoice(id)
    router.refresh()
  }

  function getClientName(client: Invoice['client']): string {
    if (typeof client === 'object' && client !== null) {
      return client.companyName
    }
    return String(client)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Link href={`${pathname}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {translations.newInvoice}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`${t('client')}, ${t('invoiceNumber')}...`}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
            <SelectItem value="sent">{t('status.sent')}</SelectItem>
            <SelectItem value="paid">{t('status.paid')}</SelectItem>
            <SelectItem value="overdue">{t('status.overdue')}</SelectItem>
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
                  {t('invoiceNumber')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('client')}
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
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noInvoices}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((invoice) => {
                  const statusInfo = STATUS_BADGE[invoice.status || 'draft'] || STATUS_BADGE.draft
                  return (
                    <tr key={invoice.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium">{invoice.invoiceNumber || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.client ? getClientName(invoice.client) : '—'}
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
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Draft: edit, send, delete */}
                          {invoice.status === 'draft' && (
                            <>
                              <Link href={`${pathname}/${invoice.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Bewerken">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('sendInvoice')} onClick={() => handleMarkSent(invoice.id)}>
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Verwijderen" onClick={() => handleDelete(invoice.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {/* Sent: mark paid, send reminder */}
                          {invoice.status === 'sent' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('markPaid')} onClick={() => handleMarkPaid(invoice.id)}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Herinnering sturen" onClick={() => handleSendReminder(invoice.id)}>
                                <Bell className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {/* Overdue: mark paid, send reminder */}
                          {invoice.status === 'overdue' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('markPaid')} onClick={() => handleMarkPaid(invoice.id)}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Aanmaning sturen" onClick={() => handleSendReminder(invoice.id)}>
                                <Bell className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {/* Always: download PDF */}
                          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('downloadPdf')}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
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
    </div>
  )
}
