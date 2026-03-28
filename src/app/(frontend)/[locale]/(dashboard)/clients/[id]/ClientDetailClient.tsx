'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Globe, FileText, Receipt } from 'lucide-react'
import { deleteClient } from '@/lib/actions/clients'
import { ClientForm } from '@/components/clients/ClientForm'
import { formatCents, formatDateShort } from '@/lib/utils'

type Statement = {
  invoices: { id: string; invoiceNumber: string; issueDate: string; dueDate: string; totalIncVat: number; status: string }[]
  quotes: { id: string; quoteNumber: string; totalIncVat: number; status: string }[]
  totals: { invoiced: number; paid: number; outstanding: number }
  invoiceCount: number
  quoteCount: number
} | null

type Props = { client: Record<string, unknown>; locale: string; statement?: Statement }

export function ClientDetailClient({ client, locale, statement }: Props) {
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

      {/* Financieel overzicht */}
      {statement && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Totaal gefactureerd</p>
              <p className="text-xl font-mono font-bold">{formatCents(statement.totals.invoiced)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Betaald</p>
              <p className="text-xl font-mono font-bold text-green-600">{formatCents(statement.totals.paid)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Openstaand</p>
              <p className="text-xl font-mono font-bold text-red-600">{formatCents(statement.totals.outstanding)}</p>
            </div>
          </div>

          {/* Facturen lijst */}
          {statement.invoices.length > 0 && (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="px-6 py-4 border-b flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Facturen ({statement.invoiceCount})</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-2 text-left font-medium text-muted-foreground">Nummer</th>
                    <th className="px-6 py-2 text-left font-medium text-muted-foreground">Datum</th>
                    <th className="px-6 py-2 text-right font-medium text-muted-foreground">Bedrag</th>
                    <th className="px-6 py-2 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.invoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/${locale}/invoices/${inv.id}`}>
                      <td className="px-6 py-2 font-mono">{inv.invoiceNumber}</td>
                      <td className="px-6 py-2">{formatDateShort(inv.issueDate)}</td>
                      <td className="px-6 py-2 text-right font-mono">{formatCents(inv.totalIncVat)}</td>
                      <td className="px-6 py-2 text-center">
                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'destructive' : 'default'}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

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
