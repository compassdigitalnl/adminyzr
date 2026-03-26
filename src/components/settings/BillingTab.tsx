'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createCheckoutSession, createPortalSession } from '@/lib/actions/billing'
import { PLANS, type PlanKey } from '@/lib/stripe'
import { CreditCard, ExternalLink, Check } from 'lucide-react'

type Props = {
  subscriptionStatus: string
  subscriptionPlan: string | null
}

const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  trialing: 'success',
  past_due: 'warning',
  canceled: 'destructive',
  none: 'secondary',
}

const statusLabels: Record<string, string> = {
  active: 'Actief',
  trialing: 'Proefperiode',
  past_due: 'Achterstallig',
  canceled: 'Geannuleerd',
  none: 'Geen abonnement',
}

export function BillingTab({ subscriptionStatus, subscriptionPlan }: Props) {
  const t = useTranslations('billing')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleUpgrade(plan: PlanKey) {
    setLoading(plan)
    setError('')

    try {
      const result = await createCheckoutSession(plan)
      if (result.url) {
        window.location.href = result.url
      } else {
        setError(result.error || t('checkoutError'))
      }
    } catch {
      setError(t('checkoutError'))
    } finally {
      setLoading(null)
    }
  }

  async function handleManageSubscription() {
    setLoading('portal')
    setError('')

    try {
      const result = await createPortalSession()
      if (result.url) {
        window.location.href = result.url
      } else {
        setError(result.error || t('portalError'))
      }
    } catch {
      setError(t('portalError'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current plan status */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('currentPlan')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subscriptionPlan
                ? PLANS[subscriptionPlan as PlanKey]?.name || subscriptionPlan
                : t('noPlan')}
            </p>
          </div>
          <Badge variant={statusVariants[subscriptionStatus] || 'secondary'}>
            {statusLabels[subscriptionStatus] || subscriptionStatus}
          </Badge>
        </div>

        {(subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'past_due') && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={loading === 'portal'}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {loading === 'portal' ? '...' : t('manageSubscription')}
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Plan cards */}
      <div>
        <h3 className="mb-4 text-base font-semibold">{t('availablePlans')}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.entries(PLANS) as [PlanKey, (typeof PLANS)[PlanKey]][]).map(
            ([key, plan]) => {
              const isCurrentPlan = subscriptionPlan === key
              return (
                <Card
                  key={key}
                  className={isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>
                      {isCurrentPlan && (
                        <Badge variant="success" className="mb-2">
                          {t('currentPlanBadge')}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        {t('currentPlanBadge')}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(key)}
                        disabled={loading === key}
                      >
                        {loading === key ? '...' : t('upgrade')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}
