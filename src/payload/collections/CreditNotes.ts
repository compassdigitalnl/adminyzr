import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const CreditNotes: CollectionConfig = {
  slug: 'credit-notes',
  admin: {
    useAsTitle: 'creditNoteNumber',
    defaultColumns: ['creditNoteNumber', 'client', 'status', 'totalIncVat', 'issuedDate'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin', 'accountant'),
    update: hasRoleInTenant('owner', 'admin', 'accountant'),
    delete: hasRoleInTenant('owner'),
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
      name: 'creditNoteNumber',
      type: 'text',
      required: true,
      unique: true,
      label: 'Creditnotanummer',
    },
    {
      name: 'originalInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      label: 'Oorspronkelijke factuur',
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'reason',
      type: 'textarea',
      required: true,
      label: 'Reden',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Concept', value: 'draft' },
        { label: 'Verstuurd', value: 'sent' },
        { label: 'Definitief', value: 'finalized' },
      ],
    },
    {
      name: 'totalExVat',
      type: 'number',
      admin: { description: 'Totaal excl. BTW (in centen)' },
    },
    {
      name: 'totalVat',
      type: 'number',
      admin: { description: 'BTW-bedrag (in centen)' },
    },
    {
      name: 'totalIncVat',
      type: 'number',
      admin: { description: 'Totaal incl. BTW (in centen)' },
    },
    {
      name: 'pdfUrl',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'issuedDate',
      type: 'date',
      label: 'Uitgiftedatum',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
