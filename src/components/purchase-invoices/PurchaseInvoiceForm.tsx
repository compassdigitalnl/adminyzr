'use client'

import { useState, useEffect } from 'react'
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
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  type PurchaseInvoiceFormData,
} from '@/lib/actions/purchase-invoices'
import { OcrUpload, OcrConfidenceBadge } from './OcrUpload'
import type { OcrProcessResult } from '@/lib/actions/ocr'

type PurchaseInvoiceFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    id: string
    supplier?: string
    supplierVatNumber?: string
    supplierIban?: string
    invoiceNumber?: string
    issueDate?: string
    dueDate?: string
    subtotal?: number
    vatAmount?: number
    totalIncVat?: number
    currency?: string
    category?: string
    notes?: string
  }
}

export function PurchaseInvoiceForm({ open, onOpenChange, editData }: PurchaseInvoiceFormProps) {
  const t = useTranslations('purchaseInvoices')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ocrResult, setOcrResult] = useState<OcrProcessResult | null>(null)

  const [supplier, setSupplier] = useState(editData?.supplier || '')
  const [supplierVatNumber, setSupplierVatNumber] = useState(editData?.supplierVatNumber || '')
  const [supplierIban, setSupplierIban] = useState(editData?.supplierIban || '')
  const [invoiceNumber, setInvoiceNumber] = useState(editData?.invoiceNumber || '')
  const [issueDate, setIssueDate] = useState(editData?.issueDate?.split('T')[0] || '')
  const [dueDate, setDueDate] = useState(editData?.dueDate?.split('T')[0] || '')
  const [subtotalEuros, setSubtotalEuros] = useState(
    editData?.subtotal ? (editData.subtotal / 100).toFixed(2) : ''
  )
  const [vatAmountEuros, setVatAmountEuros] = useState(
    editData?.vatAmount ? (editData.vatAmount / 100).toFixed(2) : ''
  )
  const [totalIncVat, setTotalIncVat] = useState(
    editData?.totalIncVat ? (editData.totalIncVat / 100).toFixed(2) : ''
  )
  const [currency, setCurrency] = useState(editData?.currency || 'EUR')
  const [category, setCategory] = useState(editData?.category || 'other')
  const [notes, setNotes] = useState(editData?.notes || '')

  // Reset form when editData changes
  useEffect(() => {
    setSupplier(editData?.supplier || '')
    setSupplierVatNumber(editData?.supplierVatNumber || '')
    setSupplierIban(editData?.supplierIban || '')
    setInvoiceNumber(editData?.invoiceNumber || '')
    setIssueDate(editData?.issueDate?.split('T')[0] || '')
    setDueDate(editData?.dueDate?.split('T')[0] || '')
    setSubtotalEuros(editData?.subtotal ? (editData.subtotal / 100).toFixed(2) : '')
    setVatAmountEuros(editData?.vatAmount ? (editData.vatAmount / 100).toFixed(2) : '')
    setTotalIncVat(editData?.totalIncVat ? (editData.totalIncVat / 100).toFixed(2) : '')
    setCurrency(editData?.currency || 'EUR')
    setCategory(editData?.category || 'other')
    setNotes(editData?.notes || '')
  }, [editData])

  function handleOcrResult(result: OcrProcessResult) {
    setOcrResult(result)
    if (result.success && result.ocrResult) {
      const data = result.ocrResult.data
      if (data.supplier) setSupplier(data.supplier)
      if (data.supplierVatNumber) setSupplierVatNumber(data.supplierVatNumber)
      if (data.supplierIban) setSupplierIban(data.supplierIban)
      if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber)
      if (data.issueDate) setIssueDate(data.issueDate)
      if (data.dueDate) setDueDate(data.dueDate)
      if (data.subtotal != null) setSubtotalEuros((data.subtotal / 100).toFixed(2))
      if (data.vatAmount != null) setVatAmountEuros((data.vatAmount / 100).toFixed(2))
      if (data.currency) setCurrency(data.currency)
    }
  }

  // Auto-calculate totalIncVat when subtotal or vatAmount changes
  useEffect(() => {
    const sub = parseFloat(subtotalEuros) || 0
    const vat = parseFloat(vatAmountEuros) || 0
    setTotalIncVat((sub + vat).toFixed(2))
  }, [subtotalEuros, vatAmountEuros])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data: PurchaseInvoiceFormData = {
      supplier,
      supplierVatNumber: supplierVatNumber || undefined,
      supplierIban: supplierIban || undefined,
      invoiceNumber: invoiceNumber || undefined,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      subtotal: Math.round((parseFloat(subtotalEuros) || 0) * 100),
      vatAmount: Math.round((parseFloat(vatAmountEuros) || 0) * 100),
      totalIncVat: Math.round((parseFloat(totalIncVat) || 0) * 100),
      currency,
      category: category || 'other',
      notes: notes || undefined,
    }

    try {
      if (isEdit && editData) {
        await updatePurchaseInvoice(editData.id, data)
      } else {
        await createPurchaseInvoice(data)
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
          <DialogTitle>{isEdit ? t('editInvoice') : t('newInvoice')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editInvoice') : t('newInvoice')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* OCR Upload — only show for new invoices */}
          {!isEdit && (
            <div className="space-y-2">
              <Label>{t('ocr.title')}</Label>
              <OcrUpload onResult={handleOcrResult} />
              {ocrResult?.success && ocrResult.ocrResult && (
                <div className="flex items-center gap-2">
                  <OcrConfidenceBadge
                    confidence={ocrResult.ocrResult.confidence}
                    score={ocrResult.ocrResult.confidenceScore}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t('ocr.review')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Supplier info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">{t('supplier')} *</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">{t('invoiceNumber')}</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierVatNumber">{t('supplierVatNumber')}</Label>
              <Input
                id="supplierVatNumber"
                value={supplierVatNumber}
                onChange={(e) => setSupplierVatNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierIban">{t('supplierIban')}</Label>
              <Input
                id="supplierIban"
                value={supplierIban}
                onChange={(e) => setSupplierIban(e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">{t('issueDate')}</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('dueDate')}</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Currency + Amounts */}
          <div className="space-y-2">
            <Label htmlFor="currency">Valuta</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CHF">CHF</SelectItem>
                <SelectItem value="SEK">SEK</SelectItem>
                <SelectItem value="NOK">NOK</SelectItem>
                <SelectItem value="DKK">DKK</SelectItem>
                <SelectItem value="PLN">PLN</SelectItem>
                <SelectItem value="CZK">CZK</SelectItem>
              </SelectContent>
            </Select>
            {currency !== 'EUR' && (
              <p className="text-xs text-amber-600">
                Let op: bedragen worden opgeslagen in {currency}, niet automatisch omgerekend naar EUR.
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtotal">{t('subtotal')}</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={subtotalEuros}
                onChange={(e) => setSubtotalEuros(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatAmount">{t('vatAmount')}</Label>
              <Input
                id="vatAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={vatAmountEuros}
                onChange={(e) => setVatAmountEuros(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalIncVat">{t('totalIncVat')}</Label>
              <Input
                id="totalIncVat"
                type="number"
                step="0.01"
                min="0"
                value={totalIncVat}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{t('category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operations">{t('categories.operations')}</SelectItem>
                <SelectItem value="software">{t('categories.software')}</SelectItem>
                <SelectItem value="hosting">{t('categories.hosting')}</SelectItem>
                <SelectItem value="marketing">{t('categories.marketing')}</SelectItem>
                <SelectItem value="office">{t('categories.office')}</SelectItem>
                <SelectItem value="travel">{t('categories.travel')}</SelectItem>
                <SelectItem value="other">{t('categories.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
