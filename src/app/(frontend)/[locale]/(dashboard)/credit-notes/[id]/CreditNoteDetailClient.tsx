'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, CheckCircle, Trash2 } from 'lucide-react'
import { updateCreditNoteStatus, deleteCreditNote } from '@/lib/actions/credit-notes'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = { doc: Record<string, unknown>; locale: string }

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  sent: { variant: 'default', label: 'Verstuurd' },
  finalized: { variant: 'success', label: 'Definitief' },
}

export function CreditNoteDetailClient({ doc, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const status = (doc.status as string) || 'draft'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.draft
  const invoice = doc.linkedInvoice as Record<string, unknown> | undefined

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'send') await updateCreditNoteStatus(String(doc.id), 'sent')
      else if (action === 'finalize') await updateCreditNoteStatus(String(doc.id), 'finalized')
      else if (action === 'delete') {
        if (!confirm('Creditnota verwijderen?')) { setLoading(''); return }
        await deleteCreditNote(String(doc.id))
        router.push(`/${locale}/credit-notes`); return
      }
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/credit-notes`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(doc.creditNoteNumber || '—')}</h1>
            {invoice ? <p className="text-sm text-muted-foreground">Bij factuur: {String((invoice as Record<string, unknown>).invoiceNumber || invoice)}</p> : null}
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
            <Button size="sm" onClick={() => handleAction('finalize')} disabled={!!loading}><CheckCircle className="mr-2 h-4 w-4" />Definitief maken</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Creditnota gegevens</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Nummer</span><p className="font-mono font-medium">{String(doc.creditNoteNumber || '—')}</p></div>
            <div><span className="text-muted-foreground">Datum</span><p>{(doc.issueDate as string) ? formatDateShort(doc.issueDate as string) : '—'}</p></div>
          </div>
          {(doc.reason as string) ? <div><span className="text-muted-foreground">Reden</span><p>{String(doc.reason)}</p></div> : null}
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Bedragen</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotaal</span><span className="font-mono">{formatCents((doc.subtotal as number) || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">BTW</span><span className="font-mono">{formatCents((doc.vatAmount as number) || 0)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-2"><span>Totaal</span><span className="font-mono">{formatCents((doc.totalIncVat as number) || 0)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
