import { getInvoice, getInvoiceItems } from '@/lib/actions/invoices'
import { getClients } from '@/lib/actions/clients'
import { getProducts } from '@/lib/actions/products'
import { EditInvoiceClient } from './EditInvoiceClient'

type Props = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditInvoicePage({ params }: Props) {
  const { id, locale } = await params

  let invoice: Record<string, unknown> | null = null
  let items: Record<string, unknown>[] = []
  let clients: { id: string; companyName: string; contactName?: string }[] = []
  let products: { id: string; name: string; unitPrice: number; vatRate: string; unit: string }[] = []

  try {
    invoice = await getInvoice(id) as Record<string, unknown>
    items = (await getInvoiceItems(id)) as Record<string, unknown>[]

    const [clientsData, productsData] = await Promise.all([
      getClients({ limit: 200 }),
      getProducts({ limit: 200, activeOnly: true }),
    ])
    clients = clientsData.docs.map((c) => ({
      id: String(c.id),
      companyName: (c.companyName as string) || '',
      contactName: (c.contactName as string) || undefined,
    }))
    products = productsData.docs.map((p) => ({
      id: String(p.id),
      name: (p.name as string) || '',
      unitPrice: (p.unitPrice as number) || 0,
      vatRate: (p.vatRate as string) || '21',
      unit: (p.unit as string) || 'hour',
    }))
  } catch {
    // Not found
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Factuur niet gevonden.</p>
      </div>
    )
  }

  if (invoice.status !== 'draft') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Alleen concept-facturen kunnen bewerkt worden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Factuur bewerken — {invoice.invoiceNumber as string}</h1>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <EditInvoiceClient
          invoice={invoice}
          items={items}
          clients={clients}
          products={products}
          locale={locale}
        />
      </div>
    </div>
  )
}
