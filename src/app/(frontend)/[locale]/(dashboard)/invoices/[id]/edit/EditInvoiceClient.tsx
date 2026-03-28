'use client'

import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'

type Props = {
  invoice: Record<string, unknown>
  items: Record<string, unknown>[]
  clients: { id: string; companyName: string; contactName?: string }[]
  products: { id: string; name: string; unitPrice: number; vatRate: string; unit: string }[]
  locale: string
}

export function EditInvoiceClient({ invoice, items, clients, products, locale }: Props) {
  const router = useRouter()

  // Map items to form format
  const clientObj = invoice.client as Record<string, unknown> | undefined
  const clientId = clientObj ? String(clientObj.id || clientObj) : String(invoice.client || '')

  const formItems = items.map((item) => ({
    product: item.product ? String(typeof item.product === 'object' ? (item.product as Record<string, unknown>).id : item.product) : undefined,
    description: (item.description as string) || '',
    quantity: (item.quantity as number) || 1,
    unitPrice: (item.unitPrice as number) || 0,
    vatRate: ((item.vatRate as string) || '21') as '21' | '9' | '0' | 'exempt',
  }))

  return (
    <InvoiceForm
      clients={clients}
      products={products}
      onSuccess={() => router.push(`/${locale}/invoices/${invoice.id}`)}
      onCancel={() => router.push(`/${locale}/invoices/${invoice.id}`)}
      editData={{
        id: String(invoice.id),
        client: clientId,
        issueDate: (invoice.issueDate as string) || '',
        dueDate: (invoice.dueDate as string) || '',
        reference: (invoice.reference as string) || undefined,
        notes: (invoice.notes as string) || undefined,
        items: formItems,
      }}
    />
  )
}
