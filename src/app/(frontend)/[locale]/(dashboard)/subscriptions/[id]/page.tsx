import { getPayloadClient } from '@/lib/get-payload'
import { getClients } from '@/lib/actions/clients'
import { SubscriptionDetailClient } from './SubscriptionDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function SubscriptionDetailPage({ params }: Props) {
  const { id, locale } = await params
  let doc: Record<string, unknown> | null = null
  try {
    const payload = await getPayloadClient()
    doc = await payload.findByID({ collection: 'subscriptions', id, depth: 1 }) as Record<string, unknown>
  } catch { /* */ }
  if (!doc) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Abonnement niet gevonden.</p></div>

  let clients: Array<Record<string, unknown> & { id: string }> = []
  try {
    const clientsData = await getClients({ limit: 100 })
    clients = clientsData.docs
  } catch {
    clients = []
  }

  return <SubscriptionDetailClient doc={doc} locale={locale} clients={clients} />
}
