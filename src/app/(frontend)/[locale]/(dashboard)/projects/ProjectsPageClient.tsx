'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { deleteProject } from '@/lib/actions/projects'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { formatCents, formatDateShort } from '@/lib/utils'

type Project = Record<string, unknown> & {
  id: string
  name?: string
  client?: string | { id: string; companyName?: string }
  description?: string
  status?: string
  priority?: string
  startDate?: string
  deadline?: string
  budget?: number
  budgetUsed?: number
  tags?: Array<{ tag: string }>
}

type ProjectsData = {
  docs: Project[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type ProjectsPageClientProps = {
  initialData: ProjectsData
  clients: Array<Record<string, unknown> & { id: string }>
  initialSearch: string
  initialStatus: string
  translations: {
    title: string
    newProject: string
    noProjects: string
    filter: string
  }
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  planning: { variant: 'outline', labelKey: 'planning' },
  active: { variant: 'success', labelKey: 'active' },
  on_hold: { variant: 'warning', labelKey: 'on_hold' },
  completed: { variant: 'default', labelKey: 'completed' },
  cancelled: { variant: 'destructive', labelKey: 'cancelled' },
}

const PRIORITY_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; labelKey: string }> = {
  low: { variant: 'outline', labelKey: 'low' },
  medium: { variant: 'secondary', labelKey: 'medium' },
  high: { variant: 'warning', labelKey: 'high' },
  critical: { variant: 'destructive', labelKey: 'critical' },
}

export function ProjectsPageClient({
  initialData,
  clients,
  initialSearch,
  initialStatus,
  translations,
}: ProjectsPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const t = useTranslations('projects')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [showForm, setShowForm] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)

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
    await deleteProject(id)
    router.refresh()
  }

  function handleEdit(project: Project) {
    setEditProject(project)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditProject(null)
      router.refresh()
    }
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
        <Button onClick={() => { setEditProject(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newProject}
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
            <SelectItem value="planning">{t('status.planning')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="on_hold">{t('status.on_hold')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
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
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('client')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('priority')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('deadline')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {t('budget')}
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
                    {translations.noProjects}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((project) => {
                  const statusInfo = STATUS_BADGE[project.status || 'planning'] || STATUS_BADGE.planning
                  const priorityInfo = PRIORITY_BADGE[project.priority || 'medium'] || PRIORITY_BADGE.medium
                  return (
                    <tr key={project.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{project.name || '\u2014'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getClientName(project.client)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusInfo.variant}>{t(`status.${statusInfo.labelKey}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={priorityInfo.variant}>{t(`priority.${priorityInfo.labelKey}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {project.deadline ? formatDateShort(project.deadline) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {project.budget ? formatCents(project.budget) : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={tc('edit')}
                            onClick={() => handleEdit(project)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title={tc('delete')}
                            onClick={() => handleDelete(project.id)}
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
      <ProjectForm
        open={showForm}
        onOpenChange={handleCloseForm}
        clients={clients}
        editData={editProject || undefined}
      />
    </div>
  )
}
