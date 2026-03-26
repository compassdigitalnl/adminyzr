'use client'

import { useTranslations } from 'next-intl'

type Props = {
  clientName: string
  locale: string
}

export function PortalHeader({ clientName, locale }: Props) {
  const t = useTranslations('portal')

  async function handleLogout() {
    document.cookie = 'portal-client-id=; path=/; max-age=0'
    window.location.href = `/${locale}/portal`
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">{clientName}</span>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        {t('logout')}
      </button>
    </div>
  )
}
