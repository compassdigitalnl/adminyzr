import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'externalOrderId',
    defaultColumns: ['externalOrderId', 'customerName', 'status', 'totalIncVat', 'orderDate'],
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
      name: 'externalOrderId',
      type: 'text',
      required: true,
      label: 'Sityzr bestelnummer',
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      admin: { description: 'Gekoppelde klant (optioneel)' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'In afwachting', value: 'pending' },
        { label: 'In verwerking', value: 'processing' },
        { label: 'Gefactureerd', value: 'invoiced' },
        { label: 'Verzonden', value: 'shipped' },
        { label: 'Afgerond', value: 'completed' },
        { label: 'Geannuleerd', value: 'cancelled' },
      ],
    },
    {
      name: 'orderDate',
      type: 'date',
      required: true,
      label: 'Besteldatum',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Bestelregels',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Productnaam',
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          defaultValue: 1,
          label: 'Aantal',
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          label: 'Stukprijs (in centen)',
        },
        {
          name: 'vatRate',
          type: 'number',
          required: true,
          defaultValue: 21,
          label: 'BTW-tarief (%)',
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'Subtotaal excl. BTW (in centen)' },
    },
    {
      name: 'vatAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'BTW-bedrag (in centen)' },
    },
    {
      name: 'totalIncVat',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'Totaal incl. BTW (in centen)' },
    },
    {
      name: 'shippingAddress',
      type: 'group',
      label: 'Verzendadres',
      fields: [
        { name: 'name', type: 'text', label: 'Naam' },
        { name: 'street', type: 'text', label: 'Straat' },
        { name: 'houseNumber', type: 'text', label: 'Huisnummer' },
        { name: 'postalCode', type: 'text', label: 'Postcode' },
        { name: 'city', type: 'text', label: 'Plaats' },
        { name: 'country', type: 'text', defaultValue: 'NL', label: 'Land' },
      ],
    },
    {
      name: 'customerEmail',
      type: 'text',
      label: 'E-mail klant',
    },
    {
      name: 'customerName',
      type: 'text',
      label: 'Naam klant',
    },
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
      admin: { description: 'Gekoppelde factuur (na facturering)' },
    },
    {
      name: 'sityzrTenantId',
      type: 'text',
      label: 'Sityzr Tenant ID',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Opmerkingen',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
