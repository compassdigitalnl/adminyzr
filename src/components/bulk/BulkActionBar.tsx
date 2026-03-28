'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { bulkUpdateStatus, bulkDelete, bulkExportCsv } from '@/lib/actions/bulk'
import { Trash2, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Props = {
  selectedIds: string[]
  collection: string
  onDone: () => void
  statusActions?: { label: string; status: string; icon?: React.ReactNode }[]
}

export function BulkActionBar({ selectedIds, collection, onDone, statusActions }: Props) {
  const [loading, setLoading] = useState('')

  if (selectedIds.length === 0) return null

  async function handleStatus(status: string) {
    setLoading(status)
    try {
      await bulkUpdateStatus(collection, selectedIds, status)
      onDone()
    } catch { /* */ } finally { setLoading('') }
  }

  async function handleDelete() {
    if (!confirm(`${selectedIds.length} items verwijderen?`)) return
    setLoading('delete')
    try {
      await bulkDelete(collection, selectedIds)
      onDone()
    } catch { /* */ } finally { setLoading('') }
  }

  async function handleExport() {
    setLoading('export')
    try {
      const csv = await bulkExportCsv(collection, selectedIds)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${collection}-export.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* */ } finally { setLoading('') }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <span className="text-sm font-medium">
        {selectedIds.length} geselecteerd
      </span>
      <div className="h-4 w-px bg-border" />

      {statusActions?.map((action) => (
        <Button
          key={action.status}
          variant="outline"
          size="sm"
          onClick={() => handleStatus(action.status)}
          disabled={!!loading}
        >
          {loading === action.status ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : action.icon}
          {action.label}
        </Button>
      ))}

      <Button variant="outline" size="sm" onClick={handleExport} disabled={!!loading}>
        {loading === 'export' ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Download className="mr-2 h-3 w-3" />}
        Export CSV
      </Button>

      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={!!loading}>
        {loading === 'delete' ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Trash2 className="mr-2 h-3 w-3" />}
        Verwijderen
      </Button>
    </div>
  )
}

/**
 * Hook for managing bulk selection state.
 * Usage: const { selectedIds, toggleId, toggleAll, clearSelection, isSelected } = useBulkSelection()
 */
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function toggleAll(ids: string[]) {
    setSelectedIds((prev) =>
      prev.length === ids.length ? [] : [...ids]
    )
  }

  function clearSelection() {
    setSelectedIds([])
  }

  function isSelected(id: string) {
    return selectedIds.includes(id)
  }

  return { selectedIds, toggleId, toggleAll, clearSelection, isSelected }
}
