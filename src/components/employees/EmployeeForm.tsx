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
  createEmployee,
  updateEmployee,
  type EmployeeFormData,
} from '@/lib/actions/employees'

type EmployeeFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    position?: string
    department?: string
    employmentType?: string
    startDate?: string
    endDate?: string
    hoursPerWeek?: number
    salary?: number
    address?: {
      street?: string
      houseNumber?: string
      postalCode?: string
      city?: string
      country?: string
    }
    emergencyContact?: {
      name?: string
      phone?: string
      relation?: string
    }
    notes?: string
    isActive?: boolean
  }
}

export function EmployeeForm({ open, onOpenChange, editData }: EmployeeFormProps) {
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState(editData?.firstName || '')
  const [lastName, setLastName] = useState(editData?.lastName || '')
  const [email, setEmail] = useState(editData?.email || '')
  const [phone, setPhone] = useState(editData?.phone || '')
  const [position, setPosition] = useState(editData?.position || '')
  const [department, setDepartment] = useState(editData?.department || '')
  const [employmentType, setEmploymentType] = useState(editData?.employmentType || 'fulltime')
  const [startDate, setStartDate] = useState(editData?.startDate?.split('T')[0] || '')
  const [endDate, setEndDate] = useState(editData?.endDate?.split('T')[0] || '')
  const [hoursPerWeek, setHoursPerWeek] = useState(editData?.hoursPerWeek?.toString() || '')
  const [salaryEuros, setSalaryEuros] = useState(
    editData?.salary ? (editData.salary / 100).toFixed(2) : ''
  )
  const [street, setStreet] = useState(editData?.address?.street || '')
  const [houseNumber, setHouseNumber] = useState(editData?.address?.houseNumber || '')
  const [postalCode, setPostalCode] = useState(editData?.address?.postalCode || '')
  const [city, setCity] = useState(editData?.address?.city || '')
  const [country, setCountry] = useState(editData?.address?.country || 'NL')
  const [ecName, setEcName] = useState(editData?.emergencyContact?.name || '')
  const [ecPhone, setEcPhone] = useState(editData?.emergencyContact?.phone || '')
  const [ecRelation, setEcRelation] = useState(editData?.emergencyContact?.relation || '')
  const [notes, setNotes] = useState(editData?.notes || '')
  const [isActive, setIsActive] = useState(editData?.isActive !== undefined ? editData.isActive : true)

  useEffect(() => {
    setFirstName(editData?.firstName || '')
    setLastName(editData?.lastName || '')
    setEmail(editData?.email || '')
    setPhone(editData?.phone || '')
    setPosition(editData?.position || '')
    setDepartment(editData?.department || '')
    setEmploymentType(editData?.employmentType || 'fulltime')
    setStartDate(editData?.startDate?.split('T')[0] || '')
    setEndDate(editData?.endDate?.split('T')[0] || '')
    setHoursPerWeek(editData?.hoursPerWeek?.toString() || '')
    setSalaryEuros(editData?.salary ? (editData.salary / 100).toFixed(2) : '')
    setStreet(editData?.address?.street || '')
    setHouseNumber(editData?.address?.houseNumber || '')
    setPostalCode(editData?.address?.postalCode || '')
    setCity(editData?.address?.city || '')
    setCountry(editData?.address?.country || 'NL')
    setEcName(editData?.emergencyContact?.name || '')
    setEcPhone(editData?.emergencyContact?.phone || '')
    setEcRelation(editData?.emergencyContact?.relation || '')
    setNotes(editData?.notes || '')
    setIsActive(editData?.isActive !== undefined ? editData.isActive : true)
  }, [editData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data: EmployeeFormData = {
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      position: position || undefined,
      department: department || undefined,
      employmentType,
      startDate,
      endDate: endDate || undefined,
      hoursPerWeek: hoursPerWeek ? parseFloat(hoursPerWeek) : undefined,
      salary: salaryEuros ? Math.round(parseFloat(salaryEuros) * 100) : undefined,
      address: {
        street: street || undefined,
        houseNumber: houseNumber || undefined,
        postalCode: postalCode || undefined,
        city: city || undefined,
        country: country || 'NL',
      },
      emergencyContact: {
        name: ecName || undefined,
        phone: ecPhone || undefined,
        relation: ecRelation || undefined,
      },
      notes: notes || undefined,
      isActive,
    }

    try {
      if (isEdit && editData) {
        await updateEmployee(editData.id, data)
      } else {
        await createEmployee(data)
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
          <DialogTitle>{isEdit ? t('editEmployee') : t('newEmployee')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editEmployee') : t('newEmployee')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('firstName')} *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Position + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">{t('position')}</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">{t('department')}</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          {/* Employment type + Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">{t('employmentType')}</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">{t('type.fulltime')}</SelectItem>
                  <SelectItem value="parttime">{t('type.parttime')}</SelectItem>
                  <SelectItem value="freelance">{t('type.freelance')}</SelectItem>
                  <SelectItem value="intern">{t('type.intern')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">{t('hoursPerWeek')}</Label>
              <Input
                id="hoursPerWeek"
                type="number"
                step="0.5"
                min="0"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
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

          {/* Salary */}
          <div className="space-y-2">
            <Label htmlFor="salary">{t('salary')}</Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={salaryEuros}
              onChange={(e) => setSalaryEuros(e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('address')}</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Input
                  placeholder={t('addressStreet')}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder={t('addressHouseNumber')}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Input
                  placeholder={t('addressPostalCode')}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder={t('addressCity')}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder={t('addressCountry')}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('emergencyContact')}</Label>
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder={t('emergencyName')}
                value={ecName}
                onChange={(e) => setEcName(e.target.value)}
              />
              <Input
                placeholder={t('emergencyPhone')}
                value={ecPhone}
                onChange={(e) => setEcPhone(e.target.value)}
              />
              <Input
                placeholder={t('emergencyRelation')}
                value={ecRelation}
                onChange={(e) => setEcRelation(e.target.value)}
              />
            </div>
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

          {/* Active */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive">{t('isActive')}</Label>
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
