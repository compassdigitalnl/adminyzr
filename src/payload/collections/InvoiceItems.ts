import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access/isAuthenticated'
import { hasRole } from '../access/hasRole'
import { calculateLineTotal } from '../hooks/calculateLineTotal'
import { recalculateInvoiceAfterItemChange, recalculateInvoiceAfterItemDelete } from '../hooks/recalculateInvoiceTotals'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const InvoiceItems: CollectionConfig = {
  slug: 'invoice-items',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'quantity', 'unitPrice', 'vatRate', 'invoice'],
  },
  access: {
    // Toegang via de gekoppelde factuur — Payload checkt invoice access apart
    read: isAuthenticated,
    create: hasRole('owner', 'admin', 'accountant'),
    update: hasRole('owner', 'admin', 'accountant'),
    delete: hasRole('owner', 'admin'),
  },
  hooks: {
    beforeValidate: [calculateLineTotal],
    afterChange: [recalculateInvoiceAfterItemChange, logAfterChange],
    afterDelete: [recalculateInvoiceAfterItemDelete, logAfterDelete],
  },
  fields: [
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
      required: true,
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      admin: { description: 'Optioneel: link naar product/dienst' },
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      label: 'Omschrijving',
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
      name: 'lineTotal',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { readOnly: true, description: 'Regeltotaal excl. BTW (in centen)' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
  timestamps: true,
}
