import { getProduct } from '@/lib/actions/products'
import { ProductDetailClient } from './ProductDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function ProductDetailPage({ params }: Props) {
  const { id, locale } = await params
  let product: Record<string, unknown> | null = null
  try { product = await getProduct(id) as Record<string, unknown> } catch { /* */ }
  if (!product) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Product niet gevonden.</p></div>
  return <ProductDetailClient product={product} locale={locale} />
}
