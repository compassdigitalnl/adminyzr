'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { createSubscription, updateSubscription, type SubscriptionFormData } from '@/lib/actions/subscriptions'

type Client = Record<string, unknown> & { id: string; companyName?: string }

type SubscriptionFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  editData?: {
    id: string
    client?: Record<string, unknown> & { id: string } | string
    name?: string
    description?: string
    interval?: string
    amount?: number
    vatRate?: string
    startDate?: string
    endDate?: string
    autoSend?: boolean
  }
}

export function SubscriptionForm({ open, onOpenChange, clients, editData }: SubscriptionFormProps) {
  const t = useTranslations('subscriptions')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const editClientId = editData?.client
    ? typeof editData.client === 'object'
      ? editData.client.id
      : editData.client
    : ''

  const [client, setClient] = useState(editClientId)
  const [name, setName] = useState(editData?.name || '')
  const [description, setDescription] = useState(editData?.description || '')
  const [interval, setInterval] = useState(editData?.interval || 'monthly')
  const [amountEuros, setAmountEuros] = useState(
    editData?.amount ? String((editData.amount / 100).toFixed(2)) : ''
  )
  const [vatRate, setVatRate] = useState(editData?.vatRate || '21')
  const [startDate, setStartDate] = useState(
    editData?.startDate ? editData.startDate.split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    editData?.endDate ? editData.endDate.split('T')[0] : ''
  )
  const [autoSend, setAutoSend] = useState(editData?.autoSend !== undefined ? editData.autoSend : true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const amountCents = Math.round(parseFloat(amountEuros) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      setError(tc('error'))
      setLoading(false)
      return
    }

    const data: SubscriptionFormData = {
      client,
      name,
      description: description || undefined,
      interval: interval as SubscriptionFormData['interval'],
      amount: amountCents,
      vatRate: vatRate as SubscriptionFormData['vatRate'],
      startDate,
      endDate: endDate || undefined,
      autoSend,
    }

    try {
      if (isEdit && editData) {
        await updateSubscription(editData.id, data)
      } else {
        await createSubscription(data)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editSubscription') : t('newSubscription')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editSubscription') : t('newSubscription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">{t('interval')} *</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('intervalWeekly')}</SelectItem>
                  <SelectItem value="monthly">{t('intervalMonthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('intervalQuarterly')}</SelectItem>
                  <SelectItem value="yearly">{t('intervalYearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t('amount')} *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={t('amountHint')}
                value={amountEuros}
                onChange={(e) => setAmountEuros(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">{t('vatRate')} *</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21">21%</SelectItem>
                  <SelectItem value="9">9%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="exempt">{t('vatExempt')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('startDate')} *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="autoSend"
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <Label htmlFor="autoSend" className="cursor-pointer">{t('autoSend')}</Label>
              <p className="text-xs text-muted-foreground">{t('autoSendHint')}</p>
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
