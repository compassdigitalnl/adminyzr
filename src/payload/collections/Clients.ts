import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'contactName', 'email', 'organization'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin', 'accountant', 'member'),
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
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'business',
      options: [
        { label: 'Zakelijk', value: 'business' },
        { label: 'Particulier', value: 'individual' },
      ],
    },
    {
      name: 'companyName',
      type: 'text',
      required: true,
      label: 'Bedrijfsnaam',
    },
    {
      name: 'contactName',
      type: 'text',
      label: 'Contactpersoon',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'kvkNumber',
      type: 'text',
      label: 'KvK-nummer',
    },
    {
      name: 'vatNumber',
      type: 'text',
      label: 'BTW-nummer',
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'houseNumber', type: 'text' },
        { name: 'postalCode', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text', defaultValue: 'NL' },
      ],
    },
    {
      name: 'paymentTermDays',
      type: 'number',
      defaultValue: 30,
      label: 'Betalingstermijn (dagen)',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notities',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        { name: 'tag', type: 'text' },
      ],
    },
    {
      name: 'portalToken',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'portalTokenExpiry',
      type: 'date',
      admin: { hidden: true },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
