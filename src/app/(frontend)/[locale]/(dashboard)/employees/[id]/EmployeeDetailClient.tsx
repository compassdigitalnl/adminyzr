'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteEmployee } from '@/lib/actions/employees'
import { formatCents, formatDateShort } from '@/lib/utils'
import { EmployeeForm } from '@/components/employees/EmployeeForm'

type Props = { employee: Record<string, unknown>; locale: string }

export function EmployeeDetailClient({ employee, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const status = (employee.status as string) || 'active'

  async function handleDelete() {
    if (!confirm('Medewerker verwijderen?')) return
    setLoading(true)
    await deleteEmployee(String(employee.id))
    router.push(`/${locale}/employees`)
  }

  // Split name into firstName/lastName for the form
  const fullName = (employee.name as string) || ''
  const nameParts = fullName.split(' ')
  const firstName = (employee.firstName as string) || nameParts[0] || ''
  const lastName = (employee.lastName as string) || nameParts.slice(1).join(' ') || ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/employees`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(employee.name || '—')}</h1>
            {(employee.position as string) ? <p className="text-sm text-muted-foreground">{String(employee.position)}</p> : null}
          </div>
          <Badge variant={status === 'active' ? 'success' : 'secondary'}>{status === 'active' ? 'Actief' : 'Inactief'}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Bewerken</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Persoonlijke gegevens</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Naam</span><p className="font-medium">{String(employee.name || '—')}</p></div>
            <div><span className="text-muted-foreground">E-mail</span><p>{String(employee.email || '—')}</p></div>
            {(employee.phone as string) ? <div><span className="text-muted-foreground">Telefoon</span><p>{String(employee.phone)}</p></div> : null}
            {(employee.bsn as string) ? <div><span className="text-muted-foreground">BSN</span><p className="font-mono">{String(employee.bsn)}</p></div> : null}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-sm space-y-3">
          <h2 className="font-semibold">Dienstverband</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Type</span><p className="capitalize">{String(employee.employmentType || '—')}</p></div>
            <div><span className="text-muted-foreground">Afdeling</span><p>{String(employee.department || '—')}</p></div>
            <div><span className="text-muted-foreground">Startdatum</span><p>{(employee.startDate as string) ? formatDateShort(employee.startDate as string) : '—'}</p></div>
            <div><span className="text-muted-foreground">Salaris</span><p className="font-mono">{formatCents((employee.salary as number) || 0)}/maand</p></div>
            <div><span className="text-muted-foreground">Uren/week</span><p>{String(employee.hoursPerWeek || '—')}</p></div>
          </div>
        </div>
      </div>

      <EmployeeForm
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) router.refresh()
        }}
        editData={{
          id: String(employee.id),
          firstName,
          lastName,
          email: (employee.email as string) || '',
          phone: (employee.phone as string) || '',
          position: (employee.position as string) || '',
          department: (employee.department as string) || '',
          employmentType: (employee.employmentType as string) || 'fulltime',
          salary: (employee.salary as number) || 0,
          hoursPerWeek: (employee.hoursPerWeek as number) || 0,
          startDate: (employee.startDate as string) || '',
          isActive: status === 'active',
        }}
      />
    </div>
  )
}
