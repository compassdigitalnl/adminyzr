import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'client', 'status', 'interval', 'amount', 'nextInvoiceDate'],
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
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Actief', value: 'active' },
        { label: 'Gepauzeerd', value: 'paused' },
        { label: 'Geannuleerd', value: 'cancelled' },
        { label: 'Verlopen', value: 'expired' },
      ],
    },
    {
      name: 'interval',
      type: 'select',
      required: true,
      defaultValue: 'monthly',
      options: [
        { label: 'Wekelijks', value: 'weekly' },
        { label: 'Maandelijks', value: 'monthly' },
        { label: 'Per kwartaal', value: 'quarterly' },
        { label: 'Jaarlijks', value: 'yearly' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: { description: 'Bedrag excl. BTW (in centen)' },
    },
    {
      name: 'vatRate',
      type: 'select',
      required: true,
      defaultValue: '21',
      options: [
        { label: '21%', value: '21' },
        { label: '9%', value: '9' },
        { label: '0%', value: '0' },
        { label: 'Vrijgesteld', value: 'exempt' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Startdatum',
    },
    {
      name: 'nextInvoiceDate',
      type: 'date',
      required: true,
      label: 'Volgende factuurdatum',
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'Einddatum (optioneel)',
    },
    {
      name: 'autoSend',
      type: 'checkbox',
      defaultValue: true,
      label: 'Automatisch versturen',
      admin: { description: 'Gegenereerde facturen automatisch als verstuurd markeren' },
    },
    {
      name: 'lastInvoiceId',
      type: 'relationship',
      relationTo: 'invoices',
      admin: { readOnly: true, description: 'Laatst gegenereerde factuur' },
    },
    {
      name: 'invoiceCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, description: 'Aantal gegenereerde facturen' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
