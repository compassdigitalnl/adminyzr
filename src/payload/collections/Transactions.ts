import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange } from '../hooks/auditLog'
import { dispatchEvents } from '../hooks/eventDispatcher'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'externalId',
    defaultColumns: ['invoice', 'providerType', 'status', 'amountInCents', 'createdAt'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin', 'accountant'),
    update: hasRoleInTenant('owner', 'admin', 'accountant'),
    // Payment records are permanent — no delete
    delete: () => false,
  },
  hooks: {
    beforeValidate: [setOrganization],
    afterChange: [logAfterChange, dispatchEvents],
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
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
      required: true,
      label: 'Factuur',
    },
    {
      name: 'paymentProvider',
      type: 'relationship',
      relationTo: 'payment-providers',
      label: 'Betaalprovider',
    },
    {
      name: 'providerType',
      type: 'select',
      required: true,
      options: [
        { label: 'Mollie', value: 'mollie' },
        { label: 'Stripe', value: 'stripe' },
        { label: 'MultiSafePay', value: 'multisafepay' },
      ],
      label: 'Provider',
    },
    {
      name: 'externalId',
      type: 'text',
      required: true,
      label: 'Extern ID',
      admin: { description: 'Payment ID bij de provider' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In behandeling', value: 'pending' },
        { label: 'Betaald', value: 'paid' },
        { label: 'Mislukt', value: 'failed' },
        { label: 'Verlopen', value: 'expired' },
        { label: 'Geannuleerd', value: 'cancelled' },
        { label: 'Terugbetaald', value: 'refunded' },
      ],
      label: 'Status',
    },
    {
      name: 'amountInCents',
      type: 'number',
      required: true,
      label: 'Bedrag (centen)',
      admin: { description: 'Bedrag in centen' },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
      label: 'Valuta',
    },
    {
      name: 'paymentUrl',
      type: 'text',
      label: 'Betaallink',
      admin: { readOnly: true },
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Betaald op',
    },
    {
      name: 'failedAt',
      type: 'date',
      label: 'Mislukt op',
    },
    {
      name: 'refundedAt',
      type: 'date',
      label: 'Terugbetaald op',
    },
    {
      name: 'refundAmountInCents',
      type: 'number',
      label: 'Terugbetaald bedrag (centen)',
    },
    {
      name: 'refundExternalId',
      type: 'text',
      label: 'Refund extern ID',
    },
    {
      name: 'paymentMethod',
      type: 'text',
      label: 'Betaalmethode',
      admin: { readOnly: true, description: 'bijv. ideal, creditcard, bancontact' },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Metadata',
      admin: { description: 'Provider-specifieke data' },
    },
  ],
  timestamps: true,
}
