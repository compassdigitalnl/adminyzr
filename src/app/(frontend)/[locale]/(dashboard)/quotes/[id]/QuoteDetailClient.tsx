'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, Check, FileText, Trash2, X } from 'lucide-react'
import { updateQuoteStatus, convertQuoteToInvoice, deleteQuote } from '@/lib/actions/quotes'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = { quote: Record<string, unknown>; locale: string }

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  sent: { variant: 'default', label: 'Verstuurd' },
  accepted: { variant: 'success', label: 'Geaccepteerd' },
  rejected: { variant: 'destructive', label: 'Afgewezen' },
  expired: { variant: 'outline', label: 'Verlopen' },
}

export function QuoteDetailClient({ quote, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const status = (quote.status as string) || 'draft'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.draft
  const client = quote.client as Record<string, unknown> | undefined

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'send') await updateQuoteStatus(String(quote.id), 'sent')
      else if (action === 'accept') await updateQuoteStatus(String(quote.id), 'accepted')
      else if (action === 'reject') await updateQuoteStatus(String(quote.id), 'rejected')
      else if (action === 'convert') {
        const result = await convertQuoteToInvoice(String(quote.id))
        router.push(`/${locale}/invoices/${result.invoiceId}`)
        return
      } else if (action === 'delete') {
        if (!confirm('Offerte verwijderen?')) { setLoading(''); return }
        await deleteQuote(String(quote.id))
        router.push(`/${locale}/quotes`)
        return
      }
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/quotes`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(quote.quoteNumber || '—')}</h1>
            <p className="text-sm text-muted-foreground">{(client?.companyName as string) || '—'}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          {status === 'draft' && (
            <>
              <Button size="sm" onClick={() => handleAction('send')} disabled={!!loading}><Send className="mr-2 h-4 w-4" />Versturen</Button>
              <Button variant="destructive" size="sm" onClick={() => handleAction('delete')} disabled={!!loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
            </>
          )}
          {status === 'sent' && (
            <>
              <Button size="sm" variant="default" onClick={() => handleAction('accept')} disabled={!!loading}><Check className="mr-2 h-4 w-4" />Accepteren</Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction('reject')} disabled={!!loading}><X className="mr-2 h-4 w-4" />Afwijzen</Button>
            </>
          )}
          {status === 'accepted' && (
            <Button size="sm" onClick={() => handleAction('convert')} disabled={!!loading}><FileText className="mr-2 h-4 w-4" />Omzetten naar factuur</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3 text-sm">
          <h2 className="font-semibold">Offertegegevens</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Offertenummer</span><p className="font-mono font-medium">{String(quote.quoteNumber || '—')}</p></div>
            <div><span className="text-muted-foreground">Status</span><p><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></p></div>
            <div><span className="text-muted-foreground">Datum</span><p>{(quote.issueDate as string) ? formatDateShort(quote.issueDate as string) : '—'}</p></div>
            <div><span className="text-muted-foreground">Geldig tot</span><p>{(quote.validUntil as string) ? formatDateShort(quote.validUntil as string) : '—'}</p></div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3 text-sm">
          <h2 className="font-semibold">Bedragen</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotaal</span><span className="font-mono">{formatCents((quote.subtotal as number) || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">BTW</span><span className="font-mono">{formatCents((quote.vatAmount as number) || 0)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-2"><span>Totaal incl. BTW</span><span className="font-mono">{formatCents((quote.totalIncVat as number) || 0)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
