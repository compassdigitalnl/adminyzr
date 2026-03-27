import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/get-payload'
import { verifySityzrWebhook } from '@/lib/sityzr/client'

/**
 * Sityzr webhook endpoint.
 * Ontvangt events van Sityzr wanneer een tenant Adminyzr wil activeren/deactiveren,
 * en order-events vanuit Sityzr webshops.
 *
 * Events:
 * - tenant.activate — Maak een nieuwe organisatie aan in Adminyzr
 * - tenant.deactivate — Deactiveer de organisatie
 * - tenant.update — Sync tenant data
 * - order.created — Maak een bestelling aan vanuit Sityzr webshop
 * - order.paid — Update bestelling naar 'processing'
 * - order.shipped — Update bestelling naar 'shipped'
 * - order.cancelled — Annuleer bestelling
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-sityzr-signature') || ''

  // Verify webhook signature
  if (process.env.SITYZR_WEBHOOK_SECRET && !verifySityzrWebhook(body, signature)) {
    // Log invalid signature
    try {
      const p = await getPayloadClient()
      await p.create({
        collection: 'webhook-log',
        data: {
          direction: 'incoming',
          source: 'sityzr',
          method: 'POST',
          url: '/api/webhooks/sityzr',
          statusCode: 401,
          error: 'Invalid signature',
        },
        overrideAccess: true,
      })
    } catch {
      // Logging failure should not break the webhook
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = await getPayloadClient()
  const event = JSON.parse(body)

  // Helper to log sityzr webhooks without breaking the flow
  const logWebhook = async (statusCode: number, orgId?: string, error?: string) => {
    try {
      await payload.create({
        collection: 'webhook-log',
        data: {
          direction: 'incoming',
          source: 'sityzr',
          method: 'POST',
          url: '/api/webhooks/sityzr',
          requestBody: event,
          statusCode,
          ...(orgId ? { organization: orgId } : {}),
          ...(error ? { error } : {}),
        },
        overrideAccess: true,
      })
    } catch {
      // Logging failure should not break the webhook
    }
  }

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
          await logWebhook(200, existing.docs[0].id as string)
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

        await logWebhook(200, org.id as string)
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
          await logWebhook(200, existing.docs[0].id as string)
        } else {
          await logWebhook(200)
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
          await logWebhook(200, existing.docs[0].id as string)
        } else {
          await logWebhook(200)
        }

        return NextResponse.json({ status: 'updated' })
      }

      case 'order.created': {
        const { orderId, tenantId, items, customer, totals, status } = event.data

        // Find the organization by sityzr tenant slug
        const orgResult = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (orgResult.docs.length === 0) {
          await logWebhook(404, undefined, `Organization not found for sityzr tenant: ${tenantId}`)
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const org = orgResult.docs[0]
        const orgId = org.id as string

        // Check for duplicate order
        const existingOrder = await payload.find({
          collection: 'orders',
          where: {
            and: [
              { organization: { equals: orgId } },
              { externalOrderId: { equals: String(orderId) } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        })

        if (existingOrder.docs.length > 0) {
          await logWebhook(200, orgId)
          return NextResponse.json({ status: 'already_exists', orderId: existingOrder.docs[0].id })
        }

        // Try to find or create a client by email
        let clientId: string | undefined
        if (customer?.email) {
          const existingClients = await payload.find({
            collection: 'clients',
            where: {
              and: [
                { organization: { equals: orgId } },
                { email: { equals: customer.email } },
                { deletedAt: { exists: false } },
              ],
            },
            limit: 1,
            overrideAccess: true,
          })

          if (existingClients.docs.length > 0) {
            clientId = existingClients.docs[0].id as string
          } else {
            // Create new client
            const newClient = await payload.create({
              collection: 'clients',
              data: {
                organization: orgId,
                type: 'individual',
                companyName: customer.name || customer.email,
                contactName: customer.name || undefined,
                email: customer.email,
                address: customer.address ? {
                  street: customer.address.street || undefined,
                  houseNumber: customer.address.houseNumber || undefined,
                  postalCode: customer.address.postalCode || undefined,
                  city: customer.address.city || undefined,
                  country: customer.address.country || 'NL',
                } : undefined,
              },
              overrideAccess: true,
            })
            clientId = newClient.id as string
          }
        }

        // Map order items
        const orderItems = (items || []).map((item: Record<string, unknown>) => ({
          name: (item.name as string) || 'Product',
          quantity: (item.quantity as number) || 1,
          unitPrice: (item.unitPrice as number) || 0,
          vatRate: (item.vatRate as number) ?? 21,
        }))

        // Create the order
        const order = await payload.create({
          collection: 'orders',
          data: {
            organization: orgId,
            externalOrderId: String(orderId),
            client: clientId || undefined,
            status: status || 'pending',
            orderDate: new Date().toISOString(),
            items: orderItems,
            subtotal: totals?.subtotal || 0,
            vatAmount: totals?.vat || 0,
            totalIncVat: totals?.total || 0,
            shippingAddress: customer?.address ? {
              name: customer.name || undefined,
              street: customer.address.street || undefined,
              houseNumber: customer.address.houseNumber || undefined,
              postalCode: customer.address.postalCode || undefined,
              city: customer.address.city || undefined,
              country: customer.address.country || 'NL',
            } : undefined,
            customerEmail: customer?.email || undefined,
            customerName: customer?.name || undefined,
            sityzrTenantId: tenantId,
          },
          overrideAccess: true,
        })

        await logWebhook(200, orgId)
        return NextResponse.json({ status: 'created', orderId: order.id })
      }

      case 'order.paid': {
        const { orderId, tenantId } = event.data

        const orgResult = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (orgResult.docs.length === 0) {
          await logWebhook(404, undefined, `Organization not found for sityzr tenant: ${tenantId}`)
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const orgId = orgResult.docs[0].id as string

        const orderResult = await payload.find({
          collection: 'orders',
          where: {
            and: [
              { organization: { equals: orgId } },
              { externalOrderId: { equals: String(orderId) } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        })

        if (orderResult.docs.length > 0) {
          await payload.update({
            collection: 'orders',
            id: orderResult.docs[0].id,
            data: { status: 'processing' },
            overrideAccess: true,
          })
        }

        await logWebhook(200, orgId)
        return NextResponse.json({ status: 'updated' })
      }

      case 'order.shipped': {
        const { orderId, tenantId } = event.data

        const orgResult = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (orgResult.docs.length === 0) {
          await logWebhook(404, undefined, `Organization not found for sityzr tenant: ${tenantId}`)
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const orgId = orgResult.docs[0].id as string

        const orderResult = await payload.find({
          collection: 'orders',
          where: {
            and: [
              { organization: { equals: orgId } },
              { externalOrderId: { equals: String(orderId) } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        })

        if (orderResult.docs.length > 0) {
          await payload.update({
            collection: 'orders',
            id: orderResult.docs[0].id,
            data: { status: 'shipped' },
            overrideAccess: true,
          })
        }

        await logWebhook(200, orgId)
        return NextResponse.json({ status: 'updated' })
      }

      case 'order.cancelled': {
        const { orderId, tenantId } = event.data

        const orgResult = await payload.find({
          collection: 'organizations',
          where: { slug: { equals: `sityzr-${tenantId}` } },
          limit: 1,
        })

        if (orgResult.docs.length === 0) {
          await logWebhook(404, undefined, `Organization not found for sityzr tenant: ${tenantId}`)
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const orgId = orgResult.docs[0].id as string

        const orderResult = await payload.find({
          collection: 'orders',
          where: {
            and: [
              { organization: { equals: orgId } },
              { externalOrderId: { equals: String(orderId) } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        })

        if (orderResult.docs.length > 0) {
          await payload.update({
            collection: 'orders',
            id: orderResult.docs[0].id,
            data: { status: 'cancelled' },
            overrideAccess: true,
          })
        }

        await logWebhook(200, orgId)
        return NextResponse.json({ status: 'updated' })
      }

      default:
        await logWebhook(200)
        return NextResponse.json({ status: 'ignored', event: event.type })
    }
  } catch (error) {
    console.error('[Sityzr webhook] Error:', error)
    await logWebhook(500, undefined, error instanceof Error ? error.message : 'Internal error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
