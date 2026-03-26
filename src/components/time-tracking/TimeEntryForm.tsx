'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { createTimeEntry, updateTimeEntry, type TimeEntryFormData } from '@/lib/actions/time-entries'
import { getPunchCards } from '@/lib/actions/punch-cards'

type ClientOption = Record<string, unknown> & {
  id: string
  companyName?: string
}

type PunchCardOption = Record<string, unknown> & {
  id: string
  name?: string
  totalCredits?: number
  usedCredits?: number
  status?: string
  client?: string | { id: string }
}

type TimeEntryFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: ClientOption[]
  editData?: {
    id: string
    client?: string | { id: string; companyName?: string }
    punchCard?: string | { id: string; name?: string }
    description?: string
    date?: string
    duration?: number
    billable?: boolean
  }
}

function minutesToDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function durationToMinutes(duration: string): number {
  const parts = duration.split(':')
  const hours = parseInt(parts[0] || '0', 10)
  const mins = parseInt(parts[1] || '0', 10)
  return hours * 60 + mins
}

export function TimeEntryForm({ open, onOpenChange, clients, editData }: TimeEntryFormProps) {
  const t = useTranslations('timeTracking')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getClientId = (client?: string | { id: string }) => {
    if (!client) return ''
    return typeof client === 'object' ? client.id : client
  }

  const getPunchCardId = (card?: string | { id: string }) => {
    if (!card) return ''
    return typeof card === 'object' ? card.id : card
  }

  const [clientId, setClientId] = useState(getClientId(editData?.client))
  const [description, setDescription] = useState(editData?.description || '')
  const [date, setDate] = useState(editData?.date ? editData.date.split('T')[0] : new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState(editData?.duration ? minutesToDuration(editData.duration) : '01:00')
  const [billable, setBillable] = useState(editData?.billable ?? true)
  const [punchCardId, setPunchCardId] = useState(getPunchCardId(editData?.punchCard))
  const [punchCards, setPunchCards] = useState<PunchCardOption[]>([])

  // Reset form when editData changes or dialog opens
  useEffect(() => {
    if (open) {
      setClientId(getClientId(editData?.client))
      setDescription(editData?.description || '')
      setDate(editData?.date ? editData.date.split('T')[0] : new Date().toISOString().split('T')[0])
      setDuration(editData?.duration ? minutesToDuration(editData.duration) : '01:00')
      setBillable(editData?.billable ?? true)
      setPunchCardId(getPunchCardId(editData?.punchCard))
      setError('')
    }
  }, [open, editData])

  // Fetch punch cards when client changes
  useEffect(() => {
    if (clientId) {
      getPunchCards({ limit: 100 }).then((result) => {
        const filtered = result.docs.filter((card) => {
          const cardClientId = typeof card.client === 'object' && card.client !== null
            ? (card.client as { id: string }).id
            : card.client
          return cardClientId === clientId && (card.status as string) === 'active'
        }) as PunchCardOption[]
        setPunchCards(filtered)
      }).catch(() => {
        setPunchCards([])
      })
    } else {
      setPunchCards([])
      setPunchCardId('')
    }
  }, [clientId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const minutes = durationToMinutes(duration)

    const data: TimeEntryFormData = {
      client: clientId,
      punchCard: punchCardId || undefined,
      description,
      date,
      duration: minutes,
      billable,
    }

    try {
      if (isEdit && editData) {
        await updateTimeEntry(editData.id, data)
      } else {
        await createTimeEntry(data)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editEntry') : t('newEntry')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editEntry') : t('newEntry')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Client */}
          <div className="space-y-2">
            <Label>{t('client')} *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName || client.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Punch Card (optional) */}
          {punchCards.length > 0 && (
            <div className="space-y-2">
              <Label>{t('punchCard')}</Label>
              <Select value={punchCardId} onValueChange={setPunchCardId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPunchCard')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('selectPunchCard')}</SelectItem>
                  {punchCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {(card.name as string) || card.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')} *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Date and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">{t('date')} *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{t('duration')} *</Label>
              <Input
                id="duration"
                type="time"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Billable */}
          <div className="flex items-center gap-2">
            <input
              id="billable"
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="billable" className="cursor-pointer">
              {t('billable')}
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !clientId}>
              {loading ? tc('loading') : tc('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
