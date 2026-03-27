import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const BankAccounts: CollectionConfig = {
  slug: 'bank-accounts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'iban', 'isDefault', 'lastSyncedAt'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin'),
    update: hasRoleInTenant('owner', 'admin'),
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
      name: 'name',
      type: 'text',
      required: true,
      label: 'Naam',
      admin: { description: 'Bijv. "Zakelijke rekening ING"' },
    },
    {
      name: 'iban',
      type: 'text',
      label: 'IBAN',
    },
    {
      name: 'bankName',
      type: 'text',
      label: 'Bank',
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
      label: 'Valuta',
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      label: 'Standaard rekening',
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      admin: { readOnly: true },
      label: 'Laatst gesynchroniseerd',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
