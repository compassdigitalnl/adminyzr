'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, X, Ban } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

type Props = { doc: Record<string, unknown>; locale: string }

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning'; label: string }> = {
  pending: { variant: 'warning', label: 'In afwachting' },
  approved: { variant: 'success', label: 'Goedgekeurd' },
  rejected: { variant: 'destructive', label: 'Afgewezen' },
  cancelled: { variant: 'secondary', label: 'Geannuleerd' },
}

export function LeaveDetailClient({ doc, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const status = (doc.status as string) || 'pending'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.pending
  const employee = doc.employee as Record<string, unknown> | undefined

  async function handleAction(action: string) {
    setLoading(action)
    try {
      const { updateLeaveStatus } = await import('@/lib/actions/leave')
      await updateLeaveStatus(String(doc.id), action)
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/leave`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Verlofaanvraag</h1>
            <p className="text-sm text-muted-foreground">{(employee?.name as string) || '—'}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          {status === 'pending' && (
            <>
              <Button size="sm" onClick={() => handleAction('approved')} disabled={!!loading}><Check className="mr-2 h-4 w-4" />Goedkeuren</Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction('rejected')} disabled={!!loading}><X className="mr-2 h-4 w-4" />Afwijzen</Button>
            </>
          )}
          {(status === 'pending' || status === 'approved') && (
            <Button size="sm" variant="outline" onClick={() => handleAction('cancelled')} disabled={!!loading}><Ban className="mr-2 h-4 w-4" />Annuleren</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Aanvraag details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Type</span><p className="capitalize font-medium">{String(doc.type || '—')}</p></div>
            <div><span className="text-muted-foreground">Dagen</span><p className="font-bold text-lg">{String(doc.days || 0)}</p></div>
            <div><span className="text-muted-foreground">Van</span><p>{(doc.startDate as string) ? formatDateShort(doc.startDate as string) : '—'}</p></div>
            <div><span className="text-muted-foreground">Tot</span><p>{(doc.endDate as string) ? formatDateShort(doc.endDate as string) : '—'}</p></div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Medewerker</h2>
          <p className="font-medium">{(employee?.name as string) || '—'}</p>
          {(employee?.email as string) ? <p className="text-muted-foreground">{String(employee?.email)}</p> : null}
          {(employee?.position as string) ? <p className="text-muted-foreground">{String(employee?.position)}</p> : null}
        </div>
      </div>

      {(doc.notes as string) ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Toelichting</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(doc.notes)}</p>
        </div>
      ) : null}
    </div>
  )
}
