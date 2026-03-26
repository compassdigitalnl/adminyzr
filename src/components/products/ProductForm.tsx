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
import { createProduct, updateProduct, type ProductFormData } from '@/lib/actions/products'

type ProductFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    id: string
    name?: string
    description?: string
    unitPrice?: number
    unit?: string
    vatRate?: string
    isActive?: boolean
  }
}

export function ProductForm({ open, onOpenChange, editData }: ProductFormProps) {
  const t = useTranslations('products')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(editData?.name || '')
  const [description, setDescription] = useState(editData?.description || '')
  const [unitPriceEuro, setUnitPriceEuro] = useState(
    editData?.unitPrice ? String((editData.unitPrice / 100).toFixed(2)) : ''
  )
  const [unit, setUnit] = useState(editData?.unit || 'hour')
  const [vatRate, setVatRate] = useState(editData?.vatRate || '21')
  const [isActive, setIsActive] = useState(editData?.isActive ?? true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const unitPriceCents = Math.round(parseFloat(unitPriceEuro) * 100)

    if (isNaN(unitPriceCents) || unitPriceCents < 0) {
      setError('Ongeldige prijs')
      setLoading(false)
      return
    }

    const data: ProductFormData = {
      name,
      description: description || undefined,
      unitPrice: unitPriceCents,
      unit: unit as ProductFormData['unit'],
      vatRate: vatRate as ProductFormData['vatRate'],
      isActive,
    }

    try {
      if (isEdit && editData) {
        await updateProduct(editData.id, data)
      } else {
        await createProduct(data)
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editProduct') : t('newProduct')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editProduct') : t('newProduct')}
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
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{t('unitPrice')} *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  &euro;
                </span>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPriceEuro}
                  onChange={(e) => setUnitPriceEuro(e.target.value)}
                  className="pl-8"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('unitPriceHint')}</p>
            </div>

            <div className="space-y-2">
              <Label>{t('unit')}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">{t('unitPiece')}</SelectItem>
                  <SelectItem value="hour">{t('unitHour')}</SelectItem>
                  <SelectItem value="day">{t('unitDay')}</SelectItem>
                  <SelectItem value="month">{t('unitMonth')}</SelectItem>
                  <SelectItem value="credit">{t('unitCredit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('vatRate')}</Label>
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

            <div className="flex items-end space-x-2 pb-1">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">{t('isActive')}</Label>
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
