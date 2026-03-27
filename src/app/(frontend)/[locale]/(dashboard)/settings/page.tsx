import { getTranslations } from 'next-intl/server'
import { getOrganization, getCurrentUser } from '@/lib/actions/settings'
import { SettingsPageClient } from './SettingsPageClient'

export default async function SettingsPage() {
  const t = await getTranslations('settings')

  let org: Record<string, unknown> & { id: string } = { id: '' }
  let user: Record<string, unknown> & { id: string } = { id: '' }

  try {
    [org, user] = await Promise.all([getOrganization(), getCurrentUser()])
  } catch {
    // Not logged in
  }

  return (
    <SettingsPageClient
      organization={org}
      user={user}
      translations={{
        title: t('title'),
        organization: t('organization'),
        profile: t('profile'),
        billing: t('billing'),
        team: t('team'),
        payments: t('payments'),
        integrations: t('integrations'),
      }}
    />
  )
}
