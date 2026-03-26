import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '@/payload/access/tenantIsolation'
import { hasRoleInTenant } from '@/payload/access/hasRole'
import { setOrganization } from '@/payload/hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '@/payload/hooks/auditLog'

export const PurchaseInvoices: CollectionConfig = {
  slug: 'purchase-invoices',
  admin: {
    useAsTitle: 'invoiceNumber',
    defaultColumns: ['supplier', 'invoiceNumber', 'status', 'totalIncVat', 'dueDate'],
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
      name: 'supplier',
      type: 'text',
      required: true,
      label: 'Leverancier',
    },
    {
      name: 'supplierVatNumber',
      type: 'text',
      label: 'BTW-nummer leverancier',
    },
    {
      name: 'supplierIban',
      type: 'text',
      label: 'IBAN leverancier',
    },
    {
      name: 'invoiceNumber',
      type: 'text',
      label: 'Factuurnummer leverancier',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_review',
      options: [
        { label: 'In behandeling', value: 'pending_review' },
        { label: 'Goedgekeurd', value: 'approved' },
        { label: 'Afgewezen', value: 'rejected' },
        { label: 'Betaald', value: 'paid' },
      ],
    },
    {
      name: 'issueDate',
      type: 'date',
      label: 'Factuurdatum',
    },
    {
      name: 'dueDate',
      type: 'date',
      label: 'Vervaldatum',
    },
    {
      name: 'subtotal',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Subtotaal excl. BTW (in centen)' },
    },
    {
      name: 'vatAmount',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'BTW-bedrag (in centen)' },
    },
    {
      name: 'totalIncVat',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Totaal incl. BTW (in centen)' },
    },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'other',
      options: [
        { label: 'Bedrijfsvoering', value: 'operations' },
        { label: 'Software', value: 'software' },
        { label: 'Hosting', value: 'hosting' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Kantoor', value: 'office' },
        { label: 'Reiskosten', value: 'travel' },
        { label: 'Overig', value: 'other' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Opmerkingen',
    },
    {
      name: 'attachment',
      type: 'upload',
      relationTo: 'attachments',
      label: 'Bijlage (PDF/afbeelding)',
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
      label: 'Goedgekeurd door',
    },
    {
      name: 'approvedAt',
      type: 'date',
      admin: { readOnly: true },
      label: 'Goedgekeurd op',
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Betaald op',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
