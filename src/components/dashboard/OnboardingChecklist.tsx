'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, X, Building2, Users, FileText, CreditCard, Mail } from 'lucide-react'

type ChecklistItem = {
  key: string
  label: string
  description: string
  icon: typeof Building2
  href: string
  done: boolean
}

type Props = {
  orgName?: string
  hasClients: boolean
  hasInvoices: boolean
  hasPaymentProvider: boolean
  hasSmtp: boolean
}

export function OnboardingChecklist({ orgName, hasClients, hasInvoices, hasPaymentProvider, hasSmtp }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding-dismissed') === 'true'
    }
    return false
  })

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('onboarding-dismissed', 'true')
  }

  const items: ChecklistItem[] = [
    {
      key: 'org',
      label: 'Bedrijfsgegevens invullen',
      description: 'KvK, BTW-nummer, adres en IBAN',
      icon: Building2,
      href: '/nl/settings',
      done: !!orgName && orgName !== '',
    },
    {
      key: 'client',
      label: 'Eerste klant toevoegen',
      description: 'Voeg je eerste klant of contactpersoon toe',
      icon: Users,
      href: '/nl/clients',
      done: hasClients,
    },
    {
      key: 'invoice',
      label: 'Eerste factuur aanmaken',
      description: 'Maak een concept-factuur aan',
      icon: FileText,
      href: '/nl/invoices',
      done: hasInvoices,
    },
    {
      key: 'payment',
      label: 'Betaalprovider configureren',
      description: 'Mollie, Stripe of MultiSafePay koppelen',
      icon: CreditCard,
      href: '/nl/settings',
      done: hasPaymentProvider,
    },
    {
      key: 'email',
      label: 'E-mail instellen',
      description: 'SMTP configureren voor factuurverzending',
      icon: Mail,
      href: '/nl/settings',
      done: hasSmtp,
    },
  ]

  const doneCount = items.filter((i) => i.done).length
  const allDone = doneCount === items.length

  if (dismissed || allDone) return null

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Aan de slag</h3>
          <p className="text-sm text-muted-foreground">{doneCount} van {items.length} stappen voltooid</p>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => !item.done && router.push(item.href)}
              disabled={item.done}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                item.done
                  ? 'opacity-60'
                  : 'hover:bg-muted/50 cursor-pointer'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              {!item.done && (
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
