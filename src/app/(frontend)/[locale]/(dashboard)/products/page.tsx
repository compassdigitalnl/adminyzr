import { getTranslations } from 'next-intl/server'
import { getProducts } from '@/lib/actions/products'
import { ProductsPageClient } from './ProductsPageClient'

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('products')

  let productsData
  try {
    productsData = await getProducts({
      search: params.search,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    productsData = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  return (
    <ProductsPageClient
      initialData={productsData}
      initialSearch={params.search || ''}
      translations={{
        title: t('title'),
        newProduct: t('newProduct'),
        noProducts: t('noProducts'),
      }}
    />
  )
}
