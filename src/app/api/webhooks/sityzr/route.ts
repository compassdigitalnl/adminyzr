import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'
import { verifySityzrWebhook } from '@/lib/sityzr/client'

/**
 * Sityzr webhook endpoint.
 * Ontvangt events van Sityzr wanneer een tenant Adminyzr wil activeren/deactiveren.
 *
 * Events:
 * - tenant.activate — Maak een nieuwe organisatie aan in Adminyzr
 * - tenant.deactivate — Deactiveer de organisatie
 * - tenant.update — Sync tenant data
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-sityzr-signature') || ''

  // Verify webhook signature
  if (process.env.SITYZR_WEBHOOK_SECRET && !verifySityzrWebhook(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const event = JSON.parse(body)

  try {
    switch (event.type) {
      case 'tenant.activate': {
        const { tenantId, tenantName, domain, ownerEmail, ownerName } = event.data

        // Check if organization already exists
        const existing = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (existing.docs.length > 0) {
          return NextResponse.json({ status: 'already_exists', orgId: existing.docs[0].id })
        }

        // Create organization
        const org = await payload.create({
          collection: 'organizations',
          data: {
            name: tenantName,
            slug: `sityzr-${tenantId}`,
            invoiceSettings: {
              prefix: 'INV',
              nextNumber: 1,
              defaultPaymentTermDays: 30,
              defaultVatRate: 21,
            },
          },
        })

        // Create owner user
        await payload.create({
          collection: 'users',
          data: {
            email: ownerEmail,
            name: ownerName || tenantName,
            password: `sityzr-${tenantId}-${Date.now()}`, // temporary, user should reset
            role: 'owner',
            organization: org.id,
          },
        })

        return NextResponse.json({ status: 'activated', orgId: org.id })
      }

      case 'tenant.deactivate': {
        const { tenantId } = event.data

        const existing = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (existing.docs.length > 0) {
          await payload.update({
            collection: 'organizations',
            id: existing.docs[0].id,
            data: { deletedAt: new Date().toISOString() },
          })
        }

        return NextResponse.json({ status: 'deactivated' })
      }

      case 'tenant.update': {
        const { tenantId, tenantName } = event.data

        const existing = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (existing.docs.length > 0) {
          await payload.update({
            collection: 'organizations',
            id: existing.docs[0].id,
            data: { name: tenantName },
          })
        }

        return NextResponse.json({ status: 'updated' })
      }

      default:
        return NextResponse.json({ status: 'ignored', event: event.type })
    }
  } catch (error) {
    console.error('[Sityzr webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
