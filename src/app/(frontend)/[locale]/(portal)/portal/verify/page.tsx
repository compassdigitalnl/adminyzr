import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { verifyPortalToken } from '@/lib/actions/portal-auth'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function PortalVerifyPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { token } = await searchParams
  const t = await getTranslations('portal')

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-red-600">
            {t('invalidToken')}
          </h2>
          <a
            href={`/${locale}/portal`}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            {t('backToPortal')}
          </a>
        </div>
      </div>
    )
  }

  const client = await verifyPortalToken(token)

  if (!client) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-red-600">
            {t('invalidToken')}
          </h2>
          <p className="text-sm text-gray-600">{t('tokenExpired')}</p>
          <a
            href={`/${locale}/portal`}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            {t('backToPortal')}
          </a>
        </div>
      </div>
    )
  }

  // Set the portal-client-id cookie
  const cookieStore = await cookies()
  cookieStore.set('portal-client-id', String(client.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  redirect(`/${locale}/portal`)
}
