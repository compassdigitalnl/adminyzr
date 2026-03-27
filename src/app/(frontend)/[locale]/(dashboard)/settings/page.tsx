import { getTranslations } from 'next-intl/server'
import { getOrganization, getCurrentUser } from '@/lib/actions/settings'
import { SettingsPageClient } from './SettingsPageClient'

export default async function SettingsPage() {
  const t = await getTranslations('settings')

  let org: Record<string, unknown> & { id: string } = { id: '' }
  let user: Record<string, unknown> & { id: string } = { id: '' }

  try {
    [org, user] = await Promise.all([getOrganization(), getCurrentUser()])
    // Inject server-side integration statuses (env vars aren't available on client)
    // Check for non-empty env vars (empty strings = not configured)
    const hasValue = (v: string | undefined) => !!v && v.length > 0 && !v.startsWith('your-')
    org._integrations = {
      smtp: hasValue(process.env.SMTP_HOST) && hasValue(process.env.SMTP_USER),
      storage: hasValue(process.env.S3_BUCKET) && hasValue(process.env.S3_ACCESS_KEY_ID),
      sityzr: hasValue(process.env.SITYZR_API_URL) && hasValue(process.env.SITYZR_WEBHOOK_SECRET),
    }
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
