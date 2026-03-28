'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Check } from 'lucide-react'
import { updateOrderStatus, convertOrderToInvoice } from '@/lib/actions/orders'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = { order: Record<string, unknown>; locale: string }

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline'; label: string }> = {
  pending: { variant: 'warning', label: 'In afwachting' },
  processing: { variant: 'default', label: 'In verwerking' },
  invoiced: { variant: 'default', label: 'Gefactureerd' },
  shipped: { variant: 'default', label: 'Verzonden' },
  completed: { variant: 'success', label: 'Afgerond' },
  cancelled: { variant: 'outline', label: 'Geannuleerd' },
}

export function OrderDetailClient({ order, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const status = (order.status as string) || 'pending'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.pending
  const client = order.client as Record<string, unknown> | undefined

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'invoice') {
        await convertOrderToInvoice(String(order.id))
      } else if (action === 'complete') {
        await updateOrderStatus(String(order.id), 'completed')
      }
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/orders`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Bestelling #{String(order.externalOrderId || order.id)}</h1>
            <p className="text-sm text-muted-foreground">{(client?.companyName as string) || '—'}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          {(status === 'pending' || status === 'processing') && (
            <Button size="sm" onClick={() => handleAction('invoice')} disabled={!!loading}><FileText className="mr-2 h-4 w-4" />Factureren</Button>
          )}
          {status === 'shipped' && (
            <Button size="sm" onClick={() => handleAction('complete')} disabled={!!loading}><Check className="mr-2 h-4 w-4" />Afronden</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Bestelgegevens</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Order ID</span><p className="font-mono">{String(order.externalOrderId || order.id)}</p></div>
            <div><span className="text-muted-foreground">Besteldatum</span><p>{(order.orderDate as string) ? formatDateShort(order.orderDate as string) : '—'}</p></div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Bedragen</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotaal</span><span className="font-mono">{formatCents((order.subtotal as number) || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">BTW</span><span className="font-mono">{formatCents((order.vatAmount as number) || 0)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-2"><span>Totaal</span><span className="font-mono">{formatCents((order.totalIncVat as number) || 0)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
