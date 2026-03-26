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
import { createPunchCard, updatePunchCard, type PunchCardFormData } from '@/lib/actions/punch-cards'
import { getClients } from '@/lib/actions/clients'

type ClientOption = Record<string, unknown> & {
  id: string
  companyName?: string
}

type PunchCardFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    id: string
    name?: string
    client?: string | { id: string; companyName?: string }
    unit?: string
    totalCredits?: number
    expiresAt?: string
    alertThreshold?: number
  }
}

export function PunchCardForm({ open, onOpenChange, editData }: PunchCardFormProps) {
  const t = useTranslations('punchCards')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])

  const editClientId = editData?.client
    ? typeof editData.client === 'object'
      ? editData.client.id
      : editData.client
    : ''

  const [name, setName] = useState(editData?.name || '')
  const [client, setClient] = useState(editClientId)
  const [unit, setUnit] = useState(editData?.unit || 'hour')
  const [totalCredits, setTotalCredits] = useState(String(editData?.totalCredits ?? ''))
  const [expiresAt, setExpiresAt] = useState(editData?.expiresAt ? editData.expiresAt.slice(0, 10) : '')
  const [alertThreshold, setAlertThreshold] = useState(String(editData?.alertThreshold ?? 20))

  useEffect(() => {
    if (open) {
      getClients({ limit: 100 })
        .then((data) => {
          setClients(data.docs as ClientOption[])
        })
        .catch(() => setClients([]))
    }
  }, [open])

  useEffect(() => {
    if (open && editData) {
      setName(editData.name || '')
      setClient(editClientId)
      setUnit(editData.unit || 'hour')
      setTotalCredits(String(editData.totalCredits ?? ''))
      setExpiresAt(editData.expiresAt ? editData.expiresAt.slice(0, 10) : '')
      setAlertThreshold(String(editData.alertThreshold ?? 20))
    } else if (open && !editData) {
      setName('')
      setClient('')
      setUnit('hour')
      setTotalCredits('')
      setExpiresAt('')
      setAlertThreshold('20')
    }
    setError('')
  }, [open, editData, editClientId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data: PunchCardFormData = {
      name,
      client,
      unit: unit as 'hour' | 'credit' | 'task',
      totalCredits: parseInt(totalCredits) || 0,
      expiresAt: expiresAt || undefined,
      alertThreshold: parseInt(alertThreshold) || 20,
    }

    try {
      if (isEdit && editData) {
        await updatePunchCard(editData.id, data)
      } else {
        await createPunchCard(data)
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
          <DialogTitle>{isEdit ? t('editCard') : t('newCard')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editCard') : t('newCard')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">{t('client')} *</Label>
            <Select value={client} onValueChange={setClient} required>
              <SelectTrigger>
                <SelectValue placeholder={t('selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.companyName as string) || c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">{t('unit')} *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">{t('unitHour')}</SelectItem>
                  <SelectItem value="credit">{t('unitCredit')}</SelectItem>
                  <SelectItem value="task">{t('unitTask')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalCredits">{t('totalCredits')} *</Label>
              <Input
                id="totalCredits"
                type="number"
                min="1"
                value={totalCredits}
                onChange={(e) => setTotalCredits(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiresAt">{t('expiresAt')}</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertThreshold">{t('alertThreshold')}</Label>
              <Input
                id="alertThreshold"
                type="number"
                min="0"
                max="100"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tc('loading') : tc('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
