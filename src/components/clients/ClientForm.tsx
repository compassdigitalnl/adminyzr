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
import { createClient, updateClient, type ClientFormData } from '@/lib/actions/clients'

type ClientFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    id: string
    type?: string
    companyName?: string
    contactName?: string
    email?: string
    phone?: string
    kvkNumber?: string
    vatNumber?: string
    address?: {
      street?: string
      houseNumber?: string
      postalCode?: string
      city?: string
      country?: string
    }
    paymentTermDays?: number
    notes?: string
  }
}

export function ClientForm({ open, onOpenChange, editData }: ClientFormProps) {
  const t = useTranslations('clients')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [type, setType] = useState(editData?.type || 'business')
  const [companyName, setCompanyName] = useState(editData?.companyName || '')
  const [contactName, setContactName] = useState(editData?.contactName || '')
  const [email, setEmail] = useState(editData?.email || '')
  const [phone, setPhone] = useState(editData?.phone || '')
  const [kvkNumber, setKvkNumber] = useState(editData?.kvkNumber || '')
  const [vatNumber, setVatNumber] = useState(editData?.vatNumber || '')
  const [street, setStreet] = useState(editData?.address?.street || '')
  const [houseNumber, setHouseNumber] = useState(editData?.address?.houseNumber || '')
  const [postalCode, setPostalCode] = useState(editData?.address?.postalCode || '')
  const [city, setCity] = useState(editData?.address?.city || '')
  const [country, setCountry] = useState(editData?.address?.country || 'NL')
  const [paymentTermDays, setPaymentTermDays] = useState(String(editData?.paymentTermDays ?? 30))
  const [notes, setNotes] = useState(editData?.notes || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data: ClientFormData = {
      type: type as 'business' | 'individual',
      companyName,
      contactName: contactName || undefined,
      email,
      phone: phone || undefined,
      kvkNumber: kvkNumber || undefined,
      vatNumber: vatNumber || undefined,
      address: {
        street: street || undefined,
        houseNumber: houseNumber || undefined,
        postalCode: postalCode || undefined,
        city: city || undefined,
        country: country || undefined,
      },
      paymentTermDays: parseInt(paymentTermDays) || 30,
      notes: notes || undefined,
    }

    try {
      if (isEdit && editData) {
        await updateClient(editData.id, data)
      } else {
        await createClient(data)
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
          <DialogTitle>{isEdit ? t('editClient') : t('newClient')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editClient') : t('newClient')}
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
              <Label htmlFor="type">{t('type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">{t('typeBusiness')}</SelectItem>
                  <SelectItem value="individual">{t('typeIndividual')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTermDays">{t('paymentTermDays')}</Label>
              <Input
                id="paymentTermDays"
                type="number"
                value={paymentTermDays}
                onChange={(e) => setPaymentTermDays(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">{t('companyName')} *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">{t('contactName')}</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')} *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kvkNumber">{t('kvkNumber')}</Label>
              <Input
                id="kvkNumber"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">{t('vatNumber')}</Label>
              <Input
                id="vatNumber"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-base font-semibold">{t('address')}</Label>
            <div className="mt-2 grid grid-cols-4 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">{t('street')}</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="houseNumber">{t('houseNumber')}</Label>
                <Input
                  id="houseNumber"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">{t('postalCode')}</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="country">{t('country')}</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

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
