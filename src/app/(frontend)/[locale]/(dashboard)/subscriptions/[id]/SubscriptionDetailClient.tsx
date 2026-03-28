'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pause, Play, XCircle, FileText, Pencil, Trash2 } from 'lucide-react'
import { pauseSubscription, resumeSubscription, cancelSubscription, generateSubscriptionInvoice, deleteSubscription } from '@/lib/actions/subscriptions'
import { formatCents, formatDateShort } from '@/lib/utils'
import { SubscriptionForm } from '../SubscriptionForm'

type Props = {
  doc: Record<string, unknown>
  locale: string
  clients: Array<Record<string, unknown> & { id: string }>
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'Actief' },
  paused: { variant: 'warning', label: 'Gepauzeerd' },
  cancelled: { variant: 'destructive', label: 'Opgezegd' },
  expired: { variant: 'outline', label: 'Verlopen' },
}

export function SubscriptionDetailClient({ doc, locale, clients }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const status = (doc.status as string) || 'active'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.active
  const client = doc.client as Record<string, unknown> | undefined

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'pause') await pauseSubscription(String(doc.id))
      else if (action === 'resume') await resumeSubscription(String(doc.id))
      else if (action === 'cancel') await cancelSubscription(String(doc.id))
      else if (action === 'invoice') await generateSubscriptionInvoice(String(doc.id))
      else if (action === 'delete') {
        if (!confirm('Abonnement verwijderen?')) { setLoading(''); return }
        await deleteSubscription(String(doc.id))
        router.push(`/${locale}/subscriptions`); return
      }
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/subscriptions`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(doc.name || '—')}</h1>
            <p className="text-sm text-muted-foreground">{(client?.companyName as string) || '—'}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          {status === 'active' && (
            <>
              <Button size="sm" onClick={() => handleAction('invoice')} disabled={!!loading}><FileText className="mr-2 h-4 w-4" />Factureren</Button>
              <Button size="sm" variant="outline" onClick={() => handleAction('pause')} disabled={!!loading}><Pause className="mr-2 h-4 w-4" />Pauzeren</Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction('cancel')} disabled={!!loading}><XCircle className="mr-2 h-4 w-4" />Opzeggen</Button>
            </>
          )}
          {status === 'paused' && (
            <>
              <Button size="sm" onClick={() => handleAction('resume')} disabled={!!loading}><Play className="mr-2 h-4 w-4" />Hervatten</Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction('cancel')} disabled={!!loading}><XCircle className="mr-2 h-4 w-4" />Opzeggen</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Bewerken</Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('delete')} disabled={!!loading}><Trash2 className="mr-2 h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Abonnementsgegevens</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Interval</span><p>{String(doc.interval || '—')}</p></div>
            <div><span className="text-muted-foreground">Bedrag</span><p className="font-mono font-bold">{formatCents((doc.amount as number) || 0)}</p></div>
            <div><span className="text-muted-foreground">Startdatum</span><p>{(doc.startDate as string) ? formatDateShort(doc.startDate as string) : '—'}</p></div>
            <div><span className="text-muted-foreground">Volgende factuur</span><p>{(doc.nextInvoiceDate as string) ? formatDateShort(doc.nextInvoiceDate as string) : '—'}</p></div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Instellingen</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Auto-versturen</span><span>{(doc.autoSend as boolean) ? 'Ja' : 'Nee'}</span></div>
            {(doc.endDate as string) ? <div className="flex justify-between"><span className="text-muted-foreground">Einddatum</span><span>{formatDateShort(doc.endDate as string)}</span></div> : null}
          </div>
        </div>
      </div>

      <SubscriptionForm
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) router.refresh()
        }}
        clients={clients}
        editData={{
          id: String(doc.id),
          client: client?.id ? { id: String(client.id) } : '',
          name: (doc.name as string) || '',
          description: (doc.description as string) || '',
          interval: (doc.interval as string) || 'monthly',
          amount: (doc.amount as number) || 0,
          vatRate: (doc.vatRate as string) || '21',
          startDate: (doc.startDate as string) || '',
          endDate: (doc.endDate as string) || '',
          autoSend: (doc.autoSend as boolean) || false,
        }}
      />
    </div>
  )
}
