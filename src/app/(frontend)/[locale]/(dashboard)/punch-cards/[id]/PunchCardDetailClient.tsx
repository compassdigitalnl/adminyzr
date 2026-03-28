'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = { doc: Record<string, unknown>; locale: string }

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'Actief' },
  depleted: { variant: 'secondary', label: 'Op' },
  expired: { variant: 'destructive', label: 'Verlopen' },
  cancelled: { variant: 'outline' as 'destructive', label: 'Geannuleerd' },
}

export function PunchCardDetailClient({ doc, locale }: Props) {
  const status = (doc.status as string) || 'active'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.active
  const client = doc.client as Record<string, unknown> | undefined
  const totalCredits = (doc.totalCredits as number) || 0
  const usedCredits = (doc.usedCredits as number) || 0
  const remaining = totalCredits - usedCredits
  const percentage = totalCredits > 0 ? Math.round((usedCredits / totalCredits) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/punch-cards`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(doc.name || '—')}</h1>
            <p className="text-sm text-muted-foreground">{(client?.companyName as string) || '—'}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Totaal credits</p>
          <p className="text-2xl font-bold">{totalCredits}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Gebruikt</p>
          <p className="text-2xl font-bold text-amber-600">{usedCredits}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Resterend</p>
          <p className="text-2xl font-bold text-green-600">{remaining}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Prijs per credit</p>
          <p className="text-2xl font-mono font-bold">{formatCents((doc.pricePerCredit as number) || 0)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Verbruik</span>
          <span className="font-mono font-medium">{percentage}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{usedCredits} gebruikt</span>
          <span>{remaining} resterend</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-2">
          <h2 className="font-semibold">Details</h2>
          {(doc.expiresAt as string) ? <p>Vervaldatum: <strong>{formatDateShort(doc.expiresAt as string)}</strong></p> : null}
          <p>Totaalwaarde: <strong className="font-mono">{formatCents(totalCredits * ((doc.pricePerCredit as number) || 0))}</strong></p>
        </div>
      </div>
    </div>
  )
}
