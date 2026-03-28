'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, X, Banknote, Trash2 } from 'lucide-react'
import { approvePurchaseInvoice, rejectPurchaseInvoice, markPurchaseInvoicePaid, deletePurchaseInvoice } from '@/lib/actions/purchase-invoices'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = { doc: Record<string, unknown>; locale: string }

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning'; label: string }> = {
  pending_review: { variant: 'warning', label: 'In behandeling' },
  approved: { variant: 'default', label: 'Goedgekeurd' },
  rejected: { variant: 'destructive', label: 'Afgewezen' },
  paid: { variant: 'success', label: 'Betaald' },
}

export function PurchaseInvoiceDetailClient({ doc, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const status = (doc.status as string) || 'pending_review'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.pending_review

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'approve') await approvePurchaseInvoice(String(doc.id))
      else if (action === 'reject') await rejectPurchaseInvoice(String(doc.id))
      else if (action === 'paid') await markPurchaseInvoicePaid(String(doc.id))
      else if (action === 'delete') {
        if (!confirm('Inkoopfactuur verwijderen?')) { setLoading(''); return }
        await deletePurchaseInvoice(String(doc.id))
        router.push(`/${locale}/purchase-invoices`); return
      }
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/purchase-invoices`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(doc.supplier || '—')}</h1>
            {(doc.invoiceNumber as string) ? <p className="text-sm text-muted-foreground">Factuurnr: {String(doc.invoiceNumber)}</p> : null}
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          {status === 'pending_review' && (
            <>
              <Button size="sm" onClick={() => handleAction('approve')} disabled={!!loading}><Check className="mr-2 h-4 w-4" />Goedkeuren</Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction('reject')} disabled={!!loading}><X className="mr-2 h-4 w-4" />Afwijzen</Button>
            </>
          )}
          {status === 'approved' && <Button size="sm" onClick={() => handleAction('paid')} disabled={!!loading}><Banknote className="mr-2 h-4 w-4" />Betaald</Button>}
          <Button variant="destructive" size="sm" onClick={() => handleAction('delete')} disabled={!!loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3 text-sm">
          <h2 className="font-semibold">Leverancier</h2>
          <p className="font-medium">{String(doc.supplier || '—')}</p>
          {(doc.supplierVatNumber as string) ? <p className="text-muted-foreground">BTW: {String(doc.supplierVatNumber)}</p> : null}
          {(doc.supplierIban as string) ? <p className="text-muted-foreground font-mono">IBAN: {String(doc.supplierIban)}</p> : null}
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3 text-sm">
          <h2 className="font-semibold">Bedragen</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotaal</span><span className="font-mono">{formatCents((doc.subtotal as number) || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">BTW</span><span className="font-mono">{formatCents((doc.vatAmount as number) || 0)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-2"><span>Totaal</span><span className="font-mono">{formatCents((doc.totalIncVat as number) || 0)}</span></div>
          </div>
          <div className="pt-2 space-y-1">
            <div className="flex justify-between text-muted-foreground"><span>Factuurdatum</span><span>{(doc.issueDate as string) ? formatDateShort(doc.issueDate as string) : '—'}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Vervaldatum</span><span>{(doc.dueDate as string) ? formatDateShort(doc.dueDate as string) : '—'}</span></div>
          </div>
        </div>
      </div>

      {(doc.notes as string) ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Opmerkingen</h2>
          <p className="text-sm text-muted-foreground">{String(doc.notes)}</p>
        </div>
      ) : null}

      {(doc.ocrConfidence as string) ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">OCR resultaat</h2>
          <div className="flex gap-4 text-sm">
            <Badge variant={(doc.ocrConfidence as string) === 'high' ? 'success' : (doc.ocrConfidence as string) === 'medium' ? 'warning' : 'destructive'}>
              {String(doc.ocrConfidence)} ({String(doc.ocrConfidenceScore)}%)
            </Badge>
            {(doc.ocrProcessedAt as string) ? <span className="text-muted-foreground">Verwerkt: {formatDateShort(doc.ocrProcessedAt as string)}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
