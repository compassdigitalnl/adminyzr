import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'
import crypto from 'crypto'

export const ApiKeys: CollectionConfig = {
  slug: 'api-keys',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'scope', 'lastUsedAt', 'isActive'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin'),
    update: hasRoleInTenant('owner', 'admin'),
    delete: hasRoleInTenant('owner'),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        // Generate API key and hash on creation
        if (operation === 'create' && data) {
          const rawKey = `ak_${crypto.randomBytes(32).toString('hex')}`
          const hash = crypto.createHash('sha256').update(rawKey).digest('hex')
          data.keyHash = hash
          data.keyPrefix = rawKey.substring(0, 10)
          // Store raw key temporarily so we can return it once
          data._rawKey = rawKey
        }
        return data
      },
    ],
    afterChange: [
      logAfterChange,
      ({ doc, operation }) => {
        // Include raw key only on creation response
        if (operation === 'create' && doc._rawKey) {
          doc.rawKey = doc._rawKey
          delete doc._rawKey
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
      admin: { description: 'Herkenbare naam voor deze API key (bijv. "Sityzr integratie")' },
    },
    {
      name: 'keyHash',
      type: 'text',
      required: true,
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'keyPrefix',
      type: 'text',
      admin: { readOnly: true, description: 'Eerste 10 tekens van de key (voor herkenning)' },
      label: 'Key prefix',
    },
    {
      name: 'scope',
      type: 'select',
      hasMany: true,
      required: true,
      options: [
        { label: 'Facturen lezen', value: 'invoices:read' },
        { label: 'Facturen schrijven', value: 'invoices:write' },
        { label: 'Klanten lezen', value: 'clients:read' },
        { label: 'Klanten schrijven', value: 'clients:write' },
        { label: 'Producten lezen', value: 'products:read' },
        { label: 'Offertes lezen', value: 'quotes:read' },
        { label: 'Offertes schrijven', value: 'quotes:write' },
        { label: 'Rapporten lezen', value: 'reports:read' },
        { label: 'Volledige toegang', value: 'full:access' },
      ],
      label: 'Rechten',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actief',
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Vervaldatum',
      admin: { description: 'Optioneel — key verloopt na deze datum' },
    },
    {
      name: 'lastUsedAt',
      type: 'date',
      admin: { readOnly: true },
      label: 'Laatst gebruikt',
    },
    {
      name: 'usageCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Aantal requests',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
      label: 'Aangemaakt door',
    },
    {
      name: 'revokedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
      label: 'Ingetrokken op',
    },
  ],
  timestamps: true,
}
