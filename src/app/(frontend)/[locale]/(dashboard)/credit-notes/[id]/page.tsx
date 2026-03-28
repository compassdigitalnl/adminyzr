import { getCreditNote } from '@/lib/actions/credit-notes'
import { CreditNoteDetailClient } from './CreditNoteDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function CreditNoteDetailPage({ params }: Props) {
  const { id, locale } = await params
  let doc: Record<string, unknown> | null = null
  try { doc = await getCreditNote(id) as Record<string, unknown> } catch { /* */ }
  if (!doc) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Creditnota niet gevonden.</p></div>
  return <CreditNoteDetailClient doc={doc} locale={locale} />
}
