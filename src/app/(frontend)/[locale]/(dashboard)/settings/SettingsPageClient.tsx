'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateOrganization, updateProfile } from '@/lib/actions/settings'
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from '@/lib/actions/two-factor'
import {
  getTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from '@/lib/actions/team'
import {
  getPaymentProviders,
  createPaymentProvider,
  deletePaymentProvider,
  setDefaultProvider,
  testProviderConnection,
} from '@/lib/actions/payment-providers'
import {
  Plus,
  Trash2,
  Users,
  CreditCard,
  Mail,
  Cloud,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Wallet,
  Star,
  Zap,
  Loader2,
} from 'lucide-react'
import { createPortalSession } from '@/lib/actions/billing'

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
    payments: string
  }
}

type Tab = 'organization' | 'profile' | 'billing' | 'team' | 'payments' | 'integrations'

export function SettingsPageClient({ organization, user, translations }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('organization')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'organization', label: translations.organization },
    { key: 'profile', label: translations.profile },
    { key: 'billing', label: translations.billing },
    { key: 'team', label: translations.team },
    { key: 'payments', label: translations.payments },
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
            <TeamTab currentUser={user} />
          )}
          {activeTab === 'payments' && (
            <PaymentProvidersTab />
          )}
          {activeTab === 'integrations' && (
            <IntegrationsTab organization={organization} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Team Tab ────────────────────────────────────────────────────────────────

type TeamMember = {
  id: string | number
  name: string | null
  email: string
  role: string
  createdAt: string
  twoFactorEnabled: boolean
}

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Eigenaar' },
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Boekhouder' },
  { value: 'member', label: 'Medewerker' },
  { value: 'viewer', label: 'Alleen lezen' },
] as const

const ROLE_LABELS: Record<string, string> = {
  owner: 'Eigenaar',
  admin: 'Admin',
  accountant: 'Boekhouder',
  member: 'Medewerker',
  viewer: 'Alleen lezen',
}

function TeamTab({ currentUser }: { currentUser: Record<string, unknown> & { id: string } }) {
  const tc = useTranslations('common')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)

  const isOwner = currentUser.role === 'owner'
  const isAdminOrOwner = currentUser.role === 'owner' || currentUser.role === 'admin'

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTeamMembers()
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }, [tc])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Teamleden</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Beheer de gebruikers die toegang hebben tot jouw organisatie.
            </p>
          </div>
          {isAdminOrOwner && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Lid uitnodigen
                </Button>
              </DialogTrigger>
              <InviteDialog
                onClose={() => setInviteOpen(false)}
                onInvited={loadMembers}
              />
            </Dialog>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">{tc('loading')}</div>
          </div>
        ) : members.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nog geen teamleden gevonden.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Naam</th>
                  <th className="pb-3 pr-4 font-medium">E-mail</th>
                  <th className="pb-3 pr-4 font-medium">Rol</th>
                  <th className="pb-3 pr-4 font-medium">2FA</th>
                  <th className="pb-3 pr-4 font-medium">Lid sinds</th>
                  {isOwner && <th className="pb-3 font-medium">Acties</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    isOwner={isOwner}
                    isCurrentUser={member.id === currentUser.id}
                    onRoleChanged={loadMembers}
                    onRemoved={loadMembers}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function TeamMemberRow({
  member,
  isOwner,
  isCurrentUser,
  onRoleChanged,
  onRemoved,
}: {
  member: TeamMember
  isOwner: boolean
  isCurrentUser: boolean
  onRoleChanged: () => void
  onRemoved: () => void
}) {
  const tc = useTranslations('common')
  const [roleLoading, setRoleLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRoleChange(newRole: string) {
    setRoleLoading(true)
    setError('')
    try {
      await updateTeamMemberRole(String(member.id), newRole as 'owner' | 'admin' | 'accountant' | 'member' | 'viewer')
      onRoleChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setRoleLoading(false)
    }
  }

  async function handleRemove() {
    if (!confirm(`Weet je zeker dat je ${member.name || member.email} wilt verwijderen uit het team?`)) return
    setRemoveLoading(true)
    setError('')
    try {
      await removeTeamMember(String(member.id))
      onRemoved()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setRemoveLoading(false)
    }
  }

  const joinedDate = new Date(member.createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.name || '-'}</span>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-[10px]">Jij</Badge>
            )}
          </div>
        </td>
        <td className="py-3 pr-4 text-muted-foreground">{member.email}</td>
        <td className="py-3 pr-4">
          {isOwner && !isCurrentUser ? (
            <Select
              value={member.role}
              onValueChange={handleRoleChange}
              disabled={roleLoading}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">{ROLE_LABELS[member.role] || member.role}</Badge>
          )}
        </td>
        <td className="py-3 pr-4">
          <Badge variant={member.twoFactorEnabled ? 'success' : 'secondary'}>
            {member.twoFactorEnabled ? 'Actief' : 'Uit'}
          </Badge>
        </td>
        <td className="py-3 pr-4 text-muted-foreground">{joinedDate}</td>
        {isOwner && (
          <td className="py-3">
            {!isCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={removeLoading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </td>
        )}
      </tr>
      {error && (
        <tr>
          <td colSpan={isOwner ? 6 : 5} className="pb-2">
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
          </td>
        </tr>
      )}
    </>
  )
}

function InviteDialog({
  onClose,
  onInvited,
}: {
  onClose: () => void
  onInvited: () => void
}) {
  const tc = useTranslations('common')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ temporaryPassword: string; email: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await inviteTeamMember({
        name,
        email,
        role: role as 'owner' | 'admin' | 'accountant' | 'member' | 'viewer',
      })
      setResult({ temporaryPassword: res.temporaryPassword, email: res.email })
      onInvited()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDone() {
    setName('')
    setEmail('')
    setRole('member')
    setResult(null)
    setError('')
    onClose()
  }

  if (result) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lid uitgenodigd</DialogTitle>
          <DialogDescription>
            Het account voor <strong>{result.email}</strong> is aangemaakt. Deel het tijdelijke wachtwoord met de gebruiker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <Label className="text-xs text-muted-foreground">Tijdelijk wachtwoord</Label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                {result.temporaryPassword}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Dit wachtwoord wordt slechts eenmaal getoond. De gebruiker kan het na inloggen wijzigen.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleDone}>Sluiten</Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Teamlid uitnodigen</DialogTitle>
          <DialogDescription>
            Voeg een nieuw lid toe aan jouw organisatie. Er wordt een account aangemaakt met een tijdelijk wachtwoord.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="inviteName">Naam *</Label>
            <Input
              id="inviteName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jan Jansen"
              required
            />
          </div>
          <div>
            <Label htmlFor="inviteEmail">E-mail *</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@voorbeeld.nl"
              required
            />
          </div>
          <div>
            <Label htmlFor="inviteRole">Rol *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="inviteRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.filter(r => r.value !== 'owner').map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? tc('loading') : 'Uitnodigen'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

// ─── Payment Providers Tab ───────────────────────────────────────────────────

type PaymentProviderItem = {
  id: string
  name: string
  provider: string
  isDefault: boolean
  isActive: boolean
  testMode: boolean
  apiKeyPrefix: string
}

const PROVIDER_OPTIONS = [
  { value: 'mollie', label: 'Mollie' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'multisafepay', label: 'MultiSafePay' },
] as const

const PROVIDER_LABELS: Record<string, string> = {
  mollie: 'Mollie',
  stripe: 'Stripe',
  multisafepay: 'MultiSafePay',
}

function PaymentProvidersTab() {
  const tc = useTranslations('common')
  const [providers, setProviders] = useState<PaymentProviderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getPaymentProviders()
      setProviders(data as PaymentProviderItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }, [tc])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Betaalproviders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configureer betaalproviders om betaallinks op facturen te plaatsen. Klanten kunnen dan direct online betalen.
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Provider toevoegen
              </Button>
            </DialogTrigger>
            <AddProviderDialog
              onClose={() => setAddOpen(false)}
              onAdded={loadProviders}
            />
          </Dialog>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">{tc('loading')}</div>
          </div>
        ) : providers.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nog geen betaalprovider geconfigureerd. Voeg een provider toe om betaallinks op facturen te activeren.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {providers.map((prov) => (
              <ProviderRow
                key={prov.id}
                provider={prov}
                onUpdated={loadProviders}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">Hoe werkt het?</h3>
        <ol className="mt-2 space-y-1 text-sm text-muted-foreground list-decimal list-inside">
          <li>Voeg een betaalprovider toe (Mollie, Stripe of MultiSafePay)</li>
          <li>Stel deze in als standaard provider</li>
          <li>Bij het versturen van een factuur wordt automatisch een betaallink gegenereerd</li>
          <li>Zodra de klant betaalt, wordt de factuur automatisch op &quot;betaald&quot; gezet</li>
        </ol>
      </div>
    </div>
  )
}

function ProviderRow({
  provider,
  onUpdated,
}: {
  provider: PaymentProviderItem
  onUpdated: () => void
}) {
  const tc = useTranslations('common')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [defaultLoading, setDefaultLoading] = useState(false)

  async function handleTest() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await testProviderConnection(provider.id)
      setTestResult(result)
      setTimeout(() => setTestResult(null), 5000)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : tc('error') })
    } finally {
      setTestLoading(false)
    }
  }

  async function handleSetDefault() {
    setDefaultLoading(true)
    try {
      await setDefaultProvider(provider.id)
      onUpdated()
    } catch {
      // Ignore
    } finally {
      setDefaultLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Weet je zeker dat je "${provider.name}" wilt verwijderen?`)) return
    setDeleteLoading(true)
    try {
      await deletePaymentProvider(provider.id)
      onUpdated()
    } catch {
      // Ignore
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{provider.name}</span>
            <Badge variant="outline">{PROVIDER_LABELS[provider.provider] || provider.provider}</Badge>
            {provider.isDefault && (
              <Badge variant="success">
                <Star className="mr-1 h-3 w-3" />
                Standaard
              </Badge>
            )}
            {provider.testMode && (
              <Badge variant="warning">Test</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            API key: {provider.apiKeyPrefix}
          </p>
          {testResult && (
            <p className={`mt-1 text-xs ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
              {testResult.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleTest} disabled={testLoading}>
          {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        </Button>
        {!provider.isDefault && (
          <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={defaultLoading}>
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleteLoading}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function AddProviderDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: () => void
}) {
  const tc = useTranslations('common')
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<string>('mollie')
  const [apiKey, setApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [testMode, setTestMode] = useState(false)
  const [isDefault, setIsDefault] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createPaymentProvider({
        name,
        provider,
        apiKey,
        testMode,
        webhookSecret: webhookSecret || undefined,
        isDefault,
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Betaalprovider toevoegen</DialogTitle>
          <DialogDescription>
            Voeg een betaalprovider toe om automatisch betaallinks op facturen te genereren.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="providerType">Provider *</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="providerType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="providerName">Naam *</Label>
            <Input
              id="providerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${PROVIDER_LABELS[provider] || 'Provider'} Productie`}
              required
            />
          </div>
          <div>
            <Label htmlFor="providerApiKey">API-sleutel *</Label>
            <Input
              id="providerApiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'mollie' ? 'live_xxx of test_xxx' : 'sk_xxx'}
              required
            />
          </div>
          {provider === 'stripe' && (
            <div>
              <Label htmlFor="providerWebhookSecret">Webhook secret</Label>
              <Input
                id="providerWebhookSecret"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_xxx"
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              Testmodus
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              Als standaard instellen
            </label>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? tc('loading') : 'Toevoegen'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

// ─── Integrations Tab ────────────────────────────────────────────────────────

type IntegrationCardProps = {
  icon: React.ReactNode
  name: string
  description: string
  status: 'connected' | 'not_configured' | 'coming_soon'
  statusLabel: string
  action?: React.ReactNode
}

function IntegrationCard({ icon, name, description, status, statusLabel, action }: IntegrationCardProps) {
  const statusVariant: Record<string, 'success' | 'secondary' | 'warning'> = {
    connected: 'success',
    not_configured: 'secondary',
    coming_soon: 'warning',
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant={statusVariant[status] || 'secondary'}>
          {statusLabel}
        </Badge>
      </div>
      {action && <div className="mt-4 flex justify-end">{action}</div>}
    </div>
  )
}

function IntegrationsTab({ organization }: { organization: Record<string, unknown> }) {
  const [portalLoading, setPortalLoading] = useState(false)

  const subscriptionStatus = (organization.subscriptionStatus as string) || 'none'
  const stripeConnected = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  // Integration statuses are passed from server via organization config flags
  const smtpConnected = (organization._integrations as Record<string, boolean> | undefined)?.smtp ?? false
  const storageConnected = (organization._integrations as Record<string, boolean> | undefined)?.storage ?? false
  const sityzrConnected = (organization._integrations as Record<string, boolean> | undefined)?.sityzr ?? false

  async function handleOpenBillingPortal() {
    setPortalLoading(true)
    try {
      const result = await createPortalSession()
      if (result.url) {
        window.location.href = result.url
      }
    } catch {
      // Ignore errors silently for portal
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Integraties</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overzicht van gekoppelde diensten en hun status.
        </p>
      </div>

      <div className="space-y-4">
        {/* Stripe */}
        <IntegrationCard
          icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
          name="Stripe"
          description="SaaS-abonnementsbeheer voor Adminyzr. Factuurbetalingen configureer je onder Betalingen."
          status={stripeConnected ? 'connected' : 'not_configured'}
          statusLabel={stripeConnected ? 'Actief' : 'Niet geconfigureerd'}
          action={
            stripeConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenBillingPortal}
                disabled={portalLoading}
              >
                {portalLoading ? '...' : 'Beheerportaal'}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            ) : undefined
          }
        />

        {/* Email / SMTP */}
        <IntegrationCard
          icon={<Mail className="h-5 w-5 text-muted-foreground" />}
          name="E-mail (SMTP)"
          description="Verstuur facturen en offertes per e-mail vanuit Adminyzr."
          status={smtpConnected ? 'connected' : 'not_configured'}
          statusLabel={smtpConnected ? 'Geconfigureerd' : 'Niet geconfigureerd'}
        />

        {/* Cloudflare R2 / S3 Storage */}
        <IntegrationCard
          icon={<Cloud className="h-5 w-5 text-muted-foreground" />}
          name="Bestandsopslag (S3/R2)"
          description="Cloud opslag voor uploads, bijlagen en gegenereerde documenten."
          status={storageConnected ? 'connected' : 'not_configured'}
          statusLabel={storageConnected ? 'Geconfigureerd' : 'Niet geconfigureerd'}
        />

        {/* Sityzr */}
        <IntegrationCard
          icon={<Globe className="h-5 w-5 text-muted-foreground" />}
          name="Sityzr"
          description="Koppel je Sityzr website aan Adminyzr voor automatische synchronisatie van klanten, orders en producten."
          status={sityzrConnected ? 'connected' : 'not_configured'}
          statusLabel={sityzrConnected ? 'Geconfigureerd' : 'Niet geconfigureerd'}
        />
      </div>
    </div>
  )
}

// ─── Organization Form (unchanged) ──────────────────────────────────────────

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

// ─── Profile Form (unchanged) ───────────────────────────────────────────────

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

// ─── Two Factor Section (unchanged) ─────────────────────────────────────────

function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const tc = useTranslations('common')
  const [is2FAEnabled, setIs2FAEnabled] = useState(enabled)
  const [showSetup, setShowSetup] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
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
        if (result.backupCodes) {
          setBackupCodes(result.backupCodes)
          setShowBackupCodes(true)
        }
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

      {showBackupCodes && backupCodes.length > 0 && (
        <div className="rounded-lg border bg-amber-50 p-4 space-y-3">
          <h3 className="font-semibold text-amber-900">Bewaar je backup codes</h3>
          <p className="text-sm text-amber-700">
            Gebruik deze eenmalige codes als je geen toegang hebt tot je authenticator app. Elke code werkt maar één keer.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="rounded bg-white px-3 py-1.5 text-sm font-mono text-center border">
                {code}
              </code>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(backupCodes.join('\n'))
          }}>
            Kopieer alle codes
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={() => setShowBackupCodes(false)}>
            Ik heb ze opgeslagen
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

// ─── Invoice Settings Form (unchanged) ──────────────────────────────────────

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
