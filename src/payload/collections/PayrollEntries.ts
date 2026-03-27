import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const PayrollEntries: CollectionConfig = {
  slug: 'payroll-entries',
  admin: {
    defaultColumns: ['employee', 'period', 'grossSalary', 'netSalary'],
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
      name: 'payrollRun',
      type: 'relationship',
      relationTo: 'payroll-runs',
      required: true,
      label: 'Salarisrun',
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employees',
      required: true,
      label: 'Medewerker',
    },
    {
      name: 'period',
      type: 'text',
      required: true,
      label: 'Periode',
    },
    {
      name: 'grossSalary',
      type: 'number',
      required: true,
      label: 'Bruto salaris',
      admin: { description: 'Bruto salaris in centen' },
    },
    {
      name: 'taxDeduction',
      type: 'number',
      defaultValue: 0,
      label: 'Loonheffing',
      admin: { description: 'Loonheffing in centen (geschat 37.07%)' },
    },
    {
      name: 'socialSecurity',
      type: 'number',
      defaultValue: 0,
      label: 'Sociale premies',
      admin: { description: 'Sociale premies in centen (geschat 27.65%)' },
    },
    {
      name: 'netSalary',
      type: 'number',
      defaultValue: 0,
      label: 'Netto salaris',
      admin: { description: 'Netto salaris in centen (berekend)', readOnly: true },
    },
    {
      name: 'hoursWorked',
      type: 'number',
      label: 'Gewerkte uren',
    },
    {
      name: 'overtimeHours',
      type: 'number',
      label: 'Overuren',
    },
    {
      name: 'bonus',
      type: 'number',
      defaultValue: 0,
      label: 'Bonus',
      admin: { description: 'Bonus in centen' },
    },
    {
      name: 'deductions',
      type: 'number',
      defaultValue: 0,
      label: 'Inhoudingen',
      admin: { description: 'Inhoudingen in centen' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Opmerkingen',
    },
  ],
  timestamps: true,
}
