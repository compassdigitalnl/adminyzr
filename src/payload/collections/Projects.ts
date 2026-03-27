import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'client', 'status', 'deadline'],
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
      label: 'Projectnaam',
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      label: 'Klant',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Omschrijving',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planning',
      options: [
        { label: 'Planning', value: 'planning' },
        { label: 'Actief', value: 'active' },
        { label: 'On hold', value: 'on_hold' },
        { label: 'Afgerond', value: 'completed' },
        { label: 'Geannuleerd', value: 'cancelled' },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Laag', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'Hoog', value: 'high' },
        { label: 'Kritiek', value: 'critical' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      label: 'Startdatum',
    },
    {
      name: 'deadline',
      type: 'date',
      label: 'Deadline',
    },
    {
      name: 'budget',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Budget (in centen)' },
    },
    {
      name: 'budgetUsed',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Besteed budget (in centen)', readOnly: true },
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
