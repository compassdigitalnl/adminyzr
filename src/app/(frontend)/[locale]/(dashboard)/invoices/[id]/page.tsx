import { getInvoice, getInvoiceItems } from '@/lib/actions/invoices'
import { InvoiceDetailClient } from './InvoiceDetailClient'

type Props = {
  params: Promise<{ id: string; locale: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id, locale } = await params

  let invoice: Record<string, unknown> | null = null
  let items: Record<string, unknown>[] = []

  try {
    invoice = await getInvoice(id) as Record<string, unknown>
    items = (await getInvoiceItems(id)) as Record<string, unknown>[]
  } catch {
    // Not found or not authorized
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Factuur niet gevonden.</p>
      </div>
    )
  }

  return <InvoiceDetailClient invoice={invoice} items={items} locale={locale} />
}
