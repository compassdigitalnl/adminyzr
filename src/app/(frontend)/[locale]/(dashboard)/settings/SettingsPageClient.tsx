'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { updateOrganization, updateProfile } from '@/lib/actions/settings'
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from '@/lib/actions/two-factor'

type Props = {
  organization: Record<string, unknown> & { id: string }
  user: Record<string, unknown> & { id: string }
  translations: {
    title: string
    organization: string
    profile: string
    billing: string
    team: string
    integrations: string
  }
}

type Tab = 'organization' | 'profile' | 'billing' | 'team' | 'integrations'

export function SettingsPageClient({ organization, user, translations }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('organization')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'organization', label: translations.organization },
    { key: 'profile', label: translations.profile },
    { key: 'billing', label: translations.billing },
    { key: 'team', label: translations.team },
    { key: 'integrations', label: translations.integrations },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{translations.title}</h1>

      <div className="grid gap-6 lg:grid-cols-4">
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-muted font-medium'
                  : 'hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3">
          {activeTab === 'organization' && (
            <OrganizationForm org={organization} />
          )}
          {activeTab === 'profile' && (
            <ProfileForm user={user} />
          )}
          {activeTab === 'billing' && (
            <InvoiceSettingsForm org={organization} />
          )}
          {activeTab === 'team' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{translations.team}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Teambeheer komt in een volgende versie.
              </p>
            </div>
          )}
          {activeTab === 'integrations' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{translations.integrations}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Integraties komen in een volgende versie.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrganizationForm({ org }: { org: Record<string, unknown> }) {
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const address = (org.address as Record<string, string>) || {}
  const contact = (org.contact as Record<string, string>) || {}

  const [name, setName] = useState((org.name as string) || '')
  const [kvkNumber, setKvkNumber] = useState((org.kvkNumber as string) || '')
  const [vatNumber, setVatNumber] = useState((org.vatNumber as string) || '')
  const [iban, setIban] = useState((org.iban as string) || '')
  const [street, setStreet] = useState(address.street || '')
  const [houseNumber, setHouseNumber] = useState(address.houseNumber || '')
  const [postalCode, setPostalCode] = useState(address.postalCode || '')
  const [city, setCity] = useState(address.city || '')
  const [country, setCountry] = useState(address.country || 'NL')
  const [email, setEmail] = useState(contact.email || '')
  const [phone, setPhone] = useState(contact.phone || '')
  const [website, setWebsite] = useState(contact.website || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await updateOrganization({
        name,
        kvkNumber: kvkNumber || undefined,
        vatNumber: vatNumber || undefined,
        iban: iban || undefined,
        address: { street, houseNumber, postalCode, city, country },
        contact: {
          email: email || undefined,
          phone: phone || undefined,
          website: website || undefined,
        },
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Organisatie</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bedrijfsgegevens die op facturen en offertes verschijnen.
        </p>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{tc('success')}</div>}

      <div className="space-y-4">
        <div>
          <Label htmlFor="orgName">Bedrijfsnaam *</Label>
          <Input id="orgName" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="kvk">KvK-nummer</Label>
            <Input id="kvk" value={kvkNumber} onChange={(e) => setKvkNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vat">BTW-nummer</Label>
            <Input id="vat" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00 XXXX 0000 0000 00" />
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold">Adres</Label>
          <div className="mt-2 grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <Label htmlFor="street">Straat</Label>
              <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="houseNr">Huisnummer</Label>
              <Input id="houseNr" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="postal">Postcode</Label>
              <Input id="postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="city">Plaats</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="country">Land</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold">Contact</Label>
          <div className="mt-2 grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="contactEmail">E-mail</Label>
              <Input id="contactEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactPhone">Telefoon</Label>
              <Input id="contactPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactWebsite">Website</Label>
              <Input id="contactWebsite" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? tc('loading') : tc('save')}
        </Button>
      </div>
    </form>
  )
}

function ProfileForm({ user }: { user: Record<string, unknown> }) {
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState((user.name as string) || '')
  const [phone, setPhone] = useState((user.phone as string) || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await updateProfile({ name, phone: phone || undefined })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profiel</h2>
        <p className="mt-1 text-sm text-muted-foreground">Je persoonlijke gegevens.</p>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{tc('success')}</div>}

      <div className="space-y-4">
        <div>
          <Label htmlFor="userName">Naam</Label>
          <Input id="userName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input value={(user.email as string) || ''} disabled />
          <p className="mt-1 text-xs text-muted-foreground">E-mail kan niet gewijzigd worden.</p>
        </div>
        <div>
          <Label htmlFor="userPhone">Telefoon</Label>
          <Input id="userPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? tc('loading') : tc('save')}
        </Button>
      </div>
    </form>

    {/* 2FA Section */}
    <TwoFactorSection enabled={!!user.twoFactorEnabled} />
    </>
  )
}

function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const tc = useTranslations('common')
  const [is2FAEnabled, setIs2FAEnabled] = useState(enabled)
  const [showSetup, setShowSetup] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStartSetup() {
    setLoading(true)
    setError('')
    try {
      const result = await setupTwoFactor()
      setQrCode(result.qrCodeDataUrl)
      setSecret(result.secret)
      setShowSetup(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setLoading(true)
    setError('')
    try {
      const result = await enableTwoFactor(secret, verifyCode)
      if (result.success) {
        setIs2FAEnabled(true)
        setShowSetup(false)
        setVerifyCode('')
      } else {
        setError(result.error || 'Verificatie mislukt')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    if (!confirm('Weet je zeker dat je 2FA wilt uitschakelen?')) return
    setLoading(true)
    try {
      await disableTwoFactor()
      setIs2FAEnabled(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Twee-factor authenticatie (2FA)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Extra beveiliging via een authenticator app (Google Authenticator, Authy, etc.)
          </p>
        </div>
        <Badge variant={is2FAEnabled ? 'success' : 'secondary'}>
          {is2FAEnabled ? 'Actief' : 'Inactief'}
        </Badge>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {!is2FAEnabled && !showSetup && (
        <Button onClick={handleStartSetup} disabled={loading}>
          {loading ? tc('loading') : '2FA inschakelen'}
        </Button>
      )}

      {showSetup && (
        <div className="space-y-4">
          <p className="text-sm">Scan de QR-code met je authenticator app:</p>
          {qrCode && (
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="2FA QR Code" width={200} height={200} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="verifyCode">Verificatiecode</Label>
            <div className="flex gap-2">
              <Input
                id="verifyCode"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-40 font-mono text-center text-lg tracking-widest"
              />
              <Button onClick={handleVerify} disabled={loading || verifyCode.length !== 6}>
                {loading ? tc('loading') : 'Verifieer'}
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowSetup(false)}>
            {tc('cancel')}
          </Button>
        </div>
      )}

      {is2FAEnabled && (
        <Button variant="destructive" onClick={handleDisable} disabled={loading}>
          2FA uitschakelen
        </Button>
      )}
    </div>
  )
}

function InvoiceSettingsForm({ org }: { org: Record<string, unknown> }) {
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const invoiceSettings = (org.invoiceSettings as Record<string, unknown>) || {}

  const [prefix, setPrefix] = useState((invoiceSettings.prefix as string) || 'INV')
  const [paymentTermDays, setPaymentTermDays] = useState(
    String((invoiceSettings.defaultPaymentTermDays as number) || 30)
  )
  const [defaultVatRate, setDefaultVatRate] = useState(
    String((invoiceSettings.defaultVatRate as number) || 21)
  )
  const [footerText, setFooterText] = useState((invoiceSettings.footerText as string) || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await updateOrganization({
        name: (org.name as string) || '',
        invoiceSettings: {
          prefix,
          defaultPaymentTermDays: parseInt(paymentTermDays) || 30,
          defaultVatRate: parseInt(defaultVatRate) || 21,
          footerText: footerText || undefined,
        },
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Factuurinstellingen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Standaardinstellingen voor nieuwe facturen.
        </p>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{tc('success')}</div>}

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="prefix">Factuurnummer prefix</Label>
            <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="INV" />
            <p className="mt-1 text-xs text-muted-foreground">Bijv. INV-2026-0001</p>
          </div>
          <div>
            <Label htmlFor="paymentTerms">Standaard betalingstermijn (dagen)</Label>
            <Input
              id="paymentTerms"
              type="number"
              value={paymentTermDays}
              onChange={(e) => setPaymentTermDays(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vatRate">Standaard BTW-tarief (%)</Label>
            <Input
              id="vatRate"
              type="number"
              value={defaultVatRate}
              onChange={(e) => setDefaultVatRate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="footer">Voettekst factuur</Label>
          <Textarea
            id="footer"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            rows={4}
            placeholder="Bankgegevens, betalingsvoorwaarden, etc."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? tc('loading') : tc('save')}
        </Button>
      </div>
    </form>
  )
}
