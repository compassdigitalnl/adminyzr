'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
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
import { PunchCardForm } from '@/components/punch-cards/PunchCardForm'
import { deletePunchCard } from '@/lib/actions/punch-cards'

type PunchCard = Record<string, unknown> & {
  id: string
  name?: string
  client?: string | { id: string; companyName?: string }
  unit?: string
  totalCredits?: number
  usedCredits?: number
  status?: string
  expiresAt?: string
  alertThreshold?: number
}

type PunchCardsData = {
  docs: PunchCard[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PunchCardsPageClientProps = {
  initialData: PunchCardsData
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newCard: string
    name: string
    client: string
    totalCredits: string
    usedCredits: string
    remaining: string
    unit: string
    expiresAt: string
    noCards: string
  }
}

function getProgressColor(percentage: number): string {
  if (percentage < 60) return 'bg-green-500'
  if (percentage < 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'depleted':
      return 'secondary'
    case 'expired':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    default:
      return 'default'
  }
}

export function PunchCardsPageClient({
  initialData,
  initialSearch,
  initialStatus,
  translations,
}: PunchCardsPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const tc = useTranslations('common')
  const t = useTranslations('punchCards')
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<PunchCard | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)

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
    await deletePunchCard(id)
    router.refresh()
  }

  function handleEdit(card: PunchCard) {
    setEditCard(card)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditCard(null)
      router.refresh()
    }
  }

  function getClientName(client: PunchCard['client']): string {
    if (!client) return '-'
    if (typeof client === 'object') return client.companyName || client.id
    return client
  }

  function getUnitLabel(unit: string | undefined): string {
    switch (unit) {
      case 'hour':
        return t('unitHour')
      case 'credit':
        return t('unitCredit')
      case 'task':
        return t('unitTask')
      default:
        return unit || '-'
    }
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setEditCard(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newCard}
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={tc('search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tc('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="depleted">{t('status.depleted')}</SelectItem>
            <SelectItem value="expired">{t('status.expired')}</SelectItem>
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
                  {translations.name}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.client}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[200px]">
                  {translations.remaining}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.unit}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.expiresAt}
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
                    {translations.noCards}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((card) => {
                  const used = card.usedCredits ?? 0
                  const total = card.totalCredits ?? 0
                  const percentage = total > 0 ? Math.round((used / total) * 100) : 0
                  const remaining = total - used

                  return (
                    <tr key={card.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{card.name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getClientName(card.client)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{used} / {total}</span>
                            <span className="text-muted-foreground">{remaining} {translations.remaining.toLowerCase()}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getUnitLabel(card.unit)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(card.status || 'active')}>
                          {t(`status.${card.status || 'active'}` as 'status.active' | 'status.depleted' | 'status.expired' | 'status.cancelled')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(card.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(card)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(card.id)}
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
      <PunchCardForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editData={editCard ? {
          id: editCard.id,
          name: editCard.name,
          client: editCard.client,
          unit: editCard.unit,
          totalCredits: editCard.totalCredits,
          expiresAt: editCard.expiresAt,
          alertThreshold: editCard.alertThreshold,
        } : undefined}
      />
    </div>
  )
}
