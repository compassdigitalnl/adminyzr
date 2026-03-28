import { getClient } from '@/lib/actions/clients'
import { getClientStatement } from '@/lib/actions/reporting'
import { ClientDetailClient } from './ClientDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id, locale } = await params
  let client: Record<string, unknown> | null = null
  let statement: Awaited<ReturnType<typeof getClientStatement>> | null = null

  try {
    client = await getClient(id) as Record<string, unknown>
    statement = await getClientStatement(id)
  } catch { /* not found */ }

  if (!client) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Klant niet gevonden.</p></div>
  }

  return <ClientDetailClient client={client} locale={locale} statement={statement} />
}
