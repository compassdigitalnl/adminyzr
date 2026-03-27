import { getTranslations } from 'next-intl/server'
import { ApiDocsClient } from './ApiDocsClient'

export default async function ApiDocsPage() {
  const t = await getTranslations('apiDocs')

  return <ApiDocsClient translations={{ title: t('title') }} />
}
