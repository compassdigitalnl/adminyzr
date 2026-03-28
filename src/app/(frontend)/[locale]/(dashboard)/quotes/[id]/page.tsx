import { getPayloadClient } from '@/lib/get-payload'
import { QuoteDetailClient } from './QuoteDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function QuoteDetailPage({ params }: Props) {
  const { id, locale } = await params
  let quote: Record<string, unknown> | null = null
  try {
    const payload = await getPayloadClient()
    quote = await payload.findByID({ collection: 'quotes', id, depth: 2 }) as Record<string, unknown>
  } catch { /* */ }
  if (!quote) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Offerte niet gevonden.</p></div>
  return <QuoteDetailClient quote={quote} locale={locale} />
}
