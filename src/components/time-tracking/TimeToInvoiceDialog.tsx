'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { getUnbilledTimeByClient, convertTimeToInvoice } from '@/lib/actions/time-to-invoice'
import { FileText, Clock, Loader2 } from 'lucide-react'

type UnbilledGroup = {
  clientId: string
  clientName: string
  entries: { id: string; description: string; date: string; duration: number }[]
  totalMinutes: number
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TimeToInvoiceDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const tc = useTranslations('common')
  const [groups, setGroups] = useState<UnbilledGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Selected client
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [hourlyRate, setHourlyRate] = useState('75')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    setSuccess('')
    getUnbilledTimeByClient()
      .then((data) => {
        setGroups(data)
        if (data.length > 0) setSelectedClient(data[0].clientId)
      })
      .catch(() => setError('Kan uren niet laden'))
      .finally(() => setLoading(false))
  }, [open])

  const selectedGroup = groups.find((g) => g.clientId === selectedClient)
  const totalHours = selectedGroup ? selectedGroup.totalMinutes / 60 : 0
  const totalAmount = totalHours * (parseFloat(hourlyRate) || 0) * 100

  async function handleSubmit() {
    if (!selectedGroup) return
    setSubmitting(true)
    setError('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

      const result = await convertTimeToInvoice({
        clientId: selectedGroup.clientId,
        timeEntryIds: selectedGroup.entries.map((e) => e.id),
        hourlyRateCents: Math.round((parseFloat(hourlyRate) || 0) * 100),
        issueDate: today,
        dueDate,
      })

      setSuccess(`Factuur ${result.invoiceNumber} aangemaakt!`)
      setTimeout(() => {
        onOpenChange(false)
        router.push(`/nl/invoices/${result.invoiceId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uren factureren
          </DialogTitle>
          <DialogDescription>
            Selecteer een klant en stel het uurtarief in om een factuur te genereren van openstaande uren.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{tc('loading')}</div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Geen onbefactureerde uren gevonden.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Client selection */}
            <div>
              <Label>Klant</Label>
              <div className="mt-1 space-y-2">
                {groups.map((g) => (
                  <button
                    key={g.clientId}
                    onClick={() => setSelectedClient(g.clientId)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      selectedClient === g.clientId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{g.clientName}</p>
                      <p className="text-xs text-muted-foreground">{g.entries.length} uren, {(g.totalMinutes / 60).toFixed(1)}h totaal</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{(g.totalMinutes / 60).toFixed(1)}h</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hourly rate */}
            <div>
              <Label>Uurtarief (excl. BTW)</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">/ uur</span>
              </div>
            </div>

            {/* Preview */}
            {selectedGroup && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uren</span>
                  <span className="font-mono">{totalHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uurtarief</span>
                  <span className="font-mono">€{parseFloat(hourlyRate || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Totaal excl. BTW</span>
                  <span className="font-mono">€{(totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Entry list */}
            {selectedGroup && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {selectedGroup.entries.length} uren bekijken
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {selectedGroup.entries.map((e) => (
                    <div key={e.id} className="flex justify-between py-1 border-b border-dashed last:border-0">
                      <span className="truncate">{e.description}</span>
                      <span className="font-mono shrink-0 ml-2">{(e.duration / 60).toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedGroup || totalAmount === 0}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Factuur aanmaken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
