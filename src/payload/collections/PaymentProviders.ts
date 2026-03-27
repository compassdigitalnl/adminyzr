import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'
import { encryptApiKey } from '@/lib/payments/encryption'

export const PaymentProviders: CollectionConfig = {
  slug: 'payment-providers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'provider', 'isDefault', 'isActive'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin'),
    update: hasRoleInTenant('owner', 'admin'),
    delete: hasRoleInTenant('owner'),
  },
  hooks: {
    beforeValidate: [setOrganization],
    beforeChange: [
      async ({ data, operation }) => {
        if (!data) return data

        // Encrypt API key on create or when changed
        if (data.apiKey && !data.apiKey.startsWith('enc:')) {
          data.apiKeyPrefix = data.apiKey.substring(0, 8) + '...'
          data.apiKey = 'enc:' + encryptApiKey(data.apiKey)
        }

        // On create, set as default if it's the first provider
        if (operation === 'create' && data.isDefault === undefined) {
          data.isDefault = false
        }

        return data
      },
    ],
    afterChange: [
      logAfterChange,
      async ({ doc, req, operation }) => {
        // Ensure only one default per organization
        if (doc.isDefault && req.payload) {
          const orgId = typeof doc.organization === 'object' ? doc.organization.id : doc.organization
          await req.payload.update({
            collection: 'payment-providers',
            where: {
              organization: { equals: orgId },
              id: { not_equals: doc.id },
              isDefault: { equals: true },
            },
            data: { isDefault: false },
            overrideAccess: true,
          })
        }
        return doc
      },
    ],
    afterDelete: [logAfterDelete],
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Naam',
      admin: { description: 'Herkenbare naam (bijv. "Mollie Productie")' },
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: [
        { label: 'Mollie', value: 'mollie' },
        { label: 'Stripe', value: 'stripe' },
        { label: 'MultiSafePay', value: 'multisafepay' },
      ],
      label: 'Provider',
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      label: 'Standaard provider',
      admin: { description: 'Gebruik deze provider bij factuurverzending' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actief',
    },
    {
      name: 'apiKey',
      type: 'text',
      required: true,
      label: 'API-sleutel',
      admin: { hidden: true },
    },
    {
      name: 'apiKeyPrefix',
      type: 'text',
      label: 'API-sleutel (prefix)',
      admin: { readOnly: true, description: 'Eerste tekens van de key (voor herkenning)' },
    },
    {
      name: 'testMode',
      type: 'checkbox',
      defaultValue: false,
      label: 'Testmodus',
      admin: { description: 'Gebruik test/sandbox omgeving van de provider' },
    },
    {
      name: 'webhookSecret',
      type: 'text',
      label: 'Webhook secret',
      admin: { hidden: true, description: 'Alleen nodig voor Stripe' },
    },
    {
      name: 'config',
      type: 'json',
      label: 'Extra configuratie',
      admin: { description: 'Provider-specifieke instellingen (JSON)' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
