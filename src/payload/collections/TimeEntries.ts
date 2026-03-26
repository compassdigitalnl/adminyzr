import type { CollectionConfig, Where } from 'payload'
import { tenantIsolation } from '@/payload/access/tenantIsolation'
import { hasRoleInTenant } from '@/payload/access/hasRole'
import { setOrganization } from '@/payload/hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '@/payload/hooks/auditLog'

export const TimeEntries: CollectionConfig = {
  slug: 'time-entries',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'user', 'client', 'duration', 'date'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner') return true
      const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization
      if (['admin', 'accountant'].includes(user.role as string)) {
        return { organization: { equals: orgId } } as Where
      }
      return {
        and: [
          { organization: { equals: orgId } },
          { user: { equals: user.id } },
        ],
      } as Where
    },
    create: hasRoleInTenant('owner', 'admin', 'accountant', 'member'),
    update: hasRoleInTenant('owner', 'admin', 'accountant', 'member'),
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
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'punchCard',
      type: 'relationship',
      relationTo: 'punch-cards',
      admin: { description: 'Optioneel: afboeken op strippenkaart' },
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      label: 'Omschrijving',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Datum',
    },
    {
      name: 'duration',
      type: 'number',
      required: true,
      label: 'Duur (minuten)',
    },
    {
      name: 'billable',
      type: 'checkbox',
      defaultValue: true,
      label: 'Factureerbaar',
    },
    {
      name: 'billed',
      type: 'checkbox',
      defaultValue: false,
      label: 'Gefactureerd',
    },
    {
      name: 'linkedInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      admin: { description: 'Factuur waarop deze uren staan' },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        { name: 'tag', type: 'text' },
      ],
    },
  ],
  timestamps: true,
}
