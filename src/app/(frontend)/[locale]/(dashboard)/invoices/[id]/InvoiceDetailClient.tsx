'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Send, Check, Download, Bell, Pencil, Trash2, Copy, FileMinus,
} from 'lucide-react'
import { updateInvoiceStatus, deleteInvoice } from '@/lib/actions/invoices'
import { sendInvoiceEmail } from '@/lib/actions/email'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = {
  invoice: Record<string, unknown>
  items: Record<string, unknown>[]
  locale: string
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  sent: { variant: 'default', label: 'Verstuurd' },
  paid: { variant: 'success', label: 'Betaald' },
  overdue: { variant: 'destructive', label: 'Te laat' },
  cancelled: { variant: 'outline', label: 'Geannuleerd' },
}

export function InvoiceDetailClient({ invoice, items, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')

  const status = (invoice.status as string) || 'draft'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.draft
  const client = invoice.client as Record<string, unknown> | undefined
  const clientName = (client?.companyName as string) || (client?.contactName as string) || '—'
  const clientEmail = client?.email as string
  const clientAddress = client?.address as Record<string, string> | undefined

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'send') {
        try {
          await sendInvoiceEmail(String(invoice.id))
        } catch {
          await updateInvoiceStatus(String(invoice.id), 'sent')
        }
      } else if (action === 'paid') {
        await updateInvoiceStatus(String(invoice.id), 'paid')
      } else if (action === 'reminder') {
        await sendInvoiceEmail(String(invoice.id))
      } else if (action === 'delete') {
        if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) {
          setLoading('')
          return
        }
        await deleteInvoice(String(invoice.id))
        router.push(`/${locale}/invoices`)
        return
      }
      router.refresh()
    } catch {
      // Ignore
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/invoices`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber as string}</h1>
            <p className="text-sm text-muted-foreground">{clientName}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {status === 'draft' && (
            <>
              <Link href={`/${locale}/invoices/${invoice.id}/edit`}>
                <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Bewerken</Button>
              </Link>
              <Button size="sm" onClick={() => handleAction('send')} disabled={loading === 'send'}>
                <Send className="mr-2 h-4 w-4" />{loading === 'send' ? '...' : 'Versturen'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleAction('delete')} disabled={loading === 'delete'}>
                <Trash2 className="mr-2 h-4 w-4" />Verwijderen
              </Button>
            </>
          )}
          {(status === 'sent' || status === 'overdue') && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleAction('reminder')} disabled={loading === 'reminder'}>
                <Bell className="mr-2 h-4 w-4" />{status === 'overdue' ? 'Aanmaning' : 'Herinnering'}
              </Button>
              <Button size="sm" onClick={() => handleAction('paid')} disabled={loading === 'paid'}>
                <Check className="mr-2 h-4 w-4" />Betaald markeren
              </Button>
            </>
          )}
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />PDF</Button>
          </a>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoice details */}
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Factuurgegevens</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Factuurnummer</span>
              <p className="font-mono font-medium">{invoice.invoiceNumber as string}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></p>
            </div>
            <div>
              <span className="text-muted-foreground">Factuurdatum</span>
              <p>{invoice.issueDate ? formatDateShort(invoice.issueDate as string) : '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vervaldatum</span>
              <p>{invoice.dueDate ? formatDateShort(invoice.dueDate as string) : '—'}</p>
            </div>
            {(invoice.reference as string) ? (
              <div className="col-span-2">
                <span className="text-muted-foreground">Referentie</span>
                <p>{String(invoice.reference)}</p>
              </div>
            ) : null}
            {(invoice.paidAt as string) ? (
              <div>
                <span className="text-muted-foreground">Betaald op</span>
                <p>{formatDateShort(invoice.paidAt as string)}</p>
              </div>
            ) : null}
            {(invoice.paymentUrl as string) ? (
              <div className="col-span-2">
                <span className="text-muted-foreground">Betaallink</span>
                <p className="truncate text-xs font-mono text-blue-600">
                  <a href={invoice.paymentUrl as string} target="_blank" rel="noopener noreferrer">
                    {String(invoice.paymentUrl)}
                  </a>
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Client details */}
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Klantgegevens</h2>
          <div className="text-sm space-y-2">
            <p className="font-medium">{clientName}</p>
            {clientEmail && <p className="text-muted-foreground">{clientEmail}</p>}
            {clientAddress && (
              <p className="text-muted-foreground">
                {[clientAddress.street, clientAddress.houseNumber].filter(Boolean).join(' ')}<br />
                {[clientAddress.postalCode, clientAddress.city].filter(Boolean).join(' ')}
              </p>
            )}
            {(client?.kvkNumber as string) ? <p className="text-muted-foreground">KvK: {String(client?.kvkNumber)}</p> : null}
            {(client?.vatNumber as string) ? <p className="text-muted-foreground">BTW: {String(client?.vatNumber)}</p> : null}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Factuurregels</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Omschrijving</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Aantal</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Prijs</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">BTW</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Geen factuurregels</td></tr>
            ) : (
              items.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-6 py-3">{(item.description as string) || '—'}</td>
                  <td className="px-6 py-3 text-right">{item.quantity as number}</td>
                  <td className="px-6 py-3 text-right font-mono">{formatCents((item.unitPrice as number) || 0)}</td>
                  <td className="px-6 py-3 text-right">{item.vatRate as string}%</td>
                  <td className="px-6 py-3 text-right font-mono">{formatCents((item.lineTotal as number) || 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t px-6 py-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotaal</span>
            <span className="font-mono">{formatCents((invoice.subtotal as number) || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">BTW</span>
            <span className="font-mono">{formatCents((invoice.vatAmount as number) || 0)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t pt-2">
            <span>Totaal incl. BTW</span>
            <span className="font-mono">{formatCents((invoice.totalIncVat as number) || 0)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(invoice.notes as string) ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Opmerkingen</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(invoice.notes)}</p>
        </div>
      ) : null}
    </div>
  )
}
