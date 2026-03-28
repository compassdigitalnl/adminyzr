'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Filter, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteEmployee } from '@/lib/actions/employees'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { formatDateShort } from '@/lib/utils'

type Employee = Record<string, unknown> & {
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
  isActive?: boolean
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
}

type EmployeesData = {
  docs: Employee[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type EmployeesPageClientProps = {
  initialData: EmployeesData
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newEmployee: string
    noEmployees: string
    filter: string
  }
}

const TYPE_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  fulltime: { variant: 'default', labelKey: 'fulltime' },
  parttime: { variant: 'secondary', labelKey: 'parttime' },
  freelance: { variant: 'warning', labelKey: 'freelance' },
  intern: { variant: 'outline', labelKey: 'intern' },
}

export function EmployeesPageClient({
  initialData,
  initialSearch,
  initialStatus,
  translations,
}: EmployeesPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [showForm, setShowForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)

  function handleSearch(value: string) {
    setSearch(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.delete('page')
      router.push(`?${params.toString()}`)
    })
  }

  function handleStatusFilter(value: string) {
    setStatus(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      if (value && value !== 'all') {
        params.set('status', value)
      } else {
        params.delete('status')
      }
      params.delete('page')
      router.push(`?${params.toString()}`)
    })
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      params.set('page', String(page))
      router.push(`?${params.toString()}`)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await deleteEmployee(id)
    router.refresh()
  }

  function handleEdit(employee: Employee) {
    setEditEmployee(employee)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditEmployee(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setEditEmployee(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newEmployee}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`${t('name')}...`}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="active">{t('statusActive')}</SelectItem>
            <SelectItem value="inactive">{t('statusInactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('position')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('department')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {t('employmentType')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('startDate')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noEmployees}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((employee) => {
                  const typeInfo = TYPE_BADGE[employee.employmentType || 'fulltime'] || TYPE_BADGE.fulltime
                  return (
                    <tr key={employee.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`${pathname}/${employee.id}`)}>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                        {employee.email && (
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {employee.position || '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {employee.department || '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={typeInfo.variant}>
                          {t(`type.${typeInfo.labelKey}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {employee.startDate ? formatDateShort(employee.startDate) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={employee.isActive ? 'success' : 'secondary'}>
                          {employee.isActive ? t('statusActive') : t('statusInactive')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={tc('edit')}
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title={tc('delete')}
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {initialData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {tc('showing', { count: initialData.totalDocs })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasPrevPage || isPending}
                onClick={() => handlePageChange((initialData.page || 1) - 1)}
              >
                {tc('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasNextPage || isPending}
                onClick={() => handlePageChange((initialData.page || 1) + 1)}
              >
                {tc('next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <EmployeeForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editData={editEmployee || undefined}
      />
    </div>
  )
}
