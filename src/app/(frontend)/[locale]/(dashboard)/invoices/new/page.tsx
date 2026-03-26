import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/actions/clients'
import { getProducts } from '@/lib/actions/products'
import { NewInvoicePageClient } from './NewInvoicePageClient'

export default async function NewInvoicePage() {
  const t = await getTranslations('invoices')

  let clients: { id: string; companyName: string; contactName?: string }[] = []
  let products: { id: string; name: string; unitPrice: number; vatRate: string; unit: string }[] = []

  try {
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
    // If not logged in, the form will show empty
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('newInvoice')}</h1>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <NewInvoicePageClient clients={clients} products={products} />
      </div>
    </div>
  )
}
