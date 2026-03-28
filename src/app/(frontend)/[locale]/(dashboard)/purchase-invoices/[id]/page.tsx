import { getPayloadClient } from '@/lib/get-payload'
import { PurchaseInvoiceDetailClient } from './PurchaseInvoiceDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function PurchaseInvoiceDetailPage({ params }: Props) {
  const { id, locale } = await params
  let doc: Record<string, unknown> | null = null
  try {
    const payload = await getPayloadClient()
    doc = await payload.findByID({ collection: 'purchase-invoices', id, depth: 1 }) as Record<string, unknown>
  } catch { /* */ }
  if (!doc) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Inkoopfactuur niet gevonden.</p></div>
  return <PurchaseInvoiceDetailClient doc={doc} locale={locale} />
}
