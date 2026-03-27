import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange } from '../hooks/auditLog'

export const BankTransactions: CollectionConfig = {
  slug: 'bank-transactions',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['date', 'description', 'amountInCents', 'status', 'matchedInvoice'],
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
      name: 'bankAccount',
      type: 'relationship',
      relationTo: 'bank-accounts',
      required: true,
      label: 'Bankrekening',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Datum',
    },
    {
      name: 'amountInCents',
      type: 'number',
      required: true,
      label: 'Bedrag (centen)',
      admin: { description: 'Positief = inkomend, negatief = uitgaand' },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
    },
    {
      name: 'description',
      type: 'text',
      label: 'Omschrijving',
    },
    {
      name: 'counterpartyName',
      type: 'text',
      label: 'Tegenrekening naam',
    },
    {
      name: 'counterpartyIban',
      type: 'text',
      label: 'Tegenrekening IBAN',
    },
    {
      name: 'reference',
      type: 'text',
      label: 'Referentie / kenmerk',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'unmatched',
      options: [
        { label: 'Niet gekoppeld', value: 'unmatched' },
        { label: 'Automatisch gekoppeld', value: 'auto_matched' },
        { label: 'Handmatig gekoppeld', value: 'manual_matched' },
        { label: 'Genegeerd', value: 'ignored' },
      ],
      label: 'Status',
    },
    {
      name: 'matchedInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      label: 'Gekoppelde factuur',
    },
    {
      name: 'matchedPurchaseInvoice',
      type: 'relationship',
      relationTo: 'purchase-invoices',
      label: 'Gekoppelde inkoopfactuur',
    },
    {
      name: 'matchConfidence',
      type: 'number',
      admin: { readOnly: true, description: 'Match score 0-100' },
      label: 'Match score',
    },
    {
      name: 'externalId',
      type: 'text',
      label: 'Extern transactie-ID',
      admin: { description: 'Voor deduplicatie bij herhaalde imports' },
    },
    {
      name: 'rawData',
      type: 'json',
      label: 'Ruwe import data',
      admin: { description: 'Originele data uit MT940/CSV' },
    },
  ],
  timestamps: true,
}
