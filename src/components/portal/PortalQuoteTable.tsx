'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { acceptPortalQuote, rejectPortalQuote } from '@/lib/actions/portal'

type Quote = {
  id: string
  quoteNumber: string
  issueDate: string
  validUntil: string
  totalIncVat: number
  status: string
}

type Props = {
  quotes: Quote[]
  clientId: string
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  )
}

export function PortalQuoteTable({ quotes: initialQuotes, clientId }: Props) {
  const t = useTranslations('portal')
  const [quotes, setQuotes] = useState(initialQuotes)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleAccept(quoteId: string) {
    setLoading(quoteId)
    setMessage(null)
    try {
      await acceptPortalQuote(clientId, quoteId)
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'accepted' } : q))
      )
      setMessage({ type: 'success', text: t('quoteAccepted') })
    } catch {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setLoading(null)
    }
  }

  async function handleReject(quoteId: string) {
    setLoading(quoteId)
    setMessage(null)
    try {
      await rejectPortalQuote(clientId, quoteId)
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'rejected' } : q))
      )
      setMessage({ type: 'success', text: t('quoteRejected') })
    } catch {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('quoteNumber')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('issueDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('validUntil')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {quote.quoteNumber}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatDate(quote.issueDate)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatDate(quote.validUntil)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                  {formatCents(quote.totalIncVat)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={quote.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {quote.status === 'sent' && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleAccept(quote.id)}
                        disabled={loading === quote.id}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {t('accept')}
                      </button>
                      <button
                        onClick={() => handleReject(quote.id)}
                        disabled={loading === quote.id}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {t('reject')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
