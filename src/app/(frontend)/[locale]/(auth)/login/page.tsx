'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LogIn, ShieldCheck } from 'lucide-react'
import { verifyTwoFactorCode } from '@/lib/actions/two-factor'

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
