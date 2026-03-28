import { getPayloadClient } from '@/lib/get-payload'
import { PunchCardDetailClient } from './PunchCardDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function PunchCardDetailPage({ params }: Props) {
  const { id, locale } = await params
  let doc: Record<string, unknown> | null = null
  try {
    const payload = await getPayloadClient()
    doc = await payload.findByID({ collection: 'punch-cards', id, depth: 1 }) as Record<string, unknown>
  } catch { /* */ }
  if (!doc) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Strippenkaart niet gevonden.</p></div>
  return <PunchCardDetailClient doc={doc} locale={locale} />
}
