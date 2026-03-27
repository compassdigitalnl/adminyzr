import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const LeaveRequests: CollectionConfig = {
  slug: 'leave-requests',
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['employee', 'type', 'startDate', 'endDate', 'status'],
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
      name: 'employee',
      type: 'relationship',
      relationTo: 'employees',
      required: true,
      label: 'Medewerker',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'Type verlof',
      options: [
        { label: 'Vakantie', value: 'vacation' },
        { label: 'Ziekte', value: 'sick' },
        { label: 'Persoonlijk', value: 'personal' },
        { label: 'Ouderschapsverlof', value: 'parental' },
        { label: 'Onbetaald', value: 'unpaid' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Startdatum',
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      label: 'Einddatum',
    },
    {
      name: 'totalDays',
      type: 'number',
      label: 'Totaal dagen',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Status',
      options: [
        { label: 'In afwachting', value: 'pending' },
        { label: 'Goedgekeurd', value: 'approved' },
        { label: 'Afgewezen', value: 'rejected' },
        { label: 'Geannuleerd', value: 'cancelled' },
      ],
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Goedgekeurd door',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'approvedAt',
      type: 'date',
      label: 'Goedgekeurd op',
      admin: { readOnly: true, position: 'sidebar' },
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
