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

  return (
    <InvoiceForm
      clients={clients}
      products={products}
      onSuccess={() => router.push(`/${locale}/invoices/${invoice.id}`)}
      onCancel={() => router.push(`/${locale}/invoices/${invoice.id}`)}
    />
  )
}
