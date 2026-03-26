import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '@/payload/access/tenantIsolation'
import { hasRoleInTenant } from '@/payload/access/hasRole'
import { setOrganization } from '@/payload/hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '@/payload/hooks/auditLog'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'unitPrice', 'vatRate', 'organization'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin', 'accountant'),
    update: hasRoleInTenant('owner', 'admin', 'accountant'),
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
      name: 'description',
      type: 'textarea',
      label: 'Omschrijving',
    },
    {
      name: 'unitPrice',
      type: 'number',
      required: true,
      label: 'Stukprijs (in centen)',
    },
    {
      name: 'unit',
      type: 'select',
      defaultValue: 'piece',
      options: [
        { label: 'Stuk', value: 'piece' },
        { label: 'Uur', value: 'hour' },
        { label: 'Dag', value: 'day' },
        { label: 'Maand', value: 'month' },
        { label: 'Credit', value: 'credit' },
      ],
    },
    {
      name: 'vatRate',
      type: 'select',
      required: true,
      defaultValue: '21',
      label: 'BTW-tarief',
      options: [
        { label: '21%', value: '21' },
        { label: '9%', value: '9' },
        { label: '0%', value: '0' },
        { label: 'Vrijgesteld', value: 'exempt' },
      ],
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
