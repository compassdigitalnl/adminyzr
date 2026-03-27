import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const TaxRates: CollectionConfig = {
  slug: 'tax-rates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'rate', 'isDefault', 'isActive'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin'),
    update: hasRoleInTenant('owner', 'admin'),
    delete: hasRoleInTenant('owner', 'admin'),
  },
  hooks: {
    beforeValidate: [setOrganization],
    afterChange: [logAfterChange],
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
    },
    {
      name: 'rate',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      label: 'Percentage',
      admin: { description: 'BTW-tarief in procenten (bijv. 21)' },
    },
    {
      name: 'description',
      type: 'text',
      label: 'Omschrijving',
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      label: 'Standaard',
      admin: { description: 'Gebruik dit tarief als standaard voor nieuwe facturen' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actief',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
