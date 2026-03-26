'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TimeEntryForm } from '@/components/time-tracking/TimeEntryForm'
import { deleteTimeEntry } from '@/lib/actions/time-entries'
import { minutesToHours, formatDateShort } from '@/lib/utils'

type ClientOption = Record<string, unknown> & {
  id: string
  companyName?: string
}

type TimeEntry = Record<string, unknown> & {
  id: string
  client?: string | { id: string; companyName?: string }
  punchCard?: string | { id: string; name?: string }
  description?: string
  date?: string
  duration?: number
  billable?: boolean
}

type TimeEntriesData = {
  docs: TimeEntry[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type TimeStats = {
  totalMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
}

type TimeTrackingPageClientProps = {
  initialData: TimeEntriesData
  initialSearch: string
  stats: TimeStats
  clients: ClientOption[]
}

export function TimeTrackingPageClient({
  initialData,
  initialSearch,
  stats,
  clients,
}: TimeTrackingPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const tc = useTranslations('common')
  const t = useTranslations('timeTracking')
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const [search, setSearch] = useState(initialSearch)

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

  function handlePageChange(page: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      params.set('page', String(page))
      router.push(`?${params.toString()}`)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await deleteTimeEntry(id)
    router.refresh()
  }

  function handleEdit(entry: TimeEntry) {
    setEditEntry(entry)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditEntry(null)
      router.refresh()
    }
  }

  function getClientName(client?: string | { id: string; companyName?: string }): string {
    if (!client) return '\u2014'
    if (typeof client === 'object') return client.companyName || client.id
    const found = clients.find((c) => c.id === client)
    return found?.companyName || client
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={() => { setEditEntry(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newEntry')}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('totalHours')}</p>
              <p className="text-2xl font-bold">{minutesToHours(stats.totalMinutes)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('billable')}</p>
              <p className="text-2xl font-bold">{minutesToHours(stats.billableMinutes)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('nonBillable')}</p>
              <p className="text-2xl font-bold">{minutesToHours(stats.nonBillableMinutes)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={`${t('description')}...`}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('date')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('description')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('client')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('duration')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {t('billable')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {t('noEntries')}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      {entry.date ? formatDateShort(entry.date) : '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{entry.description || '\u2014'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getClientName(entry.client)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {minutesToHours(entry.duration || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={entry.billable ? 'success' : 'secondary'}>
                        {entry.billable ? t('billable') : t('nonBillable')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
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
      <TimeEntryForm
        open={showForm}
        onOpenChange={handleCloseForm}
        clients={clients}
        editData={editEntry || undefined}
      />
    </div>
  )
}
