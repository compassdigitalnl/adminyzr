'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Banknote } from 'lucide-react'
import { processPayrollRun, markPayrollPaid } from '@/lib/actions/payroll'
import { formatCents, formatDateShort } from '@/lib/utils'

type Props = {
  data: {
    run: { id: string; period: string; status: string; totalGross: number; totalTax: number; totalNet: number; processedAt: string | null; paidAt: string | null }
    entries: { id: string; employeeName: string; employeeId: string; grossSalary: number; bonus: number; deductions: number; loonheffing: number; socialSecurity: number; netSalary: number }[]
  }
  locale: string
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Concept' },
  processed: { variant: 'warning', label: 'Verwerkt' },
  paid: { variant: 'success', label: 'Uitbetaald' },
}

export function PayrollDetailClient({ data, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const { run, entries } = data
  const statusInfo = STATUS_BADGE[run.status] || STATUS_BADGE.draft

  async function handleAction(action: string) {
    setLoading(action)
    try {
      if (action === 'process') await processPayrollRun(run.id)
      else if (action === 'paid') await markPayrollPaid(run.id)
      router.refresh()
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/payroll`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Verloning {run.period}</h1>
            {run.processedAt ? <p className="text-sm text-muted-foreground">Verwerkt: {formatDateShort(run.processedAt)}</p> : null}
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          {run.status === 'draft' && (
            <Button size="sm" onClick={() => handleAction('process')} disabled={!!loading}><Play className="mr-2 h-4 w-4" />Verwerken</Button>
          )}
          {run.status === 'processed' && (
            <Button size="sm" onClick={() => handleAction('paid')} disabled={!!loading}><Banknote className="mr-2 h-4 w-4" />Uitbetaald markeren</Button>
          )}
        </div>
      </div>

      {/* Totalen */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Bruto totaal</p>
          <p className="text-xl font-mono font-bold">{formatCents(run.totalGross)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Loonheffing + premies</p>
          <p className="text-xl font-mono font-bold text-red-600">{formatCents(run.totalTax)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Netto uit te betalen</p>
          <p className="text-xl font-mono font-bold text-green-600">{formatCents(run.totalNet)}</p>
        </div>
      </div>

      {/* Per medewerker */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Per medewerker ({entries.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-2 text-left font-medium text-muted-foreground">Medewerker</th>
              <th className="px-6 py-2 text-right font-medium text-muted-foreground">Bruto</th>
              <th className="px-6 py-2 text-right font-medium text-muted-foreground">Loonheffing</th>
              <th className="px-6 py-2 text-right font-medium text-muted-foreground">Premies</th>
              <th className="px-6 py-2 text-right font-medium text-muted-foreground">Netto</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Geen medewerkers in deze verloning</td></tr>
            ) : entries.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/${locale}/employees/${entry.employeeId}`)}>
                <td className="px-6 py-3 font-medium">{entry.employeeName}</td>
                <td className="px-6 py-3 text-right font-mono">{formatCents(entry.grossSalary + entry.bonus)}</td>
                <td className="px-6 py-3 text-right font-mono text-red-600">{formatCents(entry.loonheffing)}</td>
                <td className="px-6 py-3 text-right font-mono text-red-600">{formatCents(entry.socialSecurity)}</td>
                <td className="px-6 py-3 text-right font-mono font-bold">{formatCents(entry.netSalary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
