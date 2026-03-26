import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const PunchCards: CollectionConfig = {
  slug: 'punch-cards',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'client', 'totalCredits', 'usedCredits', 'status'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin', 'accountant'),
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
      name: 'name',
      type: 'text',
      required: true,
      label: 'Naam',
      admin: { description: 'Bijv. "Onderhoudspakket 20 uur"' },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'unit',
      type: 'select',
      required: true,
      defaultValue: 'hour',
      options: [
        { label: 'Uren', value: 'hour' },
        { label: 'Credits', value: 'credit' },
        { label: 'Taken', value: 'task' },
      ],
    },
    {
      name: 'totalCredits',
      type: 'number',
      required: true,
      label: 'Totaal',
    },
    {
      name: 'usedCredits',
      type: 'number',
      defaultValue: 0,
      label: 'Verbruikt',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Actief', value: 'active' },
        { label: 'Op', value: 'depleted' },
        { label: 'Verlopen', value: 'expired' },
        { label: 'Geannuleerd', value: 'cancelled' },
      ],
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Vervaldatum',
    },
    {
      name: 'alertThreshold',
      type: 'number',
      defaultValue: 20,
      label: 'Alert bij % resterend',
      admin: { description: 'Stuur notificatie wanneer dit percentage overblijft' },
    },
    {
      name: 'linkedInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      admin: { description: 'Factuur waarmee deze strippenkaart is gekocht' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
