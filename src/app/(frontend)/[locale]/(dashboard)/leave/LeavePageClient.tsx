'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Filter, Check, X, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
} from '@/lib/actions/leave-requests'
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm'
import { formatDateShort } from '@/lib/utils'

type LeaveRequest = Record<string, unknown> & {
  id: string
  employee?: string | { id: string; firstName?: string; lastName?: string }
  type?: string
  startDate?: string
  endDate?: string
  totalDays?: number
  status?: string
  approvedBy?: string | { id: string; name?: string }
  approvedAt?: string
  notes?: string
}

type LeaveData = {
  docs: LeaveRequest[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type LeavePageClientProps = {
  initialData: LeaveData
  employees: Array<Record<string, unknown> & { id: string }>
  initialStatus: string
  translations: {
    title: string
    newRequest: string
    noRequests: string
    filter: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  pending: { variant: 'warning', labelKey: 'pending' },
  approved: { variant: 'success', labelKey: 'approved' },
  rejected: { variant: 'destructive', labelKey: 'rejected' },
  cancelled: { variant: 'secondary', labelKey: 'cancelled' },
}

const TYPE_LABEL: Record<string, string> = {
  vacation: 'vacation',
  sick: 'sick',
  personal: 'personal',
  parental: 'parental',
  unpaid: 'unpaid',
}

export function LeavePageClient({
  initialData,
  employees,
  initialStatus,
  translations,
}: LeavePageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState(initialStatus)
  const [showForm, setShowForm] = useState(false)

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

  async function handleApprove(id: string) {
    await approveLeaveRequest(id)
    router.refresh()
  }

  async function handleReject(id: string) {
    await rejectLeaveRequest(id)
    router.refresh()
  }

  async function handleCancel(id: string) {
    await cancelLeaveRequest(id)
    router.refresh()
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      router.refresh()
    }
  }

  function getEmployeeName(emp: string | { id: string; firstName?: string; lastName?: string } | undefined): string {
    if (!emp) return '\u2014'
    if (typeof emp === 'object' && (emp.firstName || emp.lastName)) {
      return `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    }
    return '\u2014'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newRequest}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="pending">{t('status.pending')}</SelectItem>
            <SelectItem value="approved">{t('status.approved')}</SelectItem>
            <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
            <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
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
                  {t('employee')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('leaveType')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('startDate')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('endDate')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {t('totalDays')}
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
                    {translations.noRequests}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((request) => {
                  const statusInfo = STATUS_BADGE[request.status || 'pending'] || STATUS_BADGE.pending
                  const typeKey = TYPE_LABEL[request.type || 'vacation'] || 'vacation'
                  return (
                    <tr key={request.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{getEmployeeName(request.employee)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {t(`type.${typeKey}`)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.startDate ? formatDateShort(request.startDate) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.endDate ? formatDateShort(request.endDate) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {request.totalDays ?? '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusInfo.variant}>
                          {t(`status.${statusInfo.labelKey}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title={t('approve')}
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title={t('reject')}
                                onClick={() => handleReject(request.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(request.status === 'pending' || request.status === 'approved') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title={t('cancel')}
                              onClick={() => handleCancel(request.id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
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
      <LeaveRequestForm
        open={showForm}
        onOpenChange={handleCloseForm}
        employees={employees}
      />
    </div>
  )
}
