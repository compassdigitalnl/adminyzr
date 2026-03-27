'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Filter, Mail, Send, AlertTriangle, CheckCircle2, Eye, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateShort } from '@/lib/utils'

type EmailEntry = Record<string, unknown> & {
  id: string
  to?: string
  subject?: string
  body?: string
  status?: string
  direction?: string
  messageId?: string
  sentAt?: string
  openedAt?: string
  clickedAt?: string
  error?: string
  relatedCollection?: string
  relatedDocumentId?: string
  client?: string | { id: string; companyName?: string }
  createdAt?: string
}

type EmailLogData = {
  docs: EmailEntry[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type EmailStats = {
  totalSent: number
  totalFailed: number
  totalBounced: number
  total: number
  bounceRate: number
}

type EmailLogClientProps = {
  initialData: EmailLogData
  stats: EmailStats
  initialSearch: string
  initialStatus: string
  initialDirection: string
  translations: {
    title: string
    noEmails: string
    filter: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  sent: { variant: 'success', labelKey: 'sent' },
  failed: { variant: 'destructive', labelKey: 'failed' },
  bounced: { variant: 'warning', labelKey: 'bounced' },
}

export function EmailLogClient({
  initialData,
  stats,
  initialSearch,
  initialStatus,
  initialDirection,
  translations,
}: EmailLogClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('emailLog')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [direction, setDirection] = useState(initialDirection)
  const [selectedEmail, setSelectedEmail] = useState<EmailEntry | null>(null)

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

  function handleDirectionFilter(value: string) {
    setDirection(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      if (value && value !== 'all') {
        params.set('direction', value)
      } else {
        params.delete('direction')
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

  function getDisplayStatus(email: EmailEntry): string {
    if (email.openedAt) return 'opened'
    return email.status || 'sent'
  }

  function getStatusBadge(email: EmailEntry) {
    const displayStatus = getDisplayStatus(email)
    if (displayStatus === 'opened') {
      return { variant: 'default' as const, label: t('status.opened') }
    }
    const info = STATUS_BADGE[displayStatus] || STATUS_BADGE.sent
    return { variant: info.variant, label: t(`status.${info.labelKey}`) }
  }

  function getClientName(client: string | { id: string; companyName?: string } | undefined): string {
    if (!client) return '\u2014'
    if (typeof client === 'object' && client.companyName) return client.companyName
    return '\u2014'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statTotal')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statSent')}</p>
              <p className="text-2xl font-bold">{stats.totalSent}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statFailed')}</p>
              <p className="text-2xl font-bold">{stats.totalFailed}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
              <Mail className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statBounceRate')}</p>
              <p className="text-2xl font-bold">{stats.bounceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`${t('searchPlaceholder')}...`}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={translations.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="sent">{t('status.sent')}</SelectItem>
            <SelectItem value="failed">{t('status.failed')}</SelectItem>
            <SelectItem value="bounced">{t('status.bounced')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={handleDirectionFilter}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t('direction')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc('all')}</SelectItem>
            <SelectItem value="outgoing">{t('directionOutgoing')}</SelectItem>
            <SelectItem value="incoming">{t('directionIncoming')}</SelectItem>
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
                  {t('recipient')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('subject')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('client')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {t('direction')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {tc('date')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noEmails}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((email) => {
                  const statusBadge = getStatusBadge(email)
                  return (
                    <tr
                      key={email.id}
                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <td className="px-4 py-3 text-sm">
                        {email.to || '\u2014'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm">{email.subject || '\u2014'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getClientName(email.client)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">
                          {email.direction === 'incoming' ? t('directionIncoming') : t('directionOutgoing')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {email.sentAt ? formatDateShort(email.sentAt) : email.createdAt ? formatDateShort(email.createdAt) : '\u2014'}
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

      {/* Detail Panel */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedEmail(null)}>
          <div
            className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('details')}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEmail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('recipient')}</p>
                <p className="font-medium">{selectedEmail.to || '\u2014'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('subject')}</p>
                <p className="font-medium">{selectedEmail.subject || '\u2014'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('client')}</p>
                <p className="font-medium">{getClientName(selectedEmail.client)}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{tc('status')}</p>
                  <Badge variant={getStatusBadge(selectedEmail).variant} className="mt-1">
                    {getStatusBadge(selectedEmail).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('direction')}</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedEmail.direction === 'incoming' ? t('directionIncoming') : t('directionOutgoing')}
                  </Badge>
                </div>
              </div>
              {selectedEmail.sentAt && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('sentAt')}</p>
                  <p className="font-medium">{formatDateShort(selectedEmail.sentAt)}</p>
                </div>
              )}
              {selectedEmail.openedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('openedAt')}</p>
                  <p className="font-medium">{formatDateShort(selectedEmail.openedAt)}</p>
                </div>
              )}
              {selectedEmail.clickedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('clickedAt')}</p>
                  <p className="font-medium">{formatDateShort(selectedEmail.clickedAt)}</p>
                </div>
              )}
              {selectedEmail.messageId && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('messageId')}</p>
                  <p className="text-xs font-mono break-all">{selectedEmail.messageId}</p>
                </div>
              )}
              {selectedEmail.relatedCollection && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('relatedDocument')}</p>
                  <p className="font-medium">{selectedEmail.relatedCollection} / {selectedEmail.relatedDocumentId}</p>
                </div>
              )}
              {selectedEmail.error && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('errorMessage')}</p>
                  <p className="text-sm text-destructive bg-destructive/10 rounded p-2 mt-1">{selectedEmail.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
