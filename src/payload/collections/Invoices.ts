import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'
import { preventMutationAfterSend } from '../hooks/preventMutationAfterSend'
import { dispatchEvents } from '../hooks/eventDispatcher'

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  admin: {
    useAsTitle: 'invoiceNumber',
    defaultColumns: ['invoiceNumber', 'client', 'status', 'totalIncVat', 'dueDate'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin', 'accountant'),
    update: hasRoleInTenant('owner', 'admin', 'accountant'),
    delete: hasRoleInTenant('owner', 'admin'),
  },
  hooks: {
    beforeValidate: [setOrganization],
    beforeChange: [preventMutationAfterSend],
    afterChange: [logAfterChange, dispatchEvents],
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
      name: 'invoiceNumber',
      type: 'text',
      required: true,
      unique: true,
      label: 'Factuurnummer',
      admin: { readOnly: true },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'invoice',
      options: [
        { label: 'Factuur', value: 'invoice' },
        { label: 'Creditnota', value: 'credit_note' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Concept', value: 'draft' },
        { label: 'Verstuurd', value: 'sent' },
        { label: 'Betaald', value: 'paid' },
        { label: 'Te laat', value: 'overdue' },
        { label: 'Geannuleerd', value: 'cancelled' },
      ],
    },
    {
      name: 'issueDate',
      type: 'date',
      required: true,
      label: 'Factuurdatum',
    },
    {
      name: 'dueDate',
      type: 'date',
      required: true,
      label: 'Vervaldatum',
    },
    {
      name: 'reference',
      type: 'text',
      label: 'Referentie / PO-nummer',
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { readOnly: true, description: 'Subtotaal excl. BTW (in centen)' },
    },
    {
      name: 'vatAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { readOnly: true, description: 'BTW-bedrag (in centen)' },
    },
    {
      name: 'totalIncVat',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { readOnly: true, description: 'Totaal incl. BTW (in centen)' },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
      label: 'Valuta',
      admin: { description: 'ISO 4217 valutacode (EUR, USD, GBP, etc.)' },
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Betaald op',
    },
    {
      name: 'pdfUrl',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'paymentUrl',
      type: 'text',
      label: 'Betaallink',
      admin: { readOnly: true, description: 'Automatisch gegenereerde betaallink' },
    },
    {
      name: 'paymentProvider',
      type: 'relationship',
      relationTo: 'payment-providers',
      label: 'Betaalprovider',
      admin: { readOnly: true },
    },
    {
      name: 'paymentExternalId',
      type: 'text',
      label: 'Payment extern ID',
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Opmerkingen',
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'remindersSent',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'linkedQuote',
      type: 'relationship',
      relationTo: 'quotes',
      admin: { description: 'Offerte waaruit deze factuur is voortgekomen' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
