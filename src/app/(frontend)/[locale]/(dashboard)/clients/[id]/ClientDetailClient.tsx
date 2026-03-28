'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Globe } from 'lucide-react'
import { deleteClient } from '@/lib/actions/clients'
import { ClientForm } from '@/components/clients/ClientForm'

type Props = { client: Record<string, unknown>; locale: string }

export function ClientDetailClient({ client, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const address = client.address as Record<string, string> | undefined
  const type = (client.type as string) || 'business'

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je deze klant wilt verwijderen?')) return
    setLoading(true)
    await deleteClient(String(client.id))
    router.push(`/${locale}/clients`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/clients`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{(client.companyName as string) || (client.contactName as string) || '—'}</h1>
            {(client.contactName as string) && (client.companyName as string) ? <p className="text-sm text-muted-foreground">{String(client.contactName)}</p> : null}
          </div>
          <Badge variant="outline">{type === 'business' ? 'Zakelijk' : 'Particulier'}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Bewerken</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Contactgegevens</h2>
          <div className="space-y-3 text-sm">
            {(client.email as string) ? <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${String(client.email)}`} className="text-primary hover:underline">{String(client.email)}</a></div> : <p className="text-muted-foreground">Geen e-mail</p>}
            {(client.phone as string) ? <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${String(client.phone)}`}>{String(client.phone)}</a></div> : null}
            {(client.website as string) ? <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><a href={String(client.website)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{String(client.website)}</a></div> : null}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Bedrijfsgegevens</h2>
          <div className="space-y-2 text-sm">
            {address && (address.street || address.city) ? (
              <p>{[address.street, address.houseNumber].filter(Boolean).join(' ')}<br />{[address.postalCode, address.city].filter(Boolean).join(' ')}{address.country && address.country !== 'NL' ? `, ${address.country}` : ''}</p>
            ) : <p className="text-muted-foreground">Geen adres</p>}
            {(client.kvkNumber as string) ? <p>KvK: <span className="font-mono">{String(client.kvkNumber)}</span></p> : null}
            {(client.vatNumber as string) ? <p>BTW: <span className="font-mono">{String(client.vatNumber)}</span></p> : null}
            {(client.iban as string) ? <p>IBAN: <span className="font-mono">{String(client.iban)}</span></p> : null}
            <p>Betalingstermijn: <strong>{String(client.paymentTermDays || 30)} dagen</strong></p>
          </div>
        </div>
      </div>

      {(client.notes as string) ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Notities</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(client.notes)}</p>
        </div>
      ) : null}

      {/* Edit dialog */}
      <ClientForm
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) router.refresh()
        }}
        editData={{
          id: String(client.id),
          type: type as 'business' | 'individual',
          companyName: (client.companyName as string) || '',
          contactName: (client.contactName as string) || '',
          email: (client.email as string) || '',
          phone: (client.phone as string) || '',
          kvkNumber: (client.kvkNumber as string) || '',
          vatNumber: (client.vatNumber as string) || '',
          address: address || {},
          paymentTermDays: (client.paymentTermDays as number) || 30,
          notes: (client.notes as string) || '',
        }}
      />
    </div>
  )
}
