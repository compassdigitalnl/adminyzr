'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'

type Props = {
  invoiceCount: number
  quoteCount: number
  locale: string
}

export function PortalDashboard({ invoiceCount, quoteCount, locale }: Props) {
  const t = useTranslations('portal')

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        {t('dashboard')}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href={`/${locale}/portal/invoices`}
          className="block rounded-lg border bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl font-bold text-blue-600">{invoiceCount}</div>
          <div className="mt-1 text-sm text-gray-600">
            {t('invoiceCount', { count: invoiceCount })}
          </div>
          <div className="mt-4 text-sm font-medium text-blue-600">
            {t('viewInvoices')} &rarr;
          </div>
        </Link>
        <Link
          href={`/${locale}/portal/quotes`}
          className="block rounded-lg border bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl font-bold text-blue-600">{quoteCount}</div>
          <div className="mt-1 text-sm text-gray-600">
            {t('quoteCount', { count: quoteCount })}
          </div>
          <div className="mt-4 text-sm font-medium text-blue-600">
            {t('viewQuotes')} &rarr;
          </div>
        </Link>
      </div>
    </div>
  )
}
