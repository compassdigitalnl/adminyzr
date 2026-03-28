'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { deleteProduct } from '@/lib/actions/products'
import { formatCents } from '@/lib/utils'

type Props = { product: Record<string, unknown>; locale: string }

export function ProductDetailClient({ product, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Product verwijderen?')) return
    setLoading(true)
    await deleteProduct(String(product.id))
    router.push(`/${locale}/products`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/products`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{String(product.name || '—')}</h1>
            {(product.sku as string) ? <p className="text-sm text-muted-foreground font-mono">SKU: {String(product.sku)}</p> : null}
          </div>
          <Badge variant={(product.isActive as boolean) !== false ? 'success' : 'secondary'}>
            {(product.isActive as boolean) !== false ? 'Actief' : 'Inactief'}
          </Badge>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}><Trash2 className="mr-2 h-4 w-4" />Verwijderen</Button>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div><span className="text-muted-foreground">Prijs excl. BTW</span><p className="text-lg font-mono font-bold">{formatCents((product.unitPrice as number) || 0)}</p></div>
          <div><span className="text-muted-foreground">BTW-tarief</span><p className="text-lg font-bold">{String(product.vatRate || '21')}%</p></div>
          <div><span className="text-muted-foreground">Eenheid</span><p className="text-lg">{String(product.unit || 'stuk')}</p></div>
          <div><span className="text-muted-foreground">Status</span><p><Badge variant={(product.isActive as boolean) !== false ? 'success' : 'secondary'}>{(product.isActive as boolean) !== false ? 'Actief' : 'Inactief'}</Badge></p></div>
        </div>
        {(product.description as string) ? <div className="mt-4 pt-4 border-t"><p className="text-sm text-muted-foreground">{String(product.description)}</p></div> : null}
      </div>
    </div>
  )
}
