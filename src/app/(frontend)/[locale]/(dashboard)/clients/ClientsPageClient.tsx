'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ClientForm } from '@/components/clients/ClientForm'
import { deleteClient } from '@/lib/actions/clients'

type Client = Record<string, unknown> & {
  id: string
  type?: string
  companyName?: string
  contactName?: string
  email?: string
  phone?: string
  kvkNumber?: string
  vatNumber?: string
  address?: {
    street?: string
    houseNumber?: string
    postalCode?: string
    city?: string
    country?: string
  }
  paymentTermDays?: number
  notes?: string
}

type ClientsData = {
  docs: Client[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type ClientsPageClientProps = {
  initialData: ClientsData
  initialSearch: string
  translations: {
    title: string
    newClient: string
    companyName: string
    contactName: string
    email: string
    phone: string
    noClients: string
  }
}

export function ClientsPageClient({ initialData, initialSearch, translations }: ClientsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParamsHook = useSearchParams()
  const tc = useTranslations('common')
  const t = useTranslations('clients')
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [search, setSearch] = useState(initialSearch)

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

  function handlePageChange(page: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      params.set('page', String(page))
      router.push(`?${params.toString()}`)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await deleteClient(id)
    router.refresh()
  }

  function handleEdit(client: Client) {
    setEditClient(client)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditClient(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setEditClient(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newClient}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={`${translations.companyName}, ${translations.contactName}...`}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.companyName}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.contactName}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.email}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {translations.phone}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noClients}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`${pathname}/${client.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.companyName || '—'}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {client.type === 'business' ? t('typeBusiness') : t('typeIndividual')}
                        </Badge>
                      </div>
                      {client.address?.city && (
                        <p className="text-xs text-muted-foreground">{client.address.city}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{client.contactName || '—'}</td>
                    <td className="px-4 py-3 text-sm">{client.email}</td>
                    <td className="px-4 py-3 text-sm">{client.phone || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
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
      <ClientForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editData={editClient || undefined}
      />
    </div>
  )
}
