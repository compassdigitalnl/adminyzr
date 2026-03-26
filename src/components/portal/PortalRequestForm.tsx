'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { requestPortalAccess } from '@/lib/actions/portal-auth'

export function PortalRequestForm() {
  const t = useTranslations('portal')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await requestPortalAccess(email)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <p className="text-sm text-green-800">{t('checkEmail')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="portal-email" className="block text-sm font-medium text-gray-700">
          {t('emailLabel')}
        </label>
        <input
          id="portal-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="naam@bedrijf.nl"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? '...' : t('requestAccess')}
      </button>
    </form>
  )
}
