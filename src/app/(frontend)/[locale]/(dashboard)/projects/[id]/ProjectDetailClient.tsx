'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteProject } from '@/lib/actions/projects'
import { formatCents, formatDateShort } from '@/lib/utils'
import { ProjectForm } from '@/components/projects/ProjectForm'

type Props = {
  project: Record<string, unknown>
  locale: string
  clients: Array<Record<string, unknown> & { id: string }>
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline'; label: string }> = {
  planning: { variant: 'secondary', label: 'Planning' },
  active: { variant: 'success', label: 'Actief' },
  on_hold: { variant: 'warning', label: 'On hold' },
  completed: { variant: 'default', label: 'Afgerond' },
  cancelled: { variant: 'outline', label: 'Geannuleerd' },
}

export function ProjectDetailClient({ project, locale, clients }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const status = (project.status as string) || 'planning'
  const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.planning
  const client = project.client as Record<string, unknown> | undefined

  async function handleDelete() {
    if (!confirm('Project verwijderen?')) return
    setLoading(true)
    await deleteProject(String(project.id))
    router.push(`/${locale}/projects`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/projects`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(project.name || '—')}</h1>
            <p className="text-sm text-muted-foreground">{(client?.companyName as string) || '—'}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Bewerken</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-2">
          <h2 className="font-semibold">Budget</h2>
          <p className="text-2xl font-mono font-bold">{formatCents((project.budget as number) || 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-2">
          <h2 className="font-semibold">Deadline</h2>
          <p className="text-lg">{(project.deadline as string) ? formatDateShort(project.deadline as string) : '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-2">
          <h2 className="font-semibold">Prioriteit</h2>
          <p className="text-lg capitalize">{String(project.priority || 'medium')}</p>
        </div>
      </div>

      {(project.description as string) ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Beschrijving</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(project.description)}</p>
        </div>
      ) : null}

      <ProjectForm
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) router.refresh()
        }}
        clients={clients}
        editData={{
          id: String(project.id),
          name: (project.name as string) || '',
          description: (project.description as string) || '',
          client: client?.id ? String(client.id) : '',
          status: (project.status as string) || 'planning',
          priority: (project.priority as string) || 'medium',
          budget: (project.budget as number) || 0,
          deadline: (project.deadline as string) || '',
        }}
      />
    </div>
  )
}
