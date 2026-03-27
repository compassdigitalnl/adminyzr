'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Filter, Send, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createCreditNoteFromInvoice,
  updateCreditNoteStatus,
  deleteCreditNote,
} from '@/lib/actions/credit-notes'
import { getInvoices } from '@/lib/actions/invoices'
import { formatCents, formatDateShort } from '@/lib/utils'

type CreditNote = Record<string, unknown> & {
  id: string
  creditNoteNumber?: string
  client?: { id: string; companyName: string } | string
  originalInvoice?: { id: string; invoiceNumber: string } | string
  reason?: string
  status?: string
  issuedDate?: string
  totalExVat?: number
  totalVat?: number
  totalIncVat?: number
}

type CreditNotesData = {
  docs: CreditNote[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type InvoiceOption = {
  id: string
  invoiceNumber: string
  client?: { id: string; companyName: string } | string
  totalIncVat?: number
}

type CreditNotesPageClientProps = {
  initialData: CreditNotesData
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newCreditNote: string
    noCreditNotes: string
    filter: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  sent: { variant: 'default', label: 'Verstuurd' },
  finalized: { variant: 'success', label: 'Definitief' },
}

export function CreditNotesPageClient({
  initialData,
  initialSearch,
  initialStatus,
  translations,
}: CreditNotesPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('creditNotes')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [reason, setReason] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

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

  async function handleOpenCreateDialog() {
    setShowCreateDialog(true)
    setSelectedInvoiceId('')
    setReason('')
    setIsLoadingInvoices(true)
    try {
      const result = await getInvoices({ limit: 100 })
      const invoices = (result.docs as unknown as InvoiceOption[]).filter(
        (inv: InvoiceOption) => inv.invoiceNumber
      )
      setInvoiceOptions(invoices)
    } catch {
      setInvoiceOptions([])
    } finally {
      setIsLoadingInvoices(false)
    }
  }

  async function handleCreateCreditNote() {
    if (!selectedInvoiceId || !reason.trim()) return
    setIsCreating(true)
    try {
      await createCreditNoteFromInvoice(selectedInvoiceId, reason.trim())
      setShowCreateDialog(false)
      setSelectedInvoiceId('')
      setReason('')
      router.refresh()
    } catch (error) {
      console.error('Failed to create credit note:', error)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleSend(id: string) {
    try {
      await updateCreditNoteStatus(id, 'sent')
      router.refresh()
    } catch (error) {
      console.error('Failed to send credit note:', error)
    }
  }

  async function handleFinalize(id: string) {
    try {
      await updateCreditNoteStatus(id, 'finalized')
      router.refresh()
    } catch (error) {
      console.error('Failed to finalize credit note:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je deze creditnota wilt verwijderen?')) return
    try {
      await deleteCreditNote(id)
      router.refresh()
    } catch (error) {
      console.error('Failed to delete credit note:', error)
    }
  }

  function getClientName(client: CreditNote['client']): string {
    if (typeof client === 'object' && client !== null) {
      return client.companyName
    }
    return String(client || '—')
  }

  function getInvoiceNumber(invoice: CreditNote['originalInvoice']): string {
    if (typeof invoice === 'object' && invoice !== null) {
      return invoice.invoiceNumber
    }
    return String(invoice || '—')
  }

  function getInvoiceOptionLabel(inv: InvoiceOption): string {
    const clientName = typeof inv.client === 'object' && inv.client !== null
      ? inv.client.companyName
      : ''
    const amount = inv.totalIncVat ? ` (${formatCents(inv.totalIncVat)})` : ''
    return `${inv.invoiceNumber}${clientName ? ` — ${clientName}` : ''}${amount}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newCreditNote}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Creditnotanummer..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="draft">Concept</SelectItem>
            <SelectItem value="sent">Verstuurd</SelectItem>
            <SelectItem value="finalized">Definitief</SelectItem>
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
                  Creditnotanummer
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Klant
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Originele factuur
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Datum
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
                    {translations.noCreditNotes}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((creditNote) => {
                  const statusInfo = STATUS_BADGE[creditNote.status || 'draft'] || STATUS_BADGE.draft
                  return (
                    <tr key={creditNote.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium">{creditNote.creditNoteNumber || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {creditNote.client ? getClientName(creditNote.client) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">
                          {creditNote.originalInvoice ? getInvoiceNumber(creditNote.originalInvoice) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {creditNote.issuedDate ? formatDateShort(creditNote.issuedDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatCents(creditNote.totalIncVat || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {creditNote.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Versturen"
                                onClick={() => handleSend(creditNote.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Verwijderen"
                                onClick={() => handleDelete(creditNote.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {creditNote.status === 'sent' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Definitief maken"
                              onClick={() => handleFinalize(creditNote.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
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

      {/* Create Credit Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creditnota aanmaken</DialogTitle>
            <DialogDescription>
              Selecteer de factuur waarvoor je een creditnota wilt aanmaken en geef een reden op.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-select">Factuur</Label>
              {isLoadingInvoices ? (
                <p className="text-sm text-muted-foreground">Facturen laden...</p>
              ) : (
                <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                  <SelectTrigger id="invoice-select">
                    <SelectValue placeholder="Selecteer een factuur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceOptions.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {getInvoiceOptionLabel(inv)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reden</Label>
              <Textarea
                id="reason"
                placeholder="Beschrijf de reden voor de creditnota..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleCreateCreditNote}
              disabled={!selectedInvoiceId || !reason.trim() || isCreating}
            >
              {isCreating ? 'Aanmaken...' : 'Creditnota aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
