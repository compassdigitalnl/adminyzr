'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Globe, Building2 } from 'lucide-react'
import { deleteClient } from '@/lib/actions/clients'

type Props = { client: Record<string, unknown>; locale: string }

export function ClientDetailClient({ client, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Contactgegevens</h2>
          <div className="space-y-3 text-sm">
            {(client.email as string) ? <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{String(client.email)}</div> : null}
            {(client.phone as string) ? <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{String(client.phone)}</div> : null}
            {(client.website as string) ? <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />{String(client.website)}</div> : null}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Bedrijfsgegevens</h2>
          <div className="space-y-2 text-sm">
            {address ? (
              <p>{[address.street, address.houseNumber].filter(Boolean).join(' ')}<br />{[address.postalCode, address.city].filter(Boolean).join(' ')}</p>
            ) : null}
            {(client.kvkNumber as string) ? <p className="text-muted-foreground">KvK: {String(client.kvkNumber)}</p> : null}
            {(client.vatNumber as string) ? <p className="text-muted-foreground">BTW: {String(client.vatNumber)}</p> : null}
            {(client.iban as string) ? <p className="text-muted-foreground font-mono">IBAN: {String(client.iban)}</p> : null}
            {(client.paymentTermDays as number) ? <p className="text-muted-foreground">Betalingstermijn: {String(client.paymentTermDays)} dagen</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
