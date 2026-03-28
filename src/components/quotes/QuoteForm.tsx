'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
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
import { formatCents } from '@/lib/utils'
import { createQuote, updateQuote, type QuoteLineItem } from '@/lib/actions/quotes'

type Client = {
  id: string
  companyName: string
  contactName?: string
}

type EditData = {
  id: string
  client: string
  issueDate: string
  validUntil: string
  notes?: string
  items: QuoteLineItem[]
}

type QuoteFormProps = {
  clients: Client[]
  onSuccess: () => void
  onCancel: () => void
  editData?: EditData
}

const VAT_RATES: Record<string, number> = {
  '21': 0.21,
  '9': 0.09,
  '0': 0,
  'exempt': 0,
}

function emptyItem(): QuoteLineItem {
  return {
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: '21',
  }
}

export function QuoteForm({ clients, onSuccess, onCancel, editData }: QuoteFormProps) {
  const t = useTranslations('quotes')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [clientId, setClientId] = useState(editData?.client || '')
  const today = new Date().toISOString().split('T')[0]
  const defaultValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const [issueDate, setIssueDate] = useState(editData?.issueDate?.split('T')[0] || today)
  const [validUntil, setValidUntil] = useState(editData?.validUntil?.split('T')[0] || defaultValidUntil)
  const [notes, setNotes] = useState(editData?.notes || '')
  const [items, setItems] = useState<QuoteLineItem[]>(
    editData?.items && editData.items.length > 0 ? editData.items : [emptyItem()]
  )

  // Calculated totals
  const [subtotal, setSubtotal] = useState(0)
  const [vatAmount, setVatAmount] = useState(0)
  const [totalIncVat, setTotalIncVat] = useState(0)

  useEffect(() => {
    let sub = 0
    let vat = 0
    for (const item of items) {
      const lineTotal = Math.round(item.quantity * item.unitPrice)
      sub += lineTotal
      const rate = VAT_RATES[item.vatRate] ?? 0.21
      vat += Math.round(lineTotal * rate)
    }
    setSubtotal(sub)
    setVatAmount(vat)
    setTotalIncVat(sub + vat)
  }, [items])

  function updateItem(index: number, field: keyof QuoteLineItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!clientId) {
      setError(t('selectClient'))
      setLoading(false)
      return
    }

    if (items.length === 0 || items.every((i) => !i.description)) {
      setError(tc('required'))
      setLoading(false)
      return
    }

    try {
      const quoteData = {
        client: clientId,
        issueDate,
        validUntil,
        notes: notes || undefined,
        items: items.filter((i) => i.description),
      }

      if (isEdit && editData) {
        await updateQuote(editData.id, quoteData)
      } else {
        await createQuote(quoteData)
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Quote header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>{t('client')} *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectClient')} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                  {client.contactName ? ` — ${client.contactName}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">{t('issueDate')} *</Label>
          <Input
            id="issueDate"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">{t('validUntil')} *</Label>
          <Input
            id="validUntil"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Line items */}
      <div>
        <Label className="text-base font-semibold">{t('items')}</Label>
        <div className="mt-3 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-12 gap-3">
                {/* Description */}
                <div className="col-span-5">
                  <Label className="text-xs">{tc('description')}</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="h-9"
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <Label className="text-xs">{t('quantity')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>

                {/* Unit price (shown in euro, stored in cents) */}
                <div className="col-span-2">
                  <Label className="text-xs">{t('unitPrice')}</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      &euro;
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(item.unitPrice / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(index, 'unitPrice', Math.round(parseFloat(e.target.value || '0') * 100))
                      }
                      className="h-9 pl-6"
                    />
                  </div>
                </div>

                {/* VAT rate */}
                <div className="col-span-2">
                  <Label className="text-xs">{t('vatRate')}</Label>
                  <Select
                    value={item.vatRate}
                    onValueChange={(val) => updateItem(index, 'vatRate', val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21">21%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="exempt">Vrij</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Line total + delete */}
                <div className="col-span-1 flex flex-col items-end justify-end">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {formatCents(Math.round(item.quantity * item.unitPrice))}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addItem')}
        </Button>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('totalExVat')}</span>
            <span>{formatCents(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('totalVat')}</span>
            <span>{formatCents(vatAmount)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>{t('totalIncVat')}</span>
              <span>{formatCents(totalIncVat)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? tc('loading') : tc('save')}
        </Button>
      </div>
    </form>
  )
}
