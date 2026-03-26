'use client'

import { useRouter, usePathname } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'

type Props = {
  clients: { id: string; companyName: string; contactName?: string }[]
  products: { id: string; name: string; unitPrice: number; vatRate: string; unit: string }[]
}

export function NewInvoicePageClient({ clients, products }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  // Go back to invoices list (remove /new from path)
  const invoicesPath = pathname.replace(/\/new$/, '')

  return (
    <InvoiceForm
      clients={clients}
      products={products}
      onSuccess={() => router.push(invoicesPath)}
      onCancel={() => router.push(invoicesPath)}
    />
  )
}
