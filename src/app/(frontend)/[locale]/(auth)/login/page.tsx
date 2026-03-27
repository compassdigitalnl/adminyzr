'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { LogIn, ShieldCheck, Mail, CheckCircle } from 'lucide-react'
import { verifyTwoFactorCode } from '@/lib/actions/two-factor'
import { requestMagicLink } from '@/lib/actions/magic-link'
import { getOAuthUrls } from '@/lib/actions/oauth'

type LoginStep = 'credentials' | '2fa'

export default function LoginPage() {
  const t = useTranslations('auth')
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingUserId, setPendingUserId] = useState('')

  // Magic link state
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // OAuth SSO state
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [microsoftUrl, setMicrosoftUrl] = useState<string | null>(null)

  useEffect(() => {
    getOAuthUrls().then((urls) => {
      setGoogleUrl(urls.googleUrl)
      setMicrosoftUrl(urls.microsoftUrl)
    })

    // Show SSO error from callback redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'sso_error') {
      setError(t('ssoError'))
    }
  }, [t])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        setError(t('loginError'))
        setLoading(false)
        return
      }

      const data = await res.json()

      // Check if user has 2FA enabled
      if (data.user?.twoFactorEnabled) {
        setPendingUserId(data.user.id)
        setStep('2fa')
        // We need to logout temporarily — the cookie is set but we haven't verified 2FA yet
        // We'll verify 2FA and if it fails, we log out
        setLoading(false)
        return
      }

      // No 2FA — redirect to dashboard
      const redirect = new URLSearchParams(window.location.search).get('redirect')
      window.location.href = redirect || '/nl'
    } catch {
      setError(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const valid = await verifyTwoFactorCode(pendingUserId, totpCode)

      if (valid) {
        const redirect = new URLSearchParams(window.location.search).get('redirect')
        window.location.href = redirect || '/nl'
      } else {
        setError(t('invalidCode'))
        // After 3 failed attempts, log out
        await fetch('/api/users/logout', { method: 'POST' })
      }
    } catch {
      setError(t('invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicLinkLoading(true)

    try {
      await requestMagicLink(magicLinkEmail)
      setMagicLinkSent(true)
    } catch {
      // Always show success to not leak email existence
      setMagicLinkSent(true)
    } finally {
      setMagicLinkLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Adminyzr</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Business Operations Platform
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {step === 'credentials' ? (
            <>
              <h2 className="mb-4 text-lg font-semibold">{t('login')}</h2>
              <form onSubmit={handleCredentials} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">{t('email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="je@email.nl"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">{t('password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? '...' : t('loginButton')}
                </button>

                <div className="text-center">
                  <a href="#" className="text-sm text-primary hover:underline">
                    {t('forgotPassword')}
                  </a>
                </div>
              </form>

              {/* SSO Buttons */}
              {(googleUrl || microsoftUrl) && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        {t('ssoOr')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {googleUrl && (
                      <a
                        href={googleUrl}
                        className="inline-flex w-full items-center justify-center gap-3 rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        {t('ssoGoogle')}
                      </a>
                    )}

                    {microsoftUrl && (
                      <a
                        href={microsoftUrl}
                        className="inline-flex w-full items-center justify-center gap-3 rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 21 21">
                          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                        </svg>
                        {t('ssoMicrosoft')}
                      </a>
                    )}
                  </div>
                </>
              )}

              {/* Magic Link Section */}
              <div className="mt-6 border-t pt-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {t('magicLinkTitle')}
                </h3>

                {magicLinkSent ? (
                  <div className="flex items-start gap-3 rounded-md bg-green-50 px-3 py-3 dark:bg-green-950/20">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {t('magicLinkSent')}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-3">
                    <div>
                      <input
                        type="email"
                        value={magicLinkEmail}
                        onChange={(e) => setMagicLinkEmail(e.target.value)}
                        required
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="je@email.nl"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={magicLinkLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-background px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                      {magicLinkLoading ? '...' : t('magicLinkButton')}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('twoFactorTitle')}</h2>
                  <p className="text-sm text-muted-foreground">{t('twoFactorDescription')}</p>
                </div>
              </div>

              <form onSubmit={handleTwoFactor} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">{t('verificationCode')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {loading ? '...' : t('verifyButton')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fetch('/api/users/logout', { method: 'POST' })
                    setStep('credentials')
                    setTotpCode('')
                    setError('')
                  }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  {t('backToLogin')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
