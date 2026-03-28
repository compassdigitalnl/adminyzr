import { getOrder } from '@/lib/actions/orders'
import { OrderDetailClient } from './OrderDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id, locale } = await params
  let order: Record<string, unknown> | null = null
  try { order = await getOrder(id) as Record<string, unknown> } catch { /* */ }
  if (!order) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Bestelling niet gevonden.</p></div>
  return <OrderDetailClient order={order} locale={locale} />
}
