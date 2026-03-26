import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '@/payload/access/tenantIsolation'
import { hasRoleInTenant } from '@/payload/access/hasRole'
import { setOrganization } from '@/payload/hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '@/payload/hooks/auditLog'

export const Quotes: CollectionConfig = {
  slug: 'quotes',
  admin: {
    useAsTitle: 'quoteNumber',
    defaultColumns: ['quoteNumber', 'client', 'status', 'totalIncVat', 'validUntil'],
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
      name: 'quoteNumber',
      type: 'text',
      required: true,
      unique: true,
      label: 'Offertenummer',
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Concept', value: 'draft' },
        { label: 'Verstuurd', value: 'sent' },
        { label: 'Geaccepteerd', value: 'accepted' },
        { label: 'Afgewezen', value: 'rejected' },
        { label: 'Verlopen', value: 'expired' },
      ],
    },
    {
      name: 'issueDate',
      type: 'date',
      required: true,
      label: 'Offertedatum',
    },
    {
      name: 'validUntil',
      type: 'date',
      required: true,
      label: 'Geldig tot',
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'vatAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'totalIncVat',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Opmerkingen / Voorwaarden',
    },
    {
      name: 'pdfUrl',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'convertedToInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      admin: { readOnly: true, description: 'Factuur voortgekomen uit deze offerte' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
