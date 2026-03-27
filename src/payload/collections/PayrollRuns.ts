import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const PayrollRuns: CollectionConfig = {
  slug: 'payroll-runs',
  admin: {
    useAsTitle: 'period',
    defaultColumns: ['period', 'status', 'totalGross', 'totalNet', 'totalTax'],
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
      name: 'period',
      type: 'text',
      required: true,
      label: 'Periode',
      admin: { description: 'Bijv. 2026-03' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Status',
      options: [
        { label: 'Concept', value: 'draft' },
        { label: 'Verwerkt', value: 'processed' },
        { label: 'Betaald', value: 'paid' },
      ],
    },
    {
      name: 'processedAt',
      type: 'date',
      label: 'Verwerkt op',
      admin: { readOnly: true },
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Betaald op',
      admin: { readOnly: true },
    },
    {
      name: 'totalGross',
      type: 'number',
      defaultValue: 0,
      label: 'Totaal bruto',
      admin: { description: 'Totaal bruto in centen', readOnly: true },
    },
    {
      name: 'totalNet',
      type: 'number',
      defaultValue: 0,
      label: 'Totaal netto',
      admin: { description: 'Totaal netto in centen', readOnly: true },
    },
    {
      name: 'totalTax',
      type: 'number',
      defaultValue: 0,
      label: 'Totaal loonheffing',
      admin: { description: 'Totaal belasting in centen', readOnly: true },
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
