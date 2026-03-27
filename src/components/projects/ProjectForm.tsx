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
  createProject,
  updateProject,
  type ProjectFormData,
} from '@/lib/actions/projects'

type ProjectFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Array<Record<string, unknown> & { id: string }>
  editData?: {
    id: string
    name?: string
    client?: string | { id: string; companyName?: string }
    description?: string
    status?: string
    priority?: string
    startDate?: string
    deadline?: string
    budget?: number
    tags?: Array<{ tag: string }>
  }
}

export function ProjectForm({ open, onOpenChange, clients, editData }: ProjectFormProps) {
  const t = useTranslations('projects')
  const tc = useTranslations('common')
  const isEdit = !!editData

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getClientId = (client: string | { id: string } | undefined): string => {
    if (!client) return ''
    if (typeof client === 'object') return client.id
    return client
  }

  const [name, setName] = useState(editData?.name || '')
  const [client, setClient] = useState(getClientId(editData?.client))
  const [description, setDescription] = useState(editData?.description || '')
  const [status, setStatus] = useState(editData?.status || 'planning')
  const [priority, setPriority] = useState(editData?.priority || 'medium')
  const [startDate, setStartDate] = useState(editData?.startDate?.split('T')[0] || '')
  const [deadline, setDeadline] = useState(editData?.deadline?.split('T')[0] || '')
  const [budgetEuros, setBudgetEuros] = useState(
    editData?.budget ? (editData.budget / 100).toFixed(2) : ''
  )
  const [tagsInput, setTagsInput] = useState(
    editData?.tags?.map((t) => t.tag).join(', ') || ''
  )

  // Reset form when editData changes
  useEffect(() => {
    setName(editData?.name || '')
    setClient(getClientId(editData?.client))
    setDescription(editData?.description || '')
    setStatus(editData?.status || 'planning')
    setPriority(editData?.priority || 'medium')
    setStartDate(editData?.startDate?.split('T')[0] || '')
    setDeadline(editData?.deadline?.split('T')[0] || '')
    setBudgetEuros(editData?.budget ? (editData.budget / 100).toFixed(2) : '')
    setTagsInput(editData?.tags?.map((t) => t.tag).join(', ') || '')
  }, [editData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const data: ProjectFormData = {
      name,
      client: client && client !== 'none' ? client : undefined,
      description: description || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      budget: Math.round((parseFloat(budgetEuros) || 0) * 100),
      tags: tags.length > 0 ? tags : undefined,
    }

    try {
      if (isEdit && editData) {
        await updateProject(editData.id, data)
      } else {
        await createProject(data)
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
          <DialogTitle>{isEdit ? t('editProject') : t('newProject')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editProject') : t('newProject')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Client + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">{t('client')}</Label>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{'\u2014'}</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.companyName as string) || (c.contactName as string) || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{tc('status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">{t('status.planning')}</SelectItem>
                  <SelectItem value="active">{t('status.active')}</SelectItem>
                  <SelectItem value="on_hold">{t('status.on_hold')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">{tc('priority')}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('priority.low')}</SelectItem>
                <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                <SelectItem value="high">{t('priority.high')}</SelectItem>
                <SelectItem value="critical">{t('priority.critical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{tc('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">{t('deadline')}</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">{t('budget')}</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={budgetEuros}
              onChange={(e) => setBudgetEuros(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t('tags')}</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t('tagsPlaceholder')}
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
