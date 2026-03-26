'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerOrganization } from '@/lib/actions/onboarding'
import { Building2, User, CheckCircle2 } from 'lucide-react'

type Step = 1 | 2 | 3

export default function RegisterPage() {
  const t = useTranslations('onboarding')
  const params = useParams()
  const locale = params.locale as string

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Company info
  const [companyName, setCompanyName] = useState('')
  const [kvkNumber, setKvkNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')

  // Step 2: User info
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function handleNextStep1(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!companyName.trim()) return
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }

    setLoading(true)

    try {
      const result = await registerOrganization({
        companyName,
        kvkNumber: kvkNumber || undefined,
        vatNumber: vatNumber || undefined,
        name,
        email,
        password,
      })

      if (result.success) {
        setStep(3)
      } else {
        if (result.error === 'email_exists') {
          setError(t('emailExists'))
        } else {
          setError(result.error || t('registrationFailed'))
        }
      }
    } catch {
      setError(t('registrationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const stepIcons = [
    <Building2 key="1" className="h-4 w-4" />,
    <User key="2" className="h-4 w-4" />,
    <CheckCircle2 key="3" className="h-4 w-4" />,
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Adminyzr</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('title')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepIcons[s - 1]}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-8 rounded ${
                    s < step ? 'bg-primary/40' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {step === 1 && (
            <>
              <h2 className="mb-4 text-lg font-semibold">{t('step1Title')}</h2>
              <form onSubmit={handleNextStep1} className="space-y-4">
                <div>
                  <Label htmlFor="companyName">{t('companyName')} *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    autoFocus
                    placeholder="Mijn Bedrijf B.V."
                  />
                </div>

                <div>
                  <Label htmlFor="kvkNumber">{t('kvkNumber')}</Label>
                  <Input
                    id="kvkNumber"
                    value={kvkNumber}
                    onChange={(e) => setKvkNumber(e.target.value)}
                    placeholder="12345678"
                  />
                </div>

                <div>
                  <Label htmlFor="vatNumber">{t('vatNumber')}</Label>
                  <Input
                    id="vatNumber"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="NL123456789B01"
                  />
                </div>

                <Button type="submit" className="w-full">
                  {t('next')}
                </Button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-4 text-lg font-semibold">{t('step2Title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="name">{t('name')} *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="je@email.nl"
                  />
                </div>

                <div>
                  <Label htmlFor="password">{t('password')} *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('passwordTooShort')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">{t('confirmPassword')} *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(1)
                      setError('')
                    }}
                    className="flex-1"
                  >
                    {t('back')}
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? '...' : t('createAccount')}
                  </Button>
                </div>

                <div className="text-center">
                  <a
                    href={`/${locale}/login`}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('alreadyHaveAccount')}
                  </a>
                </div>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">{t('successTitle')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('successMessage')}
              </p>
              <Button asChild className="w-full">
                <a href={`/${locale}/login`}>{t('goToLogin')}</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
