'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProductForm } from '@/components/products/ProductForm'
import { deleteProduct } from '@/lib/actions/products'
import { formatCents } from '@/lib/utils'

type Product = Record<string, unknown> & {
  id: string
  name?: string
  description?: string
  unitPrice?: number
  unit?: string
  vatRate?: string
  isActive?: boolean
}

type ProductsData = {
  docs: Product[]
  totalDocs: number
  totalPages: number
  page: number | undefined
  hasNextPage: boolean
  hasPrevPage: boolean
}

type ProductsPageClientProps = {
  initialData: ProductsData
  initialSearch: string
  translations: {
    title: string
    newProduct: string
    noProducts: string
  }
}

const UNIT_LABELS: Record<string, string> = {
  piece: 'stuk',
  hour: 'uur',
  day: 'dag',
  month: 'maand',
  credit: 'credit',
}

export function ProductsPageClient({ initialData, initialSearch, translations }: ProductsPageClientProps) {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const tc = useTranslations('common')
  const t = useTranslations('products')
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [search, setSearch] = useState(initialSearch)

  function handleSearch(value: string) {
    setSearch(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.delete('page')
      router.push(`?${params.toString()}`)
    })
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString())
      params.set('page', String(page))
      router.push(`?${params.toString()}`)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    await deleteProduct(id)
    router.refresh()
  }

  function handleEdit(product: Product) {
    setEditProduct(product)
    setShowForm(true)
  }

  function handleCloseForm(open: boolean) {
    if (!open) {
      setShowForm(false)
      setEditProduct(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Button onClick={() => { setEditProduct(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {translations.newProduct}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={`${t('name')}, ${t('description')}...`}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('unitPrice')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('unit')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('vatRate')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {tc('status')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialData.docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {translations.noProducts}
                  </td>
                </tr>
              ) : (
                initialData.docs.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{product.name || '—'}</span>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {formatCents(product.unitPrice || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {UNIT_LABELS[product.unit || 'piece'] || product.unit}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {product.vatRate === 'exempt' ? t('vatExempt') : `${product.vatRate || '21'}%`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={product.isActive ? 'success' : 'secondary'}>
                        {product.isActive ? t('isActive') : 'Inactief'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {initialData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {tc('showing', { count: initialData.totalDocs })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasPrevPage || isPending}
                onClick={() => handlePageChange((initialData.page || 1) - 1)}
              >
                {tc('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!initialData.hasNextPage || isPending}
                onClick={() => handlePageChange((initialData.page || 1) + 1)}
              >
                {tc('next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <ProductForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editData={editProduct || undefined}
      />
    </div>
  )
}
